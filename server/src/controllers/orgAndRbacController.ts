import { Request, Response } from "express";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";
import bcrypt from "bcrypt";

interface AuthRequest extends Request {
  user?: { userId: string; [key: string]: any };
}

const getUserId = (req: AuthRequest) => req.user?.userId || req.body.actionerId || req.body.userId;

// ==========================================
// 1. USERS CRUD
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
        // 🚀 ĐÃ SỬA: Lấy trực tiếp role (1-1)
        role: { select: { roleId: true, roleName: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });

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
        // 🚀 ĐÃ SỬA: Lấy trực tiếp role và permissions
        role: { include: { permissions: { include: { permission: true } } } }
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
  // 🚀 ĐÃ SỬA: Nhận roleId thay vì roleIds
  const { fullName, email, password, phone, address, departmentId, status, roleId } = req.body;
  const actionerId = getUserId(req);

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: "Email này đã được sử dụng trong hệ thống!" });
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password || "Password@123", saltRounds);

    // 🚀 ĐÃ SỬA: Tạo user trực tiếp kèm roleId, không cần bảng trung gian
    const newUser = await prisma.users.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        address,
        departmentId,
        roleId: roleId || null,
        status: status || "ACTIVE"
      }
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
  // 🚀 ĐÃ SỬA: Nhận roleId
  const { fullName, phone, address, departmentId, status, roleId } = req.body;
  const actionerId = getUserId(req);

  try {
    const updatedUser = await prisma.users.update({
      where: { userId: id },
      data: { 
        fullName, 
        phone, 
        address, 
        departmentId, 
        status,
        roleId: roleId !== undefined ? roleId : undefined // Cập nhật roleId trực tiếp
      } 
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

export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminPin } = req.body;
    const actionerId = getUserId(req);

    if (adminPin !== "123456" && adminPin !== "Admin@2026") {
      await logAudit("Users", id, "UPDATE", { event: "SECURITY_ALERT", reason: "Nhập sai mã PIN Admin khi cố Reset Password" }, { actionerId, ip: req.ip }, actionerId, req.ip);
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

    await logAudit("Users", id, "UPDATE", null, { event: "PASSWORD_RESET", changedBy: actionerId }, actionerId, req.ip);

    res.status(200).json({ message: "Đã đặt lại mật khẩu thành công", newPassword: newPassword });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi hệ thống khi Reset Password", error: error.message });
  }
};

// ==========================================
// 2. PERMISSIONS (NỀN TẢNG CHO DYNAMIC RBAC)
// ==========================================
export const getPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [ { module: 'asc' }, { code: 'asc' } ]
    });
    res.json(permissions);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách quyền", error: error.message });
  }
};

export const seedSystemPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const standardPermissions = [
      { code: "ALL", name: "Super Admin (Quản trị Tối cao)", description: "Quyền năng vô hạn, can thiệp mọi cấu hình", module: "SYSTEM" },
      { code: "MANAGE_SETTINGS", name: "Quản lý Cài đặt", description: "Thay đổi cấu hình máy chủ, logo, múi giờ", module: "SYSTEM" },
      { code: "VIEW_SETTINGS", name: "Xem Cài đặt", description: "Xem các cấu hình chung", module: "SYSTEM" },
      { code: "MANAGE_USERS", name: "Quản lý Nhân sự", description: "Thêm, xóa, khóa, reset mật khẩu nhân viên", module: "USERS" },
      { code: "VIEW_USERS", name: "Xem Danh sách Nhân sự", description: "Xem sơ đồ tổ chức, danh sách nhân viên", module: "USERS" },
      { code: "MANAGE_ROLES", name: "Quản lý Phân quyền", description: "Tạo Vai trò (Role) và gán quyền hạn", module: "USERS" },
      { code: "MANAGE_MASTER_DATA", name: "Quản lý Dữ liệu gốc", description: "Thêm/sửa danh mục, đối tác, thuế, tiền tệ", module: "MASTER_DATA" },
      { code: "VIEW_MASTER_DATA", name: "Xem Dữ liệu gốc", description: "Tra cứu danh mục hệ thống", module: "MASTER_DATA" },
      { code: "MANAGE_INVENTORY", name: "Điều chỉnh Kho bãi", description: "Nhập/xuất thủ công, chuyển kho, kiểm kê", module: "INVENTORY" },
      { code: "VIEW_INVENTORY", name: "Tra cứu Tồn kho", description: "Xem thẻ kho, lịch sử và số lượng hàng hóa", module: "INVENTORY" },
      { code: "MANAGE_TRANSACTION", name: "Tạo Chứng từ Mua/Bán", description: "Lập Đơn hàng (PO/SO), Nhập kho (GRPO)", module: "TRANSACTIONS" },
      { code: "VIEW_TRANSACTION", name: "Xem Lịch sử Giao dịch", description: "Tra cứu chứng từ mua bán, hóa đơn", module: "TRANSACTIONS" },
      { code: "MANAGE_ACCOUNTING", name: "Ghi sổ Kế toán", description: "Tạo bút toán thủ công, đảo sổ, khóa kỳ", module: "ACCOUNTING" },
      { code: "VIEW_ACCOUNTING", name: "Xem Sổ Kế toán", description: "Xem sổ cái, bảng cân đối, lưu chuyển tiền tệ", module: "ACCOUNTING" },
      { code: "MANAGE_EXPENSES", name: "Lập Phiếu Chi", description: "Tạo và ghi nhận chứng từ chi phí", module: "EXPENSES" },
      { code: "VIEW_EXPENSES", name: "Tra cứu Phiếu Chi", description: "Xem danh sách và lịch sử chi phí", module: "EXPENSES" },
      { code: "MANAGE_ASSET", name: "Quản trị Tài sản", description: "Cấp phát, thanh lý, tính khấu hao TSCĐ", module: "ASSETS" },
      { code: "VIEW_ASSET", name: "Xem Tài sản", description: "Xem danh sách và lịch sử tài sản", module: "ASSETS" },
      { code: "MANAGE_APPROVALS", name: "Cấu hình Quy trình", description: "Thiết lập các bước duyệt (Workflow)", module: "APPROVALS" },
      { code: "APPROVE_DOCUMENTS", name: "Thực hiện Phê duyệt", description: "Có quyền Bấm nút Duyệt hoặc Từ chối tờ trình", module: "APPROVALS" },
      { code: "VIEW_APPROVALS", name: "Xem Bảng Phê duyệt", description: "Xem tiến trình và trạng thái các tờ trình", module: "APPROVALS" },
      { code: "VIEW_DASHBOARD", name: "Trực quan hóa Dữ liệu", description: "Xem biểu đồ tổng quan, báo cáo BI", module: "DASHBOARD" }
    ];

    let addedCount = 0;
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const perm of standardPermissions) {
        const existing = await tx.permission.findUnique({ where: { code: perm.code } });
        
        if (existing) {
          await tx.permission.update({
            where: { permissionId: existing.permissionId },
            data: { name: perm.name, description: perm.description, module: perm.module }
          });
          updatedCount++;
        } else {
          await tx.permission.create({
            data: perm
          });
          addedCount++;
        }
      }
    }, 
    {
      maxWait: 5000, 
      timeout: 15000 
    });

    res.json({ 
      message: "Đã làm mới và chuẩn hóa Ma trận Quyền!", 
      added_new: addedCount,
      updated_existing: updatedCount,
      total_permissions: standardPermissions.length 
    });
  } catch (error: any) {
    console.error("🔥 LỖI CRASH API SEED:", error);
    res.status(500).json({ message: "Lỗi đồng bộ Quyền", error: error.message });
  }
};

// ==========================================
// 3. ROLES CRUD (KIẾN TRÚC MỚI - CHUẨN UUID)
// ==========================================
export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const roles = await prisma.role.findMany({
      where: { isDeleted: false },
      include: { 
        permissions: { include: { permission: true } },
        _count: { select: { users: true } } // 🚀 ĐÃ SỬA: Đếm trực tiếp số User sở hữu Role này
      },
      orderBy: { roleName: 'asc' }
    });

    res.json(roles);
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
      // 🚀 ĐÃ SỬA: Tìm trong bảng Users thay vì bảng UserRole
      const usersWithRole = await tx.users.findFirst({ where: { roleId: id } });
      if (usersWithRole) throw new Error("Không thể xóa Vai trò này vì đang được gán cho nhân viên!");

      const stepWithRole = await tx.approvalStep.findFirst({ where: { roleId: id } });
      if (stepWithRole) throw new Error("Không thể xóa Vai trò vì đang được sử dụng trong Quy trình phê duyệt!");

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
// 4. ORGANIZATION & AUDIT
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

export const getSystemAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 15, search, action, tableName } = req.query;
    
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const whereCondition: any = {};
    if (action && action !== "ALL") whereCondition.action = action;
    if (tableName && tableName !== "ALL") whereCondition.tableName = tableName;

    if (search) {
      whereCondition.OR = [
        { recordId: { contains: String(search), mode: 'insensitive' } },
        { user: { fullName: { contains: String(search), mode: 'insensitive' } } },
        { user: { email: { contains: String(search), mode: 'insensitive' } } }
      ];
    }

    const [total, logs] = await prisma.$transaction([
      prisma.systemAuditLog.count({ where: whereCondition }),
      prisma.systemAuditLog.findMany({
        where: whereCondition, skip, take: limitNum,
        orderBy: { timestamp: 'desc' }, 
        include: { user: { select: { fullName: true, email: true } } }
      })
    ]);

    res.json({ data: logs, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất nhật ký", error: error.message });
  }
};

export const getAuditLogsByRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableName, recordId } = req.query;
    const logs = await prisma.systemAuditLog.findMany({
      where: { tableName: String(tableName), recordId: String(recordId) },
      orderBy: { timestamp: 'desc' },
      include: { user: { select: { fullName: true } } }
    });
    const safeLogs = logs.map(log => ({
      ...log, tableName: log.tableName || "SYSTEM", action: log.action || "SYSTEM_EVENT",
      createdAt: log.timestamp, module: log.tableName
    }));
    res.json(safeLogs);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất chi tiết Audit", error: error.message });
  }
};