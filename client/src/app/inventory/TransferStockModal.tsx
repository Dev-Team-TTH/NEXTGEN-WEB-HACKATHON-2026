"use client";

import React, { useState, useEffect } from "react";
import { ArrowRightLeft, AlertCircle, Loader2, CheckCircle2, Package, MapPin } from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useTransferStockMutation, 
  useGetProductsQuery, 
  useGetWarehousesQuery 
} from "@/state/api";

// --- IMPORT CORE MODAL ---
import Modal from "@/app/(components)/Modal";

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
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Luân Chuyển Tồn Kho"
      subtitle="Chuyển vật tư, hàng hóa giữa các kho nội bộ"
      icon={<ArrowRightLeft className="w-6 h-6 text-indigo-500" />}
      maxWidth="max-w-lg"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6 sm:p-8">
        <form id="transfer-stock-form" onSubmit={handleSubmit} className="space-y-6">
          
          {/* Chọn Sản phẩm */}
          <div className="space-y-1.5 group">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-indigo-500 transition-colors">
              <Package className="w-4 h-4" /> Vật tư / Sản phẩm <span className="text-rose-500">*</span>
            </label>
            <select
              name="productId"
              value={formData.productId}
              onChange={handleChange}
              disabled={loadingProducts}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50 shadow-sm"
            >
              <option value="">-- Chọn sản phẩm cần chuyển --</option>
              {products?.map(p => (
                <option key={p.productId} value={p.productId}>[{p.productCode}] {p.name}</option>
              ))}
            </select>
          </div>

          {/* Khu vực Chọn Kho (Đi/Đến) với nút Swap */}
          <div className="relative p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 flex flex-col gap-5">
            {/* Kho Xuất */}
            <div className="space-y-1.5 group">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-rose-500 transition-colors">
                <MapPin className="w-4 h-4 text-rose-500" /> Từ Kho (Xuất) <span className="text-rose-500">*</span>
              </label>
              <select
                name="fromWarehouseId"
                value={formData.fromWarehouseId}
                onChange={handleChange}
                disabled={loadingWarehouses}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50 shadow-sm"
              >
                <option value="">-- Chọn kho xuất --</option>
                {warehouses?.map(w => (
                  <option key={w.warehouseId} value={w.warehouseId}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            {/* Nút Đảo Chiều (Swap) Nằm giữa 2 field */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none w-full z-10 pr-16">
                <button
                  type="button"
                  onClick={handleSwapWarehouses}
                  className="pointer-events-auto p-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all hover:scale-110 active:scale-95"
                  title="Đảo chiều kho"
                >
                  <ArrowRightLeft className="w-4 h-4 rotate-90" />
                </button>
            </div>

            {/* Kho Nhập */}
            <div className="space-y-1.5 group">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-emerald-500 transition-colors">
                <MapPin className="w-4 h-4 text-emerald-500" /> Đến Kho (Nhập) <span className="text-rose-500">*</span>
              </label>
              <select
                name="toWarehouseId"
                value={formData.toWarehouseId}
                onChange={handleChange}
                disabled={loadingWarehouses}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 dark:text-white disabled:opacity-50 shadow-sm"
              >
                <option value="">-- Chọn kho nhận --</option>
                {warehouses?.map(w => (
                  <option key={w.warehouseId} value={w.warehouseId}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Số lượng */}
          <div className="space-y-1.5 group">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-focus-within:text-indigo-500 transition-colors">
              Số lượng luân chuyển <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="VD: 10"
              min="1"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-lg font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white shadow-inner"
            />
            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 text-indigo-500" /> Đảm bảo kho xuất còn đủ tồn khả dụng trước khi chuyển.
            </p>
          </div>

          {/* Lý do */}
          <div className="space-y-1.5 group">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-focus-within:text-indigo-500 transition-colors">
              Lý do / Ghi chú
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Ghi chú điều chuyển (VD: Phục vụ sản xuất...)"
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white resize-none shadow-sm"
            ></textarea>
          </div>

        </form>
      </div>
    </Modal>
  );
}