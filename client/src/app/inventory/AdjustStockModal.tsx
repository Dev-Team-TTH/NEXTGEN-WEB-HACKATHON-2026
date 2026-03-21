"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion"; // 🚀 ĐÃ FIX LỖI IMPORT Ở ĐÂY
import { 
  ClipboardEdit, AlertCircle, Loader2, CheckCircle2, 
  Package, MapPin, Calculator, TrendingUp, TrendingDown 
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useAdjustStockMutation, 
  useGetProductsQuery, 
  useGetWarehousesQuery,
  useGetInventoryBalancesQuery
} from "@/state/api";

// --- IMPORT CORE MODAL & UTILS ---
import Modal from "@/app/(components)/Modal";
import { cn } from "@/utils/helpers";

// ==========================================
// COMPONENT: MODAL ĐIỀU CHỈNH KHO (KIỂM KÊ)
// ==========================================
interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdjustStockModal({ isOpen, onClose }: AdjustStockModalProps) {
  // --- API HOOKS ---
  const { data: productsResponse, isLoading: loadingProducts } = useGetProductsQuery({ limit: 1000 }, { skip: !isOpen });
  const products = productsResponse?.data || [];

  const { data: warehouses, isLoading: loadingWarehouses } = useGetWarehousesQuery({}, { skip: !isOpen });
  
  // 🚀 LẤY DỮ LIỆU TỒN KHO ĐỂ REAL-TIME PREVIEW
  const { data: balancesResponse, isLoading: loadingBalances } = useGetInventoryBalancesQuery({ limit: 5000 }, { skip: !isOpen });
  const balances = balancesResponse?.data || [];

  const [adjustStock, { isLoading: isSubmitting }] = useAdjustStockMutation();

  // --- LOCAL STATE (FORM DATA) ---
  const [formData, setFormData] = useState({
    warehouseId: "",
    productId: "",
    adjustedQuantity: "", 
    reason: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({ warehouseId: "", productId: "", adjustedQuantity: "", reason: "" });
    }
  }, [isOpen]);

  // --- 🚀 LOGIC TÍNH TOÁN TỒN KHO THỰC TẾ (SMART UX) ---
  const currentStock = useMemo(() => {
    if (!formData.warehouseId || !formData.productId) return null;
    const balance = balances.find((b: any) => b.warehouseId === formData.warehouseId && b.productId === formData.productId);
    return balance ? balance.quantity : 0;
  }, [formData.warehouseId, formData.productId, balances]);

  const expectedStock = useMemo(() => {
    if (currentStock === null) return null;
    const adjustVal = Number(formData.adjustedQuantity) || 0;
    return currentStock + adjustVal;
  }, [currentStock, formData.adjustedQuantity]);

  // --- HANDLERS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.warehouseId || !formData.productId || !formData.adjustedQuantity) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }

    if (expectedStock !== null && expectedStock < 0) {
      toast.error("Số lượng điều chỉnh không hợp lệ (Tồn kho không thể âm)!");
      return;
    }

    try {
      const payload = {
        ...formData,
        quantity: Number(formData.adjustedQuantity)
      };

      await adjustStock(payload).unwrap();
      toast.success("Đã ghi nhận Phiếu điều chỉnh kho thành công!");
      onClose(); 
    } catch (error: any) {
      console.error("Lỗi điều chỉnh kho:", error);
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi điều chỉnh kho!");
    }
  };

  // --- FOOTER RENDER ---
  const modalFooter = (
    <>
      <button
        type="button" onClick={onClose} disabled={isSubmitting}
        className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
      >
        Hủy bỏ
      </button>
      <button
        type="submit" form="adjust-stock-form"
        disabled={isSubmitting || (expectedStock !== null && expectedStock < 0)}
        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
        ) : (
          <><CheckCircle2 className="w-4 h-4" /> Xác nhận lưu</>
        )}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen} onClose={onClose}
      title="Điều Chỉnh Tồn Kho" subtitle="Cập nhật số lượng thực tế sau kiểm kê"
      icon={<ClipboardEdit className="w-6 h-6 text-blue-500" />}
      maxWidth="max-w-lg" disableOutsideClick={isSubmitting} footer={modalFooter}
    >
      <div className="p-6 sm:p-8">
        <form id="adjust-stock-form" onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 group sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
                <MapPin className="w-4 h-4" /> Kho lưu trữ <span className="text-rose-500">*</span>
              </label>
              <select
                name="warehouseId" value={formData.warehouseId} onChange={handleChange} disabled={loadingWarehouses}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50 shadow-sm appearance-none cursor-pointer"
              >
                <option value="">-- Chọn kho cần điều chỉnh --</option>
                {warehouses?.map((w: any) => (
                  <option key={w.warehouseId} value={w.warehouseId}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 group sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
                <Package className="w-4 h-4" /> Vật tư / Sản phẩm <span className="text-rose-500">*</span>
              </label>
              <select
                name="productId" value={formData.productId} onChange={handleChange} disabled={loadingProducts}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50 shadow-sm appearance-none cursor-pointer"
              >
                <option value="">-- Chọn sản phẩm --</option>
                {products?.map((p: any) => (
                  <option key={p.productId || p.id} value={p.productId || p.id}>[{p.productCode}] {p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 🚀 THÔNG TIN PREVIEW THỰC TẾ TRƯỚC KHI ĐIỀU CHỈNH */}
          <AnimatePresence>
            {currentStock !== null && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Tồn kho hiện tại</span>
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{currentStock}</span>
                  </div>
                  <Calculator className="w-8 h-8 text-blue-300 dark:text-blue-500/50" />
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Dự kiến sau điều chỉnh</span>
                    <span className={cn(
                      "text-2xl font-black transition-colors",
                      expectedStock !== null && expectedStock < 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {expectedStock}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
              Số lượng điều chỉnh (+/-) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              {Number(formData.adjustedQuantity) > 0 ? <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" /> : Number(formData.adjustedQuantity) < 0 ? <TrendingDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-500" /> : null}
              <input
                type="number" name="adjustedQuantity" value={formData.adjustedQuantity} onChange={handleChange}
                placeholder="VD: 5 (dư hàng) hoặc -3 (hao hụt)"
                className={cn(
                  "w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-lg font-black outline-none transition-all text-slate-900 dark:text-white shadow-inner",
                  Number(formData.adjustedQuantity) !== 0 ? "pl-11" : "",
                  expectedStock !== null && expectedStock < 0 ? "focus:ring-2 focus:ring-rose-500 border-rose-300" : "focus:ring-2 focus:ring-blue-500"
                )}
              />
            </div>
            <p className={cn("text-[11px] font-medium flex items-center gap-1 mt-1", expectedStock !== null && expectedStock < 0 ? "text-rose-500" : "text-slate-500")}>
              <AlertCircle className="w-3.5 h-3.5" /> 
              {expectedStock !== null && expectedStock < 0 ? "CẢNH BÁO: Tồn kho dự kiến bị âm, hệ thống sẽ chặn thao tác này!" : "Nhập số âm (-) nếu hàng hóa bị mất hoặc hao hụt."}
            </p>
          </div>

          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
              Lý do / Ghi chú
            </label>
            <textarea
              name="reason" value={formData.reason} onChange={handleChange}
              placeholder="Ghi rõ biên bản kiểm kê số..." rows={2}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white resize-none shadow-sm"
            ></textarea>
          </div>

        </form>
      </div>
    </Modal>
  );
}