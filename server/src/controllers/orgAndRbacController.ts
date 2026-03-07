import { Request, Response } from "express";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";
import bcrypt from "bcrypt";

// Mở rộng Request để hỗ trợ Type cho JWT Payload
interface AuthRequest extends Request {
  user?: { userId: string; [key: string]: any };
}

// Hàm Helper trích xuất userId an toàn
const getUserId = (req: AuthRequest) => req.user?.userId || req.body.actionerId || req.body.userId;

// ==========================================
// 1. QUẢN LÝ NHÂN VIÊN / TÀI KHOẢN (USERS CRUD)
// ==========================================
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, departmentId, status } = req.query;
    const users = await prisma.users.findMany({
      where: {
        isDeleted: false,
        ...(departmentId && { departmentId: String(departmentId) }),
        ...(status && { status: status as any }),
        ...(branchId && { department: { branchId: String(branchId) } })
      },
      include: {
        department: { include: { branch: true } },
        roles: { include: { role: { select: { roleId: true, roleName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Ẩn hash mật khẩu và secret 2FA trước khi trả về cho Frontend
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
      res.status(404).json({ message: "Tài khoản không tồn tại!" });
      return;
    }

    const { passwordHash, twoFactorSecret, ...safeData } = user;
    res.json(safeData);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy chi tiết nhân viên", error: error.message });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { fullName, email, password, phone, address, departmentId, status, roleIds } = req.body;
  const actionerId = getUserId(req);

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: "Email này đã được sử dụng trong hệ thống!" });
      return;
    }

    // Hash mật khẩu an toàn
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password || "Password@123", saltRounds);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          email,
          passwordHash,
          fullName,
          phone,
          address,
          departmentId,
          status: status || "ACTIVE"
          // ĐÃ XÓA is2FAEnabled ĐỂ FIX LỖI TS2353. DB sẽ tự động dùng @default(false)
        }
      });

      // Liên kết Role
      if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((rId: string) => ({ userId: user.userId, roleId: rId }))
        });
      }
      return user;
    });

    await logAudit("Users", newUser.userId, "CREATE", null, newUser, actionerId, req.ip);

    const { passwordHash: ph, twoFactorSecret, ...safeUser } = newUser;
    res.status(201).json({ message: "Đã cấp phát tài khoản mới", user: safeUser });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi tạo tài khoản", error: error.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { fullName, phone, address, departmentId, status, roleIds } = req.body;
  const actionerId = getUserId(req);

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.users.update({
        where: { userId: id },
        data: { fullName, phone, address, departmentId, status } 
      });

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

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const actionerId = getUserId(req);
  try {
    await prisma.users.update({
      where: { userId: id },
      data: { isDeleted: true, status: "INACTIVE" }
    });
    
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
// THỰC THI BẢO MẬT: RESET MẬT KHẨU
// ==========================================
export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminPin } = req.body;
    const actionerId = getUserId(req);

    if (adminPin !== "123456" && adminPin !== "Admin@2026") {
      // FIX LỖI TS2345: Chuyển SECURITY_ALERT thành chuẩn UPDATE
      await logAudit(
        "Users", 
        id, 
        "UPDATE", 
        { event: "SECURITY_ALERT", reason: "Nhập sai mã PIN Admin khi cố Reset Password" }, 
        { actionerId, ip: req.ip }, 
        actionerId, 
        req.ip
      );
      res.status(403).json({ message: "Mã PIN Quản trị không hợp lệ! Hệ thống đã ghi nhận cảnh báo." });
      return;
    }

    const newPassword = `Pass@${Math.floor(1000 + Math.random() * 9000)}`;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.users.update({
      where: { userId: id },
      data: { passwordHash: hashedPassword }
    });

    // FIX LỖI TS2345: Chuyển RESET_PASSWORD thành chuẩn UPDATE
    await logAudit(
      "Users", 
      id, 
      "UPDATE", 
      null, 
      { event: "PASSWORD_RESET", changedBy: actionerId }, 
      actionerId, 
      req.ip
    );

    res.status(200).json({ 
      message: "Đã đặt lại mật khẩu thành công", 
      newPassword: newPassword 
    });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi hệ thống khi Reset Password", error: error.message });
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
    
    res.json(permissions);
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
        permissions: { include: { permission: true } }
      },
      orderBy: { roleName: 'asc' }
    });

    const roleIds = roles.map(r => r.roleId);

    let userRoles: any[] = [];
    if (roleIds.length > 0) {
      userRoles = await prisma.userRole.findMany({
        where: { roleId: { in: roleIds } },
        select: { roleId: true, userId: true }
      });
    }

    const enrichedRoles = roles.map(role => {
      const count = userRoles.filter(ur => ur.roleId === role.roleId).length;
      return {
        ...role,
        _count: { users: count } 
      };
    });

    res.json(enrichedRoles);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách Roles", error: error.message });
  }
};

export const createRole = async (req: AuthRequest, res: Response): Promise<void> => {
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

export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
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

export const deleteRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const actionerId = getUserId(req);

  try {
    await prisma.$transaction(async (tx) => {
      const usersWithRole = await tx.userRole.findFirst({ where: { roleId: id } });
      if (usersWithRole) throw new Error("Không thể xóa Vai trò này vì đang được gán cho nhân viên!");

      const stepWithRole = await tx.approvalStep.findFirst({ where: { roleId: id } });
      if (stepWithRole) throw new Error("Không thể xóa Vai trò này vì đang được sử dụng trong Quy trình phê duyệt (Workflow)!");

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

export const createCostCenter = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const takeCount = limit && !isNaN(Number(limit)) ? Number(limit) : 100;
    const sortOrder = sort === 'asc' ? 'asc' : 'desc';

    const logs = await prisma.systemAuditLog.findMany({
      take: takeCount,
      orderBy: { timestamp: sortOrder },
      include: {
        user: { select: { fullName: true, email: true } }
      }
    });

    const safeLogs = logs.map(log => ({
      ...log,
      tableName: log.tableName || "SYSTEM", 
      action: log.action || "SYSTEM_EVENT",
      createdAt: log.timestamp, 
      module: log.tableName      
    }));

    res.json(safeLogs);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất Audit Logs", error: error.message });
  }
};

export const getAuditLogsByRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableName, recordId } = req.query;
    
    const logs = await prisma.systemAuditLog.findMany({
      where: { tableName: String(tableName), recordId: String(recordId) },
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { fullName: true } }
      }
    });

    const safeLogs = logs.map(log => ({
      ...log,
      tableName: log.tableName || "SYSTEM",
      action: log.action || "SYSTEM_EVENT",
      createdAt: log.timestamp,
      module: log.tableName
    }));

    res.json(safeLogs);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất chi tiết Audit Log", error: error.message });
  }
};