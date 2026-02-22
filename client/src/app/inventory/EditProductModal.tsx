"use client";

import { X, Save, Edit, UploadCloud } from "lucide-react";
import { Product } from "@/state/api";
import { useState, useEffect, ChangeEvent, FormEvent } from "react";

const EditProductModal = ({ isOpen, onClose, product, onSubmit }: any) => {
    const [formData, setFormData] = useState<any>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && product) {
            setFormData({ ...product });
            setImagePreview(product.imageUrl || null);
        }
    }, [isOpen, product]);

    if (!isOpen || !formData) return null;

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [name]: value, 
        }));
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImagePreview(base64String);
                setFormData((prev: any) => prev ? { ...prev, imageUrl: base64String } : null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData) return;
        
        const finalData = {
            ...formData,
            price: Number(formData.price) || 0,
            purchasePrice: Number(formData.purchasePrice) || 0,
            rating: Number(formData.rating) || 0,
            conversionRate: Number(formData.conversionRate) || 1,
            reorderPoint: Number(formData.reorderPoint) || 10,
        };

        onSubmit(finalData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all">
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                
                {/* HEADER CỐ ĐỊNH */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Edit className="w-5 h-5 text-blue-600" /> Cập nhật Sản phẩm
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white dark:bg-gray-700 rounded-full shadow-sm hover:bg-gray-100 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* THÂN FORM CUỘN ĐƯỢC */}
                <form id="editProductForm" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                    
                    {/* KHU VỰC THAY ẢNH VÀ TÊN */}
                    <div className="flex gap-6 items-center">
                        <div className="relative group w-28 h-28 flex-shrink-0">
                            <div className="w-full h-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="object-cover w-full h-full" />
                                ) : (
                                    <UploadCloud className="w-8 h-8 text-gray-400" />
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <span className="text-white text-xs font-bold text-center">Đổi ảnh</span>
                                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/jpeg, image/png, image/webp" onChange={handleImageChange} />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tên sản phẩm <span className="text-red-500">*</span></label>
                                <input type="text" name="name" value={formData.name ?? ""} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all" required />
                            </div>
                            <div className="flex gap-4">
                                <div className="w-1/2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Đánh giá (Rating)</label>
                                    <input type="number" name="rating" min="0" max="5" step="0.01" value={formData.rating ?? ""} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all" />
                                </div>
                                <div className="w-1/2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Trạng thái Kinh doanh</label>
                                    <select name="status" value={formData.status || "ACTIVE"} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all cursor-pointer">
                                        <option value="ACTIVE">Đang kinh doanh</option>
                                        <option value="OUT_OF_STOCK">Tạm hết hàng</option>
                                        <option value="DISCONTINUED">Ngừng kinh doanh</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MÔ TẢ CHI TIẾT */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mô tả chi tiết / Ghi chú</label>
                        <textarea 
                            name="description" 
                            rows={2}
                            placeholder="VD: Chất liệu, quy cách đóng gói, lưu ý bảo quản..." 
                            value={formData.description ?? ""} 
                            onChange={handleChange} 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none resize-none transition-all" 
                        />
                    </div>

                    {/* NHÓM TÀI CHÍNH */}
                    <div className="flex gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="w-1/2">
                            <label className="block text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Danh mục</label>
                            <input type="text" name="category" placeholder="VD: Đồ điện tử..." value={formData.category ?? ""} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-green-200 dark:border-green-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" />
                        </div>
                        <div className="w-1/4">
                            <label className="block text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Giá vốn</label>
                            <input type="number" name="purchasePrice" min="0" value={formData.purchasePrice ?? ""} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-green-200 dark:border-green-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" />
                        </div>
                        <div className="w-1/4">
                            <label className="block text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Giá Bán <span className="text-red-500">*</span></label>
                            <input type="number" name="price" min="0" value={formData.price ?? ""} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-green-200 dark:border-green-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all font-bold text-green-600" required />
                        </div>
                    </div>

                    {/* CẤU HÌNH UoM */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-300 mb-3">
                            Thiết lập Quy đổi Đơn vị (UoM)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Đơn vị Lẻ/Cơ bản <span className="text-red-500">*</span></label>
                                <input type="text" name="baseUnit" placeholder="VD: Đôi, Cái, Chai" value={formData.baseUnit ?? ""} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Đơn vị Sỉ/Lớn</label>
                                <input type="text" name="largeUnit" placeholder="VD: Thùng, Lốc, Hộp" value={formData.largeUnit ?? ""} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" />
                            </div>
                        </div>
                        
                        {formData.largeUnit && (
                            <div className="mt-3 flex items-center gap-3 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-blue-200 dark:border-blue-700">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Công thức: 1 {formData.largeUnit} = 
                                </span>
                                <input type="number" name="conversionRate" min="2" value={formData.conversionRate ?? ""} onChange={handleChange} className="w-20 px-2 py-1 text-center font-bold text-blue-600 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" required />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {formData.baseUnit || "Cái"}
                                </span>
                            </div>
                        )}
                        <p className="text-xs text-blue-600/70 dark:text-blue-400 mt-3 italic">*Hệ thống sẽ dùng cấu hình này để tính toán Tồn kho hiện hành.</p>
                    </div>

                    {/* NHÓM KHO BÃI */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                        <div>
                            <label className="block text-xs font-semibold text-orange-800 dark:text-orange-400 mb-1">Vị trí lưu kho (Tọa độ)</label>
                            <input type="text" name="location" placeholder="VD: Kệ A - Tầng 3" value={formData.location ?? ""} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-orange-200 dark:border-orange-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-orange-800 dark:text-orange-400 mb-1">Cảnh báo tồn kho dưới (Số lượng)</label>
                            <input type="number" name="reorderPoint" min="0" value={formData.reorderPoint ?? ""} onChange={handleChange} className="w-full px-3 py-2.5 rounded-lg border border-orange-200 dark:border-orange-700 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all font-bold text-orange-600" />
                        </div>
                    </div>
                    
                </form>

                {/* FOOTER CỐ ĐỊNH */}
                <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                        Hủy bỏ
                    </button>
                    <button form="editProductForm" type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95">
                        <Save className="w-4 h-4" /> Lưu thông tin
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProductModal;