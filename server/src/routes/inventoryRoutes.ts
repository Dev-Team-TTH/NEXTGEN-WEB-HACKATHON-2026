import { Router } from "express";
import { 
  getInventoryBalances, 
  getInventoryTransactions, 
  adjustStock, 
  transferStock, 
  autoPickStock,
  getLowStockAlerts,
  getExpiringBatches,
  bulkStockTake
} from "../controllers/inventoryController";
import { authenticateToken, requirePermission } from "../middleware/authMiddleware";

const router = Router();

// ==========================================
// BẢO VỆ TẤT CẢ ROUTE BẰNG TOKEN
// ==========================================
router.use(authenticateToken);

// ==========================================
// 1. TRUY VẤN VÀ BÁO CÁO (READ-ONLY)
// ==========================================
// Danh sách tồn kho (Có phân trang)
router.get("/balances", requirePermission("VIEW_INVENTORY"), getInventoryBalances);

// Thẻ kho / Lịch sử xuất nhập (Có phân trang)
router.get("/transactions", requirePermission("VIEW_INVENTORY"), getInventoryTransactions);

// [DASHBOARD WIDGETS] Cảnh báo thông minh
router.get("/alerts/low-stock", requirePermission("VIEW_INVENTORY"), getLowStockAlerts);
router.get("/alerts/expiring", requirePermission("VIEW_INVENTORY"), getExpiringBatches);

// ==========================================
// 2. THAO TÁC KHO (OPERATIONS)
// ==========================================
// Điều chỉnh tồn kho đơn lẻ
router.post("/adjust", requirePermission("MANAGE_INVENTORY"), adjustStock);

// Chuyển kho nội bộ (Multi-items)
router.post("/transfer", requirePermission("MANAGE_INVENTORY"), transferStock);

// Kiểm kê kho hàng loạt (Bulk upload/scan)
router.post("/bulk-stock-take", requirePermission("MANAGE_INVENTORY"), bulkStockTake);

// Thuật toán nhặt hàng tự động (Phục vụ cho các Module khác như Bán hàng / Xuất vật tư)
router.post("/auto-pick", requirePermission("VIEW_INVENTORY"), autoPickStock);

export default router;