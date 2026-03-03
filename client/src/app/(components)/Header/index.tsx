"use client";

import React from "react";
import { motion } from "framer-motion";

// ==========================================
// ĐỊNH NGHĨA KIỂU DỮ LIỆU PROPS
// ==========================================
interface HeaderProps {
  title: string;                 // Tiêu đề chính của trang (Bắt buộc)
  subtitle?: string;             // Phụ đề giải thích nhỏ bên dưới
  rightNode?: React.ReactNode;   // Không gian bên phải để nhúng các nút bấm (Ví dụ: "Tạo mới")
}

// ==========================================
// COMPONENT: TIÊU ĐỀ TRANG (PAGE HEADER)
// Tuân thủ Adaptive (Tự gập xuống dòng trên Mobile)
// ==========================================
export default function Header({ title, subtitle, rightNode }: HeaderProps) {
  return (
    <motion.div 
      // Hiệu ứng xuất hiện: Trượt nhẹ từ trên xuống và rõ dần
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8"
    >
      {/* Khối Văn bản (Typography) */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {/* Khối Nút Bấm / Hành động (Call-to-Action Slot) */}
      {rightNode && (
        <div className="w-full sm:w-auto flex items-center justify-start sm:justify-end gap-3">
          {rightNode}
        </div>
      )}
    </motion.div>
  );
}