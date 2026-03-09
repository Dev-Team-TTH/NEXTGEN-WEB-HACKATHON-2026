import { Request, Response } from "express";
import { ActionType, UserStatus } from "@prisma/client";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";

const getUserId = (req: Request) => (req as any).user?.userId || req.body?.userId;

// ==========================================
// 1. PRODUCTS (SẢN PHẨM CHÍNH) - NÂNG CẤP SERVER-SIDE PAGINATION
// ==========================================
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, categoryId, status, page = 1, limit = 10 } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const whereCondition: any = {
      isDeleted: false,
    };

    if (categoryId) whereCondition.categoryId = String(categoryId);
    if (status && status !== "ALL") whereCondition.status = status as UserStatus;
    if (search) {
      whereCondition.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { productCode: { contains: String(search), mode: 'insensitive' } },
        { barcode: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const [total, productsRaw, kpiRawData] = await prisma.$transaction([
      prisma.products.count({ where: whereCondition }),
      
      prisma.products.findMany({
        where: whereCondition,
        skip: skip,
        take: limitNum,
        include: {
          category: { select: { name: true, code: true } },
          uom: { select: { name: true, code: true } },
          supplier: { select: { name: true } },
          variants: { where: { isDeleted: false } },
          uomConversions: {
            include: { fromUom: { select: { name: true } }, toUom: { select: { name: true } } }
          },
          balances: { select: { quantity: true } } // Lấy balance để tính Tồn kho
        },
        orderBy: { createdAt: 'desc' }
      }),

      prisma.products.findMany({
        where: whereCondition,
        select: {
          purchasePrice: true,
          reorderPoint: true,
          status: true,
          balances: { select: { quantity: true } } // Truy vấn nhẹ lấy balance để tính KPI
        }
      })
    ]);

    // Gắn thêm trường totalStock cho từng sản phẩm trả về Client
    const products = productsRaw.map(p => ({
      ...p,
      totalStock: p.balances.reduce((sum, b) => sum + b.quantity, 0)
    }));

    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    kpiRawData.forEach(p => {
      if (p.status === "ACTIVE") {
        const stock = p.balances.reduce((sum, b) => sum + b.quantity, 0);
        const reorder = p.reorderPoint || 10;
        totalValue += stock * Number(p.purchasePrice || 0);
        if (stock === 0) outOfStockCount++;
        else if (stock <= reorder) lowStockCount++;
      }
    });

    res.json({
      data: products,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        kpis: { totalItems: total, totalValue, lowStockCount, outOfStockCount }
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất danh sách sản phẩm", error: error.message });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await prisma.products.findUnique({
      where: { productId: id },
      include: {
        category: true,
        uom: true,
        supplier: true,
        variants: { where: { isDeleted: false } },
        batches: { orderBy: { expiryDate: 'asc' } },
        uomConversions: {
          include: { fromUom: true, toUom: true }
        }
      }
    });

    if (!product || product.isDeleted) {
      res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
      return;
    }
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất chi tiết sản phẩm", error: error.message });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      productCode, name, barcode, imageUrl, price, purchasePrice, standardCost, costingMethod,
      uomId, categoryId, supplierId, reorderPoint, hasVariants, hasBatches, status
    } = req.body;
    const userId = getUserId(req);

    const product = await prisma.$transaction(async (tx) => {
      const newProd = await tx.products.create({
        data: {
          productCode, name, barcode, imageUrl,
          price: Number(price || 0),
          purchasePrice: Number(purchasePrice || 0),
          standardCost: Number(standardCost || 0),
          costingMethod, uomId, categoryId, supplierId,
          reorderPoint: Number(reorderPoint || 0),
          hasVariants: Boolean(hasVariants),
          hasBatches: Boolean(hasBatches),
          status: status || "ACTIVE"
        }
      });
      return newProd;
    });

    await logAudit("Products", product.productId, ActionType.CREATE, null, product, userId, req.ip);
    res.status(201).json(product);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo sản phẩm", error: error.message });
  }
};

// ĐÃ KHÔI PHỤC LẠI API NHẬP EXCEL
export const importProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = req.body; 
    const userId = getUserId(req);

    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ message: "Dữ liệu rỗng hoặc không hợp lệ" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.products.createMany({
        data: products.map(p => ({
          productCode: p.productCode,
          name: p.name,
          barcode: p.barcode || null,
          price: Number(p.price || 0),
          purchasePrice: Number(p.purchasePrice || 0),
          categoryId: p.categoryId,
          uomId: p.uomId,
          hasVariants: false,
          hasBatches: false,
          status: "ACTIVE"
        })),
        skipDuplicates: true 
      });
      return created;
    });

    await logAudit("Products", "BULK_IMPORT", ActionType.CREATE, null, { count: result.count }, userId, req.ip);
    res.status(201).json({ message: `Đã nhập thành công ${result.count} sản phẩm`, count: result.count });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi nhập dữ liệu hàng loạt", error: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    const userId = getUserId(req);
    delete updateData.userId;

    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    if (updateData.purchasePrice !== undefined) updateData.purchasePrice = Number(updateData.purchasePrice);
    if (updateData.standardCost !== undefined) updateData.standardCost = Number(updateData.standardCost);
    if (updateData.reorderPoint !== undefined) updateData.reorderPoint = Number(updateData.reorderPoint);

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const existing = await tx.products.findUnique({ where: { productId: id } });
      if (!existing || existing.isDeleted) throw new Error("Sản phẩm không tồn tại!");

      return await tx.products.update({
        where: { productId: id },
        data: updateData
      });
    });

    await logAudit("Products", id, ActionType.UPDATE, null, updatedProduct, userId, req.ip);
    res.json({ message: "Cập nhật sản phẩm thành công", product: updatedProduct });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật sản phẩm", error: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.products.findUnique({ where: { productId: id } });
      if (!existing || existing.isDeleted) throw new Error("Sản phẩm không tồn tại!");

      await tx.products.update({
        where: { productId: id },
        data: { isDeleted: true, status: "INACTIVE" }
      });
    });

    await logAudit("Products", id, ActionType.DELETE, null, { isDeleted: true }, userId, req.ip);
    res.json({ message: "Xóa sản phẩm thành công" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa sản phẩm", error: error.message });
  }
};

// ==========================================
// 2. PRODUCT VARIANTS (BIẾN THỂ SẢN PHẨM)
// ==========================================
export const getProductVariants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // ID của sản phẩm cha
    const variants = await prisma.productVariant.findMany({
      where: { productId: id, isDeleted: false },
      orderBy: { sku: 'asc' }
    });
    res.json(variants);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất biến thể", error: error.message });
  }
};

export const createProductVariant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, sku, attributes, additionalPrice } = req.body;
    const userId = getUserId(req);

    const variant = await prisma.$transaction(async (tx) => {
      const product = await tx.products.findUnique({ where: { productId } });
      if (!product) throw new Error("Sản phẩm gốc không tồn tại!");
      
      if (!product.hasVariants) {
        await tx.products.update({ where: { productId }, data: { hasVariants: true } });
      }

      const existingSku = await tx.productVariant.findUnique({ where: { sku } });
      if (existingSku) throw new Error("Mã SKU biến thể đã tồn tại trong hệ thống!");

      return await tx.productVariant.create({
        data: {
          productId, sku, attributes,
          additionalPrice: Number(additionalPrice || 0)
        }
      });
    });

    await logAudit("ProductVariant", variant.variantId, ActionType.CREATE, null, variant, userId, req.ip);
    res.status(201).json(variant);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo biến thể sản phẩm", error: error.message });
  }
};

export const updateProductVariant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { variantId } = req.params;
    const { sku, attributes, additionalPrice } = req.body;
    const userId = getUserId(req);

    const variant = await prisma.$transaction(async (tx) => {
      const existing = await tx.productVariant.findUnique({ where: { variantId } });
      if (!existing || existing.isDeleted) throw new Error("Biến thể không tồn tại!");

      if (sku && sku !== existing.sku) {
         const skuCheck = await tx.productVariant.findUnique({ where: { sku } });
         if (skuCheck) throw new Error("Mã SKU này đã được sử dụng bởi biến thể khác!");
      }

      return await tx.productVariant.update({
        where: { variantId },
        data: {
          sku: sku || existing.sku,
          attributes: attributes || existing.attributes,
          additionalPrice: additionalPrice !== undefined ? Number(additionalPrice) : existing.additionalPrice
        }
      });
    });

    await logAudit("ProductVariant", variantId, ActionType.UPDATE, null, variant, userId, req.ip);
    res.json({ message: "Cập nhật biến thể thành công!", variant });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật biến thể", error: error.message });
  }
};

export const deleteProductVariant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { variantId } = req.params;
    const userId = getUserId(req);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.productVariant.findUnique({ where: { variantId } });
      if (!existing || existing.isDeleted) throw new Error("Biến thể không tồn tại!");

      const hasTx = await tx.inventoryTransaction.findFirst({ where: { variantId } });
      if (hasTx) {
        await tx.productVariant.update({
          where: { variantId },
          data: { isDeleted: true }
        });
      } else {
        await tx.productVariant.delete({ where: { variantId } });
      }
    });

    await logAudit("ProductVariant", variantId, ActionType.DELETE, null, { deleted: true }, userId, req.ip);
    res.json({ message: "Xóa biến thể thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa biến thể", error: error.message });
  }
};

// ==========================================
// 3. PRODUCT BATCHES (LÔ HÀNG)
// ==========================================
export const getProductBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; 
    const batches = await prisma.productBatch.findMany({
      where: { productId: id },
      include: { variant: { select: { sku: true, attributes: true } } },
      orderBy: { expiryDate: 'asc' }
    });
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất lô hàng", error: error.message });
  }
};

export const createProductBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, variantId, batchNumber, manufactureDate, expiryDate } = req.body;
    const userId = getUserId(req);

    const batch = await prisma.$transaction(async (tx) => {
      const check = await tx.productBatch.findFirst({
        where: { productId, batchNumber, variantId: variantId || null }
      });
      if (check) throw new Error(`Lô hàng ${batchNumber} đã tồn tại cho sản phẩm/biến thể này!`);

      return await tx.productBatch.create({
        data: {
          productId,
          variantId: variantId || null,
          batchNumber,
          manufactureDate: manufactureDate ? new Date(manufactureDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null
        }
      });
    });

    await logAudit("ProductBatch", batch.batchId, ActionType.CREATE, null, batch, userId, req.ip);
    res.status(201).json(batch);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo lô hàng", error: error.message });
  }
};

export const updateProductBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;
    const { manufactureDate, expiryDate } = req.body;
    const userId = getUserId(req);

    const batch = await prisma.$transaction(async (tx) => {
      const existing = await tx.productBatch.findUnique({ where: { batchId } });
      if (!existing) throw new Error("Lô hàng không tồn tại!");

      return await tx.productBatch.update({
        where: { batchId },
        data: {
          manufactureDate: manufactureDate ? new Date(manufactureDate) : existing.manufactureDate,
          expiryDate: expiryDate ? new Date(expiryDate) : existing.expiryDate
        }
      });
    });

    await logAudit("ProductBatch", batchId, ActionType.UPDATE, null, batch, userId, req.ip);
    res.json({ message: "Cập nhật lô hàng thành công!", batch });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật lô hàng", error: error.message });
  }
};

export const deleteProductBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;
    const userId = getUserId(req);

    await prisma.$transaction(async (tx) => {
      const hasTx = await tx.inventoryTransaction.findFirst({ where: { batchId } });
      if (hasTx) throw new Error("Không thể xóa Lô hàng đã có lịch sử giao dịch! Vui lòng dùng lệnh Điều chỉnh kho nếu cần dọn rác.");

      await tx.productBatch.delete({ where: { batchId } });
    });

    await logAudit("ProductBatch", batchId, ActionType.DELETE, null, { deleted: true }, userId, req.ip);
    res.json({ message: "Xóa lô hàng thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa lô hàng", error: error.message });
  }
};

// ==========================================
// 4. PRODUCT UOM CONVERSIONS (QUY ĐỔI ĐƠN VỊ TÍNH)
// ==========================================
export const getUomConversions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.query;
    const conversions = await prisma.productUomConversion.findMany({
      where: { ...(productId && { productId: String(productId) }) },
      include: {
        product: { select: { name: true, uomId: true } },
        fromUom: { select: { name: true, code: true } },
        toUom: { select: { name: true, code: true } }
      }
    });
    res.json(conversions);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất quy đổi ĐVT", error: error.message });
  }
};

export const createUomConversion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, fromUomId, toUomId, conversionFactor } = req.body;
    const userId = getUserId(req);

    if (fromUomId === toUomId) {
      res.status(400).json({ message: "Đơn vị gốc và đơn vị đích không được trùng nhau!" });
      return;
    }

    if (Number(conversionFactor) <= 0) {
      res.status(400).json({ message: "Hệ số quy đổi phải lớn hơn 0!" });
      return;
    }

    const conversion = await prisma.$transaction(async (tx) => {
      const existing = await tx.productUomConversion.findFirst({
        where: { productId, fromUomId, toUomId }
      });
      if (existing) throw new Error("Quy tắc quy đổi này đã tồn tại!");

      return await tx.productUomConversion.create({
        data: {
          productId, fromUomId, toUomId,
          conversionFactor: Number(conversionFactor)
        }
      });
    });

    await logAudit("ProductUomConversion", conversion.conversionId, ActionType.CREATE, null, conversion, userId, req.ip);
    res.status(201).json(conversion);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo quy đổi ĐVT", error: error.message });
  }
};

export const updateUomConversion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; 
    const { conversionFactor } = req.body;
    const userId = getUserId(req);

    if (Number(conversionFactor) <= 0) {
      res.status(400).json({ message: "Hệ số quy đổi phải lớn hơn 0!" });
      return;
    }

    const conversion = await prisma.productUomConversion.update({
      where: { conversionId: id },
      data: { conversionFactor: Number(conversionFactor) }
    });

    await logAudit("ProductUomConversion", id, ActionType.UPDATE, null, conversion, userId, req.ip);
    res.json({ message: "Cập nhật hệ số quy đổi thành công!", conversion });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật quy đổi ĐVT", error: error.message });
  }
};

export const deleteUomConversion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    await prisma.productUomConversion.delete({ where: { conversionId: id } });

    await logAudit("ProductUomConversion", id, ActionType.DELETE, null, { deleted: true }, userId, req.ip);
    res.json({ message: "Xóa quy tắc quy đổi thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa quy đổi ĐVT", error: error.message });
  }
};