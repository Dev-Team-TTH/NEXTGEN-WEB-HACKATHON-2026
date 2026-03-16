"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { X } from "lucide-react";

// --- UTILS ---
import { cn } from "@/utils/helpers";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string; 
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string; 
  disableOutsideClick?: boolean;
  hideHeader?: boolean; 
  hideFooter?: boolean; 
}

export default function Modal({
  isOpen,
  onClose,
  title = "",
  subtitle,
  icon,
  children,
  footer,
  maxWidth = "max-w-lg",
  disableOutsideClick = false,
  hideHeader = false,
  hideFooter = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  // Khắc phục Hydration Error của Next.js (Chỉ render Portal khi Client đã tải xong)
  useEffect(() => {
    setMounted(true);
  }, []);

  // ==========================================
  // LOGIC FIX: KHÓA CUỘN TRANG (SCROLL LOCK) AN TOÀN
  // Lưu lại style cũ trước khi đè 'hidden', đảm bảo không làm hỏng layout tổng
  // ==========================================
  useEffect(() => {
    if (!isOpen) return;

    // Lưu lại giá trị gốc ban đầu của body
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    return () => {
      // Trả lại nguyên vẹn giá trị gốc thay vì dùng "unset" (gây lỗi)
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  // ==========================================
  // LOGIC: LẮNG NGHE PHÍM ESCAPE (TẮT BẰNG BÀN PHÍM)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !disableOutsideClick) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, disableOutsideClick, onClose]);

  // Nếu chưa mount xong ở Client thì không render gì cả (Tránh lỗi document is not defined)
  if (!mounted) return null;

  // Cấu hình chuyển động Framer Motion (Glassmorphism Effect)
  const backdropVariants: Variants = {
    hidden: { opacity: 0, backdropFilter: "blur(0px)" },
    visible: { opacity: 1, backdropFilter: "blur(8px)", transition: { duration: 0.3 } },
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { type: "spring", damping: 25, stiffness: 300 } 
    },
    exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } },
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60"
          // CHUẨN ACCESSIBILITY
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
        >
          {/* LỚP BACKDROP BẮT SỰ KIỆN CLICK OUTSIDE */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={!disableOutsideClick ? onClose : undefined}
            aria-hidden="true"
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            // Ngăn chặn việc click vào bên trong Modal làm tắt Modal (Bong bóng sự kiện - Event Bubbling)
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-10 flex flex-col max-h-[92vh]",
              maxWidth
            )}
          >
            {/* --- HEADER --- */}
            {!hideHeader && (
              <div className="flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-4">
                  {icon && (
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-400">
                      {icon}
                    </div>
                  )}
                  <div>
                    <h2 id="modal-title" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={disableOutsideClick}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-colors disabled:opacity-50 active:scale-95"
                  aria-label="Đóng"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* --- CONTENT AREA (CÓ SCROLLBAR) --- */}
            <div className="overflow-y-auto custom-scrollbar bg-white dark:bg-transparent flex-1 flex flex-col">
              {children}
            </div>

            {/* --- FOOTER --- */}
            {!hideFooter && footer && (
              <div className="px-6 sm:px-8 py-4 sm:py-5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 sm:gap-4 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}