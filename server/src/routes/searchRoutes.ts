import { Router } from "express";
import { getGlobalSearch } from "../controllers/searchController";
// Import middleware xác thực của bạn (đảm bảo đường dẫn đúng)
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Yêu cầu phải có Token đăng nhập mới được tìm kiếm để bảo mật rò rỉ dữ liệu
router.use(authenticateToken);

// Route đón request GET /api/v1/search?q=...
router.get("/", getGlobalSearch);

export default router;