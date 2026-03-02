import { Router } from "express";
import { 
  submitForApproval, 
  processApproval, // ĐÃ SỬA: từ processApprovalAction -> processApproval
  getPendingApprovals,
  getMyRequests,
  getApprovalById, // ĐÃ SỬA: từ getApprovalDetails -> getApprovalById
  cancelApprovalRequest
} from "../controllers/approvalController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Bắt buộc xác thực Token cho toàn bộ luồng phê duyệt
router.use(authenticateToken);

// ------------------------------------------------------------------
// API TRUY VẤN DANH SÁCH & CHI TIẾT
// ------------------------------------------------------------------
router.get("/pending", getPendingApprovals); // Dành cho Người Duyệt (Sếp)
router.get("/my-requests", getMyRequests);   // Dành cho Người Trình (Nhân viên)
router.get("/:id", getApprovalById);         // Xem chi tiết Timeline

// ------------------------------------------------------------------
// API THAO TÁC NGHIỆP VỤ (HÀNH ĐỘNG)
// ------------------------------------------------------------------
router.post("/submit", submitForApproval);
router.post("/:requestId/action", processApproval); // ĐÃ SỬA
router.post("/:requestId/cancel", cancelApprovalRequest); // Thu hồi

export default router;