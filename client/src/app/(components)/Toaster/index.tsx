"use client";

import React from "react";
import { Toaster as ReactHotToaster, toast, resolveValue } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  X, 
  Loader2
} from "lucide-react";

// ==========================================
// COMPONENT: HỆ THỐNG THÔNG BÁO (TOASTER)
// Giao diện Glassmorphism, Chống Spam, Hiệu ứng Spring 60fps
// ==========================================

export default function Toaster() {
  return (
    <ReactHotToaster
      // Tự động đổi vị trí trên thiết bị
      position="top-right" 
      reverseOrder={false}
      gutter={12} // Khoảng cách giữa các Toasts
      toastOptions={{
        // Giới hạn thời gian hiển thị mặc định là 4 giây
        duration: 4000,
        // Chống spam: Giữ tối đa 3-4 toast trên màn hình (được xử lý bởi engine)
      }}
    >
      {(t) => {
        // 1. CHỌN MÀU SẮC & ICON DỰA TRÊN LOẠI THÔNG BÁO
        let icon = <Info className="w-5 h-5 text-blue-500" />;
        let glowColor = "bg-blue-500/10";
        let borderColor = "border-blue-500/20";
        let iconBg = "bg-blue-100 dark:bg-blue-500/20";

        if (t.type === "success") {
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
          glowColor = "bg-emerald-500/10";
          borderColor = "border-emerald-500/20";
          iconBg = "bg-emerald-100 dark:bg-emerald-500/20";
        } else if (t.type === "error") {
          icon = <AlertOctagon className="w-5 h-5 text-rose-500" />;
          glowColor = "bg-rose-500/10";
          borderColor = "border-rose-500/20";
          iconBg = "bg-rose-100 dark:bg-rose-500/20";
        } else if (t.type === "loading") {
          icon = <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />;
          glowColor = "bg-indigo-500/10";
          borderColor = "border-indigo-500/20";
          iconBg = "bg-indigo-100 dark:bg-indigo-500/20";
        } else if (t.icon) {
          // Custom Warning hoặc Icon tùy chỉnh
          icon = <AlertTriangle className="w-5 h-5 text-amber-500" />;
          glowColor = "bg-amber-500/10";
          borderColor = "border-amber-500/20";
          iconBg = "bg-amber-100 dark:bg-amber-500/20";
        }

        return (
          <AnimatePresence>
            {t.visible && (
              <motion.div
                key={t.id}
                // Hiệu ứng lò xo (Spring) khi xuất hiện
                initial={{ opacity: 0, y: -20, scale: 0.9, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(5px)", transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                // Layout linh hoạt (Responsive)
                className="pointer-events-auto flex w-full max-w-sm sm:max-w-md items-center gap-3 p-3 sm:p-4 rounded-2xl glass shadow-xl dark:shadow-2xl overflow-hidden relative group"
                style={{
                  // Áp dụng viền động theo loại thông báo
                  borderWidth: '1px',
                  borderColor: 'var(--tw-border-opacity)',
                }}
              >
                {/* Lớp màu phát sáng (Aura Glow) ở dưới nền */}
                <div className={`absolute -left-10 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full blur-2xl ${glowColor} pointer-events-none`}></div>

                {/* Khung chứa Icon */}
                <div className={`relative shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${iconBg} shadow-inner`}>
                  {icon}
                </div>

                {/* Khung chứa Nội dung Text */}
                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                    {/* Render text tĩnh hoặc function động của react-hot-toast */}
                    {resolveValue(t.message, t)}
                  </p>
                </div>

                {/* Nút Tắt nhanh (Close Button) - Chỉ hiện khi di chuột vào */}
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        );
      }}
    </ReactHotToaster>
  );
}