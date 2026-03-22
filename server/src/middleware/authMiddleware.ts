import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// [GIẢI PHÁP CHUẨN KIẾN TRÚC] Import Prisma Client dùng chung (Singleton)
import prisma from "../prismaClient";

const JWT_SECRET = process.env.JWT_SECRET || "erp_v7_super_secret_key_access";

// ==========================================
// MỞ RỘNG INTERFACE CỦA EXPRESS REQUEST
// ==========================================
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    [key: string]: any;
  };
  userRoles?: string[];
  userPermissions?: string[];
}

// ==========================================
// CƠ CHẾ CACHE TRÁNH DB BOTTLENECK 🚀 (ĐÃ NÂNG CẤP)
// ==========================================
interface CachedUser {
  status: string;
  isDeleted: boolean;
  roles: string[];
  permissions: string[];
  exp: number;
}

const userSecurityCache = new Map<string, CachedUser>();
const CACHE_TTL = 60 * 1000; // Tuổi thọ bộ đệm: 60 giây

// 🧹 GARBAGE COLLECTOR: BỘ THU GOM RÁC TỰ ĐỘNG CHỐNG MEMORY LEAK
// Chạy ngầm mỗi 5 phút để xóa các Cache đã hết hạn, giải phóng RAM cho Node.js
setInterval(() => {
  const now = Date.now();
  for (const [userId, cachedData] of userSecurityCache.entries()) {
    if (cachedData.exp < now) {
      userSecurityCache.delete(userId);
    }
  }
}, 5 * 60 * 1000); 

// ==========================================
// 1. XÁC THỰC NGƯỜI DÙNG (AUTHENTICATE TOKEN)
// ==========================================
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Từ chối truy cập! Access Token bị thiếu hoặc sai định dạng." });
      return;
    }

    const token = authHeader.split(" ")[1];

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError: any) {
      if (jwtError.name === "TokenExpiredError" || jwtError.name === "JsonWebTokenError") {
        res.status(401).json({ message: "Access Token không hợp lệ hoặc đã hết hạn!" });
        return;
      }
      throw jwtError; 
    }

    const userId = decoded.userId;
    const now = Date.now();

    let cachedData: CachedUser | undefined = userSecurityCache.get(userId);

    if (!cachedData || cachedData.exp < now) {
      const user = await prisma.users.findUnique({
        where: { userId },
        include: {
          role: { include: { permissions: { include: { permission: true } } } }
        }
      });

      if (!user) {
        res.status(401).json({ message: "Tài khoản không tồn tại trên hệ thống!" });
        return;
      }

      const userRoles: string[] = user.role ? [user.role.roleName] : [];
      const rawPermissions: string[] = user.role?.permissions.map((rp: any) => rp.permission.code) || [];
      const uniquePermissions: string[] = Array.from(new Set(rawPermissions));

      cachedData = {
        status: user.status,
        isDeleted: user.isDeleted,
        roles: userRoles,
        permissions: uniquePermissions,
        exp: now + CACHE_TTL
      };
      userSecurityCache.set(userId, cachedData);
    }

    const validCache: CachedUser = cachedData;

    if (validCache.isDeleted || validCache.status !== "ACTIVE") {
      res.status(403).json({ 
        message: `Tài khoản của bạn hiện đang ở trạng thái [${validCache.status}]. Vui lòng liên hệ Quản trị viên!` 
      });
      return;
    }

    req.user = { userId: decoded.userId, email: decoded.email };
    req.userRoles = validCache.roles;             
    req.userPermissions = validCache.permissions; 
    
    next();
  } catch (error: any) {
    console.error("[Auth Guard Error]:", error);
    res.status(500).json({ message: "Lỗi xác thực hệ thống", error: error.message });
  }
};

// ==========================================
// 2. PHÂN QUYỀN DỰA TRÊN MÃ QUYỀN (PERMISSION GUARD)
// ==========================================
export const requirePermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userPermissions || !req.userPermissions.includes(requiredPermission)) {
      res.status(403).json({ 
        message: `Lỗi phân quyền: Bạn không có quyền thực hiện thao tác này! (Mã quyền yêu cầu: ${requiredPermission})` 
      });
      return;
    }
    next(); 
  };
};

// ==========================================
// 3. PHÂN QUYỀN DỰA TRÊN VAI TRÒ (ROLE GUARD)
// ==========================================
export const requireRole = (requiredRole: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRoles || !req.userRoles.includes(requiredRole)) {
      res.status(403).json({ 
        message: `Lỗi truy cập: Chức năng này chỉ dành riêng cho vai trò [${requiredRole}]!` 
      });
      return;
    }
    next();
  };
};