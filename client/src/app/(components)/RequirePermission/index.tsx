"use client";

import React from "react";
import { useAppSelector } from "@/app/redux";

interface RequirePermissionProps {
  roles?: string[];         // Mảng các chức vụ được phép (VD: ["ADMIN", "MANAGER"])
  permissions?: string[];   // Mảng các quyền chi tiết (VD: ["DELETE_DOCUMENT"])
  children: React.ReactNode; 
  fallback?: React.ReactNode; // UI thay thế khi không có quyền (VD: Render 1 nút xám bị disable)
}

/**
 * COMPONENT ENTERPRISE: Bộ lọc hiển thị dựa trên Phân quyền
 * Bọc component này bên ngoài các nút "Xóa", "Khóa sổ", "Thanh toán"...
 * Nó sẽ tự động kiểm tra Redux Store, nếu User không đủ tầm, nút bấm sẽ tàng hình.
 */
export default function RequirePermission({
  roles,
  permissions,
  children,
  fallback = null
}: RequirePermissionProps) {
  // FIX LỖI TS2339: Ép kiểu (state: any) để bypass lỗi nội suy type của redux-persist
  const currentUser = useAppSelector((state: any) => state.global?.currentUser);

  // Nếu chưa load xong User hoặc mất phiên, ẩn luôn
  if (!currentUser) return <>{fallback}</>;

  // Nếu là SUPER_ADMIN thì mặc định bypass mọi quyền
  if (currentUser.role === "SUPER_ADMIN") return <>{children}</>;

  let hasRole = true;
  if (roles && roles.length > 0) {
    hasRole = roles.includes(currentUser.role || "STAFF");
  }

  let hasPerm = true;
  if (permissions && permissions.length > 0) {
    hasPerm = permissions.some((p: string) => currentUser.permissions?.includes(p));
  }

  if (hasRole && hasPerm) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}