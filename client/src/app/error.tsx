"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertOctagon, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

// ==========================================
// COMPONENT: GLOBAL ERROR BOUNDARY
// Bắt mọi lỗi crash UI và hiển thị màn hình phục hồi (Recovery)
// ==========================================

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  
  // Ghi log lỗi ra hệ thống giám sát (Ví dụ: Sentry) nếu có
  useEffect(() => {
    console.error("Hệ thống phát hiện lỗi giao diện:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen w-full relative overflow-hidden bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-50 p-4">
      
      {/* 1. HIỆU ỨNG ÁNH SÁNG NỀN (CẢNH BÁO) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('/noise.png')] z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/10 dark:bg-rose-600/15 rounded-full blur-[100px] animate-pulse pointer-events-none z-0"></div>

      {/* 2. KHỐI THÔNG BÁO LỖI (GLASSMORPHISM) */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 w-full max-w-lg flex flex-col items-center text-center p-8 sm:p-10 rounded-[2.5rem] glass shadow-2xl border-rose-100 dark:border-rose-900/30"
      >
        {/* Icon cảnh báo */}
        <div className="relative flex items-center justify-center w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-rose-100 dark:bg-rose-500/20 rounded-full animate-ping opacity-75"></div>
          <div className="relative flex items-center justify-center w-full h-full bg-rose-100 dark:bg-rose-900/40 rounded-full border border-rose-200 dark:border-rose-800">
            <AlertOctagon className="w-10 h-10 text-rose-600 dark:text-rose-400" />
          </div>
        </div>

        {/* Thông báo lỗi */}
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500 dark:from-rose-400 dark:to-orange-400">
          Đã xảy ra sự cố!
        </h2>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-6">
          Hệ thống gặp lỗi trong quá trình xử lý giao diện. Bạn có thể thử tải lại trang hoặc quay về Bảng điều khiển.
        </p>

        {/* Khối hiển thị chi tiết mã lỗi (Dành cho Developer/Support) */}
        <div className="w-full bg-slate-100 dark:bg-black/30 p-4 rounded-2xl mb-8 border border-slate-200 dark:border-white/5 text-left overflow-hidden">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 break-words line-clamp-3">
            <span className="font-bold text-rose-500 dark:text-rose-400">Log:</span> {error.message || "Unknown Error"}
            {error.digest && <span className="block mt-1 opacity-70">Digest: {error.digest}</span>}
          </p>
        </div>

        {/* Các nút hành động (Call to Actions) */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-rose-500/20"
          >
            <RefreshCcw className="w-5 h-5" />
            <span>Thử lại ngay</span>
          </button>
          
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            <Home className="w-5 h-5" />
            <span>Về trang chủ</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}