import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../utils/auditLogger";

const prisma = new PrismaClient();

// ==========================================
// 1. LẤY DANH SÁCH DANH MỤC TÀI SẢN (GET)
// ==========================================
export const getAssetCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.assetCategory.findMany({
      where: { isDeleted: false },
      include: {
        // Chỉ lấy các trường cần thiết của tài khoản kế toán để tối ưu Payload
        fixedAssetAccount: { select: { accountCode: true, name: true } },
        depreciationAccount: { select: { accountCode: true, name: true } },
        accumDepreciationAccount: { select: { accountCode: true, name: true } }
      },
      orderBy: { code: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy Danh mục Tài sản", error: error.message });
  }
};

// ==========================================
// 2. TẠO MỚI DANH MỤC TÀI SẢN (CREATE)
// ==========================================
export const createAssetCategory = async (req: Request, res: Response): Promise<void> => {
  const { code, name, depreciationRate, fixedAssetAccountId, depreciationAccountId, accumDepreciationAccountId } = req.body;
  // Lấy userId từ Middleware Auth, nếu không có thì fallback lấy từ body
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    const category = await prisma.assetCategory.create({
      data: {
        code, 
        name, 
        depreciationRate: depreciationRate ? Number(depreciationRate) : null,
        fixedAssetAccountId, 
        depreciationAccountId, 
        accumDepreciationAccountId
      }
    });
    await logAudit("AssetCategory", category.categoryId, "CREATE", null, category, userId, req.ip);
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo Danh mục Tài sản (Mã danh mục có thể đã tồn tại)", error: error.message });
  }
};

// ==========================================
// 3. CẬP NHẬT DANH MỤC TÀI SẢN (UPDATE)
// ==========================================
export const updateAssetCategory = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, depreciationRate, fixedAssetAccountId, depreciationAccountId, accumDepreciationAccountId } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    const oldCategory = await prisma.assetCategory.findUnique({ where: { categoryId: id } });
    
    if (!oldCategory || oldCategory.isDeleted) {
      res.status(404).json({ message: "Danh mục tài sản không tồn tại hoặc đã bị xóa!" });
      return;
    }

    const category = await prisma.assetCategory.update({
      where: { categoryId: id },
      data: {
        name,
        depreciationRate: depreciationRate !== undefined ? Number(depreciationRate) : oldCategory.depreciationRate,
        fixedAssetAccountId,
        depreciationAccountId,
        accumDepreciationAccountId
      }
    });

    await logAudit("AssetCategory", id, "UPDATE", oldCategory, category, userId, req.ip);
    res.json({ message: "Cập nhật Danh mục tài sản thành công!", category });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật Danh mục Tài sản", error: error.message });
  }
};

// ==========================================
// 4. XÓA DANH MỤC TÀI SẢN (SOFT DELETE VỚI RÀNG BUỘC)
// ==========================================
export const deleteAssetCategory = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    // RÀNG BUỘC (VALIDATION): Kiểm tra xem có Tài sản nào đang sử dụng Danh mục này không
    const assetsUsing = await prisma.assets.findFirst({
      where: { categoryId: id, isDeleted: false }
    });

    if (assetsUsing) {
      res.status(400).json({ 
        message: "Không thể xóa Danh mục này vì đang có Tài sản tham chiếu đến! Vui lòng chuyển đổi danh mục của các tài sản đó trước." 
      });
      return;
    }

    // Xóa mềm
    await prisma.assetCategory.update({
      where: { categoryId: id },
      data: { isDeleted: true }
    });

    await logAudit("AssetCategory", id, "DELETE", null, { isDeleted: true }, userId, req.ip);
    res.json({ message: "Xóa danh mục tài sản thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa Danh mục Tài sản", error: error.message });
  }
};