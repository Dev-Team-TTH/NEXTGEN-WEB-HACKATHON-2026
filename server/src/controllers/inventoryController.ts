import { Request, Response } from "express";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";


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
        await tx.inventoryTransaction.create({
          data: {
            documentId: doc.documentId,
            branchId,
            movementDirection: "OUT", 
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
            movingAvgCost: sourceBalance.avgCost, 
            totalCost: totalLineCost
          }
        });
      }

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

// ==========================================
// [TÍNH NĂNG MỚI] 5. THUẬT TOÁN TỰ ĐỘNG NHẶT HÀNG (FIFO / FEFO)
// ==========================================
export const autoPickStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouseId, productId, variantId, requiredQuantity } = req.body;
    const qtyNeeded = Number(requiredQuantity);

    if (!warehouseId || !productId || qtyNeeded <= 0) {
      res.status(400).json({ message: "Vui lòng cung cấp kho, sản phẩm và số lượng cần nhặt hợp lệ (> 0)." });
      return;
    }

    // 1. Kiểm tra cấu hình Sản phẩm để chọn chiến lược (FEFO hay FIFO)
    const product = await prisma.products.findUnique({
      where: { productId: String(productId) },
      select: { hasBatches: true, name: true, productCode: true }
    });

    if (!product) {
      res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
      return;
    }

    // 2. Quét tất cả tồn kho của sản phẩm này tại Kho chỉ định
    const availableBalances = await prisma.inventoryBalance.findMany({
      where: {
        warehouseId: String(warehouseId),
        productId: String(productId),
        ...(variantId && { variantId: String(variantId) }),
        quantity: { gt: 0 } // Chỉ lấy dòng có hàng
      },
      include: {
        batch: true,
        bin: true
      }
    });

    // 3. Tính toán Hàng khả dụng thực tế (Trừ đi lượng đang bị giam/khóa bởi đơn khác)
    const validBalances = availableBalances.filter(b => (b.quantity - b.lockedQty) > 0);

    if (validBalances.length === 0) {
      res.status(400).json({ message: `Sản phẩm ${product.name} đã hết hàng khả dụng trong kho này!` });
      return;
    }

    // 4. CHẠY THUẬT TOÁN SẮP XẾP ƯU TIÊN (SORT)
    validBalances.sort((a, b) => {
      if (product.hasBatches) {
        // [CHIẾN LƯỢC FEFO] - First Expire First Out (Ưu tiên xuất lô sắp hết hạn trước)
        const dateA = a.batch?.expiryDate ? new Date(a.batch.expiryDate).getTime() : Infinity;
        const dateB = b.batch?.expiryDate ? new Date(b.batch.expiryDate).getTime() : Infinity;
        
        if (dateA !== dateB) return dateA - dateB;
        
        // Nếu ngày hết hạn giống nhau, xét đến Ngày sản xuất (Cũ hơn xuất trước)
        const mfgA = a.batch?.manufactureDate ? new Date(a.batch.manufactureDate).getTime() : Infinity;
        const mfgB = b.batch?.manufactureDate ? new Date(b.batch.manufactureDate).getTime() : Infinity;
        return mfgA - mfgB;
      } else {
        // [CHIẾN LƯỢC FIFO] - Basic (Ưu tiên lấy ở kệ có số lượng ít để tối ưu không gian, hoặc theo Tên kệ)
        // Lưu ý: Trong WMS nâng cao, FIFO có thể dựa vào ngày nhập kệ (nếu có lưu timestamp).
        // Ở đây ta ưu tiên lấy sạch những kệ có ít hàng trước để dọn kho.
        const availA = a.quantity - a.lockedQty;
        const availB = b.quantity - b.lockedQty;
        if (availA !== availB) return availA - availB;

        const binA = a.bin?.code || "";
        const binB = b.bin?.code || "";
        return binA.localeCompare(binB);
      }
    });

    // 5. THỰC THI NHẶT HÀNG (ALLOCATION ROUTINE)
    let remainingToPick = qtyNeeded;
    const picks = [];

    for (const bal of validBalances) {
      if (remainingToPick <= 0) break;

      const availableQty = bal.quantity - bal.lockedQty;
      const pickQty = Math.min(availableQty, remainingToPick);

      picks.push({
        balanceId: bal.balanceId,
        warehouseId: bal.warehouseId,
        productId: bal.productId,
        variantId: bal.variantId,
        binId: bal.binId,
        binCode: bal.bin?.code || "Mặc định",
        batchId: bal.batchId,
        batchNumber: bal.batch?.batchNumber || null,
        expiryDate: bal.batch?.expiryDate || null,
        availableQty: availableQty,
        quantity: pickQty, // Đây là quantity sẽ map vào transaction
        unitCost: bal.avgCost
      });

      remainingToPick -= pickQty;
    }

    // 6. Trả kết quả
    if (remainingToPick > 0) {
      res.status(400).json({ 
        message: `Cảnh báo: Kho không đủ hàng! Bạn yêu cầu ${qtyNeeded}, nhưng hệ thống chỉ gom được ${qtyNeeded - remainingToPick} sản phẩm.`,
        isFulfilled: false,
        shortage: remainingToPick,
        picks
      });
      return;
    }

    res.json({
      message: `Đã tự động nhặt thành công ${qtyNeeded} sản phẩm theo quy tắc ${product.hasBatches ? 'FEFO' : 'FIFO'}!`,
      isFulfilled: true,
      totalPicked: qtyNeeded,
      picks
    });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi thuật toán tự động nhặt hàng", error: error.message });
  }
};