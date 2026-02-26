"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { 
  X, Save, Briefcase, Tag, DollarSign, Calendar, MapPin, 
  User, ShieldCheck, Image as ImageIcon, AlertCircle, Loader2, Activity 
} from "lucide-react";

type CreateAssetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => void;
  isSubmitting?: boolean;
};

const CreateAssetModal = ({ isOpen, onClose, onCreate, isSubmitting = false }: CreateAssetModalProps) => {
  const [formData, setFormData] = useState({
    name: "", 
    category: "Thiết bị điện tử", 
    status: "Sẵn sàng", 
    assignedTo: "", 
    location: "", 
    purchaseDate: "", 
    price: "", 
    imageUrl: "",
    depreciationMonths: "24", // Mặc định khấu hao 2 năm
    maintenanceCycle: "6"     // Mặc định bảo trì 6 tháng/lần
  });
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
    onCreate({ 
      ...formData, 
      price: Number(formData.price),
      depreciationMonths: Number(formData.depreciationMonths),
      maintenanceCycle: Number(formData.maintenanceCycle)
    });
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none font-medium bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* LỚP PHỦ ĐÓNG BĂNG UI KHI ĐANG SUBMIT TẠO PHIẾU */}
        {isSubmitting && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
            <p className="font-bold text-emerald-800 text-lg shadow-sm">Đang gửi yêu cầu phê duyệt...</p>
            <p className="text-sm text-emerald-600 mt-1">Vui lòng chờ trong giây lát</p>
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-50 sticky top-0 z-10">
          <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-800">
            <Briefcase className="w-6 h-6" /> Đề Xuất Mua Tài Sản Mới
          </h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="p-2 text-gray-400 hover:bg-white rounded-full disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY FORM */}
        <form id="createAssetForm" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          
          {/* CẢNH BÁO ENTERPRISE */}
          <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-xl border border-blue-200">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 leading-relaxed">
              <strong>Mô hình Enterprise:</strong> Đề xuất của bạn sẽ tạo thành một <b>Phiếu Yêu Cầu Mua Tài Sản</b> và gửi lên cấp Quản lý phê duyệt. Giá trị tài sản sẽ được <b>khấu hao tự động</b>.
            </p>
          </div>

          {/* KHU VỰC HÌNH ẢNH */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-pink-500" /> Hình ảnh minh họa
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {imagePreview ? (
                <div className="relative group flex-shrink-0">
                  <img src={imagePreview} alt="Preview" className="rounded-xl object-cover h-28 w-28 shadow-sm border border-gray-200" />
                  <button type="button" onClick={() => { setImagePreview(null); setFormData({ ...formData, imageUrl: "" }); }} disabled={isSubmitting} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:scale-110 transition-transform disabled:opacity-50">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-28 w-28 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div className="w-full">
                <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageChange} disabled={isSubmitting} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-2">Dung lượng tối đa 10MB. Định dạng: JPG, PNG, WEBP.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-gray-400"/> Tên tài sản <span className="text-red-500">*</span>
              </label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} required placeholder="VD: Laptop Dell XPS 15..." disabled={isSubmitting} />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-gray-400"/> Phân loại
              </label>
              <select name="category" value={formData.category} onChange={handleChange} className={`${inputClass} cursor-pointer`} disabled={isSubmitting}>
                <option value="Thiết bị điện tử">Thiết bị điện tử (IT)</option>
                <option value="Nội thất">Nội thất văn phòng</option>
                <option value="Phương tiện">Phương tiện vận tải</option>
                <option value="Máy móc công nghiệp">Máy móc / Công cụ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-gray-400"/> Trạng thái ban đầu
              </label>
              <select name="status" value={formData.status} onChange={handleChange} className={`${inputClass} cursor-pointer`} disabled={isSubmitting}>
                <option value="Sẵn sàng">Kho (Sẵn sàng)</option>
                <option value="Đang sử dụng">Bàn giao ngay (Đang sử dụng)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400"/> Ngày mua <span className="text-red-500">*</span>
              </label>
              <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className={inputClass} required disabled={isSubmitting} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-gray-400"/> Nguyên giá (Giá mua) <span className="text-red-500">*</span>
              </label>
              <input type="number" min="0" name="price" value={formData.price} onChange={handleChange} className={inputClass} required placeholder="0.00" disabled={isSubmitting} />
            </div>

            {/* KHU VỰC KHẤU HAO & BẢO TRÌ */}
            <div className="md:col-span-2 grid grid-cols-2 gap-5 p-5 bg-orange-50 border border-orange-200 rounded-xl shadow-sm">
              <div>
                <label className="block text-sm font-bold text-orange-800 mb-1.5 flex items-center gap-1.5">
                  <Activity className="w-4 h-4"/> TG Khấu hao (Tháng)
                </label>
                <input type="number" min="0" name="depreciationMonths" value={formData.depreciationMonths} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-orange-300 focus:ring-2 focus:ring-orange-500 outline-none font-medium bg-white" placeholder="VD: 24" disabled={isSubmitting} />
              </div>
              <div>
                <label className="block text-sm font-bold text-orange-800 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4"/> Chu kỳ bảo trì (Tháng)
                </label>
                <input type="number" min="0" name="maintenanceCycle" value={formData.maintenanceCycle} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-orange-300 focus:ring-2 focus:ring-orange-500 outline-none font-medium bg-white" placeholder="VD: 6 (để 0 nếu ko cần)" disabled={isSubmitting} />
              </div>
            </div>

            {/* THÔNG TIN BÀN GIAO */}
            <div className="md:col-span-2 p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-4 mt-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Thông tin Bàn giao (Tùy chọn)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500"/> Giao cho ai?
                  </label>
                  <input type="text" name="assignedTo" value={formData.assignedTo} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500" placeholder="VD: Nguyễn Văn A" disabled={isSubmitting} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500"/> Vị trí đặt / Phòng ban
                  </label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500" placeholder="VD: Phòng Kế Toán" disabled={isSubmitting} />
                </div>
              </div>
            </div>

          </div>
        </form>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white sticky bottom-0 z-10">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2.5 font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Hủy bỏ
          </button>
          <button type="submit" form="createAssetForm" disabled={isSubmitting} className="px-6 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" /> Gửi Yêu Cầu Mua
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateAssetModal;