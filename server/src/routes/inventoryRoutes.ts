import { Router } from "express";
import { 
  getInventoryBalances,
  getInventoryTransactions,
  adjustStock,
  transferStock
} from "../controllers/inventoryController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// BẮT BUỘC BẢO MẬT: Mọi thao tác kho đều phải qua xác thực
router.use(authenticateToken);

// ------------------------------------------------------------------
// 1. TRUY VẤN DỮ LIỆU KHO (BÁO CÁO)
// ------------------------------------------------------------------
router.get("/balances", getInventoryBalances);           // Xem Tồn kho hiện tại
router.get("/transactions", getInventoryTransactions);   // Xem Thẻ kho / Lịch sử

// ------------------------------------------------------------------
// 2. NGHIỆP VỤ KHO CHUYÊN SÂU (WMS)
// ------------------------------------------------------------------
router.post("/adjust", adjustStock);       // Kiểm kê / Điều chỉnh kho
router.post("/transfer", transferStock);   // Chuyển kho nội bộ

export default router;