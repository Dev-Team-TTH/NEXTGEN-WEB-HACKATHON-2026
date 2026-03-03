"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// ==========================================
// COMPONENT: MÀN HÌNH CHỜ (SPLASH SCREEN)
// Mục đích: Che đi quá trình tải initial state và tạo hiệu ứng đắm chìm
// ==========================================
export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hiển thị SplashScreen trong 2 giây rồi tự động gọi onFinish để tắt
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 800); // Chờ animation exit hoàn tất rồi mới unmount
    }, 2000); 

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            filter: "blur(20px)", 
            scale: 1.1,
            transition: { duration: 0.8, ease: "easeInOut" } 
          }}
          className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0B0F19] overflow-hidden"
        >
          {/* Lớp Noise nền */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay bg-[url('/noise.png')] z-0"></div>
          
          {/* Vòng sáng Gradient Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] rounded-full bg-blue-500/10 dark:bg-blue-600/20 blur-[80px] pointer-events-none z-0 animate-pulse duration-3000"></div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Hiệu ứng Logo xuất hiện kiểu lò xo (Spring) */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative w-24 h-24 sm:w-28 sm:h-28 drop-shadow-2xl mb-6"
            >
              <Image 
                src="/logo.png" 
                alt="TTH ERP Logo" 
                fill 
                sizes="112px" 
                style={{ objectFit: "contain" }} 
                priority 
              />
            </motion.div>

            {/* Hiệu ứng Text */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center text-center"
            >
              <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400 tracking-tight">
                TTH ERP
              </h1>
              <div className="mt-3 flex items-center gap-3">
                <div className="w-8 h-px bg-slate-300 dark:bg-slate-700"></div>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">
                  Enterprise System
                </p>
                <div className="w-8 h-px bg-slate-300 dark:bg-slate-700"></div>
              </div>
            </motion.div>

            {/* Thanh Loading nhỏ phía dưới */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-12 w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"
            >
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}