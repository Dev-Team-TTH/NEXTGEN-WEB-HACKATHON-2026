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
 * Nâng cấp: Xử lý an toàn NaN, số âm, và chuẩn hóa Fallback
 */
export const formatVND = (amount: number | string | null | undefined, fallback: string = "0 ₫"): string => {
  if (amount === null || amount === undefined || amount === "") return fallback;
  const num = Number(amount);
  if (isNaN(num)) return fallback;
  
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND',
    maximumFractionDigits: 0 
  }).format(num);
};

/**
 * Format tiền Đô la Mỹ (USD) - Phục vụ phân hệ Advanced Finance (Tỷ giá)
 */
export const formatUSD = (amount: number | string | null | undefined, fallback: string = "$0.00"): string => {
  if (amount === null || amount === undefined || amount === "") return fallback;
  const num = Number(amount);
  if (isNaN(num)) return fallback;

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
export const formatNumber = (value: number | string | null | undefined, fallback: string = "0"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  if (isNaN(num)) return fallback;
  
  return new Intl.NumberFormat('vi-VN').format(num);
};

/**
 * [TÍNH NĂNG MỚI] Format số viết tắt (Dùng cho Biểu đồ / Dashboard)
 * VD: 1,500,000 -> 1.5M | 2,500 -> 2.5K
 */
export const formatCompactNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "0";
  const num = Number(value);
  if (isNaN(num)) return "0";

  return new Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(num);
};

/**
 * Format phần trăm (%) - VD: 15.5%
 */
export const formatPercent = (value: number | string | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || value === "") return "0%";
  const num = Number(value);
  if (isNaN(num)) return "0%";
  return `${num.toFixed(decimals)}%`;
};

/**
 * Format hiển thị kích thước file (KB, MB, GB)
 */
export const formatFileSize = (bytes: number): string => {
  if (isNaN(bytes) || bytes === 0) return '0 Bytes';
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
 * Nâng cấp: Bắt lỗi Invalid Date từ Backend trả về
 */
export const formatDate = (date: string | Date | null | undefined, fallback: string = "N/A"): string => {
  if (!date) return fallback;
  const parsedDate = dayjs(date);
  if (!parsedDate.isValid()) return fallback;
  return parsedDate.format('DD/MM/YYYY');
};

/**
 * Format ngày + giờ chi tiết (DD/MM/YYYY HH:mm) - Chuyên dùng cho Audit Log
 */
export const formatDateTime = (date: string | Date | null | undefined, fallback: string = "N/A"): string => {
  if (!date) return fallback;
  const parsedDate = dayjs(date);
  if (!parsedDate.isValid()) return fallback;
  return parsedDate.format('DD/MM/YYYY HH:mm');
};

/**
 * Format thời gian tương đối (Ví dụ: "2 giờ trước", "vài giây trước")
 */
export const formatRelativeTime = (date: string | Date | null | undefined, fallback: string = "N/A"): string => {
  if (!date) return fallback;
  const parsedDate = dayjs(date);
  if (!parsedDate.isValid()) return fallback;
  return parsedDate.fromNow();
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
 * Nâng cấp: Xử lý an toàn khoảng trắng thừa, Emoji, hoặc tên có 1 chữ
 */
export const getAvatarInitials = (fullName: string | null | undefined): string => {
  if (!fullName || typeof fullName !== 'string') return "U";
  
  // Lọc bỏ các khoảng trắng thừa
  const parts = fullName.trim().replace(/\s+/g, ' ').split(" ");
  
  if (parts.length === 0 || parts[0] === "") return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  // Lấy chữ cái đầu của Tên họ và Tên gọi
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};


// ==========================================
// 5. THUẬT TOÁN KẾ TOÁN (ACCOUNTING ALGORITHMS)
// ==========================================

/**
 * [TÍNH NĂNG MỚI] Đọc số thành chữ tiếng Việt (Phục vụ In Hóa Đơn / Phiếu Thu)
 * VD: 1500000 -> "Một triệu năm trăm nghìn đồng chẵn"
 */
export const numberToWordsVN = (number: number | string): string => {
  let numStr = typeof number === 'number' ? Math.floor(number).toString() : number.toString().split('.')[0]; // Chỉ lấy phần nguyên
  if (isNaN(Number(numStr)) || numStr === "0" || numStr === "") return "Không đồng";

  const defaultNumbers = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  const readBlock = (block: string, isFullBlock: boolean) => {
    let result = '';
    const hundreds = parseInt(block[0]);
    const tens = parseInt(block[1]);
    const ones = parseInt(block[2]);

    if (hundreds > 0 || isFullBlock) {
      result += defaultNumbers[hundreds] + ' trăm ';
      if (tens === 0 && ones > 0) result += 'lẻ ';
    }
    if (tens > 0) {
      if (tens === 1) result += 'mười ';
      else result += defaultNumbers[tens] + ' mươi ';
    }
    if (ones > 0) {
      if (ones === 1 && tens > 1) result += 'mốt ';
      else if (ones === 5 && tens > 0) result += 'lăm ';
      else result += defaultNumbers[ones] + ' ';
    }
    return result.trim();
  };

  let words = '';
  let unitIndex = 0;

  // Cắt chuỗi số thành các cụm 3 chữ số từ phải sang trái
  while (numStr.length > 0) {
    let block = numStr.substring(Math.max(0, numStr.length - 3));
    numStr = numStr.substring(0, Math.max(0, numStr.length - 3));
    
    // Đệm thêm số 0 vào trước nếu cụm không đủ 3 chữ số (trừ cụm cuối cùng bên trái)
    const isFullBlock = numStr.length > 0;
    while (block.length < 3) block = '0' + block;

    const blockVal = parseInt(block);
    if (blockVal > 0) {
      const blockWords = readBlock(block, isFullBlock);
      words = blockWords + ' ' + units[unitIndex] + ' ' + words;
    }
    unitIndex++;
  }

  words = words.trim().replace(/\s+/g, ' ');
  // Viết hoa chữ cái đầu tiên và thêm chữ "chẵn"
  return words.charAt(0).toUpperCase() + words.slice(1) + ' đồng chẵn.';
};