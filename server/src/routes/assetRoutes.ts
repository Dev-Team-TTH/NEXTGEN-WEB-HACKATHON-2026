import { Router } from "express";
import { getAssets, createAsset, deleteAsset } from "../controllers/assetController";

const router = Router();

router.get("/", getAssets);
router.post("/", createAsset);
router.delete("/:id", deleteAsset);

export default router;