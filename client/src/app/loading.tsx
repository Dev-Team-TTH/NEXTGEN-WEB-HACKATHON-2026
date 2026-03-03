import React from "react";
import { Loader2, Hexagon } from "lucide-react";

// ==========================================
// COMPONENT: BỘ TẢI TRANG (GLOBAL LOADING)
// Tối ưu FCP (First Contentful Paint): Chỉ dùng HTML & Tailwind CSS 
// để đảm bảo xuất hiện tức thì trong <Suspense> mà không cần chờ JS.
// ==========================================

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] w-full relative overflow-hidden">
      
      {/* 1. HIỆU ỨNG ÁNH SÁNG NỀN (GLOW) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/10 dark:bg-blue-600/20 rounded-full blur-[80px] animate-pulse pointer-events-none"></div>

      {/* 2. KHỐI HIỂN THỊ TRUNG TÂM (GLASSMORPHISM) */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8 rounded-[2rem] glass-panel shadow-2xl">
        
        {/* Khối Logo & Spinner lồng nhau */}
        <div className="relative flex items-center justify-center w-20 h-20 mb-6">
          {/* Lớp ngoài: Vòng xoay đa giác */}
          <Hexagon className="absolute inset-0 w-full h-full text-blue-500/30 dark:text-blue-400/20 animate-spin-slow stroke-[1.5]" />
          
          {/* Lớp giữa: Vòng tròn khuyết xoay */}
          <Loader2 className="absolute inset-2 w-16 h-16 text-indigo-500 dark:text-indigo-400 animate-spin stroke-[2]" />
          
          {/* Lớp lõi: Chấm sáng nhịp thở */}
          <div className="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse"></div>
        </div>

        {/* Chữ Loading với Text Gradient */}
        <h3 className="text-lg font-bold text-gradient tracking-widest uppercase mb-2">
          Đang đồng bộ
        </h3>
        
        {/* Subtext và dấu chấm lửng chuyển động */}
        <div className="flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          <span>Vui lòng đợi trong giây lát</span>
          <span className="flex gap-0.5">
            <span className="animate-[bounce_1s_infinite_0ms]">.</span>
            <span className="animate-[bounce_1s_infinite_150ms]">.</span>
            <span className="animate-[bounce_1s_infinite_300ms]">.</span>
          </span>
        </div>

      </div>
    </div>
  );
}