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
// ==========================================
export default function Header({ title, subtitle, rightNode }: HeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }} 
      className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 sm:mb-10 transform-gpu will-change-transform w-full transition-colors duration-500"
    >
      {/* 1. HIỆU ỨNG KHÔNG GIAN TẠO CHIỀU SÂU (AMBIENT GLOW) */}
      <div className="absolute -top-6 -left-6 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none z-0 transition-colors duration-500" />
      
      {/* 2. KHỐI VĂN BẢN & MỎ NEO THỊ GIÁC */}
      <div className="relative z-10 flex items-stretch gap-3.5 sm:gap-4 transition-colors duration-500">
        {/* Accent Pillar: Thanh mỏ neo thị giác Gradient */}
        <div className="w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_12px_rgba(79,70,229,0.4)] dark:shadow-[0_0_16px_rgba(79,70,229,0.3)] transition-colors duration-500" />
        
        <div className="flex flex-col justify-center py-0.5 transition-colors duration-500">
          {/* 🚀 ĐÃ VÁ LỖI CHẾT MÀU: Bổ sung dark:text-white để hiển thị tốt trên nền tối */}
          <h1 className="text-2xl sm:text-[28px] lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none transition-colors duration-500">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1.5 sm:mt-2 max-w-xl leading-relaxed transition-colors duration-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* 3. KHỐI NÚT BẤM (ADAPTIVE ACTION BAR) */}
      {rightNode && (
        <div className="relative z-10 w-full md:w-auto flex flex-wrap items-center justify-start md:justify-end gap-3 mt-1 md:mt-0 transition-colors duration-500">
          {rightNode}
        </div>
      )}
    </motion.div>
  );
}