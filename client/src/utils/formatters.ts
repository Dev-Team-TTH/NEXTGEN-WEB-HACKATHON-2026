/**
 * TTH ERP - ENTERPRISE UTILITY BELT
 * Bộ công cụ siêu tiện ích dùng chung cho toàn bộ hệ thống Frontend.
 * Đảm bảo tính nhất quán về dữ liệu, an toàn kiểu (Type-safe) và chống Crash UI.
 */

import dayjs from "dayjs";
import "dayjs/locale/vi";
import relativeTime from "dayjs/plugin/relativeTime";

// Kích hoạt plugin thời gian tương đối cho dayjs
dayjs.extend(relativeTime);
dayjs.locale("vi");

// ============================================================================
// 1. FINANCIAL & MATH UTILITIES (XỬ LÝ TÀI CHÍNH & TOÁN HỌC)
// ============================================================================

/**
 * Format số tiền chuẩn Việt Nam Đồng (VND)
 * @param amount - Số tiền cần format
 * @param fallback - Ký tự hiển thị nếu amount không hợp lệ
 * @returns Chuỗi format (VD: 1.500.000 ₫)
 */
export const formatVND = (amount: number | string | null | undefined, fallback = "0 ₫"): string => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return fallback;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

/**
 * Format tiền tệ đa quốc gia (Multi-currency)
 * @param amount - Số tiền
 * @param currency - Mã tiền tệ (VND, USD, EUR, JPY...)
 */
export const formatCurrency = (amount: number | null | undefined, currency: string = "VND"): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return `0 ${currency}`;
  const locales: Record<string, string> = { VND: "vi-VN", USD: "en-US", EUR: "de-DE", JPY: "ja-JP" };
  return new Intl.NumberFormat(locales[currency] || "vi-VN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: currency === "VND" || currency === "JPY" ? 0 : 2,
  }).format(amount);
};

/**
 * Rút gọn con số lớn cho Dashboard (VD: 1,500,000 -> 1.5M, 2,000,000,000 -> 2B)
 * @param num - Số cần rút gọn
 */
export const compactNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
};

/**
 * Hiển thị phần trăm (VD: 0.15 -> 15%)
 */
export const formatPercentage = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return "0%";
  return `${(val * 100).toFixed(1).replace(/\.0$/, "")}%`;
};

/**
 * Khắc phục triệt để lỗi Floating Point của JavaScript trong Kế toán (VD: 0.1 + 0.2 = 0.3)
 */
export const safeRound = (value: number, decimals: number = 0): number => {
  return Number(Math.round(parseFloat(value + "e" + decimals)) + "e-" + decimals);
};

// ============================================================================
// 2. DATE & TIME UTILITIES (XỬ LÝ THỜI GIAN)
// ============================================================================

/**
 * Format ngày tháng năm cơ bản chuẩn VN
 * @param date - Chuỗi ngày tháng hoặc Object Date
 * @returns VD: 25/12/2024
 */
export const formatDate = (date: string | Date | null | undefined, format: string = "DD/MM/YYYY"): string => {
  if (!date) return "-";
  return dayjs(date).format(format);
};

/**
 * Format đầy đủ Ngày và Giờ
 * @returns VD: 14:30 - 25/12/2024
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return "-";
  return dayjs(date).format("HH:mm - DD/MM/YYYY");
};

/**
 * Tính toán thời gian tương đối (VD: Vừa xong, 5 phút trước, 2 ngày trước)
 * Tuyệt đối chính xác cho hệ thống Thông báo (Notifications) và Logs.
 */
export const timeAgo = (date: string | Date | null | undefined): string => {
  if (!date) return "";
  const now = dayjs();
  const target = dayjs(date);
  const diffInSeconds = now.diff(target, "second");

  if (diffInSeconds < 60) return "Vừa xong";
  return target.fromNow();
};

/**
 * Lấy Năm Tài Chính (Fiscal Year) dựa trên ngày truyền vào
 * Giả sử năm tài chính VN bắt đầu từ 1/1 đến 31/12
 */
export const getFiscalYear = (date: string | Date = new Date()): number => {
  return dayjs(date).year();
};

// ============================================================================
// 3. STRING & UI HELPERS (XỬ LÝ CHUỖI & GIAO DIỆN)
// ============================================================================

/**
 * Gom các class CSS điều kiện (Thay thế thư viện clsx)
 * @param classes - Mảng các class hoặc boolean kiện
 * @returns Chuỗi class sạch
 */
export const classNames = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

/**
 * Lấy chữ cái đầu của Tên để làm Avatar (VD: "Nguyễn Văn Tuấn" -> "T")
 */
export const getInitials = (fullName: string | null | undefined): string => {
  if (!fullName) return "U";
  const parts = fullName.trim().split(" ");
  const lastWord = parts[parts.length - 1];
  return lastWord.charAt(0).toUpperCase();
};

/**
 * Rút gọn chuỗi văn bản quá dài
 * @param text - Văn bản gốc
 * @param maxLength - Số ký tự tối đa
 */
export const truncateText = (text: string | null | undefined, maxLength: number = 50): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

/**
 * Tạo mã tự động dựa trên Tiền tố (VD: TTH-1712041234)
 */
export const generateCode = (prefix: string = "DOC"): string => {
  const timestamp = Date.now().toString().slice(-6);
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}${randomStr}`;
};

/**
 * Biến đổi chuỗi thành dạng Slug an toàn cho URL (VD: "Sản Phẩm" -> "san-pham")
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu tiếng Việt
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Thay khoảng trắng bằng gạch ngang
    .replace(/[^\w-]+/g, "") // Xóa ký tự đặc biệt
    .replace(/--+/g, "-"); // Xóa gạch ngang kép
};

// ============================================================================
// 4. FILE & DATA UTILITIES (XỬ LÝ TỆP TIN & DỮ LIỆU)
// ============================================================================

/**
 * Format kích thước File dễ đọc (Dùng cho Module Upload File)
 * @param bytes - Số bytes
 * @returns VD: 2.5 MB, 150 KB
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Trích xuất đuôi tệp tin từ Tên File hoặc URL
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
};

// ============================================================================
// 5. VALIDATION & SAFE CHECKS (KIỂM ĐỊNH AN TOÀN)
// ============================================================================

/**
 * Kiểm tra xem một mảng, chuỗi, hoặc Object có rỗng hay không
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" || Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};

/**
 * Parse JSON an toàn, không làm sập ứng dụng nếu string lỗi
 */
export const safeJsonParse = (str: string | null | undefined, fallback: any = {}) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("Lỗi Parse JSON an toàn:", e);
    return fallback;
  }
};