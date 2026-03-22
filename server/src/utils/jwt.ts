import jwt, { SignOptions } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Nạp biến môi trường (Đề phòng gọi file utils này độc lập)
dotenv.config();

// Lưu ý: Nếu trong project bạn đã có 1 file export PrismaClient (VD: lib/prisma.ts)
// thì nên import từ file đó để tránh bị lỗi "Too many connections" khi dev HMR.
const prisma = new PrismaClient();

// ==========================================
// CẤU HÌNH BẢO MẬT (ENTERPRISE STANDARD - FAIL-FAST)
// ==========================================
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// 🚨 NGUYÊN LÝ FAIL-FAST: Nếu thiếu Secret Key, ép sập toàn bộ hệ thống ngay lúc khởi động
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error("====================================================================");
  console.error("🔥 [FATAL ERROR]: BẢO MẬT HỆ THỐNG BỊ XÂM PHẠM!");
  console.error("🔥 Không tìm thấy biến môi trường JWT_SECRET hoặc JWT_REFRESH_SECRET.");
  console.error("🔥 Vui lòng kiểm tra lại file .env hoặc cấu hình trên Server Deployment.");
  console.error("====================================================================");
  process.exit(1); // Ép tắt tiến trình Node.js ngay lập tức
}

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "1h"; 
const REFRESH_TOKEN_EXPIRY_DAYS = process.env.REFRESH_TOKEN_EXPIRY_DAYS 
  ? parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS, 10) 
  : 7; 

export interface JwtPayload {
  userId: string;
  email?: string;
  iat?: number; 
  exp?: number; 
}

// ==========================================
// 1. CẤP PHÁT ACCESS TOKEN (STATELESS)
// ==========================================
export const generateAccessToken = (userId: string, email: string): string => {
  try {
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
export const generateRefreshToken = async (userId: string): Promise<string> => {
  try {
    const options: SignOptions = {
      expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` as SignOptions["expiresIn"]
    };
    const token = jwt.sign({ userId }, JWT_REFRESH_SECRET, options);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

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
export const verifyAndValidateRefreshToken = async (token: string): Promise<JwtPayload> => {
  try {
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

    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  } catch (error: any) {
    throw new Error(`[JWT Error] Xác thực Refresh Token thất bại: ${error.message}`);
  }
};

// ==========================================
// 5. THU HỒI TOKEN (REVOKE) - CHỐNG HACKER
// ==========================================
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

// ==========================================
// 6. 🚀 TỐI ƯU HÓA: DỌN DẸP TOKEN HẾT HẠN (GARBAGE COLLECTION)
// ==========================================
/**
 * Hàm này dùng để quét sạch các token đã hết hạn hoặc bị thu hồi ra khỏi CSDL.
 * Nên được gọi bằng một Cronjob (ví dụ node-cron) định kỳ mỗi ngày 1 lần lúc nửa đêm.
 * Giúp Database không bị phình to theo thời gian.
 */
export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    const deleted = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } }, // Xóa Token đã quá hạn
          { revoked: true }                  // Xóa Token đã bị thu hồi
        ]
      }
    });
    console.log(`🧹 [Garbage Collection] Đã dọn dẹp ${deleted.count} Refresh Token rác ra khỏi CSDL.`);
  } catch (error: any) {
    console.error(`[JWT Error] Lỗi dọn dẹp Token rác: ${error.message}`);
  }
};