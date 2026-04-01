"use client";

import React from "react";
import { motion } from "framer-motion";

// ==========================================
// ĐỊNH NGHĨA KIỂU DỮ LIỆU PROPS
// ==========================================
interface HeaderProps {
  title: string;                 
  subtitle?: string;             
  rightNode?: React.ReactNode;   
}

// ==========================================
// COMPONENT: TIÊU ĐỀ TRANG (PAGE HEADER ĐẲNG CẤP ENTERPRISE)
// Đã được giải phẫu và tối ưu hóa triệt để cho Dark Mode & Mobile
// ==========================================
export default function Header({ title, subtitle, rightNode }: HeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }} 
      // 🚀 VÁ LỖI TỔNG THỂ: 
      // - Đổi 'transition-colors' thành 'transition-all ease-in-out' để ép trình duyệt nội suy toàn bộ CSS.
      // - Thu gọn gap và margin trên Mobile để tiết kiệm diện tích màn hình.
      className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5 mb-6 sm:mb-8 md:mb-10 transform-gpu will-change-transform w-full transition-all duration-500 ease-in-out"
    >
      {/* 1. HIỆU ỨNG KHÔNG GIAN TẠO CHIỀU SÂU (AMBIENT GLOW) */}
      {/* 🚀 TỐI ƯU MOBILE: Quầng sáng tự động thu nhỏ trên điện thoại để không gây tràn thanh cuộn ngang */}
      <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 w-24 h-24 sm:w-32 sm:h-32 bg-blue-500/15 dark:bg-blue-500/20 rounded-full blur-2xl sm:blur-3xl pointer-events-none z-0 transition-all duration-500 ease-in-out" />
      
      {/* 2. KHỐI VĂN BẢN & MỎ NEO THỊ GIÁC */}
      {/* 🚀 VÁ LỖI TRÀN FLEXBOX: Bổ sung 'w-full md:w-auto min-w-0' để chống vỡ khung text */}
      <div className="relative z-10 flex items-stretch gap-3 sm:gap-4 transition-all duration-500 ease-in-out w-full md:w-auto min-w-0">
        
        {/* Accent Pillar: Thanh mỏ neo thị giác Gradient */}
        <div className="w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_8px_rgba(79,70,229,0.4)] dark:shadow-[0_0_16px_rgba(79,70,229,0.3)] transition-all duration-500 ease-in-out" />
        
        <div className="flex flex-col justify-center py-0.5 min-w-0 transition-all duration-500 ease-in-out w-full">
          {/* 🚀 VÁ LỖI CHỮ ĐEN (COLOR DEADLOCK): 
              - Ép cứng 'text-slate-900 dark:text-white'.
              - 'transition-all duration-500 ease-in-out' giải quyết triệt để độ sượng màu.
              - Responsive Text: Tự động scale từ xl (Mobile) lên 3xl (PC).
              - 'truncate break-words' chống tràn chữ phá vỡ layout.
          */}
          <h1 className="text-xl sm:text-2xl md:text-[28px] lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight sm:leading-none truncate break-words transition-all duration-500 ease-in-out">
            {title}
          </h1>
          
          {subtitle && (
            <p className="text-xs sm:text-[13px] md:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 sm:mt-1.5 md:mt-2 max-w-full md:max-w-xl leading-relaxed transition-all duration-500 ease-in-out">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* 3. KHỐI NÚT BẤM (ADAPTIVE ACTION BAR) */}
      {/* 🚀 TỐI ƯU UX MOBILE:
          - Đổi 'flex-wrap' thành 'overflow-x-auto scrollbar-hide'.
          - Giờ đây nếu có 3-4 nút bấm, chúng sẽ xếp ngang 1 hàng và có thể vuốt (swipe) mượt mà trên điện thoại!
      */}
      {rightNode && (
        <div className="relative z-10 w-full md:w-auto flex flex-row items-center justify-start md:justify-end gap-2.5 sm:gap-3 mt-2 md:mt-0 overflow-x-auto scrollbar-hide pb-1 md:pb-0 transition-all duration-500 ease-in-out">
          {rightNode}
        </div>
      )}
    </motion.div>
  );
}