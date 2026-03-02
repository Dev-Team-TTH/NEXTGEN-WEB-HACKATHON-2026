import { Router } from "express";
import { 
  getAssetCategories, 
  createAssetCategory, 
  updateAssetCategory, 
  deleteAssetCategory 
} from "../controllers/assetMasterController";
import { authenticateToken } from "../middleware/authMiddleware"; // Bảo vệ API

const router = Router();

// Bắt buộc đăng nhập để thao tác với Master Data
router.use(authenticateToken);

// ------------------------------------------------------------------
// API DANH MỤC TÀI SẢN (ASSET CATEGORIES)
// ------------------------------------------------------------------
router.get("/categories", getAssetCategories);
router.post("/categories", createAssetCategory);
router.put("/categories/:id", updateAssetCategory);
router.delete("/categories/:id", deleteAssetCategory);

export default router;