import { Router } from "express";
import { 
  getJournalEntries,
  getJournalEntryById,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  postJournalEntry,
  reverseJournalEntry,
  processPayment,
  getCashflowReport,
  getTrialBalanceReport
} from "../controllers/accountingController";
import { authenticateToken } from "../middleware/authMiddleware"; // Middleware bảo vệ hệ thống

const router = Router();

// Bật bảo mật cho tất cả các API nghiệp vụ Kế toán
router.use(authenticateToken);

// ------------------------------------------------------------------
// API SỔ NHẬT KÝ CHUNG & SỔ CÁI (CRUD Cơ bản)
// ------------------------------------------------------------------
router.get("/journal-entries", getJournalEntries);
router.get("/journal-entries/:id", getJournalEntryById);
router.post("/journal-entries", createJournalEntry);
router.put("/journal-entries/:id", updateJournalEntry);
router.delete("/journal-entries/:id", deleteJournalEntry);

// ------------------------------------------------------------------
// API NGHIỆP VỤ KẾ TOÁN CHUYÊN SÂU (GHI SỔ & ĐẢO BÚT TOÁN)
// ------------------------------------------------------------------
router.post("/journal-entries/:id/post", postJournalEntry);
router.post("/journal-entries/:id/reverse", reverseJournalEntry);

// ------------------------------------------------------------------
// API THANH TOÁN CHỨNG TỪ (AP/AR)
// ------------------------------------------------------------------
router.post("/documents/:documentId/pay", processPayment);
router.get("/reports/cashflow", getCashflowReport);
router.get("/reports/trial-balance", getTrialBalanceReport);

export default router;