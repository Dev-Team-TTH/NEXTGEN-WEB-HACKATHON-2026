import { Response } from "express";
import { ActionType } from "@prisma/client";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";
import { AuthRequest } from "../middleware/authMiddleware"; // 🚀 IMPORT CHUẨN KIẾN TRÚC

// Hàm Helper lấy userId an toàn
const getUserId = (req: AuthRequest) => req.user?.userId || req.body.userId;

// ==========================================
// 1. TRUY VẤN TỒN KHO TRỰC TIẾP (INVENTORY BALANCES)
// ==========================================
export const getInventoryBalances = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { warehouseId, productId, binId, batchId, branchId, page = "1", limit = "50" } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 50);
    const skip = (pageNumber - 1) * limitNumber;

    const whereCondition = {
      OR: [{ quantity: { gt: 0 } }, { totalValue: { gt: 0 } }],
      ...(warehouseId && { warehouseId: String(warehouseId) }),
      ...(productId && { productId: String(productId) }),
      ...(binId && { binId: String(binId) }),
      ...(batchId && { batchId: String(batchId) }),
      ...(branchId && { warehouse: { branchId: String(branchId) } })
    };

    const [totalRecords, balances] = await Promise.all([
      prisma.inventoryBalance.count({ where: whereCondition }),
      prisma.inventoryBalance.findMany({
        where: whereCondition,
        skip,
        take: limitNumber,
        include: {
          warehouse: { select: { name: true, code: true, branch: { select: { name: true } } } },
          bin: { select: { code: true, name: true } },
          product: { select: { productCode: true, name: true, uom: { select: { name: true } } } },
          batch: { select: { batchNumber: true, expiryDate: true } },
          variant: { select: { sku: true, attributes: true } }
        },
        orderBy: [
          { warehouse: { name: 'asc' } },
          { product: { name: 'asc' } }
        ]
      })
    ]);

    res.json({
      data: balances,
      meta: {
        total: totalRecords,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalRecords / limitNumber)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất tồn kho chi tiết", error: error.message });
  }
};

// ==========================================
// 2. THẺ KHO / LỊCH SỬ GIAO DỊCH KHO (STOCK LEDGER)
// ==========================================
export const getInventoryTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, warehouseId, documentId, startDate, endDate, page = "1", limit = "50" } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 50);
    const skip = (pageNumber - 1) * limitNumber;

    const whereCondition: any = {};
    if (productId) whereCondition.productId = String(productId);
    if (documentId) whereCondition.documentId = String(documentId);
    if (warehouseId) {
      whereCondition.OR = [
        { fromWarehouseId: String(warehouseId) },
        { toWarehouseId: String(warehouseId) }
      ];
    }
    if (startDate || endDate) {
      whereCondition.timestamp = {};
      if (startDate) whereCondition.timestamp.gte = new Date(String(startDate));
      if (endDate) whereCondition.timestamp.lte = new Date(String(endDate));
    }

    const [totalRecords, transactions] = await Promise.all([
      prisma.inventoryTransaction.count({ where: whereCondition }),
      prisma.inventoryTransaction.findMany({
        where: whereCondition,
        skip,
        take: limitNumber,
        include: {
          document: { select: { documentNumber: true, type: true, note: true } },
          product: { select: { productCode: true, name: true } },
          fromWarehouse: { select: { name: true } },
          toWarehouse: { select: { name: true } },
          batch: { select: { batchNumber: true } }
        },
        orderBy: { timestamp: 'desc' }
      })
    ]);

    res.json({
      data: transactions,
      meta: {
        total: totalRecords,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalRecords / limitNumber)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất thẻ kho", error: error.message });
  }
};

// ==========================================
// 3. ĐIỀU CHỈNH KHO (SINGLE STOCK ADJUSTMENT)
// ==========================================
export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  const { branchId, warehouseId, binId, productId, variantId, batchId, adjustQuantity, unitCost, note } = req.body;
  const userId = getUserId(req);

  try {
    const qty = Number(adjustQuantity);
    if (qty === 0) {
      res.status(400).json({ message: "Số lượng điều chỉnh không được bằng 0" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          documentNumber: `ADJ-${Date.now()}`,
          branchId,
          type: "ADJUSTMENT",
          status: "COMPLETED",
          note: note || "Điều chỉnh kho thủ công",
          createdById: userId,
          isLocked: true
        }
      });

      const currentBalance = await tx.inventoryBalance.findUnique({
        where: {
          warehouseId_binId_productId_variantId_batchId: {
            warehouseId, binId: binId || null, productId, variantId: variantId || null, batchId: batchId || null
          }
        }
      });

      const qtyBefore = currentBalance?.quantity || 0;
      const qtyAfter = qtyBefore + qty;

      if (qtyAfter < 0) throw new Error(`Kho không đủ tồn để trừ! Tồn hiện tại: ${qtyBefore}`);

      const cost = Number(unitCost) || Number(currentBalance?.avgCost || 0);
      const totalCostChange = Math.abs(qty) * cost;
      
      let newTotalValue = Number(currentBalance?.totalValue || 0);
      let newAvgCost = Number(currentBalance?.avgCost || 0);

      if (qty > 0) { 
        newTotalValue += totalCostChange;
        newAvgCost = qtyAfter > 0 ? (newTotalValue / qtyAfter) : 0; 
      } else { 
        newTotalValue -= totalCostChange;
      }

      await tx.inventoryBalance.upsert({
        where: {
          warehouseId_binId_productId_variantId_batchId: {
            warehouseId, binId: binId || null, productId, variantId: variantId || null, batchId: batchId || null
          }
        },
        create: {
          warehouseId, binId: binId || null, productId, variantId: variantId || null, batchId: batchId || null,
          quantity: qtyAfter, totalValue: newTotalValue, avgCost: newAvgCost
        },
        update: {
          quantity: { increment: qty }, 
          totalValue: newTotalValue, 
          avgCost: newAvgCost
        }
      });

      const txLine = await tx.inventoryTransaction.create({
        data: {
          documentId: doc.documentId, branchId, movementDirection: qty > 0 ? "IN" : "OUT",
          fromWarehouseId: qty < 0 ? warehouseId : null, toWarehouseId: qty > 0 ? warehouseId : null,
          fromBinId: qty < 0 ? binId || null : null, toBinId: qty > 0 ? binId || null : null,
          productId, variantId: variantId || null, batchId: batchId || null,
          quantity: Math.abs(qty), quantityBefore: qtyBefore, quantityAfter: qtyAfter,
          unitCost: cost, movingAvgCost: newAvgCost, totalCost: totalCostChange
        }
      });

      return { doc, txLine };
    });

    await logAudit("InventoryTransaction", result.txLine.transactionId, ActionType.CREATE, null, result, userId, req.ip);
    res.status(201).json({ message: "Điều chỉnh kho thành công!", result });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi điều chỉnh kho", error: error.message });
  }
};

// ==========================================
// 4. CHUYỂN KHO NỘI BỘ (INTERNAL TRANSFER)
// ==========================================
export const transferStock = async (req: AuthRequest, res: Response): Promise<void> => {
  const { branchId, fromWarehouseId, toWarehouseId, note, items } = req.body;
  const userId = getUserId(req);

  try {
    if (!items || items.length === 0) {
      res.status(400).json({ message: "Vui lòng chọn ít nhất 1 sản phẩm để chuyển!" });
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      res.status(400).json({ message: "Kho xuất và Kho nhập không được trùng nhau!" });
      return;
    }

    const transferDoc = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          documentNumber: `TRF-${Date.now()}`, branchId, type: "INTERNAL_TRANSFER",
          status: "COMPLETED", note: note || "Chuyển kho nội bộ", createdById: userId, isLocked: true
        }
      });

      let docTotalAmount = 0;

      const sourceConditions = items.map((item: any) => ({
        warehouseId: fromWarehouseId, binId: item.fromBinId || null, productId: item.productId,
        variantId: item.variantId || null, batchId: item.batchId || null
      }));

      const destConditions = items.map((item: any) => ({
        warehouseId: toWarehouseId, binId: item.toBinId || null, productId: item.productId,
        variantId: item.variantId || null, batchId: item.batchId || null
      }));

      const [sourceBalances, destBalances] = await Promise.all([
        tx.inventoryBalance.findMany({ where: { OR: sourceConditions } }),
        tx.inventoryBalance.findMany({ where: { OR: destConditions } })
      ]);

      const getBalanceKey = (w: string, b: string | null, p: string, v: string | null, ba: string | null) => 
        `${w}_${b || 'null'}_${p}_${v || 'null'}_${ba || 'null'}`;
      
      const sourceMap = new Map(sourceBalances.map(b => [getBalanceKey(b.warehouseId, b.binId, b.productId, b.variantId, b.batchId), b]));
      const destMap = new Map(destBalances.map(b => [getBalanceKey(b.warehouseId, b.binId, b.productId, b.variantId, b.batchId), b]));

      for (const item of items) {
        const qty = Number(item.quantity);
        if (qty <= 0) throw new Error("Số lượng chuyển phải lớn hơn 0");

        const sourceKey = getBalanceKey(fromWarehouseId, item.fromBinId, item.productId, item.variantId, item.batchId);
        const sourceBalance = sourceMap.get(sourceKey);

        if (!sourceBalance || sourceBalance.quantity < qty) {
          throw new Error(`Sản phẩm ${item.productId} không đủ tồn kho tại kho xuất!`);
        }

        const unitCost = Number(sourceBalance.avgCost);
        const totalLineCost = qty * unitCost;
        docTotalAmount += totalLineCost;

        await tx.inventoryBalance.update({
          where: { balanceId: sourceBalance.balanceId },
          data: { quantity: { decrement: qty }, totalValue: { decrement: totalLineCost } }
        });

        const destKey = getBalanceKey(toWarehouseId, item.toBinId, item.productId, item.variantId, item.batchId);
        const destBalance = destMap.get(destKey);

        let newDestTotalValue = Number(destBalance?.totalValue || 0) + totalLineCost;
        let newDestQty = (destBalance?.quantity || 0) + qty;
        let newDestAvgCost = newDestQty > 0 ? (newDestTotalValue / newDestQty) : unitCost;

        await tx.inventoryBalance.upsert({
          where: {
            warehouseId_binId_productId_variantId_batchId: {
              warehouseId: toWarehouseId, binId: item.toBinId || null, productId: item.productId,
              variantId: item.variantId || null, batchId: item.batchId || null
            }
          },
          create: {
            warehouseId: toWarehouseId, binId: item.toBinId || null, productId: item.productId,
            variantId: item.variantId || null, batchId: item.batchId || null,
            quantity: qty, totalValue: totalLineCost, avgCost: unitCost
          },
          update: {
            quantity: { increment: qty }, totalValue: { increment: totalLineCost }, avgCost: newDestAvgCost
          }
        });

        await tx.inventoryTransaction.create({
          data: {
            documentId: doc.documentId, branchId, movementDirection: "OUT", 
            fromWarehouseId, toWarehouseId, fromBinId: item.fromBinId || null, toBinId: item.toBinId || null,
            productId: item.productId, variantId: item.variantId || null, batchId: item.batchId || null,
            quantity: qty, quantityBefore: sourceBalance.quantity, quantityAfter: sourceBalance.quantity - qty,
            unitCost: unitCost, movingAvgCost: sourceBalance.avgCost, totalCost: totalLineCost
          }
        });
      }

      await tx.document.update({ where: { documentId: doc.documentId }, data: { totalAmount: docTotalAmount } });
      return doc;
    });

    await logAudit("Document (Transfer)", transferDoc.documentId, ActionType.CREATE, null, transferDoc, userId, req.ip);
    res.status(201).json({ message: "Chuyển kho nội bộ thành công!", document: transferDoc });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi chuyển kho", error: error.message });
  }
};

// ==========================================
// 5. THUẬT TOÁN TỰ ĐỘNG NHẶT HÀNG (FIFO / FEFO)
// ==========================================
export const autoPickStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { warehouseId, productId, variantId, requiredQuantity } = req.body;
    const qtyNeeded = Number(requiredQuantity);

    if (!warehouseId || !productId || qtyNeeded <= 0) {
      res.status(400).json({ message: "Vui lòng cung cấp kho, sản phẩm và số lượng cần nhặt hợp lệ (> 0)." });
      return;
    }

    const product = await prisma.products.findUnique({
      where: { productId: String(productId) },
      select: { hasBatches: true, name: true, productCode: true }
    });

    if (!product) {
      res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
      return;
    }

    const availableBalances = await prisma.inventoryBalance.findMany({
      where: {
        warehouseId: String(warehouseId), productId: String(productId),
        ...(variantId && { variantId: String(variantId) }),
        quantity: { gt: 0 }
      },
      include: { batch: true, bin: true }
    });

    const validBalances = availableBalances.filter(b => (b.quantity - b.lockedQty) > 0);

    if (validBalances.length === 0) {
      res.status(400).json({ message: `Sản phẩm ${product.name} đã hết hàng khả dụng trong kho này!` });
      return;
    }

    validBalances.sort((a, b) => {
      if (product.hasBatches) {
        const dateA = a.batch?.expiryDate ? new Date(a.batch.expiryDate).getTime() : Infinity;
        const dateB = b.batch?.expiryDate ? new Date(b.batch.expiryDate).getTime() : Infinity;
        if (dateA !== dateB) return dateA - dateB;
        
        const mfgA = a.batch?.manufactureDate ? new Date(a.batch.manufactureDate).getTime() : Infinity;
        const mfgB = b.batch?.manufactureDate ? new Date(b.batch.manufactureDate).getTime() : Infinity;
        return mfgA - mfgB;
      } else {
        const availA = a.quantity - a.lockedQty;
        const availB = b.quantity - b.lockedQty;
        if (availA !== availB) return availA - availB;

        const binA = a.bin?.code || "";
        const binB = b.bin?.code || "";
        return binA.localeCompare(binB);
      }
    });

    let remainingToPick = qtyNeeded;
    const picks = [];

    for (const bal of validBalances) {
      if (remainingToPick <= 0) break;
      const availableQty = bal.quantity - bal.lockedQty;
      const pickQty = Math.min(availableQty, remainingToPick);

      picks.push({
        balanceId: bal.balanceId, warehouseId: bal.warehouseId, productId: bal.productId,
        variantId: bal.variantId, binId: bal.binId, binCode: bal.bin?.code || "Mặc định",
        batchId: bal.batchId, batchNumber: bal.batch?.batchNumber || null, expiryDate: bal.batch?.expiryDate || null,
        availableQty: availableQty, quantity: pickQty, unitCost: bal.avgCost
      });
      remainingToPick -= pickQty;
    }

    if (remainingToPick > 0) {
      res.status(400).json({ 
        message: `Cảnh báo: Kho không đủ hàng! Thiếu ${remainingToPick} sản phẩm.`, isFulfilled: false, shortage: remainingToPick, picks
      });
      return;
    }

    res.json({ message: `Nhặt thành công ${qtyNeeded} sản phẩm (${product.hasBatches ? 'FEFO' : 'FIFO'})!`, isFulfilled: true, totalPicked: qtyNeeded, picks });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi thuật toán tự động nhặt hàng", error: error.message });
  }
};

// ==========================================
// 6. CẢNH BÁO TỒN KHO AN TOÀN (LOW STOCK ALERTS)
// ==========================================
export const getLowStockAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupedBalances = await prisma.inventoryBalance.groupBy({
      by: ['productId'],
      _sum: { quantity: true, lockedQty: true },
      where: { quantity: { gt: 0 } }
    });

    const products = await prisma.products.findMany({
      where: { reorderPoint: { gt: 0 }, isDeleted: false, status: "ACTIVE" },
      select: { productId: true, productCode: true, name: true, reorderPoint: true, imageUrl: true }
    });

    const alerts = [];
    for (const prod of products) {
      const balanceData = groupedBalances.find(b => b.productId === prod.productId);
      const totalAvailable = balanceData ? (Number(balanceData._sum.quantity) - Number(balanceData._sum.lockedQty)) : 0;

      if (totalAvailable <= prod.reorderPoint) {
        alerts.push({
          productId: prod.productId,
          productCode: prod.productCode,
          productName: prod.name,
          imageUrl: prod.imageUrl,
          reorderPoint: prod.reorderPoint,
          currentAvailableQty: totalAvailable,
          deficit: prod.reorderPoint - totalAvailable
        });
      }
    }

    res.json(alerts.sort((a, b) => b.deficit - a.deficit)); 
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy cảnh báo tồn kho", error: error.message });
  }
};

// ==========================================
// 7. CẢNH BÁO HÀNG SẮP HẾT HẠN (EXPIRING BATCHES)
// ==========================================
export const getExpiringBatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const daysThreshold = Number(req.query.days) || 30; 
    
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const expiringInventory = await prisma.inventoryBalance.findMany({
      where: {
        quantity: { gt: 0 },
        batch: {
          expiryDate: { lte: thresholdDate, not: null }
        }
      },
      include: {
        product: { select: { productCode: true, name: true, imageUrl: true } },
        warehouse: { select: { name: true } },
        bin: { select: { code: true } },
        batch: { select: { batchNumber: true, expiryDate: true } }
      },
      orderBy: { batch: { expiryDate: 'asc' } } 
    });

    res.json(expiringInventory);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy cảnh báo hàng hết hạn", error: error.message });
  }
};

// ==========================================
// 8. KIỂM KÊ HÀNG LOẠT (BULK STOCK TAKE) - HIGH PERFORMANCE
// ==========================================
export const bulkStockTake = async (req: AuthRequest, res: Response): Promise<void> => {
  const { branchId, warehouseId, note, items } = req.body;
  const userId = getUserId(req);

  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "Dữ liệu kiểm kê trống!" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          documentNumber: `STK-${Date.now()}`,
          branchId,
          type: "ADJUSTMENT",
          status: "COMPLETED",
          note: note || "Kiểm kê kho định kỳ (Bulk)",
          createdById: userId,
          isLocked: true
        }
      });

      let totalCostVariance = 0;

      const balanceConditions = items.map((item: any) => ({
        warehouseId, binId: item.binId || null, productId: item.productId, 
        variantId: item.variantId || null, batchId: item.batchId || null
      }));

      const existingBalances = await tx.inventoryBalance.findMany({
        where: { OR: balanceConditions }
      });

      const getBalanceKey = (w: string, b: string | null, p: string, v: string | null, ba: string | null) => 
        `${w}_${b || 'null'}_${p}_${v || 'null'}_${ba || 'null'}`;
      
      const balanceMap = new Map(existingBalances.map(b => [getBalanceKey(b.warehouseId, b.binId, b.productId, b.variantId, b.batchId), b]));

      for (const item of items) {
        const countedQty = Number(item.countedQuantity); 
        const key = getBalanceKey(warehouseId, item.binId, item.productId, item.variantId, item.batchId);
        const currentBalance = balanceMap.get(key);

        const qtyBefore = currentBalance?.quantity || 0;
        const varianceQty = countedQty - qtyBefore; 

        if (varianceQty === 0) continue; 

        const unitCost = Number(currentBalance?.avgCost || item.defaultUnitCost || 0);
        const varianceCost = Math.abs(varianceQty) * unitCost;
        
        if (varianceQty > 0) totalCostVariance += varianceCost; 
        else totalCostVariance -= varianceCost; 

        let newTotalValue = Number(currentBalance?.totalValue || 0);
        if (varianceQty > 0) newTotalValue += varianceCost;
        else newTotalValue -= varianceCost;

        const newAvgCost = countedQty > 0 ? (newTotalValue / countedQty) : unitCost;

        await tx.inventoryBalance.upsert({
          where: {
            warehouseId_binId_productId_variantId_batchId: {
              warehouseId, binId: item.binId || null, productId: item.productId, 
              variantId: item.variantId || null, batchId: item.batchId || null
            }
          },
          create: {
            warehouseId, binId: item.binId || null, productId: item.productId, 
            variantId: item.variantId || null, batchId: item.batchId || null,
            quantity: countedQty, totalValue: newTotalValue, avgCost: newAvgCost
          },
          update: {
            quantity: countedQty, totalValue: newTotalValue, avgCost: newAvgCost
          }
        });

        await tx.inventoryTransaction.create({
          data: {
            documentId: doc.documentId, branchId, movementDirection: varianceQty > 0 ? "IN" : "OUT",
            fromWarehouseId: varianceQty < 0 ? warehouseId : null, toWarehouseId: varianceQty > 0 ? warehouseId : null,
            fromBinId: varianceQty < 0 ? item.binId || null : null, toBinId: varianceQty > 0 ? item.binId || null : null,
            productId: item.productId, variantId: item.variantId || null, batchId: item.batchId || null,
            quantity: Math.abs(varianceQty), quantityBefore: qtyBefore, quantityAfter: countedQty,
            unitCost: unitCost, movingAvgCost: newAvgCost, totalCost: varianceCost
          }
        });
      }

      await tx.document.update({
        where: { documentId: doc.documentId },
        data: { totalAmount: Math.abs(totalCostVariance) } 
      });

      return doc;
    });

    await logAudit("Document (StockTake)", result.documentId, ActionType.CREATE, null, result, userId, req.ip);
    res.status(201).json({ message: "Chốt sổ kiểm kê hàng loạt thành công!", document: result });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xử lý kiểm kê hàng loạt", error: error.message });
  }
};