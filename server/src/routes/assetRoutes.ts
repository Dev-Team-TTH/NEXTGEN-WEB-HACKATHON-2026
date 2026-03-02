import { Router } from "express";
import { 
  getAssets, getAssetById, createAsset, updateAsset, deleteAsset,
  assignAsset, returnAsset,
  logMaintenance, completeMaintenance,
  revaluateAsset, liquidateAsset, runDepreciation,
  getAssetHistory, getAssetRequests, approveAssetRequest, rejectAssetRequest
} from "../controllers/assetController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Áp dụng bảo mật Token
router.use(authenticateToken);

// ------------------------------------------------------------------
// 1. QUẢN LÝ YÊU CẦU TÀI SẢN (ENTERPRISE REQUESTS)
// ------------------------------------------------------------------
router.get("/requests/all", getAssetRequests);
router.put("/requests/:id/approve", approveAssetRequest);
router.put("/requests/:id/reject", rejectAssetRequest);

// ------------------------------------------------------------------
// 2. NGHIỆP VỤ KHẤU HAO (DEPRECIATION)
// ------------------------------------------------------------------
router.post("/depreciation/run", runDepreciation);

// ------------------------------------------------------------------
// 3. VÒNG ĐỜI TÀI SẢN (LIFECYCLE ACTIONS)
// ------------------------------------------------------------------
router.post("/:id/assign", assignAsset);
router.post("/:id/return", returnAsset);

router.post("/:id/maintenance", logMaintenance);
router.put("/maintenances/:maintenanceId/complete", completeMaintenance);

router.post("/:id/revaluate", revaluateAsset);
router.post("/:id/liquidate", liquidateAsset);

router.get("/:id/history", getAssetHistory);

// ------------------------------------------------------------------
// 4. QUẢN LÝ DANH MỤC TÀI SẢN (CRUD)
// ------------------------------------------------------------------
router.get("/", getAssets);
router.get("/:id", getAssetById);
router.post("/", createAsset);
router.put("/:id", updateAsset);
router.delete("/:id", deleteAsset);

export default router;