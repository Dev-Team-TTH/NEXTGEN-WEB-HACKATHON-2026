"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Package, Barcode, Tag, DollarSign, Layers, 
  CheckCircle2, Loader2, Link as LinkIcon, Building2, AlertCircle 
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useCreateProductMutation, 
  useGetCategoriesQuery, 
  useGetUoMsQuery,
  useGetSuppliersQuery 
} from "@/state/api";

// --- COMPONENTS ---
import FileDropzone from "@/app/(components)/FileDropzone"; // TÍCH HỢP VŨ KHÍ UPLOAD

// ==========================================
// COMPONENT: MODAL TẠO SẢN PHẨM MỚI
// ==========================================
interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM_STATE = {
  productCode: "",
  name: "",
  barcode: "",
  categoryId: "",
  uomId: "",
  supplierId: "",
  price: "",
  purchasePrice: "",
  reorderPoint: "10",
  hasVariants: false,
  hasBatches: false,
  imageUrl: "", // Lưu trữ URL ảnh sau khi upload
};

export default function CreateProductModal({ isOpen, onClose }: CreateProductModalProps) {
  // --- STATE ---
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // --- API HOOKS ---
  const { data: categories = [], isLoading: loadingCats } = useGetCategoriesQuery(undefined, { skip: !isOpen });
  const { data: uoms = [], isLoading: loadingUoms } = useGetUoMsQuery(undefined, { skip: !isOpen });
  const { data: suppliers = [], isLoading: loadingSuppliers } = useGetSuppliersQuery(undefined, { skip: !isOpen });
  
  const [createProduct, { isLoading: isSubmitting }] = useCreateProductMutation();

  // Reset form khi đóng/mở
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_STATE);
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

  // Handler nhận URL ảnh từ Dropzone
  const handleImageUploadSuccess = (url: string) => {
    setFormData((prev) => ({ ...prev, imageUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate cơ bản
    if (!formData.productCode || !formData.name || !formData.categoryId || !formData.uomId) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc (*)");
      return;
    }

    if (Number(formData.price) < 0 || Number(formData.purchasePrice) < 0) {
      toast.error("Giá tiền không được là số âm!");
      return;
    }

    try {
      const payload = {
        ...formData,
        price: Number(formData.price || 0),
        purchasePrice: Number(formData.purchasePrice || 0),
        reorderPoint: Number(formData.reorderPoint || 0),
        supplierId: formData.supplierId || undefined, // Bỏ supplierId nếu để trống
      };

      await createProduct(payload).unwrap();
      toast.success(`Đã tạo thành công sản phẩm: ${formData.name}`);
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi khi tạo sản phẩm!");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          {/* Nền bấm ra ngoài để đóng (chỉ cho phép khi không bận) */}
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">Thêm Sản phẩm / Vật tư Mới</h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Khởi tạo Master Data vào hệ thống ERP</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                disabled={isSubmitting}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* --- BODY (SCROLLABLE) --- */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              <form id="create-product-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
                
                {/* CỘT TRÁI: UPLOAD ẢNH (VŨ KHÍ MỚI) */}
                <div className="w-full md:w-1/3 flex flex-col gap-4">
                  <div className="sticky top-0">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-indigo-500" /> Hình ảnh nhận diện
                    </h3>
                    
                    {/* TÍCH HỢP FILEDROPZONE */}
                    <FileDropzone 
                      onUploadSuccess={handleImageUploadSuccess}
                      accept="image/png, image/jpeg, image/webp"
                      label="Kéo thả ảnh sản phẩm (PNG, JPG)"
                      maxSizeMB={5}
                    />

                    {formData.imageUrl && (
                       <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                         <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                           <CheckCircle2 className="w-4 h-4" /> Đã đính kèm URL thành công
                         </p>
                       </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                      <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" /> Gợi ý chuẩn hóa
                      </h4>
                      <ul className="text-[11px] text-blue-600 dark:text-blue-400 space-y-1.5 list-disc pl-4">
                        <li>Mã SKU nên viết hoa, không dấu (VD: SP001)</li>
                        <li>Nên chọn chuẩn danh mục để dễ lên báo cáo</li>
                        <li>Sản phẩm có Date hạn sử dụng phải tick chọn "Quản lý theo Lô".</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* CỘT PHẢI: THÔNG TIN CHI TIẾT */}
                <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  
                  {/* Nhóm 1: Định danh */}
                  <div className="sm:col-span-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                      1. Thông tin Định danh
                    </h3>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      Mã SKU <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" name="productCode" value={formData.productCode} onChange={handleChange} required
                        placeholder="VD: IPHONE15-PRO"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none uppercase transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      Mã Vạch (Barcode)
                    </label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" name="barcode" value={formData.barcode} onChange={handleChange}
                        placeholder="Quét mã vạch vào đây..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      Tên Hàng hóa / Sản phẩm <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" name="name" value={formData.name} onChange={handleChange} required
                        placeholder="VD: Điện thoại iPhone 15 Pro Max 256GB"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Nhóm 2: Phân loại */}
                  <div className="sm:col-span-2 mt-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                      2. Phân loại & Đo lường
                    </h3>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      Danh mục <span className="text-rose-500">*</span>
                    </label>
                    <select 
                      name="categoryId" value={formData.categoryId} onChange={handleChange} required
                      disabled={loadingCats}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map((c: any) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      Đơn vị gốc (UoM) <span className="text-rose-500">*</span>
                    </label>
                    <select 
                      name="uomId" value={formData.uomId} onChange={handleChange} required
                      disabled={loadingUoms}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="">-- Chọn đơn vị tính --</option>
                      {uoms.map((u: any) => <option key={u.uomId} value={u.uomId}>{u.name} ({u.code})</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      Nhà Cung Cấp Mặc Định
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select 
                        name="supplierId" value={formData.supplierId} onChange={handleChange}
                        disabled={loadingSuppliers}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                      >
                        <option value="">-- Bỏ trống nếu nhập từ nhiều NCC --</option>
                        {suppliers.map((s: any) => <option key={s.supplierId} value={s.supplierId}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Nhóm 3: Giá & Kế toán */}
                  <div className="sm:col-span-2 mt-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                      3. Thiết lập Giá & Cảnh báo Kho
                    </h3>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      Giá Bán Cơ Sở (VND)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      <input 
                        type="number" name="price" value={formData.price} onChange={handleChange} min="0"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      Giá Nhập / Giá Vốn Cơ Sở (VND)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                      <input 
                        type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} min="0"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-orange-600 dark:text-orange-400 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      Định mức tồn tối thiểu (Reorder Point)
                    </label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" name="reorderPoint" value={formData.reorderPoint} onChange={handleChange} min="0"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Thuộc tính nâng cao */}
                  <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 mt-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" name="hasVariants" checked={formData.hasVariants} onChange={handleChange}
                          className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md checked:bg-indigo-500 checked:border-indigo-500 transition-colors cursor-pointer"
                        />
                        <CheckCircle2 className="absolute text-white w-3.5 h-3.5 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">
                        Có Biến thể (Màu sắc, Size...)
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" name="hasBatches" checked={formData.hasBatches} onChange={handleChange}
                          className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md checked:bg-indigo-500 checked:border-indigo-500 transition-colors cursor-pointer"
                        />
                        <CheckCircle2 className="absolute text-white w-3.5 h-3.5 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">
                        Quản lý Lô / Hạn Sử Dụng
                      </span>
                    </label>
                  </div>

                </div>
              </form>
            </div>

            {/* --- FOOTER --- */}
            <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-slate-800/80 flex justify-end gap-3 shrink-0">
              <button
                type="button" onClick={onClose} disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit" form="create-product-form" disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</> : "Tạo Sản phẩm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}