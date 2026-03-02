"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft, ShieldAlert } from "lucide-react";

// ==========================================
// COMPONENT 404 NOT FOUND (CHUẨN DOANH NGHIỆP)
// Giao diện bắt lỗi khi người dùng truy cập sai đường dẫn (URL)
// ==========================================
export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 text-center">
      
      {/* 1. Biểu tượng Cảnh báo (Animated nhẹ nhàng) */}
      <div className="flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-blue-50 dark:bg-gray-800 shadow-inner">
        <ShieldAlert className="w-12 h-12 text-blue-600 dark:text-blue-400" />
      </div>

      {/* 2. Tiêu đề 404 với Hiệu ứng Gradient mượt mà */}
      <h1 className="text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 drop-shadow-sm">
        404
      </h1>

      {/* 3. Lời nhắn chính */}
      <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
        Không tìm thấy trang
      </h2>

      {/* 4. Mô tả chi tiết (Hướng dẫn người dùng) */}
      <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
        Trang bạn đang tìm kiếm có thể đã bị xóa, thay đổi tên hoặc bạn không có quyền truy cập. Vui lòng kiểm tra lại đường dẫn.
      </p>

      {/* 5. Khu vực Nút Điều hướng (Actions) */}
      <div className="flex flex-col sm:flex-row gap-4 mt-10 justify-center w-full max-w-md">
        
        {/* Nút 1: Lùi lại một bước (Lịch sử trình duyệt) */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-gray-700 transition-all duration-200 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-blue-400 dark:hover:border-blue-500 dark:focus:ring-offset-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Quay lại trang trước
        </button>

        {/* Nút 2: Về thẳng Trang chủ an toàn */}
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white transition-all duration-200 bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
        >
          <Home className="w-5 h-5 mr-2" />
          Về màn hình chính
        </Link>
        
      </div>
      
    </div>
  );
}