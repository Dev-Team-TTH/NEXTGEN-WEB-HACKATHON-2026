"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { Compass, Home, ArrowLeft } from "lucide-react";

// ==========================================
// COMPONENT: GLOBAL NOT FOUND (404 PAGE)
// Xử lý khi người dùng truy cập đường dẫn không tồn tại
// ==========================================

export default function NotFound() {
  const router = useRouter();

  // --- CẤU HÌNH ANIMATION ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    show: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)", 
      transition: { type: "spring" as const, stiffness: 200, damping: 20 } 
    },
  };

  // Hiệu ứng lơ lửng vô cực cho số 404
  const floatingVariants: Variants = {
    animate: {
      y: [0, -15, 0],
      transition: {
        duration: 4,
        ease: "easeInOut",
        repeat: Infinity,
      },
    },
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen w-full relative overflow-hidden bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-50 p-4">
      
      {/* 1. HIỆU ỨNG ÁNH SÁNG NỀN (TÍM / XANH LAM) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('/noise.png')] z-0"></div>
      <div className="absolute top-[20%] left-[20%] w-[30vw] h-[30vw] min-w-[300px] min-h-[300px] bg-indigo-500/10 dark:bg-indigo-600/20 rounded-full blur-[100px] animate-pulse pointer-events-none z-0"></div>
      <div className="absolute bottom-[20%] right-[20%] w-[25vw] h-[25vw] min-w-[250px] min-h-[250px] bg-purple-500/10 dark:bg-purple-600/20 rounded-full blur-[100px] animate-[pulse_4s_ease-in-out_infinite] pointer-events-none z-0"></div>

      {/* 2. KHỐI NỘI DUNG CHÍNH */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center p-8 sm:p-12"
      >
        
        {/* Số 404 Khổng lồ kèm hiệu ứng lơ lửng */}
        <motion.div 
          variants={floatingVariants}
          animate="animate"
          className="relative flex items-center justify-center mb-8"
        >
          {/* Chữ 404 làm mờ ở nền đổ bóng */}
          <span className="absolute text-[12rem] sm:text-[16rem] font-black text-indigo-500/10 dark:text-indigo-400/5 blur-xl select-none">
            404
          </span>
          {/* Chữ 404 hiển thị chính */}
          <span className="relative text-[8rem] sm:text-[12rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 drop-shadow-2xl select-none leading-none">
            404
          </span>
          
          {/* Icon chiếc la bàn xoay nhẹ */}
          <motion.div 
            initial={{ rotate: -45 }}
            animate={{ rotate: 15 }}
            transition={{ repeat: Infinity, duration: 3, repeatType: "reverse", ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-4 sm:mt-8"
          >
            <Compass className="w-16 h-16 sm:w-24 sm:h-24 text-white dark:text-slate-900 opacity-20 drop-shadow-md" />
          </motion.div>
        </motion.div>

        {/* Thông báo lỗi bằng kính mờ */}
        <motion.div 
          variants={itemVariants}
          className="glass p-8 rounded-[2rem] border-indigo-100 dark:border-indigo-900/30 w-full max-w-lg mx-auto shadow-xl"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 text-slate-800 dark:text-white">
            Lạc bước vào vùng tối?
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            Trang bạn đang tìm kiếm không tồn tại, đã bị đổi tên hoặc bạn không có quyền truy cập vào khu vực này.
          </p>

          {/* Các nút hành động (Call to Actions) */}
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Quay lại</span>
            </button>
            
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-500/25"
            >
              <Home className="w-5 h-5" />
              <span>Về Bảng điều khiển</span>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}