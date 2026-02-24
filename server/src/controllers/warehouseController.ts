import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. LẤY DANH SÁCH TẤT CẢ CÁC KHO
export const getWarehouses = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: 'asc' }
    });
    res.status(200).json(warehouses);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách kho." });
  }
};

// 2. TẠO KHO MỚI (Dành cho Admin khi mở chi nhánh)
export const createWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address } = req.body;
    const newWarehouse = await prisma.warehouse.create({
      data: { name, address }
    });
    res.status(201).json({ message: "Đã thêm kho mới thành công!", warehouse: newWarehouse });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo kho mới." });
  }
};

// 3. XÓA KHO (Cẩn thận: Cần check xem kho có đang chứa hàng không)
export const deleteWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Đã sửa { >: 0 } thành { gt: 0 }
    const stockCount = await prisma.warehouseStock.count({ 
      where: { 
        warehouseId: id, 
        quantity: { gt: 0 } 
      } 
    });
    
    if (stockCount > 0) {
      res.status(400).json({ message: "Không thể xóa kho đang có chứa hàng hóa!" });
      return;
    }

    await prisma.warehouse.delete({ where: { warehouseId: id } });
    res.status(200).json({ message: "Đã đóng/xóa kho thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa kho." });
  }
};

// 4. CẬP NHẬT THÔNG TIN KHO
export const updateWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;

    const updatedWarehouse = await prisma.warehouse.update({
      where: { warehouseId: id },
      data: { name, address },
    });

    res.status(200).json({ message: "Cập nhật kho thành công!", warehouse: updatedWarehouse });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật kho." });
  }
};