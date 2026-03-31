"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRightLeft, AlertCircle, Loader2, CheckCircle2, 
  Package, MapPin, Hash, FileText, AlertTriangle, CalendarDays 
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux";
import { 
  useTransferStockMutation, 
  useGetProductsQuery, 
  useGetWarehousesQuery,
  useGetInventoryBalancesQuery,
  useGetFiscalPeriodsQuery
} from "@/state/api";

import Modal from "@/app/(components)/Modal";
import { cn } from "@/utils/helpers";

interface TransferStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM_STATE = {
  fromWarehouseId: "",
  toWarehouseId: "",
  productId: "",
  transferQuantity: "",
  reason: "",
  fiscalPeriodId: ""
};

export default function TransferStockModal({ isOpen, onClose }: TransferStockModalProps) {
  // --- BỐI CẢNH REDUX ---
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- API HOOKS (🚀 ĐÃ BƠM BỐI CẢNH CHI NHÁNH VÀO MỌI QUERY) ---
  const { data: productsResponse, isLoading: loadingProducts } = useGetProductsQuery(
    { branchId: activeBranchId, limit: 1000 } as any, 
    { skip: !isOpen || !activeBranchId }
  );
  const products = productsResponse?.data || []; 

  const { data: warehouses, isLoading: loadingWarehouses } = useGetWarehousesQuery(
    { branchId: activeBranchId } as any, 
    { skip: !isOpen || !activeBranchId }
  );
  
  const { data: balancesResponse } = useGetInventoryBalancesQuery(
    { branchId: activeBranchId, limit: 5000 } as any, 
    { skip: !isOpen || !activeBranchId }
  );
  const balances = balancesResponse?.data || [];

  const { data: periods = [], isLoading: loadingPeriods } = useGetFiscalPeriodsQuery(undefined, { skip: !isOpen });

  const [transferStock, { isLoading: isSubmitting }] = useTransferStockMutation();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  useEffect(() => {
    if (isOpen) setFormData(INITIAL_FORM_STATE);
  }, [isOpen]);

  const availableStock = useMemo(() => {
    if (!formData.fromWarehouseId || !formData.productId) return null;
    const balance = balances.find((b: any) => b.warehouseId === formData.fromWarehouseId && b.productId === formData.productId);
    return balance ? balance.quantity : 0;
  }, [formData.fromWarehouseId, formData.productId, balances]);

  const isExceedingStock = useMemo(() => {
    if (availableStock === null || !formData.transferQuantity) return false;
    return Number(formData.transferQuantity) > availableStock;
  }, [availableStock, formData.transferQuantity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeBranchId) return toast.error("Không xác định được Chi nhánh!");

    if (!formData.fromWarehouseId || !formData.toWarehouseId || !formData.productId || !formData.transferQuantity || !formData.fiscalPeriodId) {
      return toast.error("Vui lòng điền đầy đủ thông tin bắt buộc!"); 
    }

    if (formData.fromWarehouseId === formData.toWarehouseId) {
      return toast.error("Kho xuất và Kho nhập không được trùng nhau!"); 
    }

    const qty = Number(formData.transferQuantity);
    if (qty <= 0) return toast.error("Số lượng điều chuyển phải lớn hơn 0!"); 

    if (isExceedingStock) return toast.error("Số lượng điều chuyển vượt quá Tồn kho khả dụng!"); 

    try {
      const payload = {
        branchId: activeBranchId, 
        fiscalPeriodId: formData.fiscalPeriodId, 
        fromWarehouseId: formData.fromWarehouseId,
        toWarehouseId: formData.toWarehouseId,
        productId: formData.productId,
        quantity: qty,
        reason: formData.reason || "Điều chuyển nội bộ",
      };

      await transferStock(payload).unwrap();
      toast.success("Đã ghi nhận Phiếu Điều chuyển kho thành công!");
      onClose(); 
    } catch (error: any) {
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi điều chuyển kho!");
    }
  };

  const modalFooter = (
    <>
      <button
        type="button" onClick={onClose} disabled={isSubmitting}
        className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors duration-500 disabled:opacity-50"
      >
        Hủy bỏ
      </button>
      <button
        type="submit" form="transfer-stock-form"
        disabled={isSubmitting || isExceedingStock || availableStock === 0}
        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
        ) : (
          <><ArrowRightLeft className="w-4 h-4" /> Xác nhận Chuyển</>
        )}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen} onClose={onClose}
      title="Điều Chuyển Kho Nội Bộ" subtitle="Luân chuyển hàng hóa/vật tư giữa các kho trong cùng chi nhánh"
      icon={<ArrowRightLeft className="w-6 h-6 text-indigo-500" />}
      maxWidth="max-w-xl" disableOutsideClick={isSubmitting} footer={modalFooter}
    >
      <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-transparent transition-colors duration-500">
        <form id="transfer-stock-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors duration-500">
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500">
                <MapPin className="w-3.5 h-3.5" /> Từ Kho (Xuất) <span className="text-rose-500">*</span>
              </label>
              <select
                name="fromWarehouseId" value={formData.fromWarehouseId} onChange={handleChange} disabled={loadingWarehouses}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-colors duration-500 text-slate-900 dark:text-white cursor-pointer shadow-sm"
              >
                <option value="">-- Chọn kho xuất --</option>
                {warehouses?.map((w: any) => <option key={w.warehouseId} value={w.warehouseId}>{w.code} - {w.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500">
                <MapPin className="w-3.5 h-3.5" /> Đến Kho (Nhập) <span className="text-rose-500">*</span>
              </label>
              <select
                name="toWarehouseId" value={formData.toWarehouseId} onChange={handleChange} disabled={loadingWarehouses}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-colors duration-500 text-slate-900 dark:text-white cursor-pointer shadow-sm"
              >
                <option value="">-- Chọn kho nhập --</option>
                {warehouses?.map((w: any) => <option key={w.warehouseId} value={w.warehouseId}>{w.code} - {w.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500">
              <Package className="w-3.5 h-3.5" /> Vật tư / Sản phẩm điều chuyển <span className="text-rose-500">*</span>
            </label>
            <select
              name="productId" value={formData.productId} onChange={handleChange} disabled={loadingProducts}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-colors duration-500 text-slate-900 dark:text-white cursor-pointer shadow-sm"
            >
              <option value="">-- Tìm kiếm và chọn sản phẩm --</option>
              {products?.map((p: any) => <option key={p.productId} value={p.productId}>[{p.productCode}] {p.name}</option>)}
            </select>
          </div>

          <AnimatePresence>
            {availableStock !== null && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-colors duration-500",
                  availableStock > 0 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30" : "bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30"
                )}>
                  {availableStock > 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />}
                  <p className={cn("text-sm font-bold transition-colors duration-500", availableStock > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                    Tồn kho khả dụng tại Kho Xuất: <span className="text-lg font-black">{availableStock}</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500">
                <CalendarDays className="w-3.5 h-3.5" /> Ghi nhận vào kỳ <span className="text-rose-500">*</span>
              </label>
              <select
                name="fiscalPeriodId" value={formData.fiscalPeriodId} onChange={handleChange} disabled={loadingPeriods}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-colors duration-500 text-slate-900 dark:text-white cursor-pointer shadow-sm"
              >
                <option value="">-- Chọn Kỳ Hạch Toán --</option>
                {periods?.map((p: any) => (
                  <option key={p.periodId} value={p.periodId} disabled={p.isClosed || p.status === "CLOSED"}>
                    {p.periodName} {p.isClosed ? "(Đã Khóa)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500">
                <Hash className="w-3.5 h-3.5" /> Số lượng <span className="text-rose-500">*</span>
              </label>
              <input
                type="number" name="transferQuantity" value={formData.transferQuantity} onChange={handleChange} min="1"
                placeholder="VD: 50" disabled={availableStock === 0}
                className={cn(
                  "w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-xl text-lg font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 outline-none transition-colors duration-500 shadow-inner",
                  isExceedingStock ? "border-rose-500 focus:ring-rose-500 text-rose-600" : "border-slate-200 dark:border-slate-700 focus:ring-indigo-500"
                )}
              />
            </div>
            {isExceedingStock && (
              <p className="text-[11px] font-bold text-rose-500 sm:col-span-2 flex items-center gap-1 animate-pulse transition-colors duration-500">
                <AlertCircle className="w-3.5 h-3.5" /> LỖI: Số lượng chuyển vượt quá tồn kho khả dụng ({availableStock}).
              </p>
            )}
          </div>

          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500">
              <FileText className="w-3.5 h-3.5" /> Ghi chú điều chuyển
            </label>
            <textarea
              name="reason" value={formData.reason} onChange={handleChange}
              placeholder="Lý do luân chuyển hàng hóa..." rows={2}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors duration-500 resize-none shadow-sm text-slate-900 dark:text-white"
            ></textarea>
          </div>

        </form>
      </div>
    </Modal>
  );
}