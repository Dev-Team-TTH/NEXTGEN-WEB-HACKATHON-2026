import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "erp_v7_super_secret_key_access";

// ==========================================
// MỞ RỘNG INTERFACE CỦA EXPRESS REQUEST
// ==========================================
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
  // ĐÃ THÊM: Lưu sẵn quyền và vai trò vào Request để các hàm sau không cần gọi DB nữa
  userRoles?: string[];
  userPermissions?: string[];
}

// ==========================================
// CƠ CHẾ CACHE TRÁNH DB BOTTLENECK 🚀 (ĐÃ NÂNG CẤP)
// ==========================================
// Lưu trữ Trạng thái, Vai trò và Phân quyền trên RAM.
// Giải quyết bài toán: 10 API gọi cùng lúc chỉ tốn đúng 1 câu Query DB mỗi 60 giây.
interface CachedUser {
  status: string;
  isDeleted: boolean;
  roles: string[];
  permissions: string[];
  exp: number;
}

const userSecurityCache = new Map<string, CachedUser>();
const CACHE_TTL = 60 * 1000; // Tuổi thọ bộ đệm: 60 giây (1 phút)

// ==========================================
// 1. XÁC THỰC NGƯỜI DÙNG (AUTHENTICATE TOKEN)
// ==========================================
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];
    
    // Bắt lỗi vặt: Header không tồn tại hoặc không đúng chuẩn "Bearer <token>"
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Từ chối truy cập! Access Token bị thiếu hoặc sai định dạng." });
      return;
    }

    const token = authHeader.split(" ")[1];

    // 1. GIẢI MÃ TOKEN (Dùng hàm đồng bộ để try/catch bắt được lỗi ngay lập tức)
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError: any) {
      // Bắt chuẩn xác lỗi Hết hạn hoặc Sai chữ ký để trả về 401 (Giúp Redux Client kích hoạt Refresh Token)
      if (jwtError.name === "TokenExpiredError" || jwtError.name === "JsonWebTokenError") {
        res.status(401).json({ message: "Access Token không hợp lệ hoặc đã hết hạn!" });
        return;
      }
      throw jwtError; // Quăng lỗi lạ ra catch tổng
    }

    const userId = decoded.userId;
    const now = Date.now();

    // 2. LẤY DATA TỪ CACHE HOẶC DATABASE
    let cachedData = userSecurityCache.get(userId);

    if (!cachedData || cachedData.exp < now) {
      // Nâng cấp: Lấy luôn Roles và Permissions trong 1 lần query duy nhất
      const user = await prisma.users.findUnique({
        where: { userId },
        include: {
          roles: {
            include: { role: { include: { permissions: { include: { permission: true } } } } }
          }
        }
      });

      if (!user) {
        res.status(401).json({ message: "Tài khoản không tồn tại trên hệ thống!" });
        return;
      }

      // Ép phẳng mảng Roles và Permissions
      const userRoles = user.roles.map(ur => ur.role.roleName);
      const rawPermissions = user.roles.flatMap(ur => ur.role.permissions.map(rp => rp.permission.code));
      const uniquePermissions = Array.from(new Set(rawPermissions));

      // Lưu kết quả vào Cache RAM
      cachedData = {
        status: user.status,
        isDeleted: user.isDeleted,
        roles: userRoles,
        permissions: uniquePermissions,
        exp: now + CACHE_TTL
      };
      userSecurityCache.set(userId, cachedData);
    }

    // 3. KIỂM TRA TRẠNG THÁI TÀI KHOẢN (Vẫn giữ 403 Forbidden ở đây vì đây là lỗi Khóa tài khoản)
    if (cachedData.isDeleted || cachedData.status !== "ACTIVE") {
      res.status(403).json({ 
        message: `Tài khoản của bạn hiện đang ở trạng thái [${cachedData.status}]. Vui lòng liên hệ Quản trị viên!` 
      });
      return;
    }

    // 4. GẮN DỮ LIỆU VÀO REQUEST
    req.user = { userId: decoded.userId, email: decoded.email };
    req.userRoles = cachedData.roles;             // Truyền Role đi tiếp
    req.userPermissions = cachedData.permissions; // Truyền Permission đi tiếp
    
    next();
  } catch (error: any) {
    console.error("[Auth Guard Error]:", error);
    res.status(500).json({ message: "Lỗi xác thực hệ thống", error: error.message });
  }
};

// ==========================================
// 2. PHÂN QUYỀN DỰA TRÊN MÃ QUYỀN (PERMISSION GUARD)
// ==========================================
/**
 * Chặn các Request không đủ mã Quyền.
 * ĐÃ TỐI ƯU: Đọc thẳng từ RAM (req.userPermissions) với tốc độ 0.001ms, KHÔNG GỌI DATABASE NỮA!
 */
export const requirePermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Nếu mảng quyền không tồn tại hoặc không chứa mã quyền yêu cầu -> Chặn
    if (!req.userPermissions || !req.userPermissions.includes(requiredPermission)) {
      res.status(403).json({ 
        message: `Lỗi phân quyền: Bạn không có quyền thực hiện thao tác này! (Mã quyền yêu cầu: ${requiredPermission})` 
      });
      return;
    }
    
    next(); // Có quyền -> Đi tiếp
  };
};

// ==========================================
// 3. PHÂN QUYỀN DỰA TRÊN VAI TRÒ (ROLE GUARD)
// ==========================================
/**
 * Chặn các Request không đúng Vai trò (VD: Chỉ SYSTEM_ADMIN mới được vào)
 * ĐÃ TỐI ƯU: Đọc thẳng từ RAM (req.userRoles) cực nhanh.
 */
export const requireRole = (requiredRole: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Nếu mảng vai trò không tồn tại hoặc không chứa vai trò yêu cầu -> Chặn
    if (!req.userRoles || !req.userRoles.includes(requiredRole)) {
      res.status(403).json({ 
        message: `Lỗi truy cập: Chức năng này chỉ dành riêng cho vai trò [${requiredRole}]!` 
      });
      return;
    }

    next();
  };
};