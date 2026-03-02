import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../utils/auditLogger";

const prisma = new PrismaClient();

// Hàm Helper trích xuất userId
const getUserId = (req: Request) => (req as any).user?.userId || req.body.actionerId || req.body.userId;

// ==========================================
// 1. QUẢN LÝ NHÂN VIÊN (USERS CRUD)
// ==========================================
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, departmentId, status } = req.query;
    const users = await prisma.users.findMany({
      where: {
        isDeleted: false,
        ...(departmentId && { departmentId: String(departmentId) }),
        ...(status && { status: status as any }),
        // Lọc theo chi nhánh thông qua phòng ban
        ...(branchId && { department: { branchId: String(branchId) } })
      },
      include: {
        department: { include: { branch: true } },
        roles: { include: { role: { select: { roleId: true, roleName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Ẩn hash mật khẩu và secret 2FA trước khi trả về
    const safeUsers = users.map(user => {
      const { passwordHash, twoFactorSecret, ...safeData } = user;
      return safeData;
    });
    res.json(safeUsers);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách nhân viên", error: error.message });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const user = await prisma.users.findUnique({
      where: { userId: id },
      include: {
        department: { include: { branch: { include: { company: true } } } },
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }
      }
    });

    if (!user || user.isDeleted) {
      res.status(404).json({ message: "Nhân viên không tồn tại!" });
      return;
    }

    const { passwordHash, twoFactorSecret, ...safeData } = user;
    res.json(safeData);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy chi tiết nhân viên", error: error.message });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { fullName, phone, departmentId, status, roleIds } = req.body;
  const actionerId = getUserId(req);

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.users.update({
        where: { userId: id },
        data: { fullName, phone, departmentId, status }
      });

      // Cập nhật Roles (Xóa cũ, thêm mới)
      if (roleIds && Array.isArray(roleIds)) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        if (roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((rId: string) => ({ userId: id, roleId: rId }))
          });
        }
      }
      return user;
    });

    await logAudit("Users", id, "UPDATE", null, updatedUser, actionerId, req.ip);
    
    const { passwordHash, twoFactorSecret, ...safeUser } = updatedUser;
    res.json({ message: "Cập nhật nhân viên thành công!", user: safeUser });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật nhân viên", error: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const actionerId = getUserId(req);
  try {
    // Soft Delete chuẩn ERP, đổi status thành INACTIVE để không cho đăng nhập nữa
    await prisma.users.update({
      where: { userId: id },
      data: { isDeleted: true, status: "INACTIVE" }
    });
    
    // Revoke mọi token đang có của user này
    await prisma.refreshToken.updateMany({
      where: { userId: id, revoked: false },
      data: { revoked: true }
    });

    await logAudit("Users", id, "DELETE", null, { isDeleted: true }, actionerId, req.ip);
    res.json({ message: "Đã vô hiệu hóa và xóa mềm nhân viên!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi vô hiệu hóa nhân viên", error: error.message });
  }
};

// ==========================================
// 2. QUẢN LÝ QUYỀN TRUY CẬP (PERMISSIONS)
// ==========================================
export const getPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { code: 'asc' }
      ]
    });
    
    // Gom nhóm permissions theo module để Frontend dễ render Checkbox Tree
    const groupedPermissions = permissions.reduce((acc: any, curr) => {
      if (!acc[curr.module]) acc[curr.module] = [];
      acc[curr.module].push(curr);
      return acc;
    }, {});

    res.json({
      flat: permissions,
      grouped: groupedPermissions
    });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách quyền", error: error.message });
  }
};

// ==========================================
// 3. QUẢN LÝ VAI TRÒ (ROLES CRUD)
// ==========================================
export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const roles = await prisma.role.findMany({
      where: { isDeleted: false },
      include: { 
        permissions: { include: { permission: true } },
        _count: { select: { users: true } } // Đếm số lượng user đang mang role này
      },
      orderBy: { roleName: 'asc' }
    });
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách Roles", error: error.message });
  }
};

export const createRole = async (req: Request, res: Response): Promise<void> => {
  const { roleName, description, permissionIds } = req.body;
  const actionerId = getUserId(req);

  try {
    const newRole = await prisma.$transaction(async (tx) => {
      const role = await tx.role.create({ data: { roleName, description } });
      if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((pId: string) => ({ roleId: role.roleId, permissionId: pId }))
        });
      }
      return role;
    });
    await logAudit("Role", newRole.roleId, "CREATE", null, newRole, actionerId, req.ip);
    res.status(201).json(newRole);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo Role (Tên Role có thể đã tồn tại)", error: error.message });
  }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { roleName, description, permissionIds } = req.body;
  const actionerId = getUserId(req);

  try {
    const updatedRole = await prisma.$transaction(async (tx) => {
      const oldRole = await tx.role.findUnique({ where: { roleId: id } });
      if (!oldRole || oldRole.isDeleted) throw new Error("Vai trò không tồn tại!");

      const role = await tx.role.update({
        where: { roleId: id },
        data: { roleName, description }
      });

      if (permissionIds && Array.isArray(permissionIds)) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((pId: string) => ({ roleId: id, permissionId: pId }))
          });
        }
      }
      return role;
    });

    await logAudit("Role", id, "UPDATE", null, updatedRole, actionerId, req.ip);
    res.json({ message: "Cập nhật Vai trò thành công!", role: updatedRole });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật Role", error: error.message });
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const actionerId = getUserId(req);

  try {
    await prisma.$transaction(async (tx) => {
      // BẢO VỆ 1: Không cho xóa Role nếu đang có nhân viên sử dụng
      const usersWithRole = await tx.userRole.findFirst({ where: { roleId: id } });
      if (usersWithRole) {
        throw new Error("Không thể xóa Vai trò này vì đang được gán cho nhân viên!");
      }

      // BẢO VỆ 2: Không cho xóa Role nếu đang cấu hình trong Workflow
      const stepWithRole = await tx.approvalStep.findFirst({ where: { roleId: id } });
      if (stepWithRole) {
        throw new Error("Không thể xóa Vai trò này vì đang được sử dụng trong Quy trình phê duyệt (Workflow)!");
      }

      await tx.role.update({
        where: { roleId: id },
        data: { isDeleted: true }
      });
    });

    await logAudit("Role", id, "DELETE", null, { isDeleted: true }, actionerId, req.ip);
    res.json({ message: "Đã vô hiệu hóa Vai trò thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa Role", error: error.message });
  }
};

// ==========================================
// 4. QUẢN LÝ CẤU TRÚC DOANH NGHIỆP TỔNG HỢP
// ==========================================
export const getOrganizationStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const companies = await prisma.company.findMany({
      where: { isDeleted: false },
      include: {
        branches: {
          where: { isDeleted: false },
          include: {
            departments: { where: { isDeleted: false } },
            warehouses: { where: { isDeleted: false } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(companies);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy cấu trúc tổ chức", error: error.message });
  }
};

export const createCostCenter = async (req: Request, res: Response): Promise<void> => {
  const { code, name, description } = req.body;
  const actionerId = getUserId(req);
  try {
    const cc = await prisma.costCenter.create({ data: { code, name, description } });
    await logAudit("CostCenter", cc.costCenterId, "CREATE", null, cc, actionerId, req.ip);
    res.status(201).json(cc);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo Cost Center", error: error.message });
  }
};

// ==========================================
// 5. NHẬT KÝ KIỂM TOÁN HỆ THỐNG (SYSTEM AUDIT LOGS)
// ==========================================
export const getSystemAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, sort } = req.query;
    const logs = await prisma.systemAuditLog.findMany({
      take: limit ? Number(limit) : 100,
      orderBy: { timestamp: sort === 'asc' ? 'asc' : 'desc' },
      include: { user: { select: { fullName: true, email: true } } }
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất Audit Logs", error: error.message });
  }
};

export const getAuditLogsByRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableName, recordId } = req.query;
    const logs = await prisma.systemAuditLog.findMany({
      where: {
        tableName: String(tableName),
        recordId: String(recordId)
      },
      orderBy: { timestamp: 'desc' },
      include: { user: { select: { fullName: true } } }
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất chi tiết Audit Log", error: error.message });
  }
};