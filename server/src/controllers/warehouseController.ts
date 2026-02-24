import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. LẤY DANH SÁCH CHI NHÁNH (KÈM THỐNG KÊ NHÂN SỰ & TÀI SẢN)
export const getWarehouses = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        // Prisma siêu việt ở chỗ này: Tự động đếm số lượng bản ghi con!
        _count: {
          select: { 
            users: true,   // Đếm số nhân viên thuộc chi nhánh này
            assets: true,  // Đếm số tài sản thuộc chi nhánh này
          }
        }
      }
    });
    res.status(200).json(warehouses);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách chi nhánh." });
  }
};

// 2. TẠO CHI NHÁNH MỚI
export const createWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address } = req.body;
    const newWarehouse = await prisma.warehouse.create({
      data: { name, address },
    });
    res.status(201).json({ message: "Tạo chi nhánh thành công!", warehouse: newWarehouse });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo chi nhánh mới." });
  }
};

// 3. CẬP NHẬT THÔNG TIN CHI NHÁNH
export const updateWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;

    const updatedWarehouse = await prisma.warehouse.update({
      where: { warehouseId: id },
      data: { name, address },
    });

    res.status(200).json({ message: "Cập nhật chi nhánh thành công!", warehouse: updatedWarehouse });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật chi nhánh." });
  }
};

// 4. XÓA CHI NHÁNH
export const deleteWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Lưu ý thực tế: Phải kiểm tra xem chi nhánh có còn hàng/người không mới cho xóa. 
    // Ở đây ta cứ làm thao tác xóa cơ bản trước.
    await prisma.warehouse.delete({
      where: { warehouseId: id },
    });

    res.status(200).json({ message: "Đã xóa chi nhánh thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa chi nhánh." });
  }
};

// 5. LẤY CHI TIẾT 1 CHI NHÁNH (KÈM DANH SÁCH NHÂN VIÊN & TÀI SẢN)
export const getWarehouseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const warehouse = await prisma.warehouse.findUnique({
      where: { warehouseId: id },
      include: {
        users: true,   
        assets: true,  
        // 👇 THÊM ĐOẠN NÀY ĐỂ KÉO DỮ LIỆU SẢN PHẨM TỒN KHO:
        stocks: {
          include: {
            product: true // Lấy luôn tên và giá của sản phẩm đó
          }
        }
      }
    });

    if (!warehouse) {
      res.status(404).json({ message: "Không tìm thấy chi nhánh!" });
      return;
    }

    res.status(200).json(warehouse);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin chi tiết chi nhánh." });
  }
};