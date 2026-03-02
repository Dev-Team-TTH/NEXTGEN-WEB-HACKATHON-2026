import { Router } from "express";
import { 
  getExpenses, 
  getExpenseById, 
  createExpense, 
  updateExpense, 
  deleteExpense,
  postExpense
} from "../controllers/expenseController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Bắt buộc xác thực cho mọi thao tác liên quan đến tiền bạc/chi phí
router.use(authenticateToken);

// ------------------------------------------------------------------
// API QUẢN LÝ CHI PHÍ (OPEX)
// ------------------------------------------------------------------
router.get("/", getExpenses);
router.get("/:id", getExpenseById);
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

// Route quan trọng: Ghi sổ và Trừ Ngân Sách
router.post("/:id/post", postExpense);

export default router;