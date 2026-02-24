import { Router } from "express";
import { getWarehouses, createWarehouse, deleteWarehouse, updateWarehouse, getWarehouseById } from "../controllers/warehouseController";

const router = Router();

router.get("/", getWarehouses);
router.get("/:id", getWarehouseById);
router.post("/", createWarehouse);
router.delete("/:id", deleteWarehouse);
router.put("/:id", updateWarehouse); // <-- THÊM MỚI

export default router;