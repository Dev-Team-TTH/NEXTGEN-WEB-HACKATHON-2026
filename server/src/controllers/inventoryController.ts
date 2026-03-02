import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../utils/auditLogger";

const prisma = new PrismaClient();

// ==========================================
// 1. TRUY VẤN TỒN KHO TRỰC TIẾP (INVENTORY BALANCES)
// ==========================================
export const getInventoryBalances = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouseId, productId, binId, batchId, branchId } = req.query;

    const balances = await prisma.inventoryBalance.findMany({
      where: {
        // Chỉ lấy tồn kho có số lượng hoặc giá trị > 0 (tránh rác dữ liệu)
        OR: [{ quantity: { gt: 0 } }, { totalValue: { gt: 0 } }],
        ...(warehouseId && { warehouseId: String(warehouseId) }),
        ...(productId && { productId: String(productId) }),
        ...(binId && { binId: String(binId) }),
        ...(batchId && { batchId: String(batchId) }),
        ...(branchId && { warehouse: { branchId: String(branchId) } })
      },
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
    });

    res.json(balances);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất tồn kho chi tiết", error: error.message });
  }
};

// ==========================================
// 2. THẺ KHO / LỊCH SỬ GIAO DỊCH KHO (STOCK LEDGER)
// ==========================================
export const getInventoryTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, warehouseId, documentId, startDate, endDate } = req.query;

    const whereCondition: any = {};
    if (productId) whereCondition.productId = String(productId);
    if (documentId) whereCondition.documentId = String(documentId);
    if (warehouseId) {
      // Giao dịch liên quan đến kho này (có thể là nguồn xuất hoặc đích nhập)
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

    const transactions = await prisma.inventoryTransaction.findMany({
      where: whereCondition,
      include: {
        document: { select: { documentNumber: true, type: true, note: true } },
        product: { select: { productCode: true, name: true } },
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        batch: { select: { batchNumber: true } }
      },
      orderBy: { timestamp: 'desc' }
    });

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất thẻ kho", error: error.message });
  }
};

// ==========================================
// 3. ĐIỀU CHỈNH KHO / KIỂM KÊ (STOCK ADJUSTMENT)
// ==========================================
export const adjustStock = async (req: Request, res: Response): Promise<void> => {
  const { branchId, warehouseId, binId, productId, variantId, batchId, adjustQuantity, unitCost, note } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    const qty = Number(adjustQuantity);
    if (qty === 0) {
      res.status(400).json({ message: "Số lượng điều chỉnh không được bằng 0" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Tạo Chứng từ Điều chỉnh (Document)
      const doc = await tx.document.create({
        data: {
          documentNumber: `ADJ-${Date.now()}`,
          branchId,
          type: "ADJUSTMENT",
          status: "COMPLETED", // Điều chỉnh kho thường có hiệu lực ngay
          note: note || "Kiểm kê / Điều chỉnh kho thủ công",
          createdById: userId,
          isLocked: true
        }
      });

      // 2. Lấy số dư hiện tại
      const currentBalance = await tx.inventoryBalance.findUnique({
        where: {
          warehouseId_binId_productId_variantId_batchId: {
            warehouseId,
            binId: binId || null,
            productId,
            variantId: variantId || null,
            batchId: batchId || null
          }
        }
      });

      const qtyBefore = currentBalance?.quantity || 0;
      const qtyAfter = qtyBefore + qty;

      if (qtyAfter < 0) {
        throw new Error(`Kho không đủ tồn để trừ! Tồn hiện tại: ${qtyBefore}`);
      }

      // 3. Xử lý giá trị Tồn kho & Giá vốn
      const cost = Number(unitCost) || Number(currentBalance?.avgCost || 0);
      const totalCostChange = Math.abs(qty) * cost;
      
      let newTotalValue = Number(currentBalance?.totalValue || 0);
      let newAvgCost = Number(currentBalance?.avgCost || 0);

      if (qty > 0) { // Nhập kho (Cộng thêm)
        newTotalValue += totalCostChange;
        newAvgCost = newTotalValue / qtyAfter; // Tính Moving Average mới
      } else { // Xuất kho (Trừ đi)
        newTotalValue -= totalCostChange;
        // Xuất kho thì giữ nguyên giá vốn bình quân (avgCost)
      }

      // 4. Cập nhật hoặc Tạo mới Balance
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
          quantity: qtyAfter, totalValue: newTotalValue, avgCost: newAvgCost
        }
      });

      // 5. Tạo dòng Lịch sử Giao dịch
      const txLine = await tx.inventoryTransaction.create({
        data: {
          documentId: doc.documentId,
          branchId,
          movementDirection: qty > 0 ? "IN" : "OUT",
          fromWarehouseId: qty < 0 ? warehouseId : null,
          toWarehouseId: qty > 0 ? warehouseId : null,
          fromBinId: qty < 0 ? binId || null : null,
          toBinId: qty > 0 ? binId || null : null,
          productId, variantId: variantId || null, batchId: batchId || null,
          quantity: Math.abs(qty),
          quantityBefore: qtyBefore,
          quantityAfter: qtyAfter,
          unitCost: cost,
          movingAvgCost: newAvgCost,
          totalCost: totalCostChange
        }
      });

      return { doc, txLine };
    });

    await logAudit("InventoryTransaction", result.txLine.transactionId, "CREATE", null, result, userId, req.ip);
    res.status(201).json({ message: "Điều chỉnh kho thành công!", result });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi điều chỉnh kho", error: error.message });
  }
};

// ==========================================
// 4. CHUYỂN KHO NỘI BỘ (INTERNAL TRANSFER)
// ==========================================
export const transferStock = async (req: Request, res: Response): Promise<void> => {
  const { branchId, fromWarehouseId, toWarehouseId, note, items } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

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
      // 1. Tạo Document Header
      const doc = await tx.document.create({
        data: {
          documentNumber: `TRF-${Date.now()}`,
          branchId,
          type: "INTERNAL_TRANSFER",
          status: "COMPLETED", 
          note: note || "Chuyển kho nội bộ",
          createdById: userId,
          isLocked: true
        }
      });

      let docTotalAmount = 0;

      // 2. Xử lý từng Item chuyển kho
      for (const item of items) {
        const qty = Number(item.quantity);
        if (qty <= 0) throw new Error("Số lượng chuyển phải lớn hơn 0");

        // --- BƯỚC A: TRỪ KHO XUẤT (SOURCE) ---
        const sourceBalance = await tx.inventoryBalance.findUnique({
          where: {
            warehouseId_binId_productId_variantId_batchId: {
              warehouseId: fromWarehouseId,
              binId: item.fromBinId || null,
              productId: item.productId,
              variantId: item.variantId || null,
              batchId: item.batchId || null
            }
          }
        });

        if (!sourceBalance || sourceBalance.quantity < qty) {
          throw new Error(`Sản phẩm ${item.productId} không đủ tồn kho tại kho xuất! (Tồn: ${sourceBalance?.quantity || 0})`);
        }

        const unitCost = Number(sourceBalance.avgCost);
        const totalLineCost = qty * unitCost;
        docTotalAmount += totalLineCost;

        await tx.inventoryBalance.update({
          where: { balanceId: sourceBalance.balanceId },
          data: {
            quantity: sourceBalance.quantity - qty,
            totalValue: Number(sourceBalance.totalValue) - totalLineCost
          }
        });

        // --- BƯỚC B: CỘNG KHO NHẬP (DESTINATION) ---
        const destBalance = await tx.inventoryBalance.findUnique({
          where: {
            warehouseId_binId_productId_variantId_batchId: {
              warehouseId: toWarehouseId,
              binId: item.toBinId || null,
              productId: item.productId,
              variantId: item.variantId || null,
              batchId: item.batchId || null
            }
          }
        });

        let newDestTotalValue = Number(destBalance?.totalValue || 0) + totalLineCost;
        let newDestQty = (destBalance?.quantity || 0) + qty;
        let newDestAvgCost = newDestTotalValue / newDestQty;

        await tx.inventoryBalance.upsert({
          where: {
            warehouseId_binId_productId_variantId_batchId: {
              warehouseId: toWarehouseId, binId: item.toBinId || null, productId: item.productId, variantId: item.variantId || null, batchId: item.batchId || null
            }
          },
          create: {
            warehouseId: toWarehouseId, binId: item.toBinId || null, productId: item.productId, variantId: item.variantId || null, batchId: item.batchId || null,
            quantity: newDestQty, totalValue: newDestTotalValue, avgCost: newDestAvgCost
          },
          update: {
            quantity: newDestQty, totalValue: newDestTotalValue, avgCost: newDestAvgCost
          }
        });

        // --- BƯỚC C: GHI LỊCH SỬ GIAO DỊCH (TRANSACTION) ---
        // Thiết kế schema cho phép 1 record thể hiện cả from/to cho Transfer
        await tx.inventoryTransaction.create({
          data: {
            documentId: doc.documentId,
            branchId,
            movementDirection: "OUT", // Trong transfer, lấy góc nhìn kho xuất đi
            fromWarehouseId,
            toWarehouseId,
            fromBinId: item.fromBinId || null,
            toBinId: item.toBinId || null,
            productId: item.productId,
            variantId: item.variantId || null,
            batchId: item.batchId || null,
            quantity: qty,
            quantityBefore: sourceBalance.quantity,
            quantityAfter: sourceBalance.quantity - qty,
            unitCost: unitCost,
            movingAvgCost: sourceBalance.avgCost, // Giữ nguyên giá xuất
            totalCost: totalLineCost
          }
        });
      }

      // Cập nhật lại tổng giá trị của lệnh chuyển
      await tx.document.update({
        where: { documentId: doc.documentId },
        data: { totalAmount: docTotalAmount }
      });

      return doc;
    });

    await logAudit("Document (Transfer)", transferDoc.documentId, "CREATE", null, transferDoc, userId, req.ip);
    res.status(201).json({ message: "Chuyển kho nội bộ thành công!", document: transferDoc });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi chuyển kho", error: error.message });
  }
};