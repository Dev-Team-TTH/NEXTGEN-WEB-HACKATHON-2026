"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Loader2, Ban, AlertOctagon, 
  TrendingDown, DollarSign, CalendarDays, FileText
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetAssetByIdQuery, 
  useLiquidateAssetMutation 
} from "@/state/api";

// --- IMPORT CORE MODAL & UTILS ---
import Modal from "@/app/(components)/Modal";
import { formatVND, formatDate } from "@/utils/formatters";
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
  // --- API HOOKS ---
  const { data: asset, isLoading: isLoadingAsset } = useGetAssetByIdQuery(assetId || "", { skip: !assetId || !isOpen });
  const [liquidateAsset, { isLoading: isSubmitting }] = useLiquidateAssetMutation();

  // --- LOCAL STATE ---
  const [liquidationDate, setLiquidationDate] = useState(new Date().toISOString().split('T')[0]);
  const [liquidationValue, setLiquidationValue] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLiquidationDate(new Date().toISOString().split('T')[0]);
      setLiquidationValue("0");
      setReason("");
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) return;

    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do thanh lý/hủy bỏ tài sản!"); return;
    }

    if (window.confirm(`XÁC NHẬN THANH LÝ TÀI SẢN\n\nTài sản sẽ bị xóa khỏi bảng cân đối kế toán. Thao tác này không thể hoàn tác!`)) {
      try {
        await liquidateAsset({
          id: assetId,
          data: {
            liquidationDate,
            liquidationValue: Number(liquidationValue) || 0,
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
        className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
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
      <div className="p-6 sm:p-8 flex flex-col gap-6">
        
        {isLoadingAsset ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" />
            <p className="text-sm font-medium text-slate-500">Đang kiểm tra dữ liệu sổ cái...</p>
          </div>
        ) : !asset ? (
          <div className="text-center py-10 text-slate-500">Không tìm thấy dữ liệu tài sản.</div>
        ) : asset.status === "LIQUIDATED" ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <Ban className="w-12 h-12 text-rose-500 opacity-80" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tài sản này đã được thanh lý!</p>
            <p className="text-xs text-slate-500">Hồ sơ đã bị đóng băng theo quy định kế toán.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 shadow-inner">
              <AlertOctagon className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-bold mb-1">Nghiệp vụ Kế toán tự động:</p>
                <p>Khi xác nhận thanh lý, hệ thống sẽ tự động tạo Bút toán Nhật ký chung ghi giảm tài sản và ghi nhận Lỗ/Lãi thanh lý vào Báo cáo KQKD.</p>
              </div>
            </div>

            <div className="flex flex-col p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{asset.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{asset.assetCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Giá trị ghi sổ hiện tại</p>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400">{formatVND(currentValue)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Dự kiến (Lỗ) / Lãi:</p>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm",
                  netProfitLoss < 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                )}>
                  {netProfitLoss < 0 ? <TrendingDown className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                  {netProfitLoss < 0 ? "-" : "+"}{formatVND(Math.abs(netProfitLoss))}
                </div>
              </div>
            </div>

            <form id="liquidate-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-rose-500 transition-colors">
                    <CalendarDays className="w-4 h-4" /> Ngày ghi nhận <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="date" required value={liquidationDate} onChange={(e) => setLiquidationDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 shadow-sm"
                  />
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-emerald-500 transition-colors">
                    <DollarSign className="w-4 h-4" /> Tiền thu hồi (VND) <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="number" value={liquidationValue} onChange={(e) => setLiquidationValue(e.target.value)} min="0" required placeholder="0 nếu hỏng vứt đi"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-rose-500 transition-colors">
                  <FileText className="w-4 h-4" /> Lý do thanh lý <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reason} required onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Máy hỏng mainboard không thể sửa chữa..." rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-rose-500 shadow-sm"
                />
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}