"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { X, ArrowRightLeft, AlertCircle, Loader2, CheckCircle2, Package, MapPin } from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useTransferStockMutation, 
  useGetProductsQuery, 
  useGetWarehousesQuery 
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL CHUYỂN KHO NỘI BỘ
// ==========================================
interface TransferStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransferStockModal({ isOpen, onClose }: TransferStockModalProps) {
  // --- API HOOKS ---
  const { data: products, isLoading: loadingProducts } = useGetProductsQuery({});
  const { data: warehouses, isLoading: loadingWarehouses } = useGetWarehousesQuery({});
  const [transferStock, { isLoading: isSubmitting }] = useTransferStockMutation();

  // --- LOCAL STATE (FORM DATA) ---
  const [formData, setFormData] = useState({
    fromWarehouseId: "",
    toWarehouseId: "",
    productId: "",
    quantity: "",
    reason: "",
  });

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setFormData({ fromWarehouseId: "", toWarehouseId: "", productId: "", quantity: "", reason: "" });
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Nút đảo chiều kho (Swap) cực kỳ tiện lợi (Micro-interaction)
  const handleSwapWarehouses = () => {
    setFormData((prev) => ({
      ...prev,
      fromWarehouseId: prev.toWarehouseId,
      toWarehouseId: prev.fromWarehouseId,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate cơ bản
    if (!formData.fromWarehouseId || !formData.toWarehouseId || !formData.productId || !formData.quantity) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }

    if (formData.fromWarehouseId === formData.toWarehouseId) {
      toast.error("Kho xuất và Kho nhập không được trùng nhau!");
      return;
    }

    if (Number(formData.quantity) <= 0) {
      toast.error("Số lượng chuyển phải lớn hơn 0!");
      return;
    }

    try {
      // Ép kiểu quantity sang số
      const payload = {
        ...formData,
        quantity: Number(formData.quantity)
      };

      // Bắn API
      await transferStock(payload).unwrap();
      
      toast.success("Đã ghi nhận Phiếu chuyển kho thành công!");
      onClose(); // Đóng modal
    } catch (error: any) {
      console.error("Lỗi chuyển kho:", error);
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi chuyển kho!");
    }
  };

  // --- ANIMATION CONFIG CHUẨN TYPESCRIPT ---
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { type: "spring" as const, stiffness: 300, damping: 25 } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 20, 
      transition: { duration: 0.2 } 
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          {/* Lớp phủ click để đóng */}
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          {/* Modal Content */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Luân Chuyển Tồn Kho</h2>
                  <p className="text-xs text-slate-500 font-medium">Chuyển vật tư giữa các kho nội bộ</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                disabled={isSubmitting}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body / Form */}
            <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              <form id="transfer-stock-form" onSubmit={handleSubmit} className="space-y-5">
                
                {/* Chọn Sản phẩm */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" /> Vật tư / Sản phẩm <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="productId"
                    value={formData.productId}
                    onChange={handleChange}
                    disabled={loadingProducts}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="">-- Chọn sản phẩm cần chuyển --</option>
                    {products?.map(p => (
                      <option key={p.productId} value={p.productId}>[{p.productCode}] {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Khu vực Chọn Kho (Đi/Đến) với nút Swap */}
                <div className="relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 flex flex-col gap-4">
                  {/* Kho Xuất */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-500" /> Từ Kho (Xuất) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="fromWarehouseId"
                      value={formData.fromWarehouseId}
                      onChange={handleChange}
                      disabled={loadingWarehouses}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">-- Chọn kho xuất --</option>
                      {warehouses?.map(w => (
                        <option key={w.warehouseId} value={w.warehouseId}>{w.name} ({w.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Nút Đảo Chiều (Swap) Nằm giữa 2 field */}
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none w-full z-10 pr-12">
                     <button
                        type="button"
                        onClick={handleSwapWarehouses}
                        className="pointer-events-auto p-2 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all hover:scale-110 active:scale-95"
                        title="Đảo chiều kho"
                     >
                       <ArrowRightLeft className="w-4 h-4 rotate-90" />
                     </button>
                  </div>

                  {/* Kho Nhập */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-500" /> Đến Kho (Nhập) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="toWarehouseId"
                      value={formData.toWarehouseId}
                      onChange={handleChange}
                      disabled={loadingWarehouses}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">-- Chọn kho nhận --</option>
                      {warehouses?.map(w => (
                        <option key={w.warehouseId} value={w.warehouseId}>{w.name} ({w.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Số lượng */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Số lượng luân chuyển <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="VD: 10"
                    min="1"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 text-indigo-500" /> Đảm bảo kho xuất còn đủ tồn khả dụng.
                  </p>
                </div>

                {/* Lý do */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Lý do / Ghi chú
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    placeholder="Ghi chú điều chuyển (VD: Phục vụ sản xuất...)"
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white resize-none"
                  ></textarea>
                </div>

              </form>
            </div>

            {/* Footer / Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end gap-3">
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
                form="transfer-stock-form"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Xác nhận Chuyển</>
                )}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 