import { Request, Response } from "express";
import { UserStatus } from "@prisma/client";
import prisma from "../prismaClient";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { logAudit } from "../utils/auditLogger";
import { hashPassword, comparePassword } from "../utils/hash";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { AuthRequest } from "../middleware/authMiddleware";

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "erp_v7_super_secret_key_refresh";

// ==========================================
// HÀM HELPER: GHI LỊCH SỬ ĐĂNG NHẬP
// ==========================================
const logLoginHistory = async (userId: string, ipAddress: string = "", userAgent: string = "", status: string) => {
  try {
    if (userId !== "UNKNOWN") {
      await prisma.loginHistory.create({
        data: { userId, ipAddress, userAgent, status }
      });
    }
  } catch (e) {
    console.error("[Auth Error] Lỗi ghi log đăng nhập:", e);
  }
};

// ==========================================
// 1. ĐĂNG NHẬP (LOGIN)
// ==========================================
export const login = async (req: Request, res: Response): Promise<void> => {
  const email = req.body.email || req.body.username; 
  const password = req.body.password;

  if (!email || !password) {
    res.status(400).json({ message: "Vui lòng nhập đầy đủ email (hoặc tài khoản) và mật khẩu!" });
    return;
  }

  try {
    const user = await prisma.users.findUnique({
      where: { email: String(email) },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });

    if (!user || user.isDeleted) {
      await logLoginHistory("UNKNOWN", req.ip || "", req.headers["user-agent"] || "", "FAILED_USER_NOT_FOUND");
      res.status(401).json({ message: "Email hoặc mật khẩu không chính xác!" });
      return;
    }

    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const lockMinutes = Math.ceil((user.lockedUntil.getTime() - new Date().getTime()) / 60000);
      res.status(403).json({ message: `Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau ${lockMinutes} phút.` });
      return;
    }

    if (user.status === UserStatus.LOCKED && (!user.lockedUntil || new Date() > user.lockedUntil)) {
      res.status(403).json({ message: "Tài khoản của bạn đã bị khóa bởi Quản trị viên!" });
      return;
    }
    
    if (user.status === UserStatus.SUSPENDED) {
      res.status(403).json({ message: "Tài khoản của bạn đang bị đình chỉ hoạt động!" });
      return;
    }

    if (user.status === UserStatus.INACTIVE) {
      res.status(403).json({ message: "Tài khoản của bạn chưa được kích hoạt hoặc đã ngừng hoạt động!" });
      return;
    }

    const isMatch = await comparePassword(String(password), user.passwordHash);
    
    if (!isMatch) {
      const newFails = user.failedLoginAttempts + 1;
      let newStatus: UserStatus = user.status;
      let newLockedUntil = user.lockedUntil;

      if (newFails >= 5) {
        newStatus = UserStatus.LOCKED;
        newLockedUntil = new Date(new Date().getTime() + 15 * 60000);
      }

      await prisma.users.update({
        where: { userId: user.userId },
        data: { failedLoginAttempts: newFails, status: newStatus, lockedUntil: newLockedUntil }
      });

      await logLoginHistory(user.userId, req.ip || "", req.headers["user-agent"] || "", "FAILED_WRONG_PASSWORD");
      res.status(401).json({ message: "Email hoặc mật khẩu không chính xác!" });
      return;
    }

    if (user.twoFactorEnabled) {
      res.json({ message: "Vui lòng nhập mã xác thực 2 bước (2FA).", requires2FA: true, userId: user.userId });
      return;
    }

    await prisma.users.update({
      where: { userId: user.userId },
      data: { failedLoginAttempts: 0, lockedUntil: null, status: UserStatus.ACTIVE, lastLoginAt: new Date() }
    });

    await logLoginHistory(user.userId, req.ip || "", req.headers["user-agent"] || "", "SUCCESS");

    // 🚀 Đã Fix TS7006: Khai báo rõ kiểu (rp: any)
    const permissions = user.role?.permissions.map((rp: any) => rp.permission.code) || [];
    const uniquePermissions = Array.from(new Set(permissions));

    const accessToken = generateAccessToken(user.userId, user.email);
    const refreshToken = await generateRefreshToken(user.userId);

    res.json({
      message: "Đăng nhập thành công!",
      user: {
        userId: user.userId, email: user.email, fullName: user.fullName,
        departmentId: user.departmentId, roleId: user.roleId, permissions: uniquePermissions
      },
      tokens: { accessToken, refreshToken }
    });
  } catch (error: any) {
    console.error("[🔥 Login System Error]:", error);
    res.status(500).json({ message: "Lỗi máy chủ khi xử lý đăng nhập", error: error.message });
  }
};

// ==========================================
// 2. XÁC THỰC 2FA LÚC ĐĂNG NHẬP
// ==========================================
export const verify2FALogin = async (req: Request, res: Response): Promise<void> => {
  const { userId, token } = req.body;

  try {
    const user = await prisma.users.findUnique({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ message: "Tài khoản không hợp lệ hoặc chưa bật tính năng 2FA!" });
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret, encoding: "base32", token: token, window: 1
    });

    if (!verified) {
      await logLoginHistory(user.userId, req.ip || "", req.headers["user-agent"] || "", "FAILED_WRONG_2FA");
      res.status(401).json({ message: "Mã xác thực 2FA không chính xác hoặc đã hết hạn!" });
      return;
    }

    await prisma.users.update({
      where: { userId: user.userId },
      data: { failedLoginAttempts: 0, lockedUntil: null, status: UserStatus.ACTIVE, lastLoginAt: new Date() }
    });

    await logLoginHistory(user.userId, req.ip || "", req.headers["user-agent"] || "", "SUCCESS_2FA");

    // 🚀 Đã Fix TS7006
    const permissions = user.role?.permissions.map((rp: any) => rp.permission.code) || [];
    const uniquePermissions = Array.from(new Set(permissions));

    const accessToken = generateAccessToken(user.userId, user.email);
    const refreshToken = await generateRefreshToken(user.userId);

    res.json({
      message: "Xác thực 2FA thành công!",
      user: {
        userId: user.userId, email: user.email, fullName: user.fullName,
        departmentId: user.departmentId, roleId: user.roleId, permissions: uniquePermissions
      },
      tokens: { accessToken, refreshToken }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi xử lý xác thực 2FA", error: error.message });
  }
};

// ==========================================
// 3. ĐĂNG XUẤT (LOGOUT)
// ==========================================
export const logout = async (req: Request, res: Response): Promise<void> => {
  const token = req.body.refreshToken || req.body.token;
  if (!token) {
    res.status(400).json({ message: "Yêu cầu cung cấp Refresh Token để đăng xuất!" });
    return;
  }

  try {
    await prisma.refreshToken.updateMany({
      where: { token: token },
      data: { revoked: true }
    });
    res.json({ message: "Đăng xuất thành công!" });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi xử lý đăng xuất", error: error.message });
  }
};

// ==========================================
// 4. ĐĂNG XUẤT MỌI THIẾT BỊ
// ==========================================
export const logoutAllDevices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new Error("Không xác định được danh tính người dùng");

    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true }
    });

    await logAudit("Users", userId, "UPDATE", null, { action: "LOGOUT_ALL_DEVICES" }, userId, req.ip);
    res.json({ message: "Đã thu hồi phiên và đăng xuất khỏi mọi thiết bị thành công!" });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi đăng xuất đa thiết bị", error: error.message });
  }
};

// ==========================================
// 5. CẤP LẠI TOKEN (REFRESH TOKEN)
// ==========================================
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const token = req.body.refreshToken || req.body.token;

  if (!token) {
    res.status(401).json({ message: "Vui lòng cung cấp Refresh Token!" });
    return;
  }

  try {
    const savedToken = await prisma.refreshToken.findUnique({ where: { token } });
    
    if (!savedToken) {
      res.status(403).json({ message: "Refresh Token không tồn tại trong hệ thống!" });
      return;
    }

    if (savedToken.revoked) {
      res.status(403).json({ message: "Refresh Token đã bị thu hồi! Phiên làm việc không an toàn." });
      return;
    }

    if (new Date() > savedToken.expiresAt) {
      res.status(403).json({ message: "Refresh Token đã hết hạn! Vui lòng đăng nhập lại." });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (jwtError: any) {
      res.status(403).json({ message: "Chữ ký Refresh Token không hợp lệ hoặc đã hết hạn!" });
      return;
    }

    const user = await prisma.users.findUnique({ 
      where: { userId: decoded.userId },
      select: { userId: true, email: true, status: true, isDeleted: true }
    });

    if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
      res.status(403).json({ message: "Tài khoản không hợp lệ, bị khóa hoặc đã bị vô hiệu hóa!" });
      return;
    }

    const newAccessToken = generateAccessToken(user.userId, user.email);
    
    res.json({ 
      message: "Cấp lại Access Token thành công!",
      accessToken: newAccessToken 
    });

  } catch (error: any) {
    console.error("[🔥 Refresh Token Error]:", error);
    res.status(500).json({ message: "Lỗi máy chủ khi xử lý Refresh Token", error: error.message });
  }
};

// ==========================================
// 6. LẤY THÔNG TIN USER HIỆN TẠI
// ==========================================
export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: "Không xác định được danh tính người dùng!" });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { userId },
      include: {
        department: { 
          select: { 
            name: true, 
            branch: { select: { branchId: true, name: true, company: { select: { companyId: true, name: true } } } } 
          } 
        },
        role: { include: { permissions: { include: { permission: true } } } }
      }
    });

    if (!user || user.isDeleted) {
      res.status(404).json({ message: "Người dùng không tồn tại hoặc đã bị vô hiệu hóa!" });
      return;
    }

    // 🚀 Đã Fix TS7006
    const permissions = user.role?.permissions.map((rp: any) => rp.permission.code) || [];
    const uniquePermissions = Array.from(new Set(permissions));
    
    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    res.json({ ...safeUser, permissions: uniquePermissions });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy thông tin cá nhân", error: error.message });
  }
};

// ==========================================
// 7. ĐỔI MẬT KHẨU
// ==========================================
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user?.userId;

  try {
    if (!userId) throw new Error("Không xác định được người dùng");

    const user = await prisma.users.findUnique({ where: { userId } });
    if (!user) throw new Error("Tài khoản không tồn tại");

    const isMatch = await comparePassword(oldPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: "Mật khẩu hiện tại không chính xác!" });
      return;
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { userId },
        data: { passwordHash: hashedNewPassword, passwordChangedAt: new Date() }
      });

      await tx.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true }
      });
    });

    await logAudit("Users", userId, "UPDATE", null, { action: "CHANGE_PASSWORD" }, userId, req.ip);
    res.json({ message: "Đổi mật khẩu thành công! Bạn đã được đăng xuất khỏi các thiết bị khác." });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi đổi mật khẩu", error: error.message });
  }
};

// ==========================================
// 8. CÀI ĐẶT 2FA
// ==========================================
export const generate2FASecret = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new Error("Người dùng không xác định");
    
    const user = await prisma.users.findUnique({ where: { userId } });
    if (!user) throw new Error("Người dùng không tồn tại");

    const secret = speakeasy.generateSecret({ name: `ERP_V7 (${user.email})` });
    
    await prisma.users.update({
      where: { userId },
      data: { twoFactorSecret: secret.base32 }
    });

    qrcode.toDataURL(secret.otpauth_url!, (err: any, dataUrl: string) => {
      if (err) throw new Error("Lỗi tạo mã QR Code");
      res.json({
        message: "Vui lòng quét mã QR bằng ứng dụng Authenticator để lấy mã 6 số.",
        qrCodeUrl: dataUrl,
        secret: secret.base32
      });
    });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi khởi tạo cấu hình 2FA", error: error.message });
  }
};

// ==========================================
// 9. KÍCH HOẠT / TẮT 2FA
// ==========================================
export const enable2FA = async (req: AuthRequest, res: Response): Promise<void> => {
  const { token } = req.body; 
  const userId = req.user?.userId;

  try {
    if (!userId) throw new Error("Người dùng không xác định");

    const user = await prisma.users.findUnique({ where: { userId } });
    if (!user || !user.twoFactorSecret) {
      res.status(400).json({ message: "Chưa khởi tạo Secret 2FA!" });
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret, encoding: "base32", token, window: 1 
    });

    if (!verified) {
      res.status(400).json({ message: "Mã xác thực không hợp lệ. Kích hoạt thất bại!" });
      return;
    }

    await prisma.users.update({
      where: { userId },
      data: { twoFactorEnabled: true }
    });

    await logAudit("Users", userId, "UPDATE", { twoFactorEnabled: false }, { twoFactorEnabled: true }, userId, req.ip);
    res.json({ message: "Kích hoạt Xác thực 2 bước (2FA) thành công!" });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi kích hoạt 2FA", error: error.message });
  }
};

export const disable2FA = async (req: AuthRequest, res: Response): Promise<void> => {
  const { token } = req.body; 
  const userId = req.user?.userId;

  try {
    if (!userId) throw new Error("Người dùng không xác định");

    const user = await prisma.users.findUnique({ where: { userId } });
    if (!user || !user.twoFactorSecret) {
      res.status(400).json({ message: "Chưa khởi tạo Secret 2FA!" });
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret, encoding: "base32", token, window: 1 
    });

    if (!verified) {
      res.status(400).json({ message: "Mã xác thực không hợp lệ. Tắt 2FA thất bại!" });
      return;
    }

    await prisma.users.update({
      where: { userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });

    res.json({ message: "Tắt Xác thực 2 bước (2FA) thành công!" });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi tắt 2FA", error: error.message });
  }
};

// ==========================================
// 10. TẠO TÀI KHOẢN MỚI
// ==========================================
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, fullName, phone, departmentId, roleId, actionerId } = req.body;
    const hashedPassword = await hashPassword(password);

    // 🚀 NÂNG CẤP: Lưu trực tiếp roleId vào bảng Users (1-1/1-N) thay vì dùng bảng trung gian
    const newUser = await prisma.users.create({
      data: { email, passwordHash: hashedPassword, fullName, phone, departmentId, roleId, status: UserStatus.ACTIVE }
    });

    await logAudit("Users", newUser.userId, "CREATE", null, { email, fullName }, actionerId, req.ip);
    
    const { passwordHash, twoFactorSecret, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo tài khoản nhân viên", error: error.message });
  }
};

// ==========================================
// 11. LẤY LỊCH SỬ ĐĂNG NHẬP 
// ==========================================
export const getMyLoginHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: "Không xác định được người dùng!" });
      return;
    }

    const history = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10 
    });

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy lịch sử đăng nhập", error: error.message });
  }
};