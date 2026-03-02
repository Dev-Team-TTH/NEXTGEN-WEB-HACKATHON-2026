import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "erp_v7_super_secret_key_access";

// ==========================================
// MỞ RỘNG INTERFACE CỦA EXPRESS REQUEST
// ==========================================
// Giúp các Controller có thể gọi req.user.userId mà không bị TypeScript báo lỗi
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

// ==========================================
// CƠ CHẾ CACHE TRÁNH DB BOTTLENECK 🚀
// ==========================================
// Lưu trữ trạng thái User tạm thời trên RAM.
// Giải quyết bài toán: 1 User gọi 10 API cùng lúc sẽ không nã 10 câu query giống nhau vào Database.
const userStatusCache = new Map<string, { status: string; isDeleted: boolean; exp: number }>();
const CACHE_TTL = 60 * 1000; // Tuổi thọ bộ đệm: 60 giây (1 phút)

// ==========================================
// 1. XÁC THỰC NGƯỜI DÙNG (AUTHENTICATE TOKEN)
// ==========================================
/**
 * Middleware: Xác thực JWT Access Token & Kiểm tra trạng thái User.
 * Bắt buộc đặt trước mọi Route cần bảo mật.
 */
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Format yêu cầu: "Bearer <token>"

    if (!token) {
      res.status(401).json({ message: "Từ chối truy cập! Không tìm thấy Access Token." });
      return;
    }

    // 1. Giải mã Token
    jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
      if (err) {
        res.status(403).json({ message: "Access Token không hợp lệ hoặc đã hết hạn!" });
        return;
      }

      const userId = decoded.userId;
      const now = Date.now();

      // 2. BẢO MẬT NÂNG CAO & TỐI ƯU HIỆU NĂNG: Kiểm tra trạng thái User
      // Lấy từ Cache RAM trước để giảm tải Database
      let cachedUser = userStatusCache.get(userId);

      // Nếu không có Cache hoặc Cache đã quá hạn 1 phút -> Query DB
      if (!cachedUser || cachedUser.exp < now) {
        const user = await prisma.users.findUnique({
          where: { userId },
          select: { status: true, isDeleted: true } // Chỉ select 2 trường để tối ưu RAM & Tốc độ
        });

        if (!user) {
          res.status(401).json({ message: "Tài khoản không tồn tại trên hệ thống!" });
          return;
        }

        // Lưu kết quả mới nhất vào Bộ đệm Cache
        cachedUser = {
          status: user.status,
          isDeleted: user.isDeleted,
          exp: now + CACHE_TTL
        };
        userStatusCache.set(userId, cachedUser);
      }

      // 3. Phân tích kết quả (Từ Cache hoặc DB)
      if (cachedUser.isDeleted || cachedUser.status !== "ACTIVE") {
        res.status(403).json({ 
          message: `Tài khoản của bạn hiện đang ở trạng thái [${cachedUser.status}]. Vui lòng liên hệ Quản trị viên!` 
        });
        return;
      }

      // 4. Gắn thông tin User vào Request để Controller phía sau sử dụng
      req.user = decoded;
      next();
    });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi xác thực hệ thống", error: error.message });
  }
};

// ==========================================
// 2. PHÂN QUYỀN DỰA TRÊN MÃ QUYỀN (PERMISSION GUARD)
// ==========================================
/**
 * Middleware Factory: Cấp quyền truy cập dựa trên Mã Quyền (Permission Code).
 * Cách dùng ở Route: router.post("/products", authenticateToken, requirePermission("CREATE_PRODUCT"), createProduct)
 * @param requiredPermission Mã quyền bắt buộc (Ví dụ: "VIEW_DASHBOARD", "CREATE_DOCUMENT")
 */
export const requirePermission = (requiredPermission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: "Không xác định được danh tính người dùng!" });
        return;
      }

      // Truy vấn trực tiếp xem User này có mang Role nào chứa Permission tương ứng không
      const hasPermission = await prisma.userRole.findFirst({
        where: {
          userId: userId,
          role: {
            isDeleted: false,
            permissions: {
              some: {
                permission: {
                  code: requiredPermission
                }
              }
            }
          }
        }
      });

      if (!hasPermission) {
        res.status(403).json({ 
          message: `Lỗi phân quyền: Bạn không có quyền thực hiện thao tác này! (Mã quyền yêu cầu: ${requiredPermission})` 
        });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ message: "Lỗi kiểm tra phân quyền", error: error.message });
    }
  };
};

// ==========================================
// 3. PHÂN QUYỀN DỰA TRÊN VAI TRÒ (ROLE GUARD)
// ==========================================
/**
 * Middleware Factory: Cấp quyền truy cập dựa trên Tên Vai Trò (Role Name).
 * Hữu ích cho các route chỉ dành riêng cho Ban Giám Đốc hoặc IT Admin.
 * Cách dùng: router.delete("/users/:id", authenticateToken, requireRole("SYSTEM_ADMIN"), deleteUser)
 * @param requiredRole Tên vai trò bắt buộc (Ví dụ: "SYSTEM_ADMIN", "CHIEF_ACCOUNTANT")
 */
export const requireRole = (requiredRole: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: "Không xác định được danh tính người dùng!" });
        return;
      }

      const hasRole = await prisma.userRole.findFirst({
        where: {
          userId: userId,
          role: {
            roleName: requiredRole,
            isDeleted: false
          }
        }
      });

      if (!hasRole) {
        res.status(403).json({ 
          message: `Lỗi phân quyền: Chức năng này chỉ dành cho vai trò [${requiredRole}]!` 
        });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ message: "Lỗi kiểm tra vai trò", error: error.message });
    }
  };
};