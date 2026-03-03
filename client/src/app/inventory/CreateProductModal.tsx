"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, PackagePlus, Loader2, CheckCircle2, 
  Tag, DollarSign, Layers, Box, AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useCreateProductMutation, 
  useGetCategoriesQuery, 
  useGetUoMsQuery 
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL TẠO MỚI SẢN PHẨM/VẬT TƯ
// ==========================================
interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProductModal({ isOpen, onClose }: CreateProductModalProps) {
  // --- API HOOKS ---
  const { data: categories, isLoading: loadingCategories } = useGetCategoriesQuery();
  const { data: uoms, isLoading: loadingUoms } = useGetUoMsQuery();
  const [createProduct, { isLoading: isSubmitting }] = useCreateProductMutation();

  // --- LOCAL STATE (FORM DATA) ---
  const [formData, setFormData] = useState({
    productCode: "",
    name: "",
    categoryId: "",
    uomId: "",
    price: "",
    purchasePrice: "",
    standardCost: "",
    costingMethod: "MAC", // Mặc định Bình quân gia quyền
    reorderPoint: "",
    hasVariants: false,
    hasBatches: false,
    status: "ACTIVE"
  });

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        productCode: "", name: "", categoryId: "", uomId: "",
        price: "", purchasePrice: "", standardCost: "", costingMethod: "MAC",
        reorderPoint: "", hasVariants: false, hasBatches: false, status: "ACTIVE"
      });
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Custom Toggle Button (Thay thế checkbox mặc định xấu xí)
  const CustomToggle = ({ label, name, checked }: { label: string, name: string, checked: boolean }) => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => setFormData(prev => ({ ...prev, [name]: !prev[name as keyof typeof formData] }))}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <motion.span
          layout
          initial={false}
          animate={{ x: checked ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate cơ bản
    if (!formData.name || !formData.productCode || !formData.categoryId || !formData.uomId || !formData.price || !formData.purchasePrice) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc (*)");
      return;
    }

    try {
      // Ép kiểu chuẩn cấu trúc API
      const payload = {
        ...formData,
        price: Number(formData.price),
        purchasePrice: Number(formData.purchasePrice),
        standardCost: formData.standardCost ? Number(formData.standardCost) : 0,
        reorderPoint: formData.reorderPoint ? Number(formData.reorderPoint) : 0,
      };

      await createProduct(payload).unwrap();
      
      toast.success("Tạo mới sản phẩm thành công!");
      onClose(); 
    } catch (error: any) {
      console.error("Lỗi tạo sản phẩm:", error);
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi tạo sản phẩm!");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-3xl glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col max-h-[95vh] sm:max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <PackagePlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Thêm Sản phẩm Mới</h2>
                  <p className="text-xs text-slate-500 font-medium">Khởi tạo mã vật tư vào hệ thống Master Data</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              <form id="create-product-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
                
                {/* 1. THÔNG TIN CƠ BẢN */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-500" /> Thông tin cơ bản
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tên sản phẩm <span className="text-rose-500">*</span></label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="VD: Bàn phím cơ Keychron" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mã sản phẩm (SKU) <span className="text-rose-500">*</span></label>
                      <input type="text" name="productCode" value={formData.productCode} onChange={handleChange} placeholder="VD: SP-KBD-001" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ngành hàng <span className="text-rose-500">*</span></label>
                      <select name="categoryId" value={formData.categoryId} onChange={handleChange} disabled={loadingCategories} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white disabled:opacity-50">
                        <option value="">-- Chọn ngành hàng --</option>
                        {categories?.map(c => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Đơn vị tính <span className="text-rose-500">*</span></label>
                      <select name="uomId" value={formData.uomId} onChange={handleChange} disabled={loadingUoms} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white disabled:opacity-50">
                        <option value="">-- Chọn đơn vị --</option>
                        {uoms?.map(u => <option key={u.uomId} value={u.uomId}>{u.name} ({u.code})</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. THÔNG TIN GIÁ BÁN & GIÁ VỐN */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Tài chính & Giá
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Giá bán lẻ (VND) <span className="text-rose-500">*</span></label>
                      <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="VD: 1500000" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Giá nhập tham khảo (VND) <span className="text-rose-500">*</span></label>
                      <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} placeholder="VD: 1000000" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phương pháp Tính giá vốn</label>
                      <select name="costingMethod" value={formData.costingMethod} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white">
                        <option value="MAC">Bình quân gia quyền (MAC)</option>
                        <option value="FIFO">Vào trước ra trước (FIFO)</option>
                        <option value="STANDARD">Giá tiêu chuẩn (Standard Cost)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mức Cảnh báo hết hàng (Min)</label>
                      <input type="number" name="reorderPoint" value={formData.reorderPoint} onChange={handleChange} placeholder="VD: 10" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white" />
                    </div>
                  </div>
                </div>

                {/* 3. TÍNH NĂNG NÂNG CAO */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" /> Cấu hình nâng cao
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CustomToggle label="Quản lý theo Biến thể (Size, Màu...)" name="hasVariants" checked={formData.hasVariants} />
                    <CustomToggle label="Quản lý theo Lô / Hạn sử dụng" name="hasBatches" checked={formData.hasBatches} />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-3">
                    <AlertCircle className="w-3.5 h-3.5 text-indigo-500" /> Lưu ý: Không thể tắt quản lý lô/biến thể sau khi đã có giao dịch phát sinh.
                  </p>
                </div>

              </form>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
                Hủy bỏ
              </button>
              <button type="submit" form="create-product-form" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</> : <><CheckCircle2 className="w-4 h-4" /> Hoàn tất Tạo mới</>}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}