import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../utils/auditLogger";

const prisma = new PrismaClient();

// Hàm Helper trích xuất userId an toàn
const getUserId = (req: Request) => (req as any).user?.userId || req.body.userId;

// ==========================================
// 1. LẤY DANH SÁCH SẢN PHẨM (KÈM TỒN KHO THỰC TẾ)
// ==========================================
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search?.toString();
    const categoryId = req.query.categoryId?.toString();

    const products = await prisma.products.findMany({
      where: {
        isDeleted: false,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { productCode: { contains: search, mode: "insensitive" } },
            { barcode: { contains: search, mode: "insensitive" } },
          ],
        }),
        ...(categoryId && { categoryId }),
      },
      include: {
        category: { select: { name: true, code: true } },
        uom: { select: { name: true, code: true } },
        supplier: { select: { name: true } },
        variants: { where: { isDeleted: false } },
        uomConversions: {
          include: { fromUom: { select: { name: true } }, toUom: { select: { name: true } } }
        },
        balances: true, // Lấy Balances để tính tổng tồn kho
      },
      orderBy: { createdAt: 'desc' }
    });

    // Xử lý dữ liệu trả về: Tính tổng tồn kho (Quantity) và Tổng giá trị (Total Value)
    const productsWithStock = products.map((product) => {
      const totalStock = product.balances.reduce((sum, bal) => sum + bal.quantity, 0);
      const totalLocked = product.balances.reduce((sum, bal) => sum + bal.lockedQty, 0);
      const totalStockValue = product.balances.reduce((sum, bal) => sum + Number(bal.totalValue), 0);

      return {
        ...product,
        totalStock,
        totalLocked,
        availableStock: totalStock - totalLocked,
        totalStockValue,
        // Ép kiểu Decimal sang Number cho Frontend dễ xử lý
        price: Number(product.price),
        purchasePrice: Number(product.purchasePrice),
        standardCost: Number(product.standardCost)
      };
    });

    res.json(productsWithStock);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất danh sách Sản phẩm", error: error.message });
  }
};

// ==========================================
// 2. LẤY CHI TIẾT MỘT SẢN PHẨM (GET BY ID)
// ==========================================
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const product = await prisma.products.findUnique({
      where: { productId: id },
      include: {
        category: true,
        uom: true,
        supplier: true,
        variants: { where: { isDeleted: false } },
        batches: { orderBy: { expiryDate: 'asc' } },
        uomConversions: { include: { fromUom: true, toUom: true } },
        balances: {
          include: { warehouse: { select: { name: true } }, bin: { select: { name: true } } }
        }
      }
    });

    if (!product || product.isDeleted) {
      res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
      return;
    }

    // Ép kiểu Decimal sang Number
    const safeProduct = {
      ...product,
      price: Number(product.price),
      purchasePrice: Number(product.purchasePrice),
      standardCost: Number(product.standardCost)
    };

    res.json(safeProduct);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy chi tiết sản phẩm", error: error.message });
  }
};

// ==========================================
// 3. TẠO SẢN PHẨM MỚI (TRANSACTION + AUTO DEFAULT VARIANT)
// ==========================================
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      productCode, name, barcode, price, purchasePrice, costingMethod,
      uomId, categoryId, supplierId, reorderPoint,
      hasVariants, hasBatches, variants, uomConversions
    } = req.body;
    const userId = getUserId(req);

    const newProduct = await prisma.$transaction(async (tx) => {
      // 1. Tạo Product gốc
      const product = await tx.products.create({
        data: {
          productCode, name, barcode, 
          price: Number(price), 
          purchasePrice: Number(purchasePrice || 0),
          costingMethod: costingMethod || "MOVING_AVERAGE",
          uomId, categoryId, supplierId,
          reorderPoint: Number(reorderPoint || 0),
          hasVariants: Boolean(hasVariants),
          hasBatches: Boolean(hasBatches),
        },
      });

      // 2. Xử lý Variant (Biến thể)
      if (hasVariants && variants && variants.length > 0) {
        await tx.productVariant.createMany({
          data: variants.map((v: any) => ({
            productId: product.productId,
            sku: v.sku,
            attributes: JSON.stringify(v.attributes),
            additionalPrice: Number(v.additionalPrice || 0)
          }))
        });
      } else {
        // TỰ ĐỘNG tạo 1 Variant mặc định nếu sản phẩm không có biến thể
        await tx.productVariant.create({
          data: {
            productId: product.productId,
            sku: `${product.productCode}-DEFAULT`,
            attributes: JSON.stringify({ type: "default" }),
            additionalPrice: 0
          }
        });
      }

      // 3. Xử lý Quy đổi Đơn vị tính (UoM Conversions)
      if (uomConversions && uomConversions.length > 0) {
        await tx.productUomConversion.createMany({
          data: uomConversions.map((conv: any) => ({
            productId: product.productId,
            fromUomId: conv.fromUomId,
            toUomId: uomId, // Quy về UoM gốc
            conversionFactor: Number(conv.conversionFactor)
          }))
        });
      }

      return product;
    });

    await logAudit("Products", newProduct.productId, "CREATE", null, newProduct, userId, req.ip);
    res.status(201).json(newProduct);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi tạo Sản phẩm", error: error.message });
  }
};

// ==========================================
// 4. CẬP NHẬT SẢN PHẨM
// ==========================================
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };
  const userId = getUserId(req);

  // Xóa các trường không thuộc bảng Products
  delete updateData.userId;
  delete updateData.variants;
  delete updateData.uomConversions;

  try {
    const oldProduct = await prisma.products.findUnique({ where: { productId: id } });
    if (!oldProduct || oldProduct.isDeleted) {
      res.status(404).json({ message: "Sản phẩm không tồn tại hoặc đã bị xóa" });
      return;
    }

    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.purchasePrice) updateData.purchasePrice = Number(updateData.purchasePrice);
    if (updateData.standardCost) updateData.standardCost = Number(updateData.standardCost);

    const updatedProduct = await prisma.products.update({
      where: { productId: id },
      data: updateData,
    });

    await logAudit("Products", id, "UPDATE", oldProduct, updatedProduct, userId, req.ip);
    res.json(updatedProduct);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi cập nhật Sản phẩm", error: error.message });
  }
};

// ==========================================
// 5. XÓA MỀM SẢN PHẨM (SOFT DELETE)
// ==========================================
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra tồn kho
      const balances = await tx.inventoryBalance.findMany({
        where: { productId: id, quantity: { gt: 0 } }
      });
      if (balances.length > 0) {
        throw new Error("Không thể xóa sản phẩm đang còn tồn kho thực tế!");
      }

      // 2. Xóa mềm Variant
      await tx.productVariant.updateMany({
        where: { productId: id },
        data: { isDeleted: true }
      });

      // 3. Xóa mềm Product
      const deletedProduct = await tx.products.update({
        where: { productId: id },
        data: { isDeleted: true, status: "INACTIVE" }
      });

      await logAudit("Products", id, "DELETE", null, { isDeleted: true }, userId, req.ip);
    });

    res.json({ message: "Đã vô hiệu hóa (xóa mềm) sản phẩm thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa Sản phẩm", error: error.message });
  }
};

// ==========================================
// 6. LẤY DANH SÁCH BIẾN THỂ (CHO WMS)
// ==========================================
export const getProductVariants = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; // productId
  try {
    const variants = await prisma.productVariant.findMany({
      where: { productId: id, isDeleted: false },
      include: {
        balances: {
          where: { quantity: { gt: 0 } },
          select: { warehouseId: true, binId: true, batchId: true, quantity: true, lockedQty: true }
        }
      },
      orderBy: { sku: 'asc' }
    });
    res.json(variants);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất danh sách biến thể", error: error.message });
  }
};

// ==========================================
// 7. LẤY DANH SÁCH LÔ HÀNG (CHO WMS)
// ==========================================
export const getProductBatches = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; // productId
  try {
    const batches = await prisma.productBatch.findMany({
      where: { productId: id },
      include: {
        variant: { select: { sku: true, attributes: true } },
        balances: {
          where: { quantity: { gt: 0 } },
          select: { warehouseId: true, binId: true, quantity: true }
        }
      },
      orderBy: { expiryDate: 'asc' }
    });
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất danh sách lô hàng", error: error.message });
  }
};

// ==========================================
// 8. QUẢN LÝ BIẾN THỂ (VARIANTS) - CRUD ĐỘC LẬP
// ==========================================
export const createProductVariant = async (req: Request, res: Response): Promise<void> => {
  const { productId, sku, attributes, additionalPrice } = req.body;
  try {
    const variant = await prisma.productVariant.create({
      data: { productId, sku, attributes: JSON.stringify(attributes), additionalPrice: Number(additionalPrice) }
    });
    res.status(201).json(variant);
  } catch (error: any) { res.status(400).json({ message: "Lỗi tạo Biến thể", error: error.message }); }
};

export const updateProductVariant = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { sku, attributes, additionalPrice } = req.body;
  try {
    const variant = await prisma.productVariant.update({
      where: { variantId: id },
      data: { sku, attributes: JSON.stringify(attributes), additionalPrice: Number(additionalPrice) }
    });
    res.json(variant);
  } catch (error: any) { res.status(400).json({ message: "Lỗi cập nhật", error: error.message }); }
};

export const deleteProductVariant = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.productVariant.update({ where: { variantId: id }, data: { isDeleted: true } });
    res.json({ message: "Xóa biến thể thành công" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi xóa", error: error.message }); }
};

// ==========================================
// 9. QUẢN LÝ LÔ HÀNG (BATCHES) - CRUD ĐỘC LẬP
// ==========================================
export const createProductBatch = async (req: Request, res: Response): Promise<void> => {
  const { productId, variantId, batchNumber, manufactureDate, expiryDate } = req.body;
  try {
    const batch = await prisma.productBatch.create({
      data: { 
        productId, variantId: variantId || null, batchNumber, 
        manufactureDate: manufactureDate ? new Date(manufactureDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null
      }
    });
    res.status(201).json(batch);
  } catch (error: any) { res.status(400).json({ message: "Lỗi tạo Lô hàng", error: error.message }); }
};

export const updateProductBatch = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { batchNumber, manufactureDate, expiryDate } = req.body;
  try {
    const batch = await prisma.productBatch.update({
      where: { batchId: id },
      data: { 
        batchNumber,
        manufactureDate: manufactureDate ? new Date(manufactureDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined
      }
    });
    res.json(batch);
  } catch (error: any) { res.status(400).json({ message: "Lỗi cập nhật lô hàng", error: error.message }); }
};

export const deleteProductBatch = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    // Xóa vật lý vì Lô rỗng không cần giữ lại, nếu đã có Transaction thì DB sẽ chặn lại (Cascade / Restrict)
    await prisma.productBatch.delete({ where: { batchId: id } });
    res.json({ message: "Xóa lô hàng thành công" });
  } catch (error: any) { res.status(400).json({ message: "Không thể xóa Lô hàng đã có giao dịch kho!", error: error.message }); }
};

// ==========================================
// 10. QUẢN LÝ QUY ĐỔI ĐVT (UOM CONVERSIONS)
// ==========================================
export const getUomConversions = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.query;
  try {
    const conversions = await prisma.productUomConversion.findMany({
      where: { ...(productId && { productId: String(productId) }) },
      include: { fromUom: true, toUom: true }
    });
    res.json(conversions);
  } catch (error: any) { res.status(500).json({ message: "Lỗi", error: error.message }); }
};

export const createUomConversion = async (req: Request, res: Response): Promise<void> => {
  const { productId, fromUomId, toUomId, conversionFactor } = req.body;
  try {
    const conv = await prisma.productUomConversion.create({
      data: { productId, fromUomId, toUomId, conversionFactor: Number(conversionFactor) }
    });
    res.status(201).json(conv);
  } catch (error: any) { res.status(400).json({ message: "Lỗi tạo quy đổi (Có thể đã tồn tại)", error: error.message }); }
};

export const updateUomConversion = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { conversionFactor } = req.body;
  try {
    const conv = await prisma.productUomConversion.update({
      where: { conversionId: id },
      data: { conversionFactor: Number(conversionFactor) }
    });
    res.json(conv);
  } catch (error: any) { res.status(400).json({ message: "Lỗi cập nhật", error: error.message }); }
};

export const deleteUomConversion = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.productUomConversion.delete({ where: { conversionId: id } });
    res.json({ message: "Xóa quy đổi thành công" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi xóa", error: error.message }); }
};
