import { Router } from "express";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  
  // Variants
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,

  // Batches
  getProductBatches,
  createProductBatch,
  updateProductBatch,
  deleteProductBatch,

  // UoM Conversions
  getUomConversions,
  createUomConversion,
  updateUomConversion,
  deleteUomConversion
} from "../controllers/productController";

const router = Router();

// ==========================================
// 1. SẢN PHẨM (PRODUCTS CORE)
// ==========================================
router.get("/", getProducts);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

// ==========================================
// 2. BIẾN THỂ (VARIANTS)
// ==========================================
router.get("/:id/variants", getProductVariants); // Lấy biến thể theo ID sản phẩm
router.post("/variants", createProductVariant);
router.put("/variants/:id", updateProductVariant);
router.delete("/variants/:id", deleteProductVariant);

// ==========================================
// 3. LÔ HÀNG (BATCHES)
// ==========================================
router.get("/:id/batches", getProductBatches); // Lấy lô hàng theo ID sản phẩm
router.post("/batches", createProductBatch);
router.put("/batches/:id", updateProductBatch);
router.delete("/batches/:id", deleteProductBatch);

// ==========================================
// 4. QUY ĐỔI ĐƠN VỊ TÍNH (UOM CONVERSIONS)
// ==========================================
router.get("/uom-conversions", getUomConversions);
router.post("/uom-conversions", createUomConversion);
router.put("/uom-conversions/:id", updateUomConversion);
router.delete("/uom-conversions/:id", deleteUomConversion);

export default router;