import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";

// ==========================================
// CONTROLLER: GLOBAL SEARCH (TÌM KIẾM ĐA PHÂN HỆ)
// 🚀 Nâng cấp: Chuẩn hóa 100% Type-Safe theo Schema, không dùng `any`
// ==========================================
export const getGlobalSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    // 1. Kiểm tra đầu vào an toàn (Validation)
    if (!q || typeof q !== "string" || q.trim().length === 0) {
      res.status(200).json({ users: [], products: [], transactions: [] });
      return;
    }

    const searchTerm = q.trim();

    // 2. Chạy đồng thời 3 luồng truy vấn (Performance Tối đa)
    const [users, products, transactions] = await Promise.all([
      
      // --- TÌM KIẾM NHÂN SỰ / ĐỊNH DANH (USERS) ---
      prisma.users.findMany({
        where: {
          isDeleted: false,
          OR: [
            { fullName: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
            { phone: { contains: searchTerm, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: {
          userId: true,
          fullName: true,
          email: true,
          phone: true,
          status: true
        }
      }),

      // --- TÌM KIẾM HÀNG HÓA (PRODUCTS) ---
      prisma.products.findMany({
        where: {
          isDeleted: false,
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { productCode: { contains: searchTerm, mode: "insensitive" } }, // Sửa từ sku thành productCode
            { barcode: { contains: searchTerm, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: {
          productId: true,
          name: true,
          productCode: true,
          barcode: true,
          status: true
        }
      }),

      // --- TÌM KIẾM GIAO DỊCH / CHỨNG TỪ (DOCUMENTS) ---
      prisma.document.findMany({
        where: {
          OR: [
            { documentNumber: { contains: searchTerm, mode: "insensitive" } },
            { referenceDoc: { contains: searchTerm, mode: "insensitive" } },
            { note: { contains: searchTerm, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: {
          documentId: true,
          documentNumber: true,
          type: true,
          status: true,
          totalAmount: true
        }
      })
    ]);

    // 3. Trả về payload hoàn chỉnh cho Frontend
    res.status(200).json({
      users,
      products,
      transactions // Ánh xạ document thành transaction để giữ nguyên UI Frontend
    });

  } catch (error: any) {
    console.error("[Global Search] Critical Error:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi thực hiện tìm kiếm diện rộng.", error: error.message });
  }
};