"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { 
  X, Save, Package, Image as ImageIcon, DollarSign, 
  AlignLeft, Layers, CalendarClock, AlertCircle, Tag, Box, Edit, Loader2 
} from "lucide-react";
import { Product } from "@/state/api";

type EditProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmit: (updatedProduct: Product) => void;
  isSubmitting?: boolean;
};

const EditProductModal = ({ isOpen, onClose, product, onSubmit, isSubmitting = false }: EditProductModalProps) => {
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setFormData({ ...product });
      setImagePreview(product.imageUrl || null);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData({ ...formData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const finalData: Product = {
      ...product,
      ...formData,
      price: Number(formData.price) || 0,
      purchasePrice: Number(formData.purchasePrice) || 0,
      rating: Number(formData.rating) || 0,
      conversionRate: Number(formData.conversionRate) || 1,
      reorderPoint: Number(formData.reorderPoint) || 10,
      reorderUnit: formData.reorderUnit || formData.baseUnit,
    } as Product;
    onSubmit(finalData);
  };

  // Các class chuẩn hóa để UI đồng đều 100%
  const labelClass = "block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5";
  const inputClass = "w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-100 transition-shadow disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";
  const blockClass = "bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-5";
  const blockHeaderClass = "text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* LỚP PHỦ ĐÓNG BĂNG UI KHI ĐANG SUBMIT */}
        {isSubmitting && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
            <p className="font-bold text-blue-800 text-lg shadow-sm">Đang gửi yêu cầu phê duyệt...</p>
            <p className="text-sm text-blue-600 mt-1">Vui lòng chờ trong giây lát</p>
          </div>
        )}

        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" /> Cập nhật Dữ liệu Sản phẩm
            </h2>
            <p className="text-sm text-gray-500 mt-1">Mã hệ thống: <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{product.productId}</span></p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* --- BODY FORM --- */}
        <form id="editProductForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          
          {/* KHỐI 1: THÔNG TIN CƠ BẢN */}
          <div className={blockClass}>
            <h3 className={blockHeaderClass}><AlignLeft className="w-4 h-4 text-blue-500" /> Thông tin chung</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-6">
                <label className={labelClass}>Tên sản phẩm <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={formData.name || ""} onChange={handleChange} className={inputClass} required disabled={isSubmitting} />
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>Danh mục</label>
                <input type="text" name="category" value={formData.category || ""} onChange={handleChange} className={inputClass} placeholder="VD: Đồ uống..." disabled={isSubmitting} />
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>Trạng thái kinh doanh</label>
                <select name="status" value={formData.status || "ACTIVE"} onChange={handleChange} className={`${inputClass} font-bold cursor-pointer`} disabled={isSubmitting}>
                  <option value="ACTIVE" className="text-green-600">Đang bán (Active)</option>
                  <option value="OUT_OF_STOCK" className="text-orange-600">Tạm ngưng (Out)</option>
                  <option value="DISCONTINUED" className="text-red-600">Ngừng KD (Stop)</option>
                </select>
              </div>
              <div className="md:col-span-12">
                <label className={labelClass}>Mô tả chi tiết</label>
                <textarea name="description" value={formData.description || ""} onChange={handleChange} rows={2} className={`${inputClass} h-auto py-3 resize-none`} placeholder="Nhập mô tả..." disabled={isSubmitting} />
              </div>
            </div>
          </div>

          {/* KHỐI 2: TÀI CHÍNH & QUY ĐỔI ĐƠN VỊ */}
          <div className={blockClass}>
            <h3 className={blockHeaderClass}><DollarSign className="w-4 h-4 text-green-500" /> Chính sách Giá & Đơn vị tính</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Giá vốn (Nhập)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input type="number" name="purchasePrice" value={formData.purchasePrice || ""} onChange={handleChange} className={`${inputClass} pl-8`} disabled={isSubmitting} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1.5">Giá bán (Xuất) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-black">$</span>
                    <input type="number" name="price" value={formData.price || ""} onChange={handleChange} className={`${inputClass} pl-8 border-green-300 bg-green-50 text-green-800 font-bold focus:ring-green-500`} required disabled={isSubmitting} />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Đơn vị Lẻ <span className="text-red-500">*</span></label>
                  <input type="text" name="baseUnit" value={formData.baseUnit || ""} onChange={handleChange} className={inputClass} placeholder="VD: Cái, Chai" required disabled={isSubmitting} />
                </div>
                <div>
                  <label className={labelClass}>Đơn vị Sỉ (Thùng/Hộp)</label>
                  <input type="text" name="largeUnit" value={formData.largeUnit || ""} onChange={handleChange} className={inputClass} placeholder="VD: Thùng" disabled={isSubmitting} />
                </div>
                {formData.largeUnit && (
                  <div className="col-span-2 flex items-center justify-center gap-3 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-blue-200">
                    <span className="text-xs font-semibold text-gray-500">Quy đổi: 1 {formData.largeUnit} = </span>
                    <input type="number" name="conversionRate" min="2" value={formData.conversionRate || ""} onChange={handleChange} className="w-20 h-9 px-2 text-center font-bold text-blue-700 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" required disabled={isSubmitting} />
                    <span className="text-xs font-semibold text-gray-500">{formData.baseUnit}</span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* KHỐI 3: WMS & HÌNH ẢNH (Chia đôi) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            
            {/* WMS KHÓA CỨNG PHÂN LOẠI / LÔ */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className={blockHeaderClass}><Box className="w-4 h-4 text-purple-500" /> Cấu hình Kho (WMS)</h3>
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Mức cảnh báo Tồn kho thấp:</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      name="reorderPoint" 
                      value={formData.reorderPoint || ""} 
                      onChange={handleChange} 
                      className="w-24 h-10 px-3 rounded-lg border border-gray-300 text-center font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" 
                      disabled={isSubmitting}
                    />
                    <select 
                      name="reorderUnit"
                      value={formData.reorderUnit || formData.baseUnit || ""} 
                      onChange={handleChange}
                      className="h-10 px-3 rounded-lg border border-gray-300 outline-none bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSubmitting}
                    >
                      <option value={formData.baseUnit || ""}>{formData.baseUnit || "Đơn vị cơ bản"}</option>
                      {formData.largeUnit && (
                        <option value={formData.largeUnit}>{formData.largeUnit} (Đơn vị lớn)</option>
                      )}
                    </select>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
                  <p className="text-xs text-red-500 font-medium italic mb-1">Cấu trúc Lô/Phân loại đã bị khóa. Không thể thay đổi sau khi tạo mã.</p>
                  <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
                    <input type="checkbox" checked={formData.hasVariants || false} readOnly disabled className="w-5 h-5 text-purple-600 rounded border-gray-300" />
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Layers className="w-4 h-4"/> Cho phép tạo Phân loại (Size/Màu)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
                    <input type="checkbox" checked={formData.hasBatches || false} readOnly disabled className="w-5 h-5 text-amber-500 rounded border-gray-300" />
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><CalendarClock className="w-4 h-4"/> Quản lý theo Lô & Hạn sử dụng (FEFO)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* HÌNH ẢNH */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className={blockHeaderClass}><ImageIcon className="w-4 h-4 text-pink-500" /> Hình ảnh Sản phẩm</h3>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {imagePreview ? (
                  <div className="relative group flex-shrink-0">
                    <img src={imagePreview} alt="Preview" className="rounded-xl object-cover h-28 w-28 shadow-sm border border-gray-200" />
                    <button type="button" onClick={() => { setImagePreview(null); setFormData({ ...formData, imageUrl: "" }); }} disabled={isSubmitting} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform disabled:opacity-50">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-28 w-28 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="w-full">
                  <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageChange} disabled={isSubmitting} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                  <p className="text-xs text-gray-400 mt-2">Dung lượng tối đa 10MB.</p>
                </div>
              </div>
            </div>

          </div>

          {/* CẢNH BÁO */}
          <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-xl border border-blue-200">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 leading-relaxed">
              <strong>Mô hình Enterprise:</strong> Thông tin bạn sửa (Giá, Tên, Đơn vị...) sẽ không được áp dụng ngay lập tức. Thay vào đó, hệ thống sẽ tạo một <b>Phiếu Yêu Cầu Thay Đổi Master Data</b> và gửi lên cấp Quản lý phê duyệt.
            </p>
          </div>

        </form>

        {/* --- FOOTER --- */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 z-10">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Hủy bỏ
          </button>
          <button type="submit" form="editProductForm" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" /> Gửi Yêu Cầu Đổi Dữ Liệu
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditProductModal;