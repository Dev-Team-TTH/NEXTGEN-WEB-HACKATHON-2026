import { Router } from "express";
import { 
  getAssets, createAsset, deleteAsset, updateAsset,
  getAssetRequests, approveAssetRequest, rejectAssetRequest, getAssetHistory
} from "../controllers/assetController";

const router = Router();

// Route thao tác cơ bản (Sinh ra phiếu yêu cầu)
router.get("/", getAssets);
router.post("/", createAsset);
router.delete("/:id", deleteAsset);
router.put("/:id", updateAsset);

// Route luồng Duyệt Enterprise
router.get("/requests/all", getAssetRequests);
router.put("/requests/:id/approve", approveAssetRequest);
router.put("/requests/:id/reject", rejectAssetRequest);
router.get("/:id/history", getAssetHistory);

export default router;