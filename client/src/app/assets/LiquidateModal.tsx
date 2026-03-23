"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, Loader2, Ban, AlertOctagon, 
  TrendingDown, DollarSign, CalendarDays, FileText,
  Wallet
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux";
import { 
  useGetAssetByIdQuery, 
  useLiquidateAssetMutation,
  useGetFiscalPeriodsQuery, 
  useGetAccountsQuery       
} from "@/state/api";

// --- IMPORT CORE MODAL & UTILS ---
import Modal from "@/app/(components)/Modal";
import { formatVND } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

// ==========================================
// COMPONENT: MODAL THANH LÝ TÀI SẢN (LIQUIDATION)
// ==========================================
interface LiquidateModalProps {
  assetId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LiquidateModal({ assetId, isOpen, onClose }: LiquidateModalProps) {
  // --- BỐI CẢNH REDUX ---
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- API HOOKS ---
  const { data: asset, isLoading: isLoadingAsset } = useGetAssetByIdQuery(assetId || "", { skip: !assetId || !isOpen });
  const { data: periods = [], isLoading: loadingPeriods } = useGetFiscalPeriodsQuery(undefined, { skip: !isOpen });
  const { data: accounts = [], isLoading: loadingAccounts } = useGetAccountsQuery({ isActive: 'true' }, { skip: !isOpen });

  const [liquidateAsset, { isLoading: isSubmitting }] = useLiquidateAssetMutation();

  // --- LỌC TÀI KHOẢN TIỀN (ASSET 111/112) ---
  const cashAccounts = accounts.filter(acc => acc.accountType === "ASSET" && (acc.accountCode.startsWith("111") || acc.accountCode.startsWith("112")));

  // --- LOCAL STATE ---
  const [liquidationDate, setLiquidationDate] = useState(new Date().toISOString().split('T')[0]);
  const [liquidationValue, setLiquidationValue] = useState("");
  const [reason, setReason] = useState("");
  const [fiscalPeriodId, setFiscalPeriodId] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLiquidationDate(new Date().toISOString().split('T')[0]);
      setLiquidationValue("0");
      setReason("");
      setFiscalPeriodId("");
      setReceivingAccountId("");
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) return;

    if (!activeBranchId) {
      return toast.error("Không tìm thấy Chi nhánh làm việc. Vui lòng F5 lại trang!");
    }

    if (!fiscalPeriodId) {
      return toast.error("Vui lòng chọn Kỳ Kế toán để ghi sổ Bút toán Thanh lý!");
    }

    if (!reason.trim()) {
      return toast.error("Vui lòng nhập lý do thanh lý/hủy bỏ tài sản!");
    }

    const valueNum = Number(liquidationValue) || 0;
    if (valueNum > 0 && !receivingAccountId) {
      return toast.error("Vui lòng chọn Tài khoản nhận tiền (Tiền mặt/Ngân hàng) đối với giá trị thu hồi!");
    }

    if (window.confirm(`XÁC NHẬN THANH LÝ TÀI SẢN\n\nTài sản sẽ bị xóa khỏi bảng cân đối kế toán và chốt sổ kỳ này. Thao tác này không thể hoàn tác!`)) {
      try {
        await liquidateAsset({
          id: assetId,
          data: {
            branchId: activeBranchId,          // 🚀 BẢO VỆ CONTEXT
            fiscalPeriodId,                    // 🚀 BẢO VỆ AUTO-GL
            receivingAccountId: valueNum > 0 ? receivingAccountId : null, // 🚀 TÀI KHOẢN ĐỐI ỨNG
            liquidationDate,
            liquidationValue: valueNum,
            reason
          }
        }).unwrap();
        
        toast.success("Thanh lý tài sản thành công! Bút toán lãi/lỗ đã được tự động ghi nhận.");
        onClose();
      } catch (error: any) {
        toast.error(error?.data?.message || "Lỗi hệ thống khi thực hiện thanh lý!");
      }
    }
  };
  
  const currentValue = asset?.currentValue || 0;
  const netProfitLoss = (Number(liquidationValue) || 0) - currentValue;

  // --- FOOTER RENDER ---
  const modalFooter = (
    <>
      <button 
        type="button" onClick={onClose} disabled={isSubmitting} 
        className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors duration-500 disabled:opacity-50"
      >
        Hủy bỏ
      </button>
      
      {asset?.status !== "LIQUIDATED" && (
        <button 
          type="submit" form="liquidate-form" disabled={isSubmitting || isLoadingAsset} 
          className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : <><Ban className="w-4 h-4" /> Xác nhận Thanh lý</>}
        </button>
      )}
    </>
  );

  return (
    <Modal
      isOpen={isOpen && !!assetId}
      onClose={onClose}
      title="Thanh lý Tài sản (Liquidation)"
      subtitle="Ghi giảm tài sản, hủy bỏ hoặc bán phế liệu"
      icon={<ShieldAlert className="w-6 h-6 text-rose-500" />}
      maxWidth="max-w-2xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6 sm:p-8 flex flex-col gap-6 transition-colors duration-500">
        
        {isLoadingAsset ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-50 transition-colors duration-500">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" />
            <p className="text-sm font-medium text-slate-500">Đang kiểm tra dữ liệu sổ cái...</p>
          </div>
        ) : !asset ? (
          <div className="text-center py-10 text-slate-500 transition-colors duration-500">Không tìm thấy dữ liệu tài sản.</div>
        ) : asset.status === "LIQUIDATED" ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3 transition-colors duration-500">
            <Ban className="w-12 h-12 text-rose-500 opacity-80" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tài sản này đã được thanh lý!</p>
            <p className="text-xs text-slate-500">Hồ sơ đã bị đóng băng theo quy định kế toán.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 shadow-inner transition-colors duration-500">
              <AlertOctagon className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200 transition-colors duration-500">
                <p className="font-bold mb-1">Nghiệp vụ Kế toán tự động (Auto-GL):</p>
                <p>Khi xác nhận thanh lý, hệ thống sẽ tự động tạo Bút toán Nhật ký chung: Ghi Có TK 211, Ghi Nợ TK 214/811. Nếu có tiền thu hồi, sẽ tự động Ghi Nợ TK Tiền tương ứng.</p>
              </div>
            </div>

            <div className="flex flex-col p-5 rounded-2xl glass-panel shadow-sm gap-4 transition-colors duration-500">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 pb-3 transition-colors duration-500">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white transition-colors duration-500">{asset.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 transition-colors duration-500">{asset.assetCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider transition-colors duration-500">Giá trị ghi sổ hiện tại</p>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400 transition-colors duration-500">{formatVND(currentValue)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between transition-colors duration-500">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Dự kiến (Lỗ) / Lãi kỳ này:</p>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors duration-500",
                  netProfitLoss < 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                )}>
                  {netProfitLoss < 0 ? <TrendingDown className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                  {netProfitLoss < 0 ? "-" : "+"}{formatVND(Math.abs(netProfitLoss))}
                </div>
              </div>
            </div>

            <form id="liquidate-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* 🚀 CHỌN KỲ KẾ TOÁN */}
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-rose-500 transition-colors duration-500">
                  Kỳ Kế Toán Ghi Sổ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    name="fiscalPeriodId" value={fiscalPeriodId} onChange={(e) => setFiscalPeriodId(e.target.value)} required disabled={loadingPeriods}
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-none transition-colors duration-500 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Chọn Kỳ Hạch Toán --</option>
                    {periods.map((p: any) => (
                      <option key={p.periodId} value={p.periodId} disabled={p.isClosed || p.status === "CLOSED"}>
                        {p.periodName} {p.isClosed || p.status === "CLOSED" ? "(Đã Khóa)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-rose-500 transition-colors duration-500">
                    <CalendarDays className="w-4 h-4" /> Ngày thanh lý thực tế <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="date" required value={liquidationDate} onChange={(e) => setLiquidationDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 shadow-sm transition-colors duration-500"
                  />
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-emerald-500 transition-colors duration-500">
                    <DollarSign className="w-4 h-4" /> Tiền thu hồi (VND) <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="number" value={liquidationValue} onChange={(e) => setLiquidationValue(e.target.value)} min="0" required placeholder="0 nếu hỏng vứt đi"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 shadow-inner transition-colors duration-500"
                  />
                </div>
              </div>

              {/* 🚀 CHỌN TÀI KHOẢN TIỀN (Chỉ bắt buộc nếu có tiền thu hồi) */}
              <AnimatePresence>
                {Number(liquidationValue) > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 group overflow-hidden"
                  >
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-focus-within:text-emerald-500 transition-colors duration-500">
                      <Wallet className="w-3.5 h-3.5" /> Ghi Nợ Tài khoản Tiền (111/112) <span className="text-rose-500">*</span>
                    </label>
                    <select 
                      name="receivingAccountId" value={receivingAccountId} onChange={(e) => setReceivingAccountId(e.target.value)} required={Number(liquidationValue) > 0} disabled={loadingAccounts}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-colors duration-500 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Chọn TK Nhận Tiền --</option>
                      {cashAccounts.map((acc: any) => (
                        <option key={acc.accountId} value={acc.accountId}>{acc.accountCode} - {acc.name}</option>
                      ))}
                    </select>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-rose-500 transition-colors duration-500">
                  <FileText className="w-4 h-4" /> Lý do thanh lý <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reason} required onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Máy hỏng mainboard không thể sửa chữa..." rows={3}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-rose-500 shadow-sm transition-colors duration-500"
                />
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}