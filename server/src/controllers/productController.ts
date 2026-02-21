import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const search = req.query.search?.toString();
    const products = await prisma.products.findMany({
      where: {
        name: {
          contains: search,
          mode: "insensitive", // [NÂNG CẤP] Tìm kiếm thông minh không phân biệt hoa thường
        },
      },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving products" });
  }
};

export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, name, price, rating, stockQuantity } = req.body;
    const product = await prisma.products.create({
      data: {
        productId,
        name,
        price,
        rating,
        stockQuantity,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error creating product" });
  }
};

// [MỚI] CẬP NHẬT SẢN PHẨM (UPDATE)
export const updateProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, price, rating, stockQuantity } = req.body;
    const product = await prisma.products.update({
      where: {
        productId: id,
      },
      data: {
        name,
        price,
        rating,
        stockQuantity,
      },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Error updating product" });
  }
};

// [MỚI] XÓA SẢN PHẨM (DELETE)
export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.products.delete({
      where: {
        productId: id,
      },
    });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product" });
  }
};