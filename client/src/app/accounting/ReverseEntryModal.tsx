"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, ArrowRightLeft, AlertTriangle, ShieldAlert, 
  CheckCircle2, Loader2, FileText, History, Info
} from "lucide-react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetJournalEntriesQuery,
  useReverseJournalEntryMutation,
  JournalEntry,
  JournalLine
} from "@/state/api";

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

interface ReverseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalId: string | null;
}

// ==========================================
// COMPONENT CHÍNH: WIZARD ĐẢO SỔ KẾ TOÁN
// ==========================================
export default function ReverseEntryModal({ isOpen, onClose, journalId }: ReverseEntryModalProps) {

  // --- API HOOKS ---
  // Tận dụng cache của query danh sách để lấy data chi tiết không cần fetch lại
  const { data: entries = [] } = useGetJournalEntriesQuery(undefined, { skip: !isOpen });
  const [reverseEntry, { isLoading: isReversing }] = useReverseJournalEntryMutation();

  // Lấy chi tiết bút toán đang cần đảo
  const originalEntry = useMemo(() => {
    return entries.find((e: JournalEntry) => e.journalId === journalId);
  }, [entries, journalId]);

  // --- LOCAL STATE ---
  const [reason, setReason] = useState("");

  // Reset form khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen, journalId]);

  // --- ENGINE TÍNH TOÁN DỰ PHÓNG ĐẢO SỔ (DATA VIZ) ---
  const reversedLines = useMemo(() => {
    if (!originalEntry || !originalEntry.lines) return [];
    
    // Đảo ngược vị trí Nợ thành Có, Có thành Nợ
    return originalEntry.lines.map((line: JournalLine) => ({
      ...line,
      newDebit: line.credit || 0, // Tiền CÓ cũ chuyển thành NỢ mới
      newCredit: line.debit || 0  // Tiền NỢ cũ chuyển thành CÓ mới
    }));
  }, [originalEntry]);

  const totalValue = useMemo(() => {
    return originalEntry?.lines?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0;
  }, [originalEntry]);

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalId) return;

    if (reason.trim().length < 10) {
      toast.error("Vui lòng nhập lý do đảo sổ chi tiết (ít nhất 10 ký tự) để phục vụ kiểm toán!");
      return;
    }

    try {
      await reverseEntry({
        id: journalId,
        data: { reason: reason.trim() }
      }).unwrap();
      
      toast.success("Đảo bút toán thành công! Sổ cái đã được cân bằng lại.");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi hệ thống! Không thể thực hiện đảo sổ.");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 30, rotateX: 5 },
    visible: { opacity: 1, scale: 1, y: 0, rotateX: 0, transition: { type: "spring", stiffness: 350, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };
  const listVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } };

  return (
    <AnimatePresence>
      {isOpen && journalId && (
        <motion.div
          variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-xl"
          style={{ perspective: 1200 }}
        >
          <div className="absolute inset-0" onClick={!isReversing ? onClose : undefined} />

          <motion.div
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-4xl bg-white dark:bg-[#0B0F19] rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.5)] border border-orange-500/30 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* 1. HEADER (CẢNH BÁO MÀU CAM) */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-orange-200 dark:border-orange-500/20 bg-orange-50/80 dark:bg-orange-950/20 backdrop-blur-md shrink-0 z-20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-orange-400 to-rose-500 rounded-2xl text-white shadow-lg shadow-orange-500/30">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-orange-700 dark:text-orange-400 tracking-tight">Đảo Bút Toán (Reverse Entry)</h2>
                  <p className="text-xs font-bold text-orange-600/70 dark:text-orange-500/70 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Nghiệp vụ điều chỉnh sai sót
                  </p>
                </div>
              </div>
              <button onClick={onClose} disabled={isReversing} className="p-2 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 rounded-xl transition-colors shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>

            {!originalEntry ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-orange-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-bold">Đang truy xuất dữ liệu sổ cái...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-slate-50/50 dark:bg-transparent">
                
                {/* INFO PANEL */}
                <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 p-5 rounded-2xl flex gap-4 text-orange-800 dark:text-orange-200">
                  <Info className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm mb-1">Quy tắc Kiểm toán Kế toán</h4>
                    <p className="text-xs leading-relaxed opacity-90">
                      Bút toán <strong>[{originalEntry.reference}]</strong> đã được ghi sổ (POSTED). Để đảm bảo tính minh bạch của vết kiểm toán, hệ thống sẽ KHÔNG XÓA bút toán này. Thay vào đó, một <strong>bút toán đảo ngược (Reversal)</strong> sẽ được tạo ra để tự động triệt tiêu số dư của bút toán gốc.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* CỘT TRÁI: FORM LÝ DO */}
                  <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm h-full flex flex-col">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <FileText className="w-4 h-4 text-orange-500" /> Xác nhận Nghiệp vụ
                      </h4>
                      
                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Giá trị đảo</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-200">{formatVND(totalValue)}</p>
                      </div>

                      <form id="reverseForm" onSubmit={handleSubmit} className="flex-1 flex flex-col">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase flex items-center gap-1.5 mb-2">
                          Lý do đảo sổ (Bắt buộc) *
                        </label>
                        <textarea 
                          required minLength={10}
                          value={reason} onChange={(e) => setReason(e.target.value)}
                          placeholder="Nhập lý do chi tiết (VD: Hạch toán nhầm tài khoản chi phí...)"
                          className="w-full flex-1 min-h-[120px] px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-shadow"
                        />
                        <p className="text-[10px] text-slate-400 mt-2 italic flex justify-end">Tối thiểu 10 ký tự</p>
                      </form>
                    </div>
                  </div>

                  {/* CỘT PHẢI: BẢNG PREVIEW ĐẢO NGƯỢC (DATA VIZ) */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm flex flex-col">
                    <div className="px-5 py-4 bg-slate-50 dark:bg-[#0B0F19] border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-500" /> Bảng xem trước Phân bổ (Preview)
                      </h4>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                          <tr>
                            <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700" rowSpan={2}>Tài khoản</th>
                            <th className="px-4 py-2 border-b border-r border-slate-200 dark:border-slate-700 text-center text-slate-400 bg-slate-100 dark:bg-slate-900/50" colSpan={2}>GỐC CHƯA ĐẢO</th>
                            <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-center text-orange-600 dark:text-orange-500 bg-orange-50/50 dark:bg-orange-900/10" colSpan={2}>SẼ GHI VÀO SỔ CÁI</th>
                          </tr>
                          <tr>
                            <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-right opacity-50">NỢ</th>
                            <th className="px-4 py-2 border-b border-r border-slate-200 dark:border-slate-700 text-right opacity-50">CÓ</th>
                            <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-right bg-orange-50/30 dark:bg-orange-900/10">NỢ MỚI</th>
                            <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-right bg-orange-50/30 dark:bg-orange-900/10">CÓ MỚI</th>
                          </tr>
                        </thead>
                        <motion.tbody variants={listVariants} initial="hidden" animate="visible" className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {reversedLines.map((line: any, idx: number) => (
                            <motion.tr variants={itemVariants} key={line.lineId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              {/* TK */}
                              <td className="px-4 py-3">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{line.account?.accountCode || "N/A"}</span>
                              </td>
                              
                              {/* CŨ */}
                              <td className="px-4 py-3 text-right text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">{formatVND(line.debit)}</td>
                              <td className="px-4 py-3 text-right text-slate-400 border-r border-slate-100 dark:border-slate-700 line-through decoration-slate-300 dark:decoration-slate-600">{formatVND(line.credit)}</td>
                              
                              {/* MỚI (ĐẢO) */}
                              <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10">
                                {line.newDebit > 0 ? formatVND(line.newDebit) : "-"}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10">
                                {line.newCredit > 0 ? formatVND(line.newCredit) : "-"}
                              </td>
                            </motion.tr>
                          ))}
                        </motion.tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 3. FOOTER */}
            <div className="px-6 py-5 bg-white dark:bg-[#090D14] border-t border-slate-200 dark:border-white/5 flex justify-end gap-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20">
              <button 
                type="button" onClick={onClose} disabled={isReversing} 
                className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy & Đóng
              </button>
              <button 
                type="submit" form="reverseForm"
                disabled={isReversing || reason.trim().length < 10 || !originalEntry} 
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white text-sm font-bold rounded-xl shadow-xl shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReversing ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
                XÁC NHẬN ĐẢO SỔ VÀ LƯU VẾT
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}