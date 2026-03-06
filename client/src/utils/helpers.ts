import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ==========================================
// 1. UI & TAILWIND MERGER (Cốt lõi cho Motion)
// ==========================================

/**
 * Hàm `cn` (Class Name merger) - Tuyệt chiêu của các dự án Enterprise.
 * Giúp gộp các class Tailwind một cách thông minh, tự động ghi đè class trùng lặp.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==========================================
// 2. BẢO MẬT & PHÂN QUYỀN (RBAC HELPERS)
// ==========================================

/**
 * Nâng cấp: Hỗ trợ kiểm tra linh hoạt 1 quyền, hoặc 1 mảng các quyền.
 * Có thể cấu hình requireAll (Cần có tất cả các quyền) hoặc Any (Chỉ cần 1 trong các quyền).
 */
export const hasPermission = (
  userPermissions: string[] | undefined | null, 
  requiredPermissions: string | string[],
  requireAll: boolean = false
): boolean => {
  if (!userPermissions || userPermissions.length === 0) return false;
  
  // Quyền tối cao
  if (userPermissions.includes("SUPER_ADMIN") || userPermissions.includes("ALL_ACCESS")) return true;
  
  const requiredArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  if (requiredArray.length === 0) return true;

  if (requireAll) {
    // Phải có TẤT CẢ các quyền trong mảng
    return requiredArray.every(perm => userPermissions.includes(perm));
  } else {
    // Chỉ cần có MỘT TRONG CÁC quyền trong mảng
    return requiredArray.some(perm => userPermissions.includes(perm));
  }
};

// ==========================================
// 3. DATA VIZ & GENERATORS
// ==========================================

/**
 * Thuật toán băm (Hash) chuỗi Tên thành một màu sắc cố định.
 * Rất hữu dụng để tạo màu nền cho Avatar của User hoặc Tên Đối tác (Partner).
 * Nâng cấp: Xử lý an toàn chuỗi rỗng và loại bỏ triệt để số âm (Math.abs).
 */
export const generateAvatarColor = (name: string | null | undefined): string => {
  if (!name || name.trim() === "") return "bg-slate-500 dark:bg-slate-700";
  
  const colors = [
    "bg-rose-500", "bg-blue-500", "bg-emerald-500", 
    "bg-amber-500", "bg-indigo-500", "bg-purple-500", 
    "bg-pink-500", "bg-cyan-500", "bg-orange-500",
    "bg-teal-500", "bg-fuchsia-500", "bg-violet-500"
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Hàm tạo độ trễ (Delay) ảo - Dùng để test hiệu ứng Loading hoặc chống Spam click
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// 4. BỘ CÔNG CỤ HIỆU NĂNG & AN TOÀN (NEW ENTERPRISE UTILS)
// ==========================================

/**
 * [TÍNH NĂNG MỚI] Debounce Function: Trì hoãn thực thi hàm (Chống Spam API)
 * Bắt buộc dùng cho thanh Global Search khi người dùng gõ phím liên tục.
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * [TÍNH NĂNG MỚI] Xử lý an toàn khi Parse JSON từ LocalStorage
 * Giúp ứng dụng không bị sập (White screen of death) nếu dữ liệu LocalStorage bị lỗi/hack.
 */
export const safeJSONParse = <T>(jsonString: string | null | undefined, fallback: T): T => {
  if (!jsonString) return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    return parsed !== null ? parsed : fallback;
  } catch (error) {
    console.error("Lỗi Parse JSON:", error);
    return fallback;
  }
};

/**
 * [TÍNH NĂNG MỚI] Deep Clone (Sao chép sâu Object/Array)
 * Chống lỗi dính tham chiếu bộ nhớ (Reference mutation) khi xử lý Form State phức tạp trong Redux.
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== "object") return obj;
  // Cách mới nhất và xịn nhất của JS hiện đại (Nếu trình duyệt hỗ trợ)
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  // Fallback an toàn
  return JSON.parse(JSON.stringify(obj));
};