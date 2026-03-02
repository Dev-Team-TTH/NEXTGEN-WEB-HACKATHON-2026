"use client";

import React from "react";
import Image from "next/image";

// ==========================================
// COMPONENT LOADING CHUẨN DOANH NGHIỆP
// Tự động hiển thị khi Next.js App Router đang phân tích & kết xuất một trang nặng
// ==========================================
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full bg-transparent">
      
      {/* 1. Logo Thương Hiệu Nhấp Nháy (MỚI ĐƯỢC NÂNG CẤP) */}
      <div className="relative w-24 h-24 mb-6 animate-pulse flex items-center justify-center">
        <Image 
          src="/logo.png" 
          alt="TTH Logo" 
          fill
          sizes="96px"
          style={{ objectFit: "contain" }}
          priority // Ưu tiên tải hình ảnh này ngay lập tức vì nó nằm ở màn hình chờ
        />
      </div>

      {/* 2. Vòng tròn xoay động học (Spinner) */}
      <div className="relative flex items-center justify-center w-14 h-14">
        <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-600 dark:border-blue-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
      
      {/* 3. Dòng chữ trạng thái nhấp nháy */}
      <h3 className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300 animate-pulse">
        Đang tải dữ liệu...
      </h3>
      
      {/* 4. Khẩu hiệu hệ thống */}
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Vui lòng đợi trong giây lát
      </p>

    </div>
  );
}