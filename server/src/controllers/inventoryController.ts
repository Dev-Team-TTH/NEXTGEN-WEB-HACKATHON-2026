import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. LẤY DANH SÁCH GIAO DỊCH
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        product: true,
        variant: true,
        batch: true,
        warehouse: true // Bổ sung lấy tên Kho
      }
    });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách giao dịch" });
  }
};

// 2. THỦ KHO TẠO PHIẾU YÊU CẦU
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      productId, type, quantity, note, variantId, 
      batchId, newBatchNumber, expiryDate, location, createdBy,
      warehouseId // Bắt buộc phải có ID Kho gửi lên từ Frontend
    } = req.body;

    if (!warehouseId) {
      res.status(400).json({ message: "Thiếu thông tin Kho (warehouseId)!" });
      return;
    }

    const transaction = await prisma.inventoryTransaction.create({
      data: {
        productId, 
        warehouseId, // Đã bổ sung warehouseId vào đây để hết lỗi đỏ
        type, 
        quantity,
        note: note || "",
        variantId: variantId || null,
        batchId: batchId || null,
        newBatchNumber: newBatchNumber || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        location: location || null,
        createdBy: createdBy || "ThuKho_01",
        status: "PENDING"
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi tạo phiếu giao dịch" });
  }
};

// 3. QUẢN LÝ BẤM NÚT DUYỆT (ĐÃ NÂNG CẤP ĐA KHO & INTERACTIVE TRANSACTION)
export const approveTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    // Dùng Interactive Transaction để bọc toàn bộ quy trình duyệt
    await prisma.$transaction(async (tx) => {
      const invTx = await tx.inventoryTransaction.findUnique({ where: { transactionId: id } });
      if (!invTx || invTx.status !== "PENDING") {
        throw new Error("Phiếu không tồn tại hoặc đã được xử lý");
      }

      const isOut = invTx.type === "OUT";
      const qtyChange = isOut ? -invTx.quantity : invTx.quantity;
      let finalBatchId = invTx.batchId;

      // ==========================================
      // BƯỚC 1: XỬ LÝ LÔ HÀNG (ProductBatch)
      // ==========================================
      if (!isOut && invTx.newBatchNumber && invTx.variantId) {
        const existingBatch = await tx.productBatch.findUnique({
          where: { variantId_batchNumber: { variantId: invTx.variantId, batchNumber: invTx.newBatchNumber } }
        });

        if (existingBatch) {
          finalBatchId = existingBatch.batchId;
          await tx.productBatch.update({
            where: { batchId: existingBatch.batchId },
            data: { stockQuantity: { increment: invTx.quantity } }
          });
        } else {
          const newBatch = await tx.productBatch.create({
            data: {
              batchNumber: invTx.newBatchNumber,
              productId: invTx.productId,
              variantId: invTx.variantId,
              expiryDate: invTx.expiryDate || new Date(),
              stockQuantity: invTx.quantity
            }
          });
          finalBatchId = newBatch.batchId;
        }
      } else if (isOut && finalBatchId) {
        const batch = await tx.productBatch.findUnique({ where: { batchId: finalBatchId } });
        if (!batch || batch.stockQuantity < invTx.quantity) {
          throw new Error(`Hệ thống tổng không đủ số lượng lô ${batch?.batchNumber || ''} để xuất`);
        }
        await tx.productBatch.update({
          where: { batchId: finalBatchId },
          data: { stockQuantity: { increment: qtyChange } }
        });
      }

      // ==========================================
      // BƯỚC 2: XỬ LÝ TỒN KHO TẠI CHI NHÁNH NÀY (WarehouseStock)
      // ==========================================
      const existingStock = await tx.warehouseStock.findFirst({
        where: {
          warehouseId: invTx.warehouseId,
          productId: invTx.productId,
          variantId: invTx.variantId,
          batchId: finalBatchId,
        }
      });

      if (isOut) {
        if (!existingStock || existingStock.quantity < invTx.quantity) {
          throw new Error("Kho hiện tại của bạn không đủ hàng để xuất!");
        }
        await tx.warehouseStock.update({
          where: { id: existingStock.id },
          data: { quantity: { increment: qtyChange } }
        });
      } else {
        if (existingStock) {
          await tx.warehouseStock.update({
            where: { id: existingStock.id },
            data: { quantity: { increment: qtyChange } }
          });
        } else {
          await tx.warehouseStock.create({
            data: {
              warehouseId: invTx.warehouseId,
              productId: invTx.productId,
              variantId: invTx.variantId,
              batchId: finalBatchId,
              quantity: invTx.quantity
            }
          });
        }
      }

      // ==========================================
      // BƯỚC 3 & 4: CẬP NHẬT TỒN KHO TỔNG (ĐỂ BÁO CÁO NHANH CHO ADMIN)
      // ==========================================
      if (invTx.variantId) {
        if (isOut) {
          const variant = await tx.productVariant.findUnique({ where: { variantId: invTx.variantId } });
          if (!variant || variant.stockQuantity < invTx.quantity) throw new Error("Biến thể tổng không đủ hàng");
        }
        await tx.productVariant.update({
          where: { variantId: invTx.variantId },
          data: { stockQuantity: { increment: qtyChange } }
        });
      }

      if (isOut) {
        const product = await tx.products.findUnique({ where: { productId: invTx.productId } });
        if (!product || product.stockQuantity < invTx.quantity) throw new Error("Sản phẩm tổng không đủ hàng");
      }
      await tx.products.update({
        where: { productId: invTx.productId },
        data: { stockQuantity: { increment: qtyChange } }
      });

      // ==========================================
      // BƯỚC 5: ĐỔI TRẠNG THÁI PHIẾU
      // ==========================================
      await tx.inventoryTransaction.update({
        where: { transactionId: invTx.transactionId },
        data: { 
          status: "COMPLETED", 
          approvedBy: approvedBy || "QuanLy_01", 
          approvedAt: new Date(), 
          batchId: finalBatchId 
        }
      });
    });

    res.status(200).json({ message: "Duyệt phiếu thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Lỗi hệ thống khi duyệt phiếu" });
  }
};

// 4. TỪ CHỐI PHIẾU (Hủy bỏ)
export const rejectTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const tx = await prisma.inventoryTransaction.findUnique({ where: { transactionId: id } });
    if (!tx || tx.status !== "PENDING") {
      res.status(400).json({ message: "Phiếu không tồn tại hoặc đã được xử lý" });
      return;
    }

    await prisma.inventoryTransaction.update({
      where: { transactionId: id },
      data: { status: "REJECTED", approvedBy: approvedBy || "QuanLy_01", approvedAt: new Date() }
    });

    res.status(200).json({ message: "Đã từ chối phiếu!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi từ chối phiếu" });
  }
};