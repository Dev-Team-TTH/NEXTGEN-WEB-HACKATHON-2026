import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. LẤY DANH SÁCH GIAO DỊCH (HỖ TRỢ PHÂN TRANG & BỘ LỌC)
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    // Nhận các tham số từ Query String (Frontend gửi lên)
    const { page = "1", limit = "20", type, startDate, endDate, search } = req.query;

    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    // Xây dựng điều kiện lọc (Where Clause)
    const whereCondition: any = {};

    if (type && type !== "ALL") whereCondition.type = type;

    if (startDate || endDate) {
      whereCondition.timestamp = {};
      if (startDate) whereCondition.timestamp.gte = new Date(startDate as string);
      if (endDate) whereCondition.timestamp.lte = new Date(endDate as string);
    }

    if (search) {
      whereCondition.product = {
        name: { contains: search as string, mode: "insensitive" }
      };
    }

    // Chạy song song 2 lệnh: Lấy dữ liệu & Đếm tổng số dòng
    const [transactions, total] = await prisma.$transaction([
      prisma.inventoryTransaction.findMany({
        where: whereCondition,
        skip: skip,
        take: pageSize,
        orderBy: { timestamp: 'desc' },
        include: {
          product: true,
          variant: true,
          batch: true,
        }
      }),
      prisma.inventoryTransaction.count({ where: whereCondition })
    ]);

    // Trả về cấu trúc chuẩn Enterprise
    res.status(200).json({
      data: transactions,
      pagination: {
        total,
        page: pageNumber,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error("Lỗi getTransactions:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách giao dịch" });
  }
};

// 2. TẠO PHIẾU YÊU CẦU (GỘP CHUNG MỌI LOẠI GIAO DỊCH)
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      productId, type, quantity, note, variantId, 
      batchId, newBatchNumber, expiryDate, location, createdBy 
    } = req.body;

    const transaction = await prisma.inventoryTransaction.create({
      data: {
        productId, 
        type, // NHAP_HANG, XUAT_BAN, XUAT_NOI_BO, DIEU_CHINH
        quantity, // Có thể âm hoặc dương
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

// 3. QUẢN LÝ BẤM NÚT DUYỆT (ĐÃ NÂNG CẤP XỬ LÝ ĐA LOẠI HÌNH)
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

      // XÁC ĐỊNH HƯỚNG GIAO DỊCH (TĂNG HAY GIẢM TỒN KHO)
      const isDecrease = ["XUAT_BAN", "XUAT_NOI_BO"].includes(invTx.type) || (invTx.type === "DIEU_CHINH" && invTx.quantity < 0);
      
      // Lấy giá trị tuyệt đối của số lượng để dễ tính toán
      const absoluteQty = Math.abs(invTx.quantity);
      const qtyChange = isDecrease ? -absoluteQty : absoluteQty; // Nếu giảm thì qtyChange mang dấu âm
      
      let finalBatchId = invTx.batchId;

      // ==========================================
      // BƯỚC 1: XỬ LÝ LÔ HÀNG (ProductBatch)
      // ==========================================
      if (!isDecrease && invTx.newBatchNumber) {
        // LUỒNG NHẬP (TĂNG TỒN KHO) - TÌM LÔ THEO SẢN PHẨM & SỐ LÔ 
        const existingBatch = await tx.productBatch.findFirst({
          where: { 
            productId: invTx.productId,
            batchNumber: invTx.newBatchNumber,
            // Sửa lỗi Prisma: Dùng spread operator để chèn variantId an toàn
            ...(invTx.variantId ? { variantId: invTx.variantId } : {})
          }
        });

        if (existingBatch) {
          finalBatchId = existingBatch.batchId;
          await tx.productBatch.update({
            where: { batchId: existingBatch.batchId },
            data: { stockQuantity: { increment: absoluteQty } }
          });
        } else {
          const newBatch = await tx.productBatch.create({
            data: {
              batchNumber: invTx.newBatchNumber,
              productId: invTx.productId,
              expiryDate: invTx.expiryDate || new Date(),
              stockQuantity: absoluteQty,
              // Sửa lỗi Prisma: Dùng spread operator để chèn variantId an toàn
              ...(invTx.variantId ? { variantId: invTx.variantId } : {})
            }
          });
          finalBatchId = newBatch.batchId;
        }
      } else if (isDecrease && finalBatchId) {
        // LUỒNG XUẤT (GIẢM TỒN KHO)
        const batch = await tx.productBatch.findUnique({ where: { batchId: finalBatchId } });
        if (!batch || batch.stockQuantity < absoluteQty) {
          throw new Error(`Kho không đủ số lượng lô ${batch?.batchNumber || ''} để xuất/giảm!`);
        }
        await tx.productBatch.update({
          where: { batchId: finalBatchId },
          data: { stockQuantity: { increment: qtyChange } } // qtyChange lúc này là số âm
        });
      }

      // ==========================================
      // BƯỚC 2: CẬP NHẬT TỒN KHO TỔNG CỦA HỆ THỐNG
      // ==========================================
      if (invTx.variantId) {
        if (isDecrease) {
          const variant = await tx.productVariant.findUnique({ where: { variantId: invTx.variantId } });
          if (!variant || variant.stockQuantity < absoluteQty) throw new Error("Biến thể tổng không đủ hàng");
        }
        await tx.productVariant.update({
          where: { variantId: invTx.variantId },
          data: { stockQuantity: { increment: qtyChange } }
        });
      }

      if (isDecrease) {
        const product = await tx.products.findUnique({ where: { productId: invTx.productId } });
        if (!product || product.stockQuantity < absoluteQty) throw new Error("Sản phẩm tổng không đủ hàng");
      }
      
      await tx.products.update({
        where: { productId: invTx.productId },
        data: { stockQuantity: { increment: qtyChange } }
      });

      // ==========================================
      // BƯỚC 3: ĐỔI TRẠNG THÁI PHIẾU THÀNH COMPLETED
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