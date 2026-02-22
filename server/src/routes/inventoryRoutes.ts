import { Router } from "express";
import { createTransaction } from "../controllers/inventoryController";

const router = Router();

// Đường dẫn sẽ là: POST /inventory/transaction
router.post("/transaction", createTransaction);

export default router;