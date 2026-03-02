import { Router } from "express";
import { 
  login, 
  verify2FALogin,
  logout,
  logoutAllDevices,
  refreshToken, 
  getCurrentUser,
  changePassword,
  generate2FASecret,
  enable2FA,
  createUser
} from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// ------------------------------------------------------------------
// 1. PUBLIC ROUTES (Không yêu cầu đăng nhập)
// ------------------------------------------------------------------
router.post("/login", login);
router.post("/verify-2fa", verify2FALogin);
router.post("/refresh-token", refreshToken);

// ------------------------------------------------------------------
// 2. PROTECTED ROUTES (Bắt buộc phải có Access Token hợp lệ)
// ------------------------------------------------------------------

// Chặn Middleware bảo vệ ở đây cho tất cả các Route bên dưới
router.use(authenticateToken);

router.get("/me", getCurrentUser);
router.post("/logout", logout);
router.post("/logout-all", logoutAllDevices);
router.post("/change-password", changePassword);

// API cài đặt Bảo mật 2 lớp (2FA)
router.post("/2fa/generate", generate2FASecret);
router.post("/2fa/enable", enable2FA);

// Tạo User (Đáng lẽ nằm ở User Management, nhưng tạm để ở đây)
router.post("/users", createUser);

export default router;