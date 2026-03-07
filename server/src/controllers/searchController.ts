import { Request, Response } from "express";
import prisma from "../prismaClient"; // Đảm bảo đường dẫn này khớp với file cấu hình Prisma của bạn

// ==========================================
// CONTROLLER: GLOBAL SEARCH (TÌM KIẾM ĐA PHÂN HỆ)
// Thiết kế Defensive: Try-catch từng query để không sập API nếu thiếu bảng
// ==========================================
export const getGlobalSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    // 1. Kiểm tra đầu vào an toàn (Validation)
    if (!q || typeof q !== "string" || q.trim().length === 0) {
      res.status(200).json({ users: [], products: [], transactions: [] });
      return;
    }

    const searchTerm = q.trim();

    // 2. Khởi tạo các mảng kết quả rỗng
    let users: any[] = [];
    let products: any[] = [];
    let transactions: any[] = [];

    // --- TÌM KIẾM NHÂN SỰ / ĐỊNH DANH (USERS) ---
    try {
      if ((prisma as any).users) {
        users = await (prisma as any).users.findMany({
          where: {
            isDeleted: false,
            OR: [
              { fullName: { contains: searchTerm, mode: "insensitive" } },
              { email: { contains: searchTerm, mode: "insensitive" } },
              { phone: { contains: searchTerm, mode: "insensitive" } }
            ]
          },
          take: 5, // Lấy top 5 kết quả tốt nhất
          select: {
            userId: true,
            fullName: true,
            email: true,
            phone: true,
            status: true
          }
        });
      }
    } catch (err: any) {
      console.warn("[Global Search] Lỗi hoặc không tìm thấy bảng Users:", err.message);
    }

    // --- TÌM KIẾM HÀNG HÓA (PRODUCTS) ---
    try {
      // Hỗ trợ cả 2 cách đặt tên schema: 'product' hoặc 'products'
      const productModel = (prisma as any).product || (prisma as any).products;
      if (productModel) {
        products = await productModel.findMany({
          where: {
            isDeleted: false,
            OR: [
              { name: { contains: searchTerm, mode: "insensitive" } },
              { sku: { contains: searchTerm, mode: "insensitive" } }
            ]
          },
          take: 5,
          select: {
            productId: true,
            name: true,
            sku: true,
            stockQuantity: true,
            status: true
          }
        });
      }
    } catch (err: any) {
      console.warn("[Global Search] Lỗi hoặc không tìm thấy bảng Products:", err.message);
    }

    // --- TÌM KIẾM GIAO DỊCH / CHỨNG TỪ (TRANSACTIONS) ---
    try {
      // Hỗ trợ cả 2 cách đặt tên schema: 'transaction' hoặc 'inventoryTransaction'
      if ((prisma as any).transaction) {
        transactions = await (prisma as any).transaction.findMany({
          where: {
            OR: [
              { reference: { contains: searchTerm, mode: "insensitive" } },
              { type: { contains: searchTerm, mode: "insensitive" } }
            ]
          },
          take: 5,
          select: {
            transactionId: true,
            reference: true,
            type: true,
            status: true
          }
        });
      } else if ((prisma as any).inventoryTransaction) {
        const invTrans = await (prisma as any).inventoryTransaction.findMany({
          where: {
            OR: [
              { referenceCode: { contains: searchTerm, mode: "insensitive" } },
              { type: { contains: searchTerm, mode: "insensitive" } }
            ]
          },
          take: 5,
          select: {
            transactionId: true,
            referenceCode: true,
            type: true,
            status: true
          }
        });
        
        // Chuẩn hóa key (Map lại DTO) để Frontend đọc được chung một chuẩn
        transactions = invTrans.map((tx: any) => ({
          transactionId: tx.transactionId,
          reference: tx.referenceCode,
          type: tx.type,
          status: tx.status
        }));
      }
    } catch (err: any) {
      console.warn("[Global Search] Lỗi hoặc không tìm thấy bảng Transactions:", err.message);
    }

    // 3. Trả về payload hoàn chỉnh cho Frontend
    res.status(200).json({
      users,
      products,
      transactions
    });

  } catch (error: any) {
    console.error("[Global Search] Critical Error:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi thực hiện tìm kiếm diện rộng.", error: error.message });
  }
};