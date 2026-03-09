import { Router } from "express";
import {
  getProducts, getProductById, createProduct, updateProduct, deleteProduct, importProducts,
  getProductVariants, createProductVariant, updateProductVariant, deleteProductVariant,
  getProductBatches, createProductBatch, updateProductBatch, deleteProductBatch,
  getUomConversions, createUomConversion, updateUomConversion, deleteUomConversion
} from "../controllers/productController";

import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// ==========================================
// MIDDLEWARE BẢO VỆ TOÀN BỘ ROUTE
// ==========================================
router.use(authenticateToken);

// ==========================================
// 1. BIẾN THỂ SẢN PHẨM (VARIANTS)
// ==========================================
router.post("/variants", createProductVariant);
router.put("/variants/:variantId", updateProductVariant);
router.delete("/variants/:variantId", deleteProductVariant);

// ==========================================
// 2. LÔ HÀNG (BATCHES)
// ==========================================
router.post("/batches", createProductBatch);
router.put("/batches/:batchId", updateProductBatch);
router.delete("/batches/:batchId", deleteProductBatch);

// ==========================================
// 3. QUY ĐỔI ĐƠN VỊ TÍNH (UOM CONVERSIONS)
// ==========================================
router.get("/uom-conversions", getUomConversions);
router.post("/uom-conversions", createUomConversion);
router.put("/uom-conversions/:id", updateUomConversion);
router.delete("/uom-conversions/:id", deleteUomConversion);

// ==========================================
// 4. SẢN PHẨM CHÍNH (PRODUCTS MASTER)
// ==========================================
router.get("/", getProducts);
router.post("/import", importProducts); // API IMPORT HÀNG LOẠT
router.post("/", createProduct);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

// --- CÁC ROUTE LẤY DỮ LIỆU MỞ RỘNG CỦA 1 SẢN PHẨM ---
router.get("/:id/variants", getProductVariants);
router.get("/:id/batches", getProductBatches);

export default router;