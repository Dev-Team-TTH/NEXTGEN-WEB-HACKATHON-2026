import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createTransaction = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, type, quantity, note } = req.body;

    // 1. Kiểm tra đầu vào hợp lệ
    if (!productId || !type || quantity <= 0) {
      res.status(400).json({ message: "Dữ liệu đầu vào không hợp lệ" });
      return;
    }

    // 2. Sử dụng Prisma Transaction để đảm bảo tính toàn vẹn dữ liệu (Atomic)
    const result = await prisma.$transaction(async (tx) => {
      // B2.1: Lấy thông tin sản phẩm hiện tại
      const product = await tx.products.findUnique({
        where: { productId },
      });

      if (!product) {
        throw new Error("Sản phẩm không tồn tại");
      }

      // Kiểm tra xem số lượng xuất có vượt quá tồn kho không (Double Check ở Backend)
      if (type === "OUT" && product.stockQuantity < quantity) {
        throw new Error("Số lượng xuất vượt quá tồn kho hiện tại");
      }

      // B2.2: Tạo bản ghi Lịch sử giao dịch (InventoryTransaction)
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          type,
          quantity,
          note,
        },
      });

      // B2.3: Cập nhật lại số lượng Tồn kho trong bảng Products
      const updatedProduct = await tx.products.update({
        where: { productId },
        data: {
          stockQuantity:
            type === "IN"
              ? { increment: quantity } // Nếu NHẬP -> Cộng thêm
              : { decrement: quantity }, // Nếu XUẤT -> Trừ đi
        },
      });

      return { transaction, updatedProduct };
    });

    // Trả về kết quả thành công
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Lỗi giao dịch kho:", error);
    res.status(500).json({ message: error.message || "Lỗi khi thực hiện giao dịch kho" });
  }
};