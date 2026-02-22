"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { X, ArrowRight, ArrowLeft, CheckCircle, UploadCloud, Package, Image as ImageIcon, Scale, AlignLeft, DollarSign } from "lucide-react";

export type ProductFormData = {
  productId: string;
  name: string;
  price: number | string;
  stockQuantity: number; 
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
  location: string;
};

type CreateProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (formData: ProductFormData) => void;
};

const generateSKU = () => "SP-" + Math.random().toString(36).substring(2, 8).toUpperCase();

const CreateProductModal = ({ isOpen, onClose, onCreate }: CreateProductModalProps) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ProductFormData>({
    productId: generateSKU(),
    name: "",
    price: "", 
    stockQuantity: 0, 
    rating: "", 
    baseUnit: "Cái",
    largeUnit: "",
    conversionRate: 1,
    purchasePrice: "",
    status: "ACTIVE",
    category: "",
    description: "",
    reorderPoint: 10,
    location: "",
  });
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData({ ...formData, imageUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Nếu chưa tới bước cuối thì chuyển bước
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    const finalData = {
      ...formData,
      price: Number(formData.price) || 0,
      purchasePrice: Number(formData.purchasePrice) || 0,
      rating: Number(formData.rating) || 0,
      conversionRate: Number(formData.conversionRate) || 1,
      reorderPoint: Number(formData.reorderPoint) || 10,
    };

    onCreate(finalData as any);
    
    setFormData({ 
      productId: generateSKU(), name: "", price: "", stockQuantity: 0, rating: "", 
      baseUnit: "Cái", largeUnit: "", conversionRate: 1, imageUrl: "",
      purchasePrice: "", status: "ACTIVE", category: "", description: "", 
      reorderPoint: 10, location: "",
    });
    setImagePreview(null);
    setStep(1);
    onClose();
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex gap-4">
              <div className="w-1/3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mã SKU / ID <span className="text-red-500">*</span></label>
                <input type="text" name="productId" value={formData.productId ?? ""} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all font-mono text-sm uppercase" required placeholder="VD: SP-001..." />
              </div>
              <div className="w-2/3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tên sản phẩm <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={formData.name ?? ""} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all" required />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Danh mục (Ngành hàng)</label>
                <input type="text" name="category" placeholder="VD: Đồ điện tử..." value={formData.category ?? ""} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all" />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Đánh giá sơ bộ (Sao)</label>
                <input type="number" name="rating" min="0" max="5" step="0.01" value={formData.rating ?? ""} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mô tả / Ghi chú chi tiết</label>
              <textarea name="description" rows={3} placeholder="VD: Cấu hình, chất liệu, lưu ý đóng gói..." value={formData.description ?? ""} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none resize-none transition-all" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* NHÓM TÀI CHÍNH */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <h4 className="flex items-center gap-2 text-sm font-bold text-green-800 dark:text-green-300 mb-3"><DollarSign className="w-4 h-4"/> Thiết lập Giá trị</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Giá vốn (Nhập vào)</label>
                  <input type="number" name="purchasePrice" min="0" value={formData.purchasePrice ?? ""} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-green-200 dark:border-green-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Giá Bán ra <span className="text-red-500">*</span></label>
                  <input type="number" name="price" min="0" value={formData.price ?? ""} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-green-200 dark:border-green-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all font-bold text-green-700 dark:text-green-400" required />
                </div>
              </div>
            </div>

            {/* CẤU HÌNH UoM */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <h4 className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-300 mb-3"><Scale className="w-4 h-4"/> Quy đổi Đơn vị (UoM)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Đơn vị Lẻ (Xuất) <span className="text-red-500">*</span></label>
                  <input type="text" name="baseUnit" placeholder="VD: Cái, Chai" value={formData.baseUnit ?? ""} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Đơn vị Sỉ (Nhập)</label>
                  <input type="text" name="largeUnit" placeholder="VD: Thùng, Lốc" value={formData.largeUnit ?? ""} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" />
                </div>
              </div>
              {formData.largeUnit && (
                <div className="mt-3 flex items-center gap-3 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-blue-200 dark:border-blue-700">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Công thức: 1 {formData.largeUnit} = </span>
                  <input type="number" name="conversionRate" min="2" value={formData.conversionRate ?? ""} onChange={handleChange} className="w-20 px-2 py-1 text-center font-bold text-blue-600 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" required />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formData.baseUnit}</span>
                </div>
              )}
            </div>

            {/* NHÓM QUẢN TRỊ KHO BÃI */}
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-orange-800 dark:text-orange-400 mb-1">Vị trí lưu kho</label>
                <input type="text" name="location" placeholder="VD: Kệ A - Tầng 3" value={formData.location ?? ""} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-orange-200 dark:border-orange-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-orange-800 dark:text-orange-400 mb-1">Báo động khi tồn dưới</label>
                <input type="number" name="reorderPoint" min="0" value={formData.reorderPoint ?? ""} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-orange-200 dark:border-orange-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all font-bold text-orange-600" />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="w-full">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tải lên Ảnh Sản phẩm (Tùy chọn)</label>
              <div className="mt-2 flex justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-6 py-12 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
                <div className="text-center">
                  {imagePreview ? (
                    <div className="flex flex-col items-center">
                      <img src={imagePreview} alt="Preview" className="rounded-lg object-cover shadow-md mb-3 h-40 w-40 border border-gray-200" />
                      <span className="text-sm text-blue-600 font-bold cursor-pointer hover:underline">Nhấn để đổi ảnh khác</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-500" aria-hidden="true" />
                      <div className="mt-4 flex justify-center text-sm leading-6 text-gray-600 dark:text-gray-400">
                        <label className="relative cursor-pointer rounded-md font-semibold text-blue-600 hover:text-blue-500">
                          <span>Chọn tệp từ máy tính</span>
                          <input type="file" className="sr-only" accept="image/jpeg, image/png, image/webp" onChange={handleImageChange} />
                        </label>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">PNG, JPG, WEBP lên đến 10MB</p>
                    </>
                  )}
                </div>
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/jpeg, image/png, image/webp" onChange={handleImageChange} />
              </div>
            </div>
          </div>
        );
      default: 
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Package className="w-6 h-6 text-blue-600" /> Khai báo Sản phẩm Mới</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white dark:bg-gray-700 rounded-full shadow-sm hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        {/* STEPPER */}
        <div className="px-8 pt-6 pb-2 shrink-0">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-100 dark:bg-gray-700 z-0"></div>
            
            {[
              { num: 1, icon: <AlignLeft className="w-4 h-4" />, label: "Cơ bản" },
              { num: 2, icon: <DollarSign className="w-4 h-4" />, label: "Vận hành" },
              { num: 3, icon: <ImageIcon className="w-4 h-4" />, label: "Hình ảnh" }
            ].map((s) => (
              <div key={s.num} className={`relative z-10 flex flex-col items-center gap-2 ${step >= s.num ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 border-white dark:border-gray-800 transition-colors ${step > s.num ? 'bg-green-500 text-white' : step === s.num ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-200 text-gray-500'}`}>
                  {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.icon}
                </div>
                <span className={`text-xs font-bold ${step === s.num ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FORM CONTENT DẠNG CUỘN */}
        <form id="createProductForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 min-h-[350px]">
          {renderStepContent()}
        </form>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <button type="button" onClick={step === 1 ? onClose : () => setStep(step - 1)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl flex items-center gap-2 transition-colors">
            {step === 1 ? "Hủy bỏ" : <><ArrowLeft className="w-4 h-4" /> Quay lại</>}
          </button>
          
          <button type="submit" form="createProductForm" className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all ${step < 3 ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'}`}>
            {step < 3 ? <>Tiếp tục <ArrowRight className="w-4 h-4" /></> : <><CheckCircle className="w-4 h-4" /> Hoàn tất lưu</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProductModal;