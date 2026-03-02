import { Router } from "express";
import { 
  getAccounts, createAccount, updateAccount, deleteAccount,
  getFiscalYears, createFiscalYear, toggleFiscalYearStatus,
  getFiscalPeriods, toggleFiscalPeriodStatus
} from "../controllers/financeSetupController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// BẮT BUỘC BẢO MẬT: Chỉ user có token hợp lệ (và có phân quyền trên FE) mới được thao tác
router.use(authenticateToken);

// ------------------------------------------------------------------
// 1. HỆ THỐNG TÀI KHOẢN KẾ TOÁN (CHART OF ACCOUNTS)
// ------------------------------------------------------------------
router.get("/accounts", getAccounts);
router.post("/accounts", createAccount);
router.put("/accounts/:id", updateAccount);
router.delete("/accounts/:id", deleteAccount);

// ------------------------------------------------------------------
// 2. NĂM TÀI CHÍNH (FISCAL YEARS)
// ------------------------------------------------------------------
router.get("/years", getFiscalYears);
router.post("/years", createFiscalYear);
router.put("/years/:id/toggle-status", toggleFiscalYearStatus);

// ------------------------------------------------------------------
// 3. KỲ KẾ TOÁN THÁNG (FISCAL PERIODS)
// ------------------------------------------------------------------
router.get("/periods", getFiscalPeriods);
router.put("/periods/:id/toggle-status", toggleFiscalPeriodStatus);

export default router;