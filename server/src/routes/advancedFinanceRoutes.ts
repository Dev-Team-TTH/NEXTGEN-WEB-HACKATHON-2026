import { Router } from "express";
import { 
  getTaxes, createTax, updateTax, deleteTax,
  getCurrencies, createCurrency, updateCurrency, deleteCurrency,
  addExchangeRate, deleteExchangeRate,
  getPriceLists, createPriceList, updatePriceList, deletePriceList,
  getBudgets, createBudget, updateBudget, deleteBudget
} from "../controllers/advancedFinanceController";
import { authenticateToken } from "../middleware/authMiddleware"; // Bảo mật Route

const router = Router();

// Áp dụng Middleware bảo mật cho toàn bộ module Tài chính nâng cao
router.use(authenticateToken);

// ------------------------------------------------------------------
// 1. THUẾ (TAXES)
// ------------------------------------------------------------------
router.get("/taxes", getTaxes);
router.post("/taxes", createTax);
router.put("/taxes/:id", updateTax);
router.delete("/taxes/:id", deleteTax);

// ------------------------------------------------------------------
// 2. TIỀN TỆ & TỶ GIÁ (CURRENCIES & EXCHANGE RATES)
// ------------------------------------------------------------------
router.get("/currencies", getCurrencies);
router.post("/currencies", createCurrency);
router.put("/currencies/:currencyCode", updateCurrency);
router.delete("/currencies/:currencyCode", deleteCurrency);

router.post("/exchange-rates", addExchangeRate);
router.delete("/exchange-rates/:rateId", deleteExchangeRate);

// ------------------------------------------------------------------
// 3. BẢNG GIÁ (PRICE LISTS)
// ------------------------------------------------------------------
router.get("/price-lists", getPriceLists);
router.post("/price-lists", createPriceList);
router.put("/price-lists/:id", updatePriceList);
router.delete("/price-lists/:id", deletePriceList);

// ------------------------------------------------------------------
// 4. NGÂN SÁCH (BUDGET CONTROL)
// ------------------------------------------------------------------
router.get("/budgets", getBudgets);
router.post("/budgets", createBudget);
router.put("/budgets/:id", updateBudget);
router.delete("/budgets/:id", deleteBudget);

export default router;