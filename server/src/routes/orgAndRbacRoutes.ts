import { Router } from "express";
import { 
  getUsers, getUserById, createUser, updateUser, deleteUser, resetUserPassword,
  getPermissions,
  getRoles, createRole, updateRole, deleteRole,
  getOrganizationStructure, createCostCenter, getSystemAuditLogs, getAuditLogsByRecord
} from "../controllers/orgAndRbacController";
import { authenticateToken, requirePermission } from "../middleware/authMiddleware";

const router = Router();

// BẮT BUỘC BẢO MẬT: Phân quyền và cấu trúc là dữ liệu tuyệt mật
router.use(authenticateToken);

// ------------------------------------------------------------------
// 1. NHÂN VIÊN & ĐỊNH DANH (USERS)
// ------------------------------------------------------------------
router.get("/users", getUsers);
router.get("/users/:id", getUserById);

// Đã bổ sung Route tạo mới người dùng
router.post("/users", createUser); 

router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Route bảo mật đặc biệt: Reset Mật khẩu (Yêu cầu quyền MANAGE_USERS)
router.post("/users/:id/reset-password", requirePermission("MANAGE_USERS"), resetUserPassword);

// ------------------------------------------------------------------
// 2. PHÂN QUYỀN (ROLES & PERMISSIONS)
// ------------------------------------------------------------------
router.get("/permissions", getPermissions);

router.get("/roles", getRoles);
router.post("/roles", createRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

// ------------------------------------------------------------------
// 3. CẤU TRÚC DOANH NGHIỆP & KIỂM TOÁN (ORG STRUCTURE & AUDIT LOGS)
// ------------------------------------------------------------------
router.get("/organization", getOrganizationStructure);
router.post("/cost-centers", createCostCenter);
router.get("/audit-logs", getSystemAuditLogs);
router.get("/audit-logs/detail", getAuditLogsByRecord);

export default router;