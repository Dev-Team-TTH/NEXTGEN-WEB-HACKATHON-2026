"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { 
  X, ArrowRight, ArrowLeft, CheckCircle, UploadCloud, Package, 
  Image as ImageIcon, AlignLeft, DollarSign, Layers, CalendarClock, Trash2, Tag, Box
} from "lucide-react";

export type VariantData = {
  sku: string;
  attributes: string;
  additionalPrice: number | string;
};

export type ProductFormData = {
  productId: string;
  name: string;
  price: number | string;
  rating: number | string;
  baseUnit: string;
  largeUnit: string;
  conversionRate: number | string;
  imageUrl?: string;
  purchasePrice: number | string;
  status: string;
  category: string;
  description: string;
  reorderPoint: number | string;
  hasVariants: boolean;
  hasBatches: boolean;
  variants: VariantData[];
};

const generateSKU = () => "SP-" + Math.random().toString(36).substring(2, 8).toUpperCase();

const CreateProductModal = ({ isOpen, onClose, onCreate }: any) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ProductFormData>({
    productId: generateSKU(), name: "", price: "", rating: "", 
    baseUnit: "Cái", largeUnit: "", conversionRate: 1,
    purchasePrice: "", status: "ACTIVE", category: "", description: "", 
    reorderPoint: 10, hasVariants: false, hasBatches: false, variants: []
  });
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  if (!isOpen) return null;

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

  const addVariant = () => setFormData({ ...formData, variants: [...formData.variants, { sku: `${formData.productId}-V${formData.variants.length + 1}`, attributes: "", additionalPrice: 0 }] });
  
  const updateVariant = (index: number, field: string, value: string | number) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value } as any;
    setFormData({ ...formData, variants: newVariants });
  };
  
  const removeVariant = (index: number) => setFormData({ ...formData, variants: formData.variants.filter((_, i) => i !== index) });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step < 4) return setStep(step + 1);

    const finalData = {
      ...formData,
      price: Number(formData.price) || 0,
      purchasePrice: Number(formData.purchasePrice) || 0,
      rating: Number(formData.rating) || 0,
      conversionRate: Number(formData.conversionRate) || 1,
      reorderPoint: Number(formData.reorderPoint) || 10,
      variants: formData.hasVariants ? formData.variants.map(v => ({ ...v, additionalPrice: Number(v.additionalPrice) || 0 })) : [],
      stockQuantity: 0 // Bắt buộc tồn kho ban đầu là 0 để tuân thủ quy trình WMS
    };

    onCreate(finalData);
    
    // Reset form
    setFormData({ 
      productId: generateSKU(), name: "", price: "", rating: "", baseUnit: "Cái", largeUnit: "", conversionRate: 1,
      purchasePrice: "", status: "ACTIVE", category: "", description: "", reorderPoint: 10, hasVariants: false, hasBatches: false, variants: []
    });
    setImagePreview(null);
    setStep(1);
  };

  // --- STANDARD CSS CLASSES ---
  const labelClass = "block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5";
  const inputClass = "w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-100 transition-shadow";
  const blockClass = "bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm";
  const blockHeaderClass = "text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-5 pb-3 border-b border-gray-100 dark:border-gray-700";

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className={blockClass}>
              <h3 className={blockHeaderClass}><AlignLeft className="w-4 h-4 text-blue-500" /> Thông tin cơ bản</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-4">
                  <label className={labelClass}>Mã SKU (Tự sinh) <span className="text-red-500">*</span></label>
                  <input type="text" name="productId" value={formData.productId} onChange={handleChange} className={`${inputClass} font-mono uppercase bg-gray-50`} required />
                </div>
                <div className="md:col-span-8">
                  <label className={labelClass}>Tên Sản phẩm Gốc <span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} placeholder="VD: Sữa chua Vinamilk" required />
                </div>
                <div className="md:col-span-6">
                  <label className={labelClass}>Danh mục</label>
                  <input type="text" name="category" value={formData.category} onChange={handleChange} className={inputClass} placeholder="VD: Đồ uống" />
                </div>
                <div className="md:col-span-6">
                  <label className={labelClass}>Mức cảnh báo Tồn kho thấp</label>
                  <div className="relative">
                    <input type="number" name="reorderPoint" value={formData.reorderPoint} onChange={handleChange} className={`${inputClass} pr-12 font-bold text-red-600`} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">{formData.baseUnit}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
            <div className={blockClass}>
              <h3 className={blockHeaderClass}><DollarSign className="w-4 h-4 text-green-500" /> Cấu hình Giá & Đơn vị tính</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tài chính */}
                <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                    <label className={labelClass}>Giá Vốn (Nhập)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} className={`${inputClass} pl-9`} placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1.5">Giá Bán Cơ Bản <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 font-black">$</span>
                      <input type="number" name="price" value={formData.price} onChange={handleChange} className={`${inputClass} pl-9 border-green-300 bg-green-50 text-green-800 font-bold focus:ring-green-500`} placeholder="0.00" required />
                    </div>
                  </div>
                </div>

                {/* Đơn vị */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-800/50 space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className={labelClass}>Đơn vị Lẻ <span className="text-red-500">*</span></label>
                      <input type="text" name="baseUnit" value={formData.baseUnit} onChange={handleChange} className={inputClass} placeholder="Cái, Hộp" required />
                    </div>
                    <div className="flex-1">
                      <label className={labelClass}>Đơn vị Sỉ (Thùng)</label>
                      <input type="text" name="largeUnit" value={formData.largeUnit} onChange={handleChange} className={inputClass} placeholder="Thùng" />
                    </div>
                  </div>
                  {formData.largeUnit && (
                    <div className="flex items-center justify-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 shadow-sm mt-2">
                      <span className="text-xs font-semibold text-gray-500">1 {formData.largeUnit} = </span>
                      <input type="number" name="conversionRate" min="2" value={formData.conversionRate} onChange={handleChange} className="w-20 h-9 px-2 text-center font-bold text-blue-700 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" required />
                      <span className="text-xs font-semibold text-gray-500">{formData.baseUnit}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
            <div className={blockClass}>
              <h3 className={blockHeaderClass}><Box className="w-4 h-4 text-purple-500" /> Thiết lập Thuộc tính & Kho (WMS)</h3>
              
              {/* Quản lý Lô */}
              <div className="p-4 border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl mb-4 transition-colors hover:bg-amber-50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="hasBatches" checked={formData.hasBatches} onChange={handleChange} className="w-5 h-5 mt-0.5 text-amber-600 rounded border-gray-300 focus:ring-amber-500" />
                  <div>
                    <span className="text-sm font-bold text-amber-800 flex items-center gap-2"><CalendarClock className="w-4 h-4"/> Yêu cầu quản lý theo Lô / HSD (FEFO)</span>
                    <p className="text-xs text-amber-600/80 mt-1 font-medium">Bật tùy chọn này, hệ thống sẽ bắt buộc khai báo số Lô và Hạn sử dụng mỗi khi Nhập/Xuất kho.</p>
                  </div>
                </label>
              </div>

              {/* Phân loại (Variant) */}
              <div className="p-4 border border-purple-200 bg-purple-50/50 dark:bg-purple-900/10 rounded-xl transition-colors hover:bg-purple-50">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input type="checkbox" name="hasVariants" checked={formData.hasVariants} onChange={handleChange} className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                  <span className="text-sm font-bold text-purple-800 flex items-center gap-2"><Layers className="w-4 h-4"/> Sản phẩm có Phân loại (Size, Màu sắc...)</span>
                </label>
                
                {formData.hasVariants && (
                  <div className="space-y-3 pt-3 border-t border-purple-100">
                    {formData.variants.map((v, index) => (
                      <div key={index} className="flex flex-col sm:flex-row items-end gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-purple-100 shadow-sm relative">
                        <div className="w-full sm:w-1/3">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Mã SKU Phân loại <span className="text-red-500">*</span></label>
                          <input type="text" value={v.sku} onChange={(e) => updateVariant(index, "sku", e.target.value)} className={`${inputClass} font-mono text-xs`} required/>
                        </div>
                        <div className="w-full sm:w-1/3">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Tên Thuộc tính <span className="text-red-500">*</span></label>
                          <input type="text" value={v.attributes} onChange={(e) => updateVariant(index, "attributes", e.target.value)} placeholder="VD: Màu Đỏ - XL" className={inputClass} required/>
                        </div>
                        <div className="w-full sm:w-1/3">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Giá phụ thu (+)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                            <input type="number" value={v.additionalPrice} onChange={(e) => updateVariant(index, "additionalPrice", e.target.value)} className={`${inputClass} pl-8 text-blue-600 font-bold`} />
                          </div>
                        </div>
                        <button type="button" onClick={() => removeVariant(index)} className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white rounded-full shadow-sm transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addVariant} className="text-xs font-bold text-purple-700 bg-purple-100 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors w-full sm:w-auto border border-purple-200 border-dashed">
                      + Thêm dòng Phân loại
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className={blockClass}>
              <h3 className={blockHeaderClass}><ImageIcon className="w-4 h-4 text-pink-500" /> Hình ảnh Sản phẩm</h3>
              <div className="flex flex-col sm:flex-row items-center gap-6 py-4">
                {imagePreview ? (
                  <div className="relative group">
                    <img src={imagePreview} alt="Preview" className="rounded-xl object-cover h-40 w-40 shadow-md border border-gray-200" />
                    <button type="button" onClick={() => setImagePreview(null)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-gray-50/50">
                    <UploadCloud className="w-10 h-10 text-gray-400 mb-3" />
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tải ảnh lên</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                )}
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Ảnh đại diện Master Data</h4>
                  <p className="text-xs text-gray-500 mb-4">Định dạng hỗ trợ: JPG, PNG, WEBP.<br/>Khuyến nghị kích thước vuông 500x500px.</p>
                  {imagePreview && (
                    <label className="inline-block px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                      Đổi ảnh khác
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2">
            <Package className="w-6 h-6" /> Khởi tạo Master Data Mới
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEPPER (Thanh tiến trình đẹp mắt) */}
        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 flex justify-between relative">
          <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-gray-200 dark:bg-gray-700 -z-0 -translate-y-1/2"></div>
          {["Cơ bản", "Giá & Đơn vị", "WMS / Phân loại", "Hình ảnh"].map((label, i) => {
            const isCompleted = step > i + 1;
            const isActive = step === i + 1;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5 z-10 bg-white dark:bg-gray-800 px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isCompleted ? "bg-blue-600 border-blue-600 text-white" : 
                  isActive ? "bg-white border-blue-600 text-blue-600" : 
                  "bg-white border-gray-300 text-gray-400"
                }`}>
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* BODY (Form lướt) */}
        <form id="createProductForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto bg-gray-50/50">
          {renderStepContent()}
        </form>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button type="button" onClick={step === 1 ? onClose : () => setStep(step - 1)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-2">
            {step === 1 ? "Hủy bỏ" : <><ArrowLeft className="w-4 h-4"/> Quay lại</>}
          </button>
          
          <button type="submit" form="createProductForm" className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-2">
            {step < 4 ? <>Tiếp tục <ArrowRight className="w-4 h-4"/></> : <><CheckCircle className="w-4 h-4" /> Hoàn tất Khởi tạo</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateProductModal;