"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Lock, Unlock, CalendarDays, Loader2, 
  AlertOctagon, CheckCircle2, ShieldAlert
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { 
  useGetFiscalYearsQuery,
  useGetFiscalPeriodsQuery,
  useCloseFiscalPeriodMutation,
  useReopenFiscalPeriodMutation,
  FiscalPeriod
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL CHỐT SỔ / KHÓA KỲ KẾ TOÁN
// ==========================================
interface FiscalPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FiscalPeriodModal({ isOpen, onClose }: FiscalPeriodModalProps) {
  // --- STATE ---
  const [selectedYearId, setSelectedYearId] = useState<string>("");

  // --- API HOOKS ---
  const { data: fiscalYears = [], isLoading: isLoadingYears } = useGetFiscalYearsQuery(undefined, { skip: !isOpen });
  
  // Lấy danh sách các kỳ kế toán (tháng/quý) theo năm đã chọn
  const { data: fiscalPeriods = [], isLoading: isLoadingPeriods, refetch: refetchPeriods } = useGetFiscalPeriodsQuery(
    { yearId: selectedYearId }, 
    { skip: !selectedYearId || !isOpen }
  );

  const [closePeriod, { isLoading: isClosing }] = useCloseFiscalPeriodMutation();
  const [reopenPeriod, { isLoading: isReopening }] = useReopenFiscalPeriodMutation();

  // Tự động chọn Năm tài chính đầu tiên (năm hiện tại) khi load xong
  useEffect(() => {
    if (fiscalYears.length > 0 && !selectedYearId) {
      // Ưu tiên chọn năm đang ACTIVE (mở)
      const activeYear = fiscalYears.find(y => y.status === "ACTIVE" || !y.isClosed);
      setSelectedYearId(activeYear ? activeYear.yearId : fiscalYears[0].yearId);
    }
  }, [fiscalYears, selectedYearId]);

  // Reset khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedYearId("");
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleToggleLock = async (period: FiscalPeriod) => {
    const isCurrentlyClosed = period.status === "CLOSED";
    const actionName = isCurrentlyClosed ? "Mở khóa" : "Khóa sổ";
    
    if (window.confirm(`Bạn có chắc chắn muốn ${actionName} kỳ "${period.periodName}"?\n\n${isCurrentlyClosed ? "Cảnh báo: Dữ liệu trong kỳ này sẽ có thể bị thay đổi!" : "Toàn bộ chứng từ và bút toán trong kỳ này sẽ bị đóng băng."}`)) {
      try {
        if (isCurrentlyClosed) {
          await reopenPeriod(period.periodId).unwrap();
          toast.success(`Đã MỞ KHÓA kỳ ${period.periodName}`);
        } else {
          await closePeriod(period.periodId).unwrap();
          toast.success(`Đã KHÓA SỔ kỳ ${period.periodName}`);
        }
        refetchPeriods(); // Cập nhật lại danh sách ngay lập tức
      } catch (error: any) {
        toast.error(error?.data?.message || `Lỗi khi ${actionName} kỳ kế toán!`);
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
          {/* Khóa click ra ngoài nếu đang xử lý API */}
          <div className="absolute inset-0" onClick={!(isClosing || isReopening) ? onClose : undefined} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-4xl glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Chốt sổ / Khóa kỳ Kế toán</h2>
                  <p className="text-xs text-slate-500 font-medium">Quản lý trạng thái đóng/mở của các kỳ kế toán</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                disabled={isClosing || isReopening} 
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto scrollbar-thin flex flex-col gap-6 bg-white/30 dark:bg-black/10">
              
              {/* Lời nhắc nhở rủi ro */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <AlertOctagon className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-bold mb-1">Cảnh báo nghiệp vụ:</p>
                  <p>Việc Khóa kỳ kế toán (Đóng sổ) sẽ ngăn chặn mọi hành vi tạo mới, chỉnh sửa, hoặc đảo bút toán thuộc khoảng thời gian đó. Chỉ những tài khoản có đặc quyền Kế toán trưởng mới có thể thao tác.</p>
                </div>
              </div>

              {/* Bộ chọn Năm Tài Chính */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-500" /> Chọn Năm Tài Chính
                </label>
                {isLoadingYears ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách năm...
                  </div>
                ) : (
                  <select
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  >
                    <option value="" disabled>-- Lựa chọn năm --</option>
                    {fiscalYears.map(year => (
                      <option key={year.yearId} value={year.yearId}>
                        {year.yearName} {year.isClosed ? "(Đã khóa toàn bộ)" : "(Đang mở)"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Lưới danh sách Kỳ Kế Toán (Tháng/Quý) */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Danh sách Kỳ Kế Toán
                </h3>
                
                {isLoadingPeriods ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                    <p className="text-sm font-medium text-slate-500">Đang tải chi tiết các kỳ...</p>
                  </div>
                ) : fiscalPeriods.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                    Không tìm thấy kỳ kế toán nào cho năm này.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {fiscalPeriods.map((period) => {
                        const isClosed = period.status === "CLOSED";
                        return (
                          <motion.div 
                            key={period.periodId}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`p-4 rounded-2xl border flex flex-col gap-4 transition-all duration-300 ${
                              isClosed 
                                ? 'bg-slate-100/50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 opacity-70 grayscale-[30%]' 
                                : 'bg-white border-emerald-200 shadow-sm dark:bg-slate-800/80 dark:border-emerald-500/30'
                            }`}
                          >
                            {/* Thông tin kỳ */}
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className={`font-bold text-lg ${isClosed ? 'text-slate-600 dark:text-slate-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                  {period.periodName}
                                </h4>
                                <p className="text-[10px] font-mono text-slate-500 mt-1 bg-slate-100 dark:bg-slate-900/80 px-1.5 py-0.5 rounded w-fit">
                                  {dayjs(period.startDate).format('DD/MM/YYYY')} - {dayjs(period.endDate).format('DD/MM/YYYY')}
                                </p>
                              </div>
                              
                              {/* Badge Trạng thái */}
                              {isClosed ? (
                                <span className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500">
                                  <Lock className="w-4 h-4" />
                                </span>
                              ) : (
                                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                  <Unlock className="w-4 h-4" />
                                </span>
                              )}
                            </div>

                            {/* Nút Hành động */}
                            <button
                              onClick={() => handleToggleLock(period)}
                              disabled={isClosing || isReopening}
                              className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 ${
                                isClosed
                                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:border-rose-500/20 dark:text-rose-400'
                              }`}
                            >
                              {(isClosing || isReopening) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isClosed ? (
                                <>Mở khóa kỳ này</>
                              ) : (
                                <><Lock className="w-4 h-4" /> Chốt sổ kỳ này</>
                              )}
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end shrink-0">
              <button 
                onClick={onClose} 
                disabled={isClosing || isReopening} 
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:hover:bg-white dark:text-slate-900 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                Đóng cửa sổ
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}