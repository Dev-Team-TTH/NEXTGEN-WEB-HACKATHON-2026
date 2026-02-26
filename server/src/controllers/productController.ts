import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// LẤY DANH SÁCH SẢN PHẨM
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search?.toString();
    const products = await prisma.products.findMany({
      where: { name: { contains: search, mode: "insensitive" } },
      include: { Variants: true, Batches: { orderBy: { expiryDate: 'asc' } } },
      orderBy: { productId: 'desc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving products" });
  }
};

// TẠO MASTER DATA MỚI
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  // ... (Nội dung phần này giữ nguyên như cũ, tôi rút gọn ở đây để bạn dễ nhìn)
  // TRONG FILE BẠN PASTE NHỚ GIỮ LẠI CODE CỦA HÀM NÀY NHÉ!
  try {
    const { productId, name, price, rating, stockQuantity, baseUnit, largeUnit, conversionRate, imageUrl, purchasePrice, status, category, description, reorderPoint, hasVariants, hasBatches, variants, batches } = req.body;
    const product = await prisma.products.create({
      data: {
        productId, name, price, rating, stockQuantity: stockQuantity || 0,
        baseUnit: baseUnit || "Cái", largeUnit: largeUnit || null,
        conversionRate: conversionRate ? parseInt(conversionRate) : 1,
        imageUrl: imageUrl || null, purchasePrice: purchasePrice ? parseFloat(purchasePrice) : 0,
        status: status || "ACTIVE", category: category || "", description: description || "", 
        reorderPoint: reorderPoint ? parseInt(reorderPoint) : 10,
        hasVariants: hasVariants || false, hasBatches: hasBatches || false,
        Variants: hasVariants && variants && variants.length > 0 ? { create: variants.map((v: any) => ({ sku: v.sku, attributes: v.attributes, additionalPrice: v.additionalPrice || 0, stockQuantity: v.stockQuantity || 0 })) } : undefined,
        Batches: hasBatches && batches && batches.length > 0 ? { create: batches.map((b: any) => ({ batchNumber: b.batchNumber, manufactureDate: b.manufactureDate ? new Date(b.manufactureDate) : null, expiryDate: new Date(b.expiryDate), stockQuantity: b.stockQuantity || 0, variantId: b.variantId || null })) } : undefined
      },
      include: { Variants: true, Batches: true } 
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error creating product" });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    await prisma.products.delete({ where: { productId } });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product" });
  }
};

// =====================================================================
// NÂNG CẤP MÔ HÌNH ENTERPRISE: QUẢN LÝ YÊU CẦU THAY ĐỔI MASTER DATA
// =====================================================================

// 1. NGƯỜI DÙNG SUBMIT FORM EDIT -> TẠO PHIẾU YÊU CẦU
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { name, price, purchasePrice, status, category, description, imageUrl, reorderPoint } = req.body;

    const existingProduct = await prisma.products.findUnique({ where: { productId } });
    if (!existingProduct) {
      res.status(404).json({ message: "Không tìm thấy sản phẩm" }); return;
    }

    // TẠO PHIẾU YÊU CẦU VÀO BẢNG MasterDataRequest
    const request = await prisma.masterDataRequest.create({
      data: {
        productId,
        requestedBy: "Thủ Kho", // Ở thực tế lấy từ auth token
        newName: name,
        newPrice: price !== undefined ? Number(price) : null,
        newPurchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : null,
        newCategory: category || null,
        newDescription: description || null,
        newStatus: status || null,
        newImageUrl: imageUrl || null,
        newReorderPoint: reorderPoint !== undefined ? Number(reorderPoint) : null,
      }
    });

    res.status(201).json({ message: "Đã gửi yêu cầu phê duyệt thành công!", request });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi server khi tạo yêu cầu", error: error.message });
  }
};

// 2. LẤY DANH SÁCH CÁC PHIẾU YÊU CẦU ĐỂ QUẢN LÝ DUYỆT
export const getMasterDataRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await prisma.masterDataRequest.findMany({
      include: { product: true },
      orderBy: { timestamp: 'desc' }
    });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách yêu cầu" });
  }
};

// 3. QUẢN LÝ BẤM DUYỆT -> GHI ĐÈ DỮ LIỆU MỚI VÀO SẢN PHẨM
export const approveMasterData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    await prisma.$transaction(async (tx) => {
      const request = await tx.masterDataRequest.findUnique({ where: { requestId: id } });
      if (!request || request.status !== "PENDING") throw new Error("Yêu cầu không hợp lệ hoặc đã được xử lý!");

      // Chuẩn bị dữ liệu ghi đè
      const updateData: any = {};
      if (request.newName !== null) updateData.name = request.newName;
      if (request.newPrice !== null) updateData.price = request.newPrice;
      if (request.newPurchasePrice !== null) updateData.purchasePrice = request.newPurchasePrice;
      if (request.newCategory !== null) updateData.category = request.newCategory;
      if (request.newDescription !== null) updateData.description = request.newDescription;
      if (request.newStatus !== null) updateData.status = request.newStatus;
      if (request.newImageUrl !== null) updateData.imageUrl = request.newImageUrl;
      if (request.newReorderPoint !== null) updateData.reorderPoint = request.newReorderPoint;

      // 1. Cập nhật vào bảng Products
      await tx.products.update({
        where: { productId: request.productId },
        data: updateData
      });

      // 2. Chuyển trạng thái phiếu thành APPROVED
      await tx.masterDataRequest.update({
        where: { requestId: id },
        data: { status: "APPROVED", approvedBy: approvedBy || "Giám Đốc", approvedAt: new Date() }
      });
    });

    res.status(200).json({ message: "Đã duyệt và cập nhật Master Data!" });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Lỗi khi duyệt" });
  }
};

// 4. QUẢN LÝ TỪ CHỐI
export const rejectMasterData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    await prisma.masterDataRequest.update({
      where: { requestId: id },
      data: { status: "REJECTED", approvedBy: approvedBy || "Giám Đốc", approvedAt: new Date() }
    });

    res.status(200).json({ message: "Đã từ chối yêu cầu!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi từ chối" });
  }
};