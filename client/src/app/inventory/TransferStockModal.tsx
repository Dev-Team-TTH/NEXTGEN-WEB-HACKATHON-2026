"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRightLeft, AlertCircle, Loader2, CheckCircle2, 
  Package, MapPin, Hash, FileText, AlertTriangle 
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useTransferStockMutation, 
  useGetProductsQuery, 
  useGetWarehousesQuery,
  useGetInventoryBalancesQuery // 🚀 THÊM API TRUY VẤN TỒN KHO THỰC TẾ
} from "@/state/api";

// --- IMPORT CORE MODAL & UTILS ---
import Modal from "@/app/(components)/Modal";
import { cn } from "@/utils/helpers";

// ==========================================
// COMPONENT: MODAL ĐIỀU CHUYỂN KHO NỘI BỘ
// ==========================================
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
};

export default function TransferStockModal({ isOpen, onClose }: TransferStockModalProps) {
  // --- API HOOKS ---
  const { data: productsResponse, isLoading: loadingProducts } = useGetProductsQuery({ limit: 1000 }, { skip: !isOpen });
  const products = productsResponse?.data || []; 

  const { data: warehouses, isLoading: loadingWarehouses } = useGetWarehousesQuery({}, { skip: !isOpen });
  
  // 🚀 LẤY DỮ LIỆU TỒN KHO ĐỂ REAL-TIME PREVIEW
  const { data: balancesResponse } = useGetInventoryBalancesQuery({ limit: 5000 }, { skip: !isOpen });
  const balances = balancesResponse?.data || [];

  const [transferStock, { isLoading: isSubmitting }] = useTransferStockMutation();

  // --- LOCAL STATE ---
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_STATE);
    }
  }, [isOpen]);

  // --- 🚀 LOGIC TÍNH TOÁN TỒN KHO KHẢ DỤNG (KHO XUẤT) ---
  const availableStock = useMemo(() => {
    if (!formData.fromWarehouseId || !formData.productId) return null;
    const balance = balances.find((b: any) => b.warehouseId === formData.fromWarehouseId && b.productId === formData.productId);
    return balance ? balance.quantity : 0;
  }, [formData.fromWarehouseId, formData.productId, balances]);

  const isExceedingStock = useMemo(() => {
    if (availableStock === null || !formData.transferQuantity) return false;
    return Number(formData.transferQuantity) > availableStock;
  }, [availableStock, formData.transferQuantity]);

  // --- HANDLERS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fromWarehouseId || !formData.toWarehouseId || !formData.productId || !formData.transferQuantity) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc!"); return;
    }

    if (formData.fromWarehouseId === formData.toWarehouseId) {
      toast.error("Kho xuất và Kho nhập không được trùng nhau!"); return;
    }

    const qty = Number(formData.transferQuantity);
    if (qty <= 0) {
      toast.error("Số lượng điều chuyển phải lớn hơn 0!"); return;
    }

    if (isExceedingStock) {
      toast.error("Số lượng điều chuyển vượt quá Tồn kho khả dụng!"); return;
    }

    try {
      const payload = {
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
      console.error("Lỗi điều chuyển kho:", error);
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi điều chuyển kho!");
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
        type="submit" form="transfer-stock-form"
        disabled={isSubmitting || isExceedingStock || availableStock === 0}
        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-transparent">
        <form id="transfer-stock-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Nguồn & Đích (Layout Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">
                <MapPin className="w-3.5 h-3.5" /> Từ Kho (Xuất) <span className="text-rose-500">*</span>
              </label>
              <select
                name="fromWarehouseId" value={formData.fromWarehouseId} onChange={handleChange} disabled={loadingWarehouses}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="">-- Chọn kho xuất --</option>
                {warehouses?.map((w: any) => <option key={w.warehouseId} value={w.warehouseId}>{w.code} - {w.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">
                <MapPin className="w-3.5 h-3.5" /> Đến Kho (Nhập) <span className="text-rose-500">*</span>
              </label>
              <select
                name="toWarehouseId" value={formData.toWarehouseId} onChange={handleChange} disabled={loadingWarehouses}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="">-- Chọn kho nhập --</option>
                {warehouses?.map((w: any) => <option key={w.warehouseId} value={w.warehouseId}>{w.code} - {w.name}</option>)}
              </select>
            </div>
          </div>

          {/* Chọn Sản phẩm */}
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">
              <Package className="w-3.5 h-3.5" /> Vật tư / Sản phẩm điều chuyển <span className="text-rose-500">*</span>
            </label>
            <select
              name="productId" value={formData.productId} onChange={handleChange} disabled={loadingProducts}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white cursor-pointer shadow-sm"
            >
              <option value="">-- Tìm kiếm và chọn sản phẩm --</option>
              {products?.map((p: any) => <option key={p.productId} value={p.productId}>[{p.productCode}] {p.name}</option>)}
            </select>
          </div>

          {/* 🚀 THÔNG TIN PREVIEW TỒN KHO THỰC TẾ */}
          <AnimatePresence>
            {availableStock !== null && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  availableStock > 0 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30" : "bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30"
                )}>
                  {availableStock > 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />}
                  <p className={cn("text-sm font-bold", availableStock > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                    Tồn kho khả dụng tại Kho Xuất: <span className="text-lg font-black">{availableStock}</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Số lượng */}
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">
              <Hash className="w-3.5 h-3.5" /> Số lượng <span className="text-rose-500">*</span>
            </label>
            <input
              type="number" name="transferQuantity" value={formData.transferQuantity} onChange={handleChange} min="1"
              placeholder="VD: 50" disabled={availableStock === 0}
              className={cn(
                "w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-xl text-lg font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 outline-none transition-all shadow-inner",
                isExceedingStock ? "border-rose-500 focus:ring-rose-500 text-rose-600" : "border-slate-200 dark:border-slate-700 focus:ring-indigo-500"
              )}
            />
            {isExceedingStock && (
              <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1 mt-1 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" /> LỖI: Số lượng chuyển vượt quá tồn kho khả dụng ({availableStock}).
              </p>
            )}
          </div>

          {/* Lý do */}
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">
              <FileText className="w-3.5 h-3.5" /> Ghi chú điều chuyển
            </label>
            <textarea
              name="reason" value={formData.reason} onChange={handleChange}
              placeholder="Lý do luân chuyển hàng hóa..." rows={2}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-sm"
            ></textarea>
          </div>

        </form>
      </div>
    </Modal>
  );
}