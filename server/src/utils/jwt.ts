import jwt, { SignOptions } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==========================================
// CẤU HÌNH BẢO MẬT (Lấy từ biến môi trường)
// ==========================================
// Đảm bảo có fallback an toàn nếu file .env thiếu cấu hình
const JWT_SECRET = process.env.JWT_SECRET || "erp_v7_super_secret_key_access";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "erp_v7_super_secret_key_refresh";

// Thời gian sống mặc định (Access Token: 1 giờ, Refresh Token: 7 ngày)
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "1h"; 
const REFRESH_TOKEN_EXPIRY_DAYS = process.env.REFRESH_TOKEN_EXPIRY_DAYS 
  ? parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS, 10) 
  : 7; 

// Định nghĩa kiểu dữ liệu Payload được nhúng bên trong Token
export interface JwtPayload {
  userId: string;
  email?: string;
  iat?: number; // Issued At (Thời điểm tạo)
  exp?: number; // Expiration Time (Thời điểm hết hạn)
}

// ==========================================
// 1. CẤP PHÁT ACCESS TOKEN (STATELESS)
// ==========================================
/**
 * Tạo Access Token (JWT) ngắn hạn. 
 * Token này KHÔNG lưu vào DB, dùng để Frontend đính kèm vào Header để gọi API.
 */
export const generateAccessToken = (userId: string, email: string): string => {
  try {
    // Ép kiểu (SignOptions["expiresIn"]) để TypeScript hiểu đúng định dạng thời gian
    const options: SignOptions = {
      expiresIn: ACCESS_TOKEN_EXPIRY as SignOptions["expiresIn"]
    };

    return jwt.sign({ userId, email }, JWT_SECRET, options);
  } catch (error: any) {
    throw new Error(`[JWT Error] Lỗi khởi tạo Access Token: ${error.message}`);
  }
};

// ==========================================
// 2. CẤP PHÁT & LƯU REFRESH TOKEN (STATEFUL)
// ==========================================
/**
 * Tạo Refresh Token dài hạn.
 * Tự động tính toán ngày hết hạn và Lưu thẳng vào Database (bảng RefreshToken).
 */
export const generateRefreshToken = async (userId: string): Promise<string> => {
  try {
    // 1. Sinh chuỗi Token
    const options: SignOptions = {
      expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` as SignOptions["expiresIn"]
    };
    const token = jwt.sign({ userId }, JWT_REFRESH_SECRET, options);
    
    // 2. Tính toán ngày hết hạn chính xác để lưu vào DB (Cộng thêm N ngày)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    // 3. Lưu vào Bảng RefreshToken theo đúng Schema
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        revoked: false
      }
    });

    return token;
  } catch (error: any) {
    throw new Error(`[JWT Error] Lỗi khởi tạo và lưu Refresh Token vào Database: ${error.message}`);
  }
};

// ==========================================
// 3. XÁC THỰC ACCESS TOKEN (VERIFY)
// ==========================================
/**
 * Dùng cho Auth Middleware: Giải mã và kiểm tra tính hợp lệ của chữ ký Access Token.
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error: any) {
    throw new Error(`[JWT Error] Access Token không hợp lệ hoặc đã hết hạn: ${error.message}`);
  }
};

// ==========================================
// 4. KIỂM TRA & XÁC THỰC REFRESH TOKEN NGHIÊM NGẶT
// ==========================================
/**
 * Dùng khi Client yêu cầu cấp lại Access Token mới.
 * Hàm này CHỐT CHẶN BẢO MẬT KÉP: Kiểm tra DB trước, sau đó mới Verify Chữ ký.
 */
export const verifyAndValidateRefreshToken = async (token: string): Promise<JwtPayload> => {
  try {
    // Bước 1: Tra cứu Token trong Database
    const savedToken = await prisma.refreshToken.findUnique({
      where: { token }
    });

    if (!savedToken) {
      throw new Error("Refresh Token không tồn tại trong hệ thống!");
    }

    if (savedToken.revoked) {
      throw new Error("Refresh Token này đã bị thu hồi (Revoked)! Vui lòng đăng nhập lại.");
    }

    if (new Date() > savedToken.expiresAt) {
      throw new Error("Refresh Token đã quá hạn trong Cơ sở dữ liệu!");
    }

    // Bước 2: Giải mã và kiểm tra tính toàn vẹn của chữ ký số JWT
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  } catch (error: any) {
    throw new Error(`[JWT Error] Xác thực Refresh Token thất bại: ${error.message}`);
  }
};

// ==========================================
// 5. THU HỒI TOKEN (REVOKE) - CHỐNG HACKER
// ==========================================
/**
 * Thu hồi 1 Token cụ thể (Dùng khi người dùng chủ động bấm Đăng xuất)
 */
export const revokeRefreshToken = async (token: string): Promise<void> => {
  try {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { revoked: true }
    });
  } catch (error: any) {
    throw new Error(`[JWT Error] Lỗi thu hồi Token đăng xuất: ${error.message}`);
  }
};

/**
 * Thu hồi TOÀN BỘ Token của 1 User (Dùng khi "Đăng xuất mọi thiết bị", Đổi mật khẩu, hoặc Admin khóa tài khoản)
 */
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  try {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true }
    });
  } catch (error: any) {
    throw new Error(`[JWT Error] Lỗi thu hồi toàn bộ token của người dùng: ${error.message}`);
  }
};