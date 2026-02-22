import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search?.toString();
    const products = await prisma.products.findMany({
      where: {
        name: { contains: search, mode: "insensitive" },
      },
      orderBy: { productId: 'desc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving products" });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Hứng ĐẦY ĐỦ các trường từ Frontend
    const { productId, name, price, rating, stockQuantity, baseUnit, largeUnit, conversionRate, imageUrl, purchasePrice, status, category, description, reorderPoint, location } = req.body;
    
    const product = await prisma.products.create({
      data: {
        productId,
        name,
        price,
        rating,
        stockQuantity: stockQuantity || 0,
        baseUnit: baseUnit || "Cái",
        largeUnit: largeUnit || null,
        conversionRate: conversionRate ? parseInt(conversionRate) : 1,
        imageUrl: imageUrl || null,
        // Các trường Tập đoàn
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : 0,
        status: status || "ACTIVE",
        category: category || "",
        description: description || "",
        reorderPoint: reorderPoint ? parseInt(reorderPoint) : 10,
        location: location || "",
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error creating product" });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // 1. Hứng ĐẦY ĐỦ các trường từ Frontend cho hàm UPDATE
    const { name, price, rating, stockQuantity, baseUnit, largeUnit, conversionRate, imageUrl, purchasePrice, status, category, description, reorderPoint, location } = req.body;
    
    const product = await prisma.products.update({
      where: { productId: id },
      data: {
        name,
        price,
        rating,
        stockQuantity,
        baseUnit: baseUnit || "Cái",
        largeUnit: largeUnit || null,
        conversionRate: conversionRate ? parseInt(conversionRate) : 1,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        // Các trường Tập đoàn bắt buộc phải có ở đây
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : 0,
        status: status || "ACTIVE",
        category: category || "",
        description: description || "",
        reorderPoint: reorderPoint ? parseInt(reorderPoint) : 10,
        location: location || "",
      },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Error updating product" });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.products.delete({ where: { productId: id } });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product" });
  }
};