"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, ArrowRightLeft, AlertOctagon, 
  Loader2, CheckCircle2, FileText, Calendar
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { 
  useGetJournalEntryByIdQuery, 
  useReverseJournalEntryMutation 
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL ĐẢO BÚT TOÁN (REVERSE ENTRY)
// ==========================================
interface ReverseEntryModalProps {
  entryId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReverseEntryModal({ entryId, isOpen, onClose }: ReverseEntryModalProps) {
  // --- API HOOKS ---
  // Chỉ gọi API lấy chi tiết nếu có entryId
  const { data: entryData, isLoading: isLoadingEntry } = useGetJournalEntryByIdQuery(entryId || "", {
    skip: !entryId
  });
  
  const [reverseEntry, { isLoading: isSubmitting }] = useReverseJournalEntryMutation();

  // --- LOCAL STATE (FORM) ---
  const [reason, setReason] = useState("");
  // Mặc định ngày đảo là ngày hiện tại
  const [reversalDate, setReversalDate] = useState(dayjs().format('YYYY-MM-DD'));

  // Reset form khi mở
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setReversalDate(dayjs().format('YYYY-MM-DD'));
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryId) return;

    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do đảo bút toán (Bắt buộc)!");
      return;
    }

    try {
      await reverseEntry({
        id: entryId,
        data: {
          reversalDate,
          reason
        }
      }).unwrap();
      
      toast.success("Đã tạo Bút toán Đảo thành công!");
      onClose();
    } catch (error: any) {
      console.error("Lỗi khi đảo bút toán:", error);
      toast.error(error?.data?.message || "Không thể đảo bút toán này. Có thể kỳ kế toán đã khóa!");
    }
  };

  // --- HELPER ---
  const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  // Tính tổng Nợ/Có của bút toán gốc để hiển thị
  const totalDebit = entryData?.lines?.reduce((sum: number, line: any) => sum + Number(line.debit || 0), 0) || 0;
  const totalCredit = entryData?.lines?.reduce((sum: number, line: any) => sum + Number(line.credit || 0), 0) || 0;

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md"
        >
          {/* Backdrop click (Khóa click ra ngoài khi đang submit) */}
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg glass-panel rounded-3xl shadow-2xl border border-rose-500/20 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header (Tone màu Cảnh báo) */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-rose-500/10 bg-rose-50/50 dark:bg-rose-900/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-rose-700 dark:text-rose-400 leading-tight">Đảo Bút Toán (Reverse)</h2>
                  <p className="text-xs text-rose-500/70 font-medium">Thao tác này sẽ sinh ra một định khoản ngược lại</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-full transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 flex flex-col gap-6 bg-white/50 dark:bg-black/20">
              
              {isLoadingEntry ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" />
                  <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu bút toán gốc...</p>
                </div>
              ) : entryData ? (
                <>
                  {/* DATA VIZ: THÔNG TIN BÚT TOÁN GỐC */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Bút toán cần đảo
                    </h3>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{entryData.reference || `JRN-${entryData.journalId.substring(0, 5)}`}</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-[200px] truncate" title={entryData.description}>
                          {entryData.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Ngày ghi sổ gốc</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{dayjs(entryData.entryDate).format('DD/MM/YYYY')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 pt-3 border-t border-slate-200 dark:border-white/10">
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 uppercase">Tổng Nợ</p>
                        <p className="font-bold text-blue-600">{formatVND(totalDebit)}</p>
                      </div>
                      <div className="flex-1 border-l border-slate-200 dark:border-white/10 pl-4">
                        <p className="text-[10px] text-slate-400 uppercase">Tổng Có</p>
                        <p className="font-bold text-orange-600">{formatVND(totalCredit)}</p>
                      </div>
                    </div>
                  </div>

                  {/* FORM NHẬP LIỆU LÝ DO */}
                  <form id="reverse-entry-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                    
                    {/* Cảnh báo */}
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
                      <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Hệ thống sẽ tạo ra một bút toán mới với số tiền âm (hoặc đảo ngược Nợ thành Có, Có thành Nợ) để triệt tiêu bút toán này.</p>
                    </div>

                    {/* Ngày đảo */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" /> Ngày ghi nhận đảo <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="date" 
                        value={reversalDate}
                        onChange={(e) => setReversalDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none text-slate-900 dark:text-white" 
                      />
                    </div>

                    {/* Lý do đảo */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" /> Lý do đảo / Biên bản <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ghi rõ lý do sai sót (VD: Hạch toán sai tài khoản, sai số tiền, theo yêu cầu số...)"
                        rows={3}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none text-slate-900 dark:text-white resize-none"
                      />
                    </div>

                  </form>
                </>
              ) : (
                <div className="text-center py-10 text-slate-500">
                  Không tìm thấy dữ liệu bút toán.
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isSubmitting} 
                className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                form="reverse-entry-form" 
                disabled={isSubmitting || isLoadingEntry || !entryData} 
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : <><CheckCircle2 className="w-4 h-4" /> Xác nhận Đảo Bút toán</>}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}