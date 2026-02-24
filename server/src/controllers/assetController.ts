import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. LẤY DANH SÁCH TÀI SẢN
export const getAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const assets = await prisma.assets.findMany({
      orderBy: { purchaseDate: 'desc' },
      include: { warehouse: true } // Kéo theo thông tin Chi nhánh đang giữ tài sản
    });
    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách tài sản." });
  }
};

// 2. THÊM TÀI SẢN MỚI
export const createAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, purchaseDate, purchasePrice, currentValue, status, location, assignedTo, warehouseId } = req.body;

    const newAsset = await prisma.assets.create({
      data: {
        name,
        category,
        purchaseDate: new Date(purchaseDate),
        purchasePrice: Number(purchasePrice),
        currentValue: Number(currentValue || purchasePrice),
        status: status || "ACTIVE",
        location,
        assignedTo,
        warehouseId: warehouseId || null // Lưu ID chi nhánh vào đây
      },
    });
    res.status(201).json({ message: "Đã thêm tài sản thành công!", asset: newAsset });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo tài sản mới." });
  }
};

// 3. XÓA TÀI SẢN
export const deleteAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.assets.delete({ where: { assetId: id } });
    res.status(200).json({ message: "Đã xóa tài sản khỏi hệ thống!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa tài sản." });
  }
};