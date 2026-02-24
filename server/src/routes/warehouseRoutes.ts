import { Router } from "express";
import { getWarehouses, createWarehouse, deleteWarehouse, updateWarehouse } from "../controllers/warehouseController";

const router = Router();

router.get("/", getWarehouses);
router.post("/", createWarehouse);
router.delete("/:id", deleteWarehouse);
router.put("/:id", updateWarehouse); // <-- THÊM MỚI

export default router;