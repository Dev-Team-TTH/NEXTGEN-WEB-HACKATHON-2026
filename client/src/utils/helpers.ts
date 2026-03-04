import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ==========================================
// 1. UI & TAILWIND MERGER (Cốt lõi cho Motion)
// ==========================================

/**
 * Hàm `cn` (Class Name merger) - Tuyệt chiêu của các dự án Enterprise.
 * Giúp gộp các class Tailwind một cách thông minh, tự động ghi đè class trùng lặp.
 * Đặc biệt hữu dụng khi kết hợp với các hiệu ứng động của Framer Motion.
 * * Cần cài đặt thư viện: `npm install clsx tailwind-merge`
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==========================================
// 2. BẢO MẬT & PHÂN QUYỀN (RBAC HELPERS)
// ==========================================

/**
 * Kiểm tra xem User hiện tại có sở hữu Quyền (Permission) cụ thể hay không.
 * Hỗ trợ các đặc quyền tối cao như SUPER_ADMIN.
 */
export const hasPermission = (userPermissions: string[] | undefined | null, requiredPermission: string): boolean => {
  if (!userPermissions || userPermissions.length === 0) return false;
  
  // Mở khóa toàn bộ nếu là Super Admin
  if (userPermissions.includes("SUPER_ADMIN") || userPermissions.includes("ALL_ACCESS")) return true;
  
  return userPermissions.includes(requiredPermission);
};

// ==========================================
// 3. DATA VIZ & GENERATORS
// ==========================================

/**
 * Thuật toán băm (Hash) chuỗi Tên thành một màu sắc cố định.
 * Rất hữu dụng để tạo màu nền cho Avatar của User hoặc Tên Đối tác (Partner).
 */
export const generateAvatarColor = (name: string | null | undefined): string => {
  if (!name) return "bg-slate-500";
  
  const colors = [
    "bg-rose-500", "bg-blue-500", "bg-emerald-500", 
    "bg-amber-500", "bg-indigo-500", "bg-purple-500", 
    "bg-pink-500", "bg-cyan-500", "bg-orange-500"
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Trả về một màu cố định dựa trên index
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Hàm tạo độ trễ (Delay) ảo - Dùng để test hiệu ứng Loading hoặc chống Spam click
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));