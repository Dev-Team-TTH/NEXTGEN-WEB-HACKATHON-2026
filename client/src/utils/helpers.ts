/**
 * TTH ERP - CORE HELPERS
 * Nơi chứa các thuật toán cốt lõi, xử lý Tailwind, bảo mật phân quyền (RBAC),
 * và tối ưu hiệu năng cho luồng render của React.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ==========================================
// 1. UI & TAILWIND MERGER
// ==========================================

/**
 * Hàm `cn` (Class Name merger) - Trái tim của hệ thống Design System.
 * Giúp gộp các class Tailwind thông minh, tự động giải quyết xung đột (override) class.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ==========================================
// 2. BẢO MẬT & PHÂN QUYỀN (RBAC HELPERS)
// ==========================================

/**
 * Kiểm tra quyền hạn an toàn, hỗ trợ linh hoạt 1 quyền hoặc 1 mảng quyền.
 * @param userPermissions Mảng các quyền mà User đang có (lấy từ Redux)
 * @param requiredPermissions Quyền hoặc mảng quyền yêu cầu của tính năng
 * @param requireAll Nếu TRUE: Bắt buộc phải có đủ TẤT CẢ quyền trong mảng. Nếu FALSE: Chỉ cần 1 trong số đó.
 * @returns Boolean - Có được phép truy cập hay không?
 */
export const hasPermission = (
  userPermissions: string[] | undefined | null, 
  requiredPermissions: string | string[],
  requireAll: boolean = false
): boolean => {
  if (!userPermissions || !Array.isArray(userPermissions) || userPermissions.length === 0) {
    return false;
  }
  
  // Quyền tối cao: Luôn luôn Pass (Dành cho Giám đốc / Admin hệ thống)
  if (userPermissions.includes("SUPER_ADMIN") || userPermissions.includes("ALL_ACCESS")) {
    return true;
  }
  
  const requiredArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  if (requiredArray.length === 0) return true; // Không yêu cầu quyền gì

  if (requireAll) {
    return requiredArray.every(perm => userPermissions.includes(perm));
  } else {
    return requiredArray.some(perm => userPermissions.includes(perm));
  }
};

// ==========================================
// 3. DATA VIZ & GENERATORS (THUẬT TOÁN)
// ==========================================

/**
 * Thuật toán băm (Hash) chuỗi Tên thành một màu sắc cố định trong dải màu Tailwind.
 * Phục vụ tạo Avatar ngẫu nhiên nhưng CỐ ĐỊNH cho User/Partner (A luôn là đỏ, B luôn là xanh...).
 */
export const generateAvatarColor = (name: string | null | undefined): string => {
  if (!name || name.trim() === "") return "bg-slate-500 dark:bg-slate-700 text-white";
  
  const colors = [
    "bg-rose-500 text-white", "bg-blue-500 text-white", "bg-emerald-500 text-white", 
    "bg-amber-500 text-white", "bg-indigo-500 text-white", "bg-purple-500 text-white", 
    "bg-pink-500 text-white", "bg-cyan-500 text-white", "bg-orange-500 text-white",
    "bg-teal-500 text-white", "bg-fuchsia-500 text-white", "bg-violet-500 text-white"
  ];
  
  // Thuật toán băm DJB2
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Lấy trị tuyệt đối để tránh lỗi index âm
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

/**
 * Hàm tạo độ trễ (Delay) bất đồng bộ.
 * Phục vụ test hiệu ứng Loading Skeleton hoặc chống Spam API liên tục.
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// ==========================================
// 4. BỘ CÔNG CỤ HIỆU NĂNG (PERFORMANCE)
// ==========================================

/**
 * Debounce Function: Trì hoãn thực thi hàm cho đến khi người dùng ngừng thao tác.
 * BẮT BUỘC dùng cho Thanh tìm kiếm (Search Input) để tránh dDoS Backend của chính mình.
 * @param func Hàm cần thực thi
 * @param delay Thời gian chờ (milliseconds)
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  // Trả về kiểu NodeJS.Timeout để tương thích đa môi trường
  let timeoutId: ReturnType<typeof setTimeout> | null = null; 
  
  return function (this: unknown, ...args: Parameters<T>) {
    const context = this;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

/**
 * Parse chuỗi JSON từ API hoặc LocalStorage một cách an toàn.
 * Cứu cánh tuyệt đối cho ứng dụng (Ngăn chặn White Screen of Death khi JSON bị hỏng).
 * @param jsonString Chuỗi JSON cần parse
 * @param fallback Dữ liệu mặc định trả về nếu parse lỗi (Cùng kiểu T)
 */
export const safeJSONParse = <T>(jsonString: string | null | undefined, fallback: T): T => {
  if (!jsonString) return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    // Xử lý cả trường hợp JSON.parse("null") trả về null
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (error) {
    console.warn("Cảnh báo an toàn: Parse JSON thất bại, trả về fallback.", error);
    return fallback;
  }
};

/**
 * Deep Clone: Sao chép sâu cấu trúc Object/Array.
 * Giải pháp triệt để cắt đứt tham chiếu bộ nhớ (Reference Mutation) gây lỗi không re-render trong Redux/React State.
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== "object") return obj;
  
  // 🚀 TỐI ƯU HÓA: Dùng API siêu tốc độ của trình duyệt hiện đại (Bảo toàn được Date, Map, Set)
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(obj);
    } catch (error) {
      console.warn("Cảnh báo: Không thể structuredClone, lùi về giải pháp truyền thống.");
    }
  }
  
  // Giải pháp truyền thống (Sẽ bị mất định dạng Date -> chuyển thành chuỗi ISO)
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error("Lỗi Deep Clone: Object chứa tham chiếu vòng tròn (Circular Reference).");
    return obj; 
  }
};