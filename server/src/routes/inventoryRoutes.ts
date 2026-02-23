import { Router } from "express";
import { createTransaction, approveTransaction, getTransactions, rejectTransaction } from "../controllers/inventoryController";

const router = Router();

router.get("/", getTransactions); // Lấy danh sách phiếu
router.post("/", createTransaction); // Tạo phiếu nháp
router.put("/:id/approve", approveTransaction); // Duyệt phiếu
router.put("/:id/reject", rejectTransaction); // Từ chối phiếu

export default router;