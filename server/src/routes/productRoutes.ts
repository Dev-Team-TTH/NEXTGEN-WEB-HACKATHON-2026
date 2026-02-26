import { Router } from "express";
import { 
  getProducts, createProduct, updateProduct, deleteProduct,
  getMasterDataRequests, approveMasterData, rejectMasterData // THÊM IMPORT
} from "../controllers/productController";

const router = Router();

router.get("/", getProducts);
router.post("/", createProduct);
router.delete("/:productId", deleteProduct);

// ĐỔI ROUTE UPDATE THÀNH PUT (tạo yêu cầu)
router.put("/:productId", updateProduct);

// THÊM 3 ROUTE MỚI CHO ENTERPRISE DUYỆT:
router.get("/requests", getMasterDataRequests);
router.put("/requests/:id/approve", approveMasterData);
router.put("/requests/:id/reject", rejectMasterData);

export default router;