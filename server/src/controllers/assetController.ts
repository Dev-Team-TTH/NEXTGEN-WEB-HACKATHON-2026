import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. Lấy danh sách tài sản
export const getAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search?.toString();
    const assets = await prisma.assets.findMany({
      where: {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      orderBy: { purchaseDate: 'desc' }
    });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách tài sản" });
  }
};

// 2. Thêm tài sản mới
export const createAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, status, assignedTo, purchaseDate, price } = req.body;
    const asset = await prisma.assets.create({
      data: {
        name,
        category,
        status,
        assignedTo,
        purchaseDate: new Date(purchaseDate),
        price,
      },
    });
    res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo tài sản mới" });
  }
};

// 3. Xóa tài sản
export const deleteAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.assets.delete({
      where: { assetId: id },
    });
    res.json({ message: "Đã xóa tài sản thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa tài sản" });
  }
};