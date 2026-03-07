"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  PackagePlus, Loader2, CheckCircle2, 
  Tag, DollarSign, Layers, AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useCreateProductMutation, 
  useGetCategoriesQuery, 
  useGetUoMsQuery 
} from "@/state/api";

// --- IMPORT CORE MODAL ---
import Modal from "@/app/(components)/Modal";

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

  // Custom Toggle Button
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

  // --- FOOTER RENDER ---
  const modalFooter = (
    <>
      <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
        Hủy bỏ
      </button>
      <button type="submit" form="create-product-form" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</> : <><CheckCircle2 className="w-4 h-4" /> Hoàn tất Tạo mới</>}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm Sản phẩm Mới"
      subtitle="Khởi tạo mã vật tư vào hệ thống Master Data"
      icon={<PackagePlus className="w-6 h-6 text-blue-500" />}
      maxWidth="max-w-3xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6 sm:p-8">
        <form id="create-product-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
          
          {/* 1. THÔNG TIN CƠ BẢN */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-500" /> Thông tin cơ bản
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors">Tên sản phẩm <span className="text-rose-500">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="VD: Bàn phím cơ Keychron" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white shadow-sm" />
              </div>
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors">Mã sản phẩm (SKU) <span className="text-rose-500">*</span></label>
                <input type="text" name="productCode" value={formData.productCode} onChange={handleChange} placeholder="VD: SP-KBD-001" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white uppercase shadow-sm" />
              </div>
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors">Ngành hàng <span className="text-rose-500">*</span></label>
                <select name="categoryId" value={formData.categoryId} onChange={handleChange} disabled={loadingCategories} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white disabled:opacity-50 shadow-sm">
                  <option value="">-- Chọn ngành hàng --</option>
                  {categories?.map(c => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors">Đơn vị tính <span className="text-rose-500">*</span></label>
                <select name="uomId" value={formData.uomId} onChange={handleChange} disabled={loadingUoms} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white disabled:opacity-50 shadow-sm">
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
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-emerald-500 transition-colors">Giá bán lẻ (VND) <span className="text-rose-500">*</span></label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="VD: 1500000" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" />
              </div>
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-emerald-500 transition-colors">Giá nhập tham khảo (VND) <span className="text-rose-500">*</span></label>
                <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} placeholder="VD: 1000000" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" />
              </div>
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-emerald-500 transition-colors">Phương pháp Tính giá vốn</label>
                <select name="costingMethod" value={formData.costingMethod} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white shadow-sm">
                  <option value="MAC">Bình quân gia quyền (MAC)</option>
                  <option value="FIFO">Vào trước ra trước (FIFO)</option>
                  <option value="STANDARD">Giá tiêu chuẩn (Standard Cost)</option>
                </select>
              </div>
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-emerald-500 transition-colors">Mức Cảnh báo hết hàng (Min)</label>
                <input type="number" name="reorderPoint" value={formData.reorderPoint} onChange={handleChange} placeholder="VD: 10" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white shadow-sm" />
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
    </Modal>
  );
}