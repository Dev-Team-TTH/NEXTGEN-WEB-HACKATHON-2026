import { Router } from "express";
import { 
  getUsers, getUserById, updateUser, deleteUser, 
  getPermissions,
  getRoles, createRole, updateRole, deleteRole,
  getOrganizationStructure, createCostCenter, getSystemAuditLogs, getAuditLogsByRecord
} from "../controllers/orgAndRbacController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// BẮT BUỘC BẢO MẬT: Phân quyền và cấu trúc là dữ liệu tuyệt mật
router.use(authenticateToken);

// ------------------------------------------------------------------
// 1. NHÂN VIÊN (USERS)
// ------------------------------------------------------------------
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// ------------------------------------------------------------------
// 2. PHÂN QUYỀN (ROLES & PERMISSIONS)
// ------------------------------------------------------------------
router.get("/permissions", getPermissions);

router.get("/roles", getRoles);
router.post("/roles", createRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

// ------------------------------------------------------------------
// 3. CẤU TRÚC DOANH NGHIỆP (ORG STRUCTURE SUMMARY)
// ------------------------------------------------------------------
router.get("/organization", getOrganizationStructure);
router.post("/cost-centers", createCostCenter);
router.get("/audit-logs", getSystemAuditLogs);
router.get("/audit-logs/detail", getAuditLogsByRecord);

export default router;