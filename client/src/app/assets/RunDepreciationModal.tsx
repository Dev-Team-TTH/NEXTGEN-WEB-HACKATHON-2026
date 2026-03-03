"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Calculator, Loader2, CheckCircle2, 
  CalendarDays, AlertOctagon, Cog, Database, Send
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { useRunAssetDepreciationMutation } from "@/state/api";

// ==========================================
// COMPONENT: MODAL CHẠY KHẤU HAO TỰ ĐỘNG
// ==========================================
interface RunDepreciationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RunDepreciationModal({ isOpen, onClose }: RunDepreciationModalProps) {
  // --- API HOOKS ---
  const [runDepreciation, { isLoading: isRunning }] = useRunAssetDepreciationMutation();

  // --- LOCAL STATE ---
  // Mặc định chọn tháng hiện tại để chạy khấu hao
  const [period, setPeriod] = useState(dayjs().format('YYYY-MM'));

  // Reset khi mở
  useEffect(() => {
    if (isOpen) {
      setPeriod(dayjs().format('YYYY-MM'));
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleRunBatchJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!period) {
      toast.error("Vui lòng chọn kỳ khấu hao!");
      return;
    }

    if (window.confirm(`XÁC NHẬN CHẠY KHẤU HAO KỲ [${period}]\n\nHệ thống sẽ tự động trừ giá trị tài sản và sinh bút toán kế toán. Thao tác này không thể hoàn tác. Bạn có chắc chắn?`)) {
      try {
        await runDepreciation({ period }).unwrap();
        toast.success(`Chạy khấu hao thành công cho kỳ ${period}! Giá trị tài sản đã được cập nhật.`);
        onClose(); 
      } catch (error: any) {
        console.error("Lỗi chạy khấu hao:", error);
        toast.error(error?.data?.message || "Lỗi hệ thống! Có thể kỳ này đã được chạy khấu hao trước đó.");
      }
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  // Trực quan hóa quy trình xử lý (Data Viz)
  const processSteps = [
    { icon: Database, title: "Quét Dữ liệu", desc: "Tìm các tài sản đang sử dụng" },
    { icon: Cog, title: "Xử lý Thuật toán", desc: "Trích lập theo tỷ lệ (Đường thẳng/Giảm dần)" },
    { icon: Send, title: "Đồng bộ Sổ cái", desc: "Sinh tự động Bút toán Khấu hao" }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md"
        >
          {/* Khóa click ra ngoài khi hệ thống đang chạy batch job */}
          <div className="absolute inset-0" onClick={!isRunning ? onClose : undefined} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg glass-panel rounded-3xl shadow-2xl border border-purple-500/30 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header (Màu Tím đặc trưng cho System Job) */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-purple-500/10 bg-purple-50/50 dark:bg-purple-900/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-purple-700 dark:text-purple-400 leading-tight">Chạy Khấu Hao Ký</h2>
                  <p className="text-xs text-purple-500/70 font-medium">Auto-Depreciation Batch Job</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                disabled={isRunning} 
                className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-6 bg-white/50 dark:bg-black/20">
              
              {/* Cảnh báo nghiêm trọng */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 shadow-inner">
                <AlertOctagon className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-bold mb-1">Cảnh báo Hệ thống:</p>
                  <p>Lệnh chạy khấu hao sẽ bào mòn Giá trị còn lại của tất cả tài sản hợp lệ và <b>KHÓA</b> chứng từ của kỳ đó. Vui lòng đảm bảo bạn chọn đúng kỳ kế toán.</p>
                </div>
              </div>

              {/* Data Viz: Quy trình xử lý */}
              <div className="grid grid-cols-3 gap-2">
                {processSteps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="flex flex-col items-center text-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-white/5 relative">
                      <div className={`p-2 rounded-full ${isRunning ? 'bg-purple-100 dark:bg-purple-500/20 animate-pulse text-purple-600 dark:text-purple-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                        <Icon className={`w-4 h-4 ${isRunning && idx === 1 ? 'animate-spin' : ''}`} />
                      </div>
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{step.title}</p>
                      <p className="text-[9px] text-slate-500 hidden sm:block">{step.desc}</p>
                      {/* Mũi tên kết nối */}
                      {idx < 2 && (
                        <div className="absolute top-6 right-[-10px] sm:right-[-12px] text-slate-300 dark:text-slate-600 hidden xs:block">
                           ▶
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Form Input */}
              <form id="run-depreciation-form" onSubmit={handleRunBatchJob} className="space-y-2 mt-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-purple-500" /> Chọn Kỳ Khấu hao (Tháng/Năm) <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="month" 
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  disabled={isRunning}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-lg font-bold focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-white disabled:opacity-50 text-center" 
                />
              </form>

            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isRunning} 
                className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                form="run-depreciation-form" 
                disabled={isRunning} 
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Đang chạy Batch Job...</>
                ) : (
                  <><Cog className="w-4 h-4" /> Kích hoạt Tự động</>
                )}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}