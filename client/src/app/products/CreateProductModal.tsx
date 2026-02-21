"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { v4 } from "uuid";
import { X, ArrowRight, ArrowLeft, CheckCircle, UploadCloud, Info, Package, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import Image from "next/image";

type ProductFormData = {
  name: string;
  price: number;
  stockQuantity: number;
  rating: number;
};

type CreateProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (formData: ProductFormData) => void;
};

const CreateProductModal = ({
  isOpen,
  onClose,
  onCreate,
}: CreateProductModalProps) => {
  const { t } = useTranslation();
  
  // 1. STATE QUẢN LÝ CÁC BƯỚC VÀ DỮ LIỆU
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    productId: v4(),
    name: "",
    price: 0,
    stockQuantity: 0,
    rating: 0,
  });
  
  // State chứa ảnh Preview
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  if (!isOpen) return null;

  // 2. XỬ LÝ NHẬP LIỆU
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === "price" || name === "stockQuantity" || name === "rating"
          ? parseFloat(value) || 0
          : value,
    });
  };

  // Xử lý khi chọn ảnh
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Tạo URL ảo để xem trước ảnh ngay lập tức
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // 3. HÀM SUBMIT FORM (Hoàn tất)
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onCreate(formData);
    
    // Reset form
    setFormData({ productId: v4(), name: "", price: 0, stockQuantity: 0, rating: 0 });
    setImagePreview(null);
    setStep(1);
    onClose();
  };

  // 4. GIAO DIỆN TỪNG BƯỚC (STEPS)
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t("productModal.name")}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all"
                required
              />
            </div>
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t("productModal.price")}
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all"
                  required
                />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t("productModal.rating")}
                </label>
                <input
                  type="number"
                  name="rating"
                  min="0"
                  max="5"
                  value={formData.rating}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all"
                  required
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t("productModal.stock")}
              </label>
              <input
                type="number"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleChange}
                className="w-full px-4 py-3 text-lg font-bold text-blue-600 dark:text-blue-400 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 outline-none transition-all"
                required
              />
            </div>
            {/* Lời khuyên UI (Mô phỏng) */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex gap-3 text-blue-700 dark:text-blue-300">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Hãy đảm bảo số lượng tồn kho được kiểm kê thực tế trước khi nhập vào hệ thống để tránh sai sót xuất/nhập.
              </p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="w-full">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Ảnh Sản phẩm
              </label>
              {/* KHU VỰC TẢI ẢNH (MOCKUP) */}
              <div className="mt-2 flex justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-6 py-10 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
                <div className="text-center">
                  {imagePreview ? (
                    <div className="flex flex-col items-center">
                      <Image 
                        src={imagePreview} 
                        alt="Preview" 
                        width={150} height={150} 
                        className="rounded-lg object-cover shadow-sm mb-3 h-32 w-32"
                      />
                      <span className="text-sm text-blue-600 font-medium cursor-pointer">Đổi ảnh khác</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500" aria-hidden="true" />
                      <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400 justify-center">
                        <label className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-600 focus-within:outline-none hover:text-blue-500">
                          <span>{t("productModal.upload")}</span>
                          <input type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                        </label>
                      </div>
                      <p className="text-xs leading-5 text-gray-500 mt-1">{t("productModal.uploadHint")}</p>
                    </>
                  )}
                </div>
                {/* Input ẩn đè lên toàn khu vực nếu đã có ảnh để dễ đổi */}
                {imagePreview && <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={handleImageChange} />}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/60 backdrop-blur-sm p-4 transition-all">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            {t("productModal.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white dark:bg-gray-700 rounded-full shadow-sm hover:bg-gray-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* THANH TIẾN TRÌNH (STEPPER) */}
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full z-0"></div>
              
              {/* Step 1 */}
              <div className={`relative z-10 flex flex-col items-center gap-2 transition-all ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 border-white dark:border-gray-800 transition-colors ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step > 1 ? <CheckCircle className="w-5 h-5" /> : 1}
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t("productModal.step1")}</span>
              </div>

              {/* Step 2 */}
              <div className={`relative z-10 flex flex-col items-center gap-2 transition-all ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 border-white dark:border-gray-800 transition-colors ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step > 2 ? <CheckCircle className="w-5 h-5" /> : 2}
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t("productModal.step2")}</span>
              </div>

              {/* Step 3 */}
              <div className={`relative z-10 flex flex-col items-center gap-2 transition-all ${step >= 3 ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 border-white dark:border-gray-800 transition-colors ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t("productModal.step3")}</span>
              </div>
            </div>
          </div>

          {/* NỘI DUNG TỪNG BƯỚC */}
          <div className="p-6 min-h-[250px]">
            {renderStepContent()}
          </div>

          {/* FOOTER BUTTONS */}
          <div className="flex items-center justify-between px-6 py-5 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={step === 1 ? onClose : () => setStep(step - 1)}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors flex items-center gap-2"
            >
              {step === 1 ? t("productModal.cancel") : (
                <><ArrowLeft className="w-4 h-4" /> {t("productModal.prev")}</>
              )}
            </button>
            
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
              >
                {t("productModal.next")} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
              >
                <CheckCircle className="w-4 h-4" /> {t("productModal.submit")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProductModal;