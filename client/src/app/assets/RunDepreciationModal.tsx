"use client";

import React, { useState, useEffect } from "react";
import { 
  Calculator, Loader2, CheckCircle2, 
  CalendarDays, AlertOctagon, Cog, Database, Send, FileText
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux";
import { 
  useRunAssetDepreciationMutation,
  useGetFiscalPeriodsQuery 
} from "@/state/api";

// --- IMPORT CORE MODAL & UTILS ---
import Modal from "@/app/(components)/Modal";
import { cn } from "@/utils/helpers";

// ==========================================
// COMPONENT: MODAL CHẠY KHẤU HAO TỰ ĐỘNG
// ==========================================
interface RunDepreciationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RunDepreciationModal({ isOpen, onClose }: RunDepreciationModalProps) {
  // --- BỐI CẢNH (CONTEXT) ---
  const { activeBranchId } = useAppSelector(state => state.global);

  // --- API HOOKS ---
  const { data: fiscalPeriods = [], isLoading: loadingPeriods } = useGetFiscalPeriodsQuery({}, { skip: !isOpen });
  const [runDepreciation, { isLoading: isRunning }] = useRunAssetDepreciationMutation();

  // --- LOCAL STATE ---
  const [fiscalPeriodId, setFiscalPeriodId] = useState("");
  // 🚀 BỔ SUNG: Trạng thái cho Diễn giải Kế toán (Khớp nối hoàn hảo với API)
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (isOpen && fiscalPeriods.length > 0) {
      // Ưu tiên chọn kỳ mở
      const openPeriods = fiscalPeriods.filter(p => !p.isClosed && p.status !== "CLOSED");
      if (openPeriods.length > 0 && !fiscalPeriodId) {
        setFiscalPeriodId(openPeriods[0].periodId);
      }
      setDescription(""); // Reset description khi mở lại Modal
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fiscalPeriods]);

  useEffect(() => {
    if (!isOpen) {
      setFiscalPeriodId("");
      setDescription("");
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleRunBatchJob = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!activeBranchId) {
      toast.error("Không tìm thấy bối cảnh Chi nhánh. Vui lòng F5 lại trang!");
      return;
    }

    if (!fiscalPeriodId) {
      toast.error("Vui lòng chọn Kỳ kế toán!");
      return;
    }

    const selectedPeriod = fiscalPeriods.find(p => p.periodId === fiscalPeriodId);
    const periodName = selectedPeriod?.periodName || "Kỳ này";

    if (window.confirm(`XÁC NHẬN CHẠY KHẤU HAO [${periodName}]\n\nHệ thống sẽ tự động trừ giá trị tài sản và sinh bút toán kế toán. Thao tác này không thể hoàn tác. Bạn có chắc chắn?`)) {
      try {
        // 🚀 TỐI ƯU HÓA: Truyền custom description từ Kế toán trưởng, fallback về mặc định nếu rỗng
        await runDepreciation({ 
          fiscalPeriodId,
          branchId: activeBranchId,
          description: description.trim() !== "" ? description.trim() : `Khấu hao tài sản tự động kỳ ${periodName}`
        }).unwrap();
        
        toast.success(`Chạy khấu hao thành công cho ${periodName}! Giá trị tài sản đã được cập nhật.`);
        onClose(); 
      } catch (error: any) {
        console.error("Lỗi chạy khấu hao:", error);
        toast.error(error?.data?.message || "Lỗi hệ thống! Có thể kỳ này đã được chạy khấu hao trước đó.");
      }
    }
  };

  const processSteps = [
    { icon: Database, title: "Quét Dữ liệu", desc: "Tìm các tài sản đang sử dụng" },
    { icon: Cog, title: "Xử lý Thuật toán", desc: "Trích lập theo tỷ lệ (Đường thẳng/Giảm dần)" },
    { icon: Send, title: "Đồng bộ Sổ cái", desc: "Sinh tự động Bút toán Khấu hao" }
  ];

  // --- FOOTER RENDER ---
  const modalFooter = (
    <>
      <button 
        type="button" onClick={onClose} disabled={isRunning} 
        className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors duration-500 disabled:opacity-50"
      >
        Hủy bỏ
      </button>
      <button 
        onClick={handleRunBatchJob} 
        disabled={isRunning || !fiscalPeriodId || !activeBranchId} 
        className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isRunning ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Đang chạy Batch Job...</>
        ) : (
          <><Cog className="w-4 h-4" /> Kích hoạt Tự động</>
        )}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chạy Khấu Hao Ký"
      subtitle="Auto-Depreciation Batch Job"
      icon={<Calculator className="w-6 h-6 text-purple-500" />}
      maxWidth="max-w-lg"
      disableOutsideClick={isRunning}
      footer={modalFooter}
    >
      <div className="p-6 sm:p-8 flex flex-col gap-6 transition-colors duration-500">
        
        {/* Cảnh báo */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 shadow-inner transition-colors duration-500">
          <AlertOctagon className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200 transition-colors duration-500">
            <p className="font-bold mb-1">Cảnh báo Hệ thống:</p>
            <p>Lệnh chạy khấu hao sẽ bào mòn Giá trị còn lại của tất cả tài sản hợp lệ và sinh Bút toán Nhật ký chung. Vui lòng đảm bảo bạn chọn đúng kỳ kế toán.</p>
          </div>
        </div>

        {/* Data Viz: Quy trình xử lý */}
        <div className="grid grid-cols-3 gap-3">
          {processSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex flex-col items-center text-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-white/5 relative transition-colors duration-500">
                <div className={cn(
                  "p-2 rounded-full transition-colors duration-500",
                  isRunning ? "bg-purple-100 dark:bg-purple-500/20 animate-pulse text-purple-600 dark:text-purple-400" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                )}>
                  <Icon className={cn("w-4 h-4", isRunning && idx === 1 ? "animate-spin" : "")} />
                </div>
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide transition-colors duration-500">{step.title}</p>
                <p className="text-[9px] text-slate-500 hidden sm:block transition-colors duration-500">{step.desc}</p>
                {/* Mũi tên kết nối */}
                {idx < 2 && (
                  <div className="absolute top-1/2 -translate-y-1/2 right-[-10px] sm:right-[-12px] text-slate-300 dark:text-slate-600 hidden xs:block z-10 transition-colors duration-500">
                      ▶
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form id="run-depreciation-form" onSubmit={handleRunBatchJob} className="space-y-4 mt-2">
          {/* Form Input: Chọn Kỳ Kế Toán */}
          <div className="space-y-2 group">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-purple-500 transition-colors duration-500">
              <CalendarDays className="w-4 h-4" /> Chọn Kỳ Kế toán (Fiscal Period) <span className="text-rose-500">*</span>
            </label>
            
            {!activeBranchId ? (
               <div className="w-full px-4 py-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 text-center transition-colors duration-500">
                  Vui lòng chọn Chi nhánh làm việc trên thanh Header!
               </div>
            ) : loadingPeriods ? (
              <div className="w-full h-[52px] bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse transition-colors duration-500" />
            ) : (
              <select 
                value={fiscalPeriodId}
                onChange={(e) => setFiscalPeriodId(e.target.value)}
                disabled={isRunning || fiscalPeriods.length === 0}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-white disabled:opacity-50 shadow-sm cursor-pointer transition-colors duration-500" 
              >
                <option value="">-- Click để chọn Kỳ --</option>
                {fiscalPeriods.map(p => (
                  <option key={p.periodId} value={p.periodId} disabled={p.isClosed || p.status === "CLOSED"}>
                    {p.periodName} {p.isClosed || p.status === "CLOSED" ? "(Đã khóa)" : "(Đang mở)"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 🚀 BỔ SUNG: Form Input: Diễn giải Bút toán Kế toán */}
          <div className="space-y-2 group">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-purple-500 transition-colors duration-500">
              <FileText className="w-4 h-4" /> Diễn giải Bút toán Sổ cái
            </label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isRunning || !fiscalPeriodId || !activeBranchId}
              rows={2}
              placeholder="VD: Khấu hao TSCĐ Tháng 10/2023 theo QĐ 12/HĐQT..."
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-white disabled:opacity-50 shadow-sm resize-none transition-colors duration-500"
            />
            <p className="text-[11px] text-slate-500 transition-colors duration-500">
              Bỏ trống để sử dụng diễn giải mặc định của hệ thống.
            </p>
          </div>
        </form>

      </div>
    </Modal>
  );
}