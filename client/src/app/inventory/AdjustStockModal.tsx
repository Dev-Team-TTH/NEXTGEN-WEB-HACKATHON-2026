"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { X, ClipboardEdit, AlertCircle, Loader2, CheckCircle2, Package, MapPin } from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useAdjustStockMutation, 
  useGetProductsQuery, 
  useGetWarehousesQuery 
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL ĐIỀU CHỈNH KHO (KIỂM KÊ)
// ==========================================
interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdjustStockModal({ isOpen, onClose }: AdjustStockModalProps) {
  // --- API HOOKS ---
  const { data: products, isLoading: loadingProducts } = useGetProductsQuery({});
  const { data: warehouses, isLoading: loadingWarehouses } = useGetWarehousesQuery({});
  const [adjustStock, { isLoading: isSubmitting }] = useAdjustStockMutation();

  // --- LOCAL STATE (FORM DATA) ---
  const [formData, setFormData] = useState({
    warehouseId: "",
    productId: "",
    adjustedQuantity: "", // Số lượng thay đổi (+/-)
    reason: "",
  });

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setFormData({ warehouseId: "", productId: "", adjustedQuantity: "", reason: "" });
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate cơ bản
    if (!formData.warehouseId || !formData.productId || !formData.adjustedQuantity) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }

    try {
      // Ép kiểu quantity sang số
      const payload = {
        ...formData,
        quantity: Number(formData.adjustedQuantity)
      };

      // Bắn API
      await adjustStock(payload).unwrap();
      
      toast.success("Đã ghi nhận Phiếu điều chỉnh kho thành công!");
      onClose(); // Đóng modal sau khi xong
    } catch (error: any) {
      console.error("Lỗi điều chỉnh kho:", error);
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi điều chỉnh kho!");
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
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <ClipboardEdit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Điều Chỉnh Tồn Kho</h2>
                  <p className="text-xs text-slate-500 font-medium">Cập nhật số lượng thực tế sau kiểm kê</p>
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
              <form id="adjust-stock-form" onSubmit={handleSubmit} className="space-y-5">
                
                {/* Chọn Kho */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" /> Kho lưu trữ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="warehouseId"
                    value={formData.warehouseId}
                    onChange={handleChange}
                    disabled={loadingWarehouses}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="">-- Chọn kho cần điều chỉnh --</option>
                    {warehouses?.map(w => (
                      <option key={w.warehouseId} value={w.warehouseId}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

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
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {products?.map(p => (
                      <option key={p.productId} value={p.productId}>[{p.productCode}] {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Số lượng điều chỉnh */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Số lượng điều chỉnh (+/-) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="adjustedQuantity"
                    value={formData.adjustedQuantity}
                    onChange={handleChange}
                    placeholder="VD: 5 (dư hàng) hoặc -3 (hao hụt)"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 text-amber-500" /> Nhập số âm nếu hàng bị mất/hư hỏng.
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
                    placeholder="Ghi rõ biên bản kiểm kê số..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white resize-none"
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
                form="adjust-stock-form"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Xác nhận lưu</>
                )}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}