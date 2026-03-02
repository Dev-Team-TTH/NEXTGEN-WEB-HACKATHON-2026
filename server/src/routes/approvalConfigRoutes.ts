import { Router } from "express";
import { 
  getWorkflows, 
  getWorkflowById, 
  createWorkflow, 
  updateWorkflow, 
  deleteWorkflow 
} from "../controllers/approvalConfigController";
import { authenticateToken } from "../middleware/authMiddleware"; // Middleware bảo mật

const router = Router();

// Áp dụng xác thực cho toàn bộ các API cấu hình duyệt
router.use(authenticateToken);

// Các Routes CRUD
router.get("/", getWorkflows);
router.get("/:id", getWorkflowById);
router.post("/", createWorkflow);
router.put("/:id", updateWorkflow);
router.delete("/:id", deleteWorkflow);

export default router;