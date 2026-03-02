"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

// ==========================================
// COMPONENT ERROR BOUNDARY (LÁ CHẮN LỖI)
// Bắt toàn bộ lỗi Javascript Runtime không mong muốn trong quá trình sử dụng
// ==========================================
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Ghi log lỗi ra Console hoặc gửi lên hệ thống theo dõi (VD: Sentry)
  useEffect(() => {
    console.error("Hệ thống phát hiện lỗi (System Error):", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 text-center">
      
      {/* 1. Biểu tượng Lỗi (Animated rung lắc nhẹ) */}
      <div className="flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-red-50 dark:bg-red-900/20 shadow-inner animate-pulse">
        <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
      </div>

      {/* 2. Tiêu đề Lỗi hệ thống */}
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
        Đã xảy ra sự cố!
      </h1>

      {/* 3. Mô tả chi tiết cho người dùng */}
      <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
        Rất xin lỗi, hệ thống vừa gặp một lỗi xử lý nội bộ hoặc không thể tải dữ liệu phân đoạn này. Đừng lo, các phần khác vẫn hoạt động bình thường.
      </p>
      
      {/* Hiển thị mã lỗi kỹ thuật (Chỉ hiển thị cơ bản, tránh lộ thông tin nhạy cảm) */}
      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm font-mono max-w-lg mx-auto overflow-hidden text-ellipsis whitespace-nowrap">
        {error.message || "Unknown Runtime Error"}
      </div>

      {/* 4. Khu vực Nút Điều hướng Xử lý */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center w-full max-w-md">
        
        {/* Nút 1: Thử tải lại (Reset Boundary) */}
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white transition-all duration-200 bg-red-600 border border-transparent rounded-lg shadow-sm hover:bg-red-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900"
        >
          <RefreshCcw className="w-5 h-5 mr-2" />
          Thử kết xuất lại
        </button>

        {/* Nút 2: Về thẳng Trang chủ an toàn */}
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-gray-700 transition-all duration-200 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-blue-400 dark:hover:border-blue-500 dark:focus:ring-offset-gray-900"
        >
          <Home className="w-5 h-5 mr-2" />
          Về màn hình chính
        </Link>
        
      </div>
      
    </div>
  );
}