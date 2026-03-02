import bcrypt from "bcrypt";
import crypto from "crypto";

// ==========================================
// CẤU HÌNH BẢO MẬT (SECURITY CONFIGURATION)
// ==========================================
// Số vòng lặp Salt (Độ phức tạp mã hóa). Khuyến nghị 10-12 cho Production.
// Lấy từ biến môi trường để dễ dàng thay đổi khi cấu hình server, mặc định là 10.
const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ? parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) : 10;

// ==========================================
// 1. MÃ HÓA MẬT KHẨU NGƯỜI DÙNG (BCRYPT)
// ==========================================

/**
 * Hàm băm mật khẩu người dùng
 * Dùng thuật toán bcrypt để băm mật khẩu kèm tự động sinh Salt để chống Rainbow Table Attack.
 * @param password Mật khẩu gốc dạng chuỗi (Plain text)
 * @returns Chuỗi mật khẩu đã được băm (Hashed password)
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error: any) {
    throw new Error(`[Security Error] Lỗi mã hóa mật khẩu: ${error.message}`);
  }
};

/**
 * Hàm kiểm tra đối chiếu mật khẩu
 * So sánh mật khẩu người dùng nhập vào với mã băm lưu trong Database (bảng Users).
 * @param password Mật khẩu gốc người dùng vừa nhập (Plain text)
 * @param hash Mã băm lấy từ Database
 * @returns True nếu khớp mật khẩu, False nếu không khớp
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error: any) {
    throw new Error(`[Security Error] Lỗi đối chiếu mật khẩu: ${error.message}`);
  }
};

// ==========================================
// 2. MÃ HÓA VÀ SINH TOKEN (SHA-256 & CRYPTO)
// ==========================================

/**
 * Hàm sinh mã token ngẫu nhiên an toàn tuyệt đối (Cryptographically secure)
 * Thường dùng để tạo Reset Password Token, API Keys, mã kích hoạt (OTP/Verification).
 * @param byteLength Độ dài số byte ngẫu nhiên (Mặc định 32 byte ~ sẽ sinh ra 64 ký tự hex)
 * @returns Chuỗi token ngẫu nhiên dạng Hexadecimal
 */
export const generateRandomToken = (byteLength: number = 32): string => {
  try {
    return crypto.randomBytes(byteLength).toString("hex");
  } catch (error: any) {
    throw new Error(`[Security Error] Lỗi sinh chuỗi ngẫu nhiên: ${error.message}`);
  }
};

/**
 * Hàm băm token một chiều bằng thuật toán SHA-256 (Tốc độ cao)
 * Thường dùng để băm các Refresh Token hoặc API Key trước khi lưu vào Database
 * nhằm ngăn chặn lộ lọt ngay cả khi Hacker lấy được toàn bộ Database.
 * @param token Chuỗi token gốc cần mã hóa
 * @returns Chuỗi token đã được băm bằng SHA-256
 */
export const hashTokenSHA256 = (token: string): string => {
  try {
    return crypto.createHash("sha256").update(token).digest("hex");
  } catch (error: any) {
    throw new Error(`[Security Error] Lỗi mã hóa token SHA-256: ${error.message}`);
  }
};