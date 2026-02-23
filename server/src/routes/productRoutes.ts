import { Router } from "express";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../controllers/productController";

const router = Router();

router.get("/", getProducts);
router.post("/", createProduct);

// Đảm bảo bạn có dòng này để hứng request Sửa sản phẩm:
router.put("/:productId", updateProduct);

// Đảm bảo bạn có dòng này để hứng request Xóa sản phẩm:
router.delete("/:productId", deleteProduct);

export default router;