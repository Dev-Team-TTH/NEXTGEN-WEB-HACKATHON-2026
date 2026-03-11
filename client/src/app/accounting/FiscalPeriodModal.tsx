"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, CalendarDays, Lock, Unlock, Plus, AlertTriangle, 
  Loader2, CheckCircle2, ShieldAlert, CalendarClock,
  ArrowRight, TrendingUp, History, Camera
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetFiscalYearsQuery,
  useCreateFiscalYearMutation,
  useCloseFiscalYearMutation,
  useGetFiscalPeriodsQuery,
  useCloseFiscalPeriodMutation,
  useReopenFiscalPeriodMutation,
  FiscalYear,
  FiscalPeriod
} from "@/state/api";

// --- UTILS ---
import { formatDate } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

// ==========================================
// COMPONENT CHÍNH: TRẠM KIỂM SOÁT KỲ KẾ TOÁN
// ==========================================
interface FiscalPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FiscalPeriodModal({ isOpen, onClose }: FiscalPeriodModalProps) {
  
  // --- STATE ---
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);

  // --- API HOOKS ---
  const { data: years = [], isLoading: loadingYears } = useGetFiscalYearsQuery(undefined, { skip: !isOpen });
  const { data: periods = [], isLoading: loadingPeriods } = useGetFiscalPeriodsQuery({ yearId: selectedYearId }, { skip: !isOpen || !selectedYearId });

  const [createYear, { isLoading: isCreatingYear }] = useCreateFiscalYearMutation();
  const [closeYear, { isLoading: isClosingYear }] = useCloseFiscalYearMutation();
  const [closePeriod, { isLoading: isClosingPeriod }] = useCloseFiscalPeriodMutation();
  const [reopenPeriod, { isLoading: isReopeningPeriod }] = useReopenFiscalPeriodMutation();

  const isProcessing = isCreatingYear || isClosingYear || isClosingPeriod || isReopeningPeriod;

  useEffect(() => {
    if (isOpen && years.length > 0 && !selectedYearId) {
      const activeYear = years.find((y: any) => y.status === "ACTIVE" || !y.isClosed);
      setSelectedYearId(activeYear ? activeYear.yearId : years[0].yearId);
    }
  }, [isOpen, years, selectedYearId]);

  // --- DATA VIZ: Tính toán Tiến độ Khóa sổ ---
  const selectedYear = useMemo(() => years.find((y: FiscalYear) => y.yearId === selectedYearId), [years, selectedYearId]);
  
  const progress = useMemo(() => {
    if (!periods.length) return { closed: 0, total: 0, percent: 0 };
    const closed = periods.filter((p: any) => p.isClosed || p.status === "CLOSED").length;
    return { 
      closed, 
      total: periods.length, 
      percent: Math.round((closed / periods.length) * 100) 
    };
  }, [periods]);

  // --- HANDLERS ---
  const handleCreateNextYear = async () => {
    const nextYearNum = new Date().getFullYear() + 1; 
    if (window.confirm(`Hệ thống sẽ tự động khởi tạo Năm Tài Chính ${nextYearNum} cùng 12 kỳ kế toán tương ứng. Xác nhận?`)) {
      try {
        await createYear({
          year: nextYearNum,
          startDate: `${nextYearNum}-01-01`,
          endDate: `${nextYearNum}-12-31`
        } as any).unwrap();
        toast.success(`Đã khởi tạo thành công Năm ${nextYearNum}!`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi khởi tạo năm tài chính!");
      }
    }
  };

  const handleTogglePeriod = async (rawPeriod: any) => {
    const isClosed = rawPeriod.isClosed || rawPeriod.status === "CLOSED";
    const periodName = rawPeriod.periodName || `Kỳ ${rawPeriod.periodNumber}`;
    
    const message = isClosed 
      ? `CẢNH BÁO MỞ KHÓA: Nếu mở lại "${periodName}", kế toán viên có thể sửa đổi bút toán cũ. Điều này có thể làm thay đổi cấu trúc Báo cáo Tài chính.\n\nTiếp tục mở khóa?`
      : `KHÓA SỔ & CHỤP SNAPSHOT "${periodName}": \n- Mọi dữ liệu tài chính trong kỳ này sẽ bị niêm phong cứng.\n- Hệ thống tự động tạo Snapshot toàn bộ tồn kho hiện tại để phục vụ đối soát.\n\nBạn có chắc chắn muốn chốt sổ?`;

    if (window.confirm(message)) {
      try {
        if (isClosed) {
          await reopenPeriod(rawPeriod.periodId).unwrap();
          toast.success(`Đã MỞ KHÓA ${periodName}.`);
        } else {
          await closePeriod(rawPeriod.periodId).unwrap();
          toast.success(`Đã KHÓA SỔ & SNAPSHOT ${periodName} an toàn.`);
        }
      } catch (err: any) {
        toast.error(err?.data?.message || `Lỗi khi xử lý thao tác!`);
      }
    }
  };

  const handleCloseYear = async () => {
    if (!selectedYearId || !selectedYear) return;
    if (progress.closed < progress.total) {
      toast.error("Phải khóa toàn bộ 12 kỳ (tháng) trước khi Khóa Năm Tài Chính!");
      return;
    }
    
    const yearDisplayName = (selectedYear as any).yearName || (selectedYear as any).year;
    if (window.confirm(`BƯỚC NGOẶT: Khóa sổ Toàn bộ Năm "${yearDisplayName}"?\nCơ sở dữ liệu sẽ kết chuyển số dư sang năm sau. Hành động này KHÔNG THỂ HOÀN TÁC!`)) {
      try {
        await closeYear(selectedYearId).unwrap();
        toast.success(`Đã khóa sổ vĩnh viễn Năm tài chính!`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi khi chạy tiến trình Khóa Năm!");
      }
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 30 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };
  const listVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md"
        >
          <div className="absolute inset-0" onClick={!isProcessing ? onClose : undefined} />

          <motion.div
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-5xl bg-slate-50 dark:bg-[#0B0F19] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/10 overflow-hidden z-10 flex flex-col md:flex-row h-[85vh]"
          >
            
            {/* === CỘT TRÁI: DANH SÁCH NĂM TÀI CHÍNH === */}
            <div className="w-full md:w-[320px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/5 flex flex-col shrink-0 z-20">
              <div className="p-6 border-b border-slate-200 dark:border-white/5 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <button onClick={onClose} disabled={isProcessing} className="md:hidden p-1.5 text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Niên độ Kế toán</h2>
                <p className="text-xs font-medium text-slate-500 mt-1">Quản lý vòng đời dữ liệu tài chính</p>
                
                <button 
                  onClick={handleCreateNextYear} disabled={isProcessing}
                  className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 bg-slate-100 hover:bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-900/30 dark:text-indigo-400 text-sm font-bold rounded-xl transition-colors border border-dashed border-indigo-200 dark:border-indigo-800"
                >
                  {isCreatingYear ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}
                  Khởi tạo Năm Mới
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-thin">
                {loadingYears ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                ) : years.map((rawYear: any) => {
                  const isActive = selectedYearId === rawYear.yearId;
                  const isClosed = rawYear.isClosed || rawYear.status === "CLOSED";
                  const yearNameDisplay = rawYear.yearName || `Năm ${rawYear.year}`;

                  return (
                    <div 
                      key={rawYear.yearId} 
                      onClick={() => !isProcessing && setSelectedYearId(rawYear.yearId)}
                      className={cn(
                        "relative p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                        isActive ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2 relative z-10">
                        <h4 className={cn("font-bold text-lg", isActive ? "text-indigo-700 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300")}>
                          {yearNameDisplay}
                        </h4>
                        {isClosed ? (
                          <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg"><Lock className="w-3.5 h-3.5"/></div>
                        ) : (
                          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><Unlock className="w-3.5 h-3.5"/></div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 relative z-10">
                        <span>{formatDate(rawYear.startDate, "MM/YYYY")}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{formatDate(rawYear.endDate, "MM/YYYY")}</span>
                      </div>
                      {isActive && <motion.div layoutId="activeYear" className="absolute inset-0 border-2 border-indigo-500 rounded-2xl shadow-[0_0_15px_rgba(99,102,241,0.2)] pointer-events-none" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* === CỘT PHẢI: QUẢN LÝ KỲ (THÁNG) === */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-transparent relative overflow-hidden">
              <div className="hidden md:flex items-center justify-end p-4 absolute top-0 right-0 z-30">
                 <button onClick={onClose} disabled={isProcessing} className="p-2 text-slate-400 hover:text-rose-500 bg-white/80 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-900/30 backdrop-blur-sm rounded-xl transition-colors shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!selectedYearId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <CalendarDays className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-bold">Chọn một Năm tài chính để xem chi tiết.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-6 sm:p-8 overflow-y-auto scrollbar-thin">
                  
                  {/* WIDGET TỔNG QUAN NĂM */}
                  <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><ShieldAlert className="w-32 h-32"/></div>
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4 relative z-10">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                          Trạng thái {(selectedYear as any)?.yearName || (selectedYear as any)?.year}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                          <Lock className="w-4 h-4 text-rose-500"/>
                          Khóa sổ đảm bảo tính vô tỳ vết của Báo cáo tài chính.
                        </p>
                      </div>
                      
                      <button 
                        onClick={handleCloseYear}
                        disabled={isProcessing || (selectedYear as any)?.isClosed || (selectedYear as any)?.status === "CLOSED" || progress.closed < progress.total}
                        className={cn(
                          "px-5 py-2.5 font-bold text-sm rounded-xl flex items-center gap-2 transition-all shadow-sm",
                          (selectedYear as any)?.isClosed || (selectedYear as any)?.status === "CLOSED" ? "bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed" : progress.closed < progress.total ? "bg-rose-50 text-rose-300 dark:bg-rose-900/10 cursor-not-allowed border border-rose-100 dark:border-rose-900/50" : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/30 active:scale-95"
                        )}
                      >
                        {isClosingYear ? <Loader2 className="w-4 h-4 animate-spin"/> : <Lock className="w-4 h-4"/>}
                        {(selectedYear as any)?.isClosed || (selectedYear as any)?.status === "CLOSED" ? "Năm Đã Khóa Vĩnh Viễn" : "Chốt Sổ Toàn Bộ Năm"}
                      </button>
                    </div>

                    <div className="relative z-10">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                        <span className="text-slate-500">Tiến trình Khóa sổ</span>
                        <span className={progress.percent === 100 ? "text-emerald-500" : "text-indigo-500"}>
                          {progress.closed} / {progress.total} Kỳ ({progress.percent}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }} animate={{ width: `${progress.percent}%` }} transition={{ duration: 1, ease: "easeOut" }}
                          className={cn("h-full stripe-pattern", progress.percent === 100 ? "bg-emerald-500" : "bg-indigo-500")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* LƯỚI 12 KỲ KẾ TOÁN */}
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarClock className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-bold text-slate-800 dark:text-white">Chi tiết 12 Kỳ Kế toán (Tháng)</h4>
                  </div>

                  {loadingPeriods ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500"/></div>
                  ) : (
                    <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {periods.map((rawPeriod: any) => {
                        const isClosed = rawPeriod.isClosed || rawPeriod.status === "CLOSED";
                        const isYearClosed = (selectedYear as any)?.isClosed || (selectedYear as any)?.status === "CLOSED";
                        const periodName = rawPeriod.periodName || `Kỳ ${rawPeriod.periodNumber}`;

                        return (
                          <motion.div 
                            variants={itemVariants} key={rawPeriod.periodId} 
                            className={cn(
                              "p-5 rounded-2xl border transition-all flex flex-col justify-between h-[140px] relative overflow-hidden group",
                              isClosed ? "bg-slate-50 border-slate-200 dark:bg-[#0d1321] dark:border-slate-800" : "bg-white border-emerald-200 shadow-sm hover:shadow-md dark:bg-slate-800 dark:border-emerald-500/30"
                            )}
                          >
                            <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-5 pointer-events-none">
                              {isClosed ? <Lock className="w-24 h-24 text-slate-500"/> : <Unlock className="w-24 h-24 text-emerald-500"/>}
                            </div>

                            <div className="flex items-start justify-between relative z-10">
                              <div>
                                <h5 className={cn("font-black text-lg flex items-center gap-1.5", isClosed ? "text-slate-500" : "text-emerald-700 dark:text-emerald-400")}>
                                  {periodName}
                                  {isClosed && <span title="Đã có Snapshot tồn kho"><Camera className="w-3.5 h-3.5 text-indigo-400" /></span>}
                                </h5>
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  {formatDate(rawPeriod.startDate, "DD/MM")} - {formatDate(rawPeriod.endDate, "DD/MM/YYYY")}
                                </p>
                              </div>
                              <div className={cn("p-2 rounded-xl", isClosed ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 shadow-sm")}>
                                {isClosed ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>}
                              </div>
                            </div>

                            <div className="relative z-10 mt-auto pt-2">
                              {!isYearClosed ? (
                                <button 
                                  onClick={() => handleTogglePeriod(rawPeriod)} disabled={isProcessing}
                                  className={cn(
                                    "w-full py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                                    isClosed ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20" : "text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
                                  )}
                                >
                                  {isClosed ? <Unlock className="w-3.5 h-3.5"/> : <Lock className="w-3.5 h-3.5"/>}
                                  {isClosed ? "Mở khóa kỳ này" : "Khóa sổ & Snapshot"}
                                </button>
                              ) : (
                                <div className="w-full py-2 text-xs font-bold text-center text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                  Đã niêm phong theo Năm
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}

                </div>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}