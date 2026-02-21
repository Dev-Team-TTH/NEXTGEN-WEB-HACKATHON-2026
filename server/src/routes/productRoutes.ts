import { Router } from "express";
import { 
  createProduct, 
  getProducts, 
  updateProduct, 
  deleteProduct 
} from "../controllers/productController";

const router = Router();

router.get("/", getProducts);
router.post("/", createProduct);

// [MỚI] Các route cho Sửa và Xóa
router.put("/:id", updateProduct);    // Endpoint: PUT /products/:id
router.delete("/:id", deleteProduct); // Endpoint: DELETE /products/:id

export default router;