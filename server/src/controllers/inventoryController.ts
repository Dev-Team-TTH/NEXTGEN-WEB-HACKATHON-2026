import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. LẤY DANH SÁCH GIAO DỊCH (KÈM THÔNG TIN SẢN PHẨM, LÔ, BIẾN THỂ)
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        product: true,
        variant: true,
        batch: true
      }
    });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách giao dịch" });
  }
};

// 2. THỦ KHO TẠO PHIẾU YÊU CẦU (Chưa trừ/cộng kho)
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      productId, type, quantity, note, variantId, 
      batchId, newBatchNumber, expiryDate, location, createdBy 
    } = req.body;

    const transaction = await prisma.inventoryTransaction.create({
      data: {
        productId, type, quantity,
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
    res.status(500).json({ message: "Lỗi tạo phiếu giao dịch" });
  }
};

// 3. KẾ TOÁN KHO / QUẢN LÝ BẤM NÚT DUYỆT
export const approveTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const tx = await prisma.inventoryTransaction.findUnique({ where: { transactionId: id } });
    if (!tx || tx.status !== "PENDING") {
      res.status(400).json({ message: "Phiếu không tồn tại hoặc đã được xử lý" });
      return;
    }

    const queries: any[] = [];
    const qtyChange = tx.type === "IN" ? tx.quantity : -tx.quantity;
    let finalBatchId = tx.batchId;

    if (tx.type === "IN" && tx.newBatchNumber && tx.variantId) {
      const existingBatch = await prisma.productBatch.findUnique({
        where: { variantId_batchNumber: { variantId: tx.variantId, batchNumber: tx.newBatchNumber } }
      });

      if (existingBatch) {
        finalBatchId = existingBatch.batchId;
        queries.push(prisma.productBatch.update({
          where: { batchId: existingBatch.batchId },
          data: { stockQuantity: { increment: tx.quantity } }
        }));
      } else {
        const newBatch = await prisma.productBatch.create({
          data: {
            batchNumber: tx.newBatchNumber,
            productId: tx.productId,
            variantId: tx.variantId,
            expiryDate: tx.expiryDate || new Date(),
            stockQuantity: tx.quantity
          }
        });
        finalBatchId = newBatch.batchId;
      }
    } else if (tx.type === "OUT" && finalBatchId) {
      queries.push(prisma.productBatch.update({
        where: { batchId: finalBatchId },
        data: { stockQuantity: { increment: qtyChange } }
      }));
    }

    if (tx.variantId) {
      queries.push(prisma.productVariant.update({
        where: { variantId: tx.variantId },
        data: { stockQuantity: { increment: qtyChange } }
      }));
    }

    queries.push(prisma.products.update({
      where: { productId: tx.productId },
      data: { stockQuantity: { increment: qtyChange } }
    }));

    queries.push(prisma.inventoryTransaction.update({
      where: { transactionId: tx.transactionId },
      data: { status: "COMPLETED", approvedBy: approvedBy || "QuanLy_01", approvedAt: new Date(), batchId: finalBatchId }
    }));

    await prisma.$transaction(queries);
    res.status(200).json({ message: "Duyệt phiếu thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi duyệt phiếu" });
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