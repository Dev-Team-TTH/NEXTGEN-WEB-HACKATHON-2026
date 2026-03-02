import { Router } from "express";
import { getDashboardMetrics } from "../controllers/dashboardController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// BẮT BUỘC BẢO MẬT: Bất kỳ ai xem Dashboard cũng phải có Token hợp lệ
router.use(authenticateToken);

// Lấy toàn bộ chỉ số Dashboard
router.get("/", getDashboardMetrics);

export default router;