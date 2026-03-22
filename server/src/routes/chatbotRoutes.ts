import { Router } from "express";
import { handleChatRequest } from "../controllers/chatbotController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// ==========================================
// THIẾT LẬP CÁC ENDPOINT CHO TRỢ LÝ AI (CHATBOT)
// ==========================================

/**
 * @route   POST /api/v1/chatbot/ask
 * @desc    Gửi câu hỏi và ngữ cảnh cho AI xử lý (Có hỗ trợ Lịch sử trò chuyện)
 * @access  Private (Chỉ người dùng đã đăng nhập mới được gọi)
 */
router.post("/ask", authenticateToken, handleChatRequest);

// (Tùy chọn tương lai): Thêm các route lưu lịch sử
// router.get("/history", authenticateToken, getChatHistory);

export default router;