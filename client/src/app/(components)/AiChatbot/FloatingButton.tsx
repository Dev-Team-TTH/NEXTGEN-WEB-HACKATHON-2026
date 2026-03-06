import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

interface FloatingButtonProps {
  isOpen: boolean;
  showTooltip: boolean;
  onOpen: () => void;
  onCloseTooltip: () => void;
}

export default function FloatingButton({ isOpen, showTooltip, onOpen, onCloseTooltip }: FloatingButtonProps) {
  return (
    <AnimatePresence>
      {!isOpen && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-[60] flex flex-col items-end gap-3 pointer-events-none">
          
          {/* Tooltip Lời chào Chủ động */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="relative px-4 py-3 bg-white dark:bg-[#1E293B] rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.15)] border border-slate-200/80 dark:border-white/10 max-w-[220px] pointer-events-auto group"
              >
                <button onClick={onCloseTooltip} className="absolute -top-2 -right-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <X className="w-3 h-3" />
                </button>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                  Cần hỗ trợ phân tích dữ liệu? Hỏi TTH AI Core ngay! ✨
                </p>
                <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-[#1E293B] border-b border-r border-slate-200/80 dark:border-white/10 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nút Bong bóng Phát sáng */}
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onOpen}
            className="relative w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(79,70,229,0.5)] border border-white/20 pointer-events-auto group"
          >
            <div className="absolute inset-0 rounded-full bg-indigo-500 opacity-50 animate-ping" style={{ animationDuration: '3s' }} />
            <Sparkles className="w-6 h-6 text-white relative z-10 group-hover:animate-spin-slow" />
            <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-indigo-700 rounded-full shadow-sm z-20" />
          </motion.button>

        </div>
      )}
    </AnimatePresence>
  );
}