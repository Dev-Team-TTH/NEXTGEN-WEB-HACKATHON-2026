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
      // Kéo theo toàn bộ dữ liệu Biến thể và Lô hàng
      include: {
        Variants: true,
        Batches: {
          orderBy: { expiryDate: 'asc' } // Sắp xếp Lô hàng ưu tiên FEFO (Gần hết hạn lên đầu)
        }
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
    const { 
      productId, name, price, rating, stockQuantity, baseUnit, largeUnit, conversionRate, imageUrl, 
      purchasePrice, status, category, description, reorderPoint, 
      hasVariants, hasBatches, variants, batches // Đã gỡ bỏ biến location ở đây
    } = req.body;
    
    const product = await prisma.products.create({
      data: {
        productId, name, price, rating, 
        stockQuantity: stockQuantity || 0,
        baseUnit: baseUnit || "Cái", largeUnit: largeUnit || null,
        conversionRate: conversionRate ? parseInt(conversionRate) : 1,
        imageUrl: imageUrl || null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : 0,
        status: status || "ACTIVE", category: category || "",
        description: description || "", reorderPoint: reorderPoint ? parseInt(reorderPoint) : 10,
        // Đã gỡ bỏ dòng: location: location || "",
        hasVariants: hasVariants || false,
        hasBatches: hasBatches || false,
        
        // Tạo tự động Biến thể nếu có
        Variants: hasVariants && variants && variants.length > 0 ? {
          create: variants.map((v: any) => ({
            sku: v.sku,
            attributes: v.attributes,
            additionalPrice: v.additionalPrice || 0,
            stockQuantity: v.stockQuantity || 0
          }))
        } : undefined,

        // Tạo tự động Lô hàng nếu có (Dành cho việc sau này nếu cần thiết khởi tạo nhanh)
        Batches: hasBatches && batches && batches.length > 0 ? {
          create: batches.map((b: any) => ({
            batchNumber: b.batchNumber,
            manufactureDate: b.manufactureDate ? new Date(b.manufactureDate) : null,
            expiryDate: new Date(b.expiryDate),
            stockQuantity: b.stockQuantity || 0,
            variantId: b.variantId || null
          }))
        } : undefined
      },
      include: { Variants: true, Batches: true } 
    });

    res.status(201).json(product);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error creating product with variants/batches" });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    
    // Hứng dữ liệu từ Frontend gửi lên
    const { 
      name, price, rating, baseUnit, largeUnit, conversionRate, imageUrl, 
      purchasePrice, status, category, description, reorderPoint,
      hasVariants, hasBatches 
    } = req.body;

    // 1. Kiểm tra xem sản phẩm có tồn tại trong Database không
    const existingProduct = await prisma.products.findUnique({
      where: { productId }
    });

    if (!existingProduct) {
      res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      return;
    }

    // 2. Cập nhật dữ liệu với kiểu dữ liệu được ép ép buộc (Tránh lỗi 500)
    const updatedProduct = await prisma.products.update({
      where: { productId },
      data: {
        name, 
        price: price !== undefined ? Number(price) : undefined, 
        rating: rating !== undefined ? Number(rating) : undefined, 
        baseUnit, 
        largeUnit: largeUnit || null,
        conversionRate: conversionRate !== undefined ? Number(conversionRate) : 1,
        imageUrl: imageUrl || null,
        purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : 0,
        status, 
        category: category || "", 
        description: description || "", 
        reorderPoint: reorderPoint !== undefined ? Number(reorderPoint) : 10,
        hasVariants: hasVariants !== undefined ? Boolean(hasVariants) : undefined, 
        hasBatches: hasBatches !== undefined ? Boolean(hasBatches) : undefined
      }
    });

    res.status(200).json(updatedProduct);
  } catch (error: any) {
    // 3. In log đỏ ra Terminal để dễ dàng bắt bệnh nếu còn lỗi
    console.error("❌ LỖI CẬP NHẬT MASTER DATA:", error.message || error);
    res.status(500).json({ message: "Lỗi server khi cập nhật sản phẩm", error: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    await prisma.products.delete({
      where: { productId }
    });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product" });
  }
};