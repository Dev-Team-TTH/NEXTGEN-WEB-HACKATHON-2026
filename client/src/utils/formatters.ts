import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import 'dayjs/locale/vi';

// Kích hoạt plugin thời gian tương đối (VD: "2 giờ trước")
dayjs.extend(relativeTime);
dayjs.locale('vi');

// ==========================================
// 1. TIỀN TỆ & TÀI CHÍNH (FINANCIAL FORMATTERS)
// ==========================================

/**
 * Format tiền Việt Nam Đồng (VND)
 * Xử lý an toàn các trường hợp null, undefined, NaN
 */
export const formatVND = (amount: number | string | null | undefined): string => {
  const num = Number(amount);
  if (isNaN(num) || amount === null || amount === undefined) return "0 ₫";
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND',
    maximumFractionDigits: 0 
  }).format(num);
};

/**
 * Format tiền Đô la Mỹ (USD) - Phục vụ phân hệ Advanced Finance (Tỷ giá)
 */
export const formatUSD = (amount: number | string | null | undefined): string => {
  const num = Number(amount);
  if (isNaN(num) || amount === null || amount === undefined) return "$0.00";
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

// ==========================================
// 2. CON SỐ & KHỐI LƯỢNG (NUMBERS & QUANTITIES)
// ==========================================

/**
 * Format số lượng lớn (VD: 1.000.000)
 */
export const formatNumber = (value: number | string | null | undefined): string => {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) return "0";
  return new Intl.NumberFormat('vi-VN').format(num);
};

/**
 * Format phần trăm (%) - VD: 15.5%
 */
export const formatPercent = (value: number | string | null | undefined, decimals: number = 1): string => {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) return "0%";
  return `${num.toFixed(decimals)}%`;
};

/**
 * Format hiển thị kích thước file (KB, MB, GB)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ==========================================
// 3. THỜI GIAN & NGÀY THÁNG (DATE & TIME FORMATTERS)
// ==========================================

/**
 * Format ngày chuẩn VN (DD/MM/YYYY)
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "N/A";
  return dayjs(date).format('DD/MM/YYYY');
};

/**
 * Format ngày + giờ chi tiết (DD/MM/YYYY HH:mm) - Chuyên dùng cho Audit Log
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return "N/A";
  return dayjs(date).format('DD/MM/YYYY HH:mm');
};

/**
 * Format thời gian tương đối (Ví dụ: "2 giờ trước", "vài giây trước")
 */
export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return "N/A";
  return dayjs(date).fromNow();
};

// ==========================================
// 4. CHUỖI & ĐỊNH DẠNG TEXT (STRING HELPERS)
// ==========================================

/**
 * Rút gọn chuỗi văn bản nếu quá dài (Ellipsis)
 */
export const truncateText = (text: string | null | undefined, maxLength: number = 50): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

/**
 * Tạo chữ viết tắt Avatar từ Họ và Tên (Nguyễn Văn A -> NA)
 */
export const getAvatarInitials = (fullName: string | null | undefined): string => {
  if (!fullName) return "U";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};