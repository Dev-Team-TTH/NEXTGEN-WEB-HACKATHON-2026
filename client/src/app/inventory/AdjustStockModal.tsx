"use client";

import React, { useState, useEffect } from "react";
import { ClipboardEdit, AlertCircle, Loader2, CheckCircle2, Package, MapPin } from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useAdjustStockMutation, 
  useGetProductsQuery, 
  useGetWarehousesQuery 
} from "@/state/api";

// --- IMPORT CORE MODAL ---
import Modal from "@/app/(components)/Modal";

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

  // --- FOOTER RENDER ---
  const modalFooter = (
    <>
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
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Điều Chỉnh Tồn Kho"
      subtitle="Cập nhật số lượng thực tế sau kiểm kê"
      icon={<ClipboardEdit className="w-6 h-6 text-blue-500" />}
      maxWidth="max-w-lg"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6 sm:p-8">
        <form id="adjust-stock-form" onSubmit={handleSubmit} className="space-y-6">
          
          {/* Chọn Kho */}
          <div className="space-y-1.5 group">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
              <MapPin className="w-4 h-4" /> Kho lưu trữ <span className="text-rose-500">*</span>
            </label>
            <select
              name="warehouseId"
              value={formData.warehouseId}
              onChange={handleChange}
              disabled={loadingWarehouses}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50 shadow-sm"
            >
              <option value="">-- Chọn kho cần điều chỉnh --</option>
              {warehouses?.map(w => (
                <option key={w.warehouseId} value={w.warehouseId}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>

          {/* Chọn Sản phẩm */}
          <div className="space-y-1.5 group">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
              <Package className="w-4 h-4" /> Vật tư / Sản phẩm <span className="text-rose-500">*</span>
            </label>
            <select
              name="productId"
              value={formData.productId}
              onChange={handleChange}
              disabled={loadingProducts}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50 shadow-sm"
            >
              <option value="">-- Chọn sản phẩm --</option>
              {products?.map(p => (
                <option key={p.productId} value={p.productId}>[{p.productCode}] {p.name}</option>
              ))}
            </select>
          </div>

          {/* Số lượng điều chỉnh */}
          <div className="space-y-1.5 group">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-focus-within:text-blue-500 transition-colors">
              Số lượng điều chỉnh (+/-) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              name="adjustedQuantity"
              value={formData.adjustedQuantity}
              onChange={handleChange}
              placeholder="VD: 5 (dư hàng) hoặc -3 (hao hụt)"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-lg font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white shadow-inner"
            />
            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Nhập số âm (-) nếu hàng hóa bị mất hoặc hư hỏng.
            </p>
          </div>

          {/* Lý do */}
          <div className="space-y-1.5 group">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-focus-within:text-blue-500 transition-colors">
              Lý do / Ghi chú
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Ghi rõ biên bản kiểm kê số..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white resize-none shadow-sm"
            ></textarea>
          </div>

        </form>
      </div>
    </Modal>
  );
}