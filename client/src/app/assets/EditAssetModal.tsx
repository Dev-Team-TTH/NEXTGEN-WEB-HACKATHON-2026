"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { 
  X, Save, Edit, Briefcase, Tag, MapPin, User, 
  ShieldAlert, Image as ImageIcon, AlertCircle, Loader2, Activity, ShieldCheck 
} from "lucide-react";

type EditAssetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
  onEdit: (id: string, data: any) => void;
  isSubmitting?: boolean;
};

const EditAssetModal = ({ isOpen, onClose, asset, onEdit, isSubmitting = false }: EditAssetModalProps) => {
  const [formData, setFormData] = useState({
    name: "", 
    category: "", 
    status: "", 
    assignedTo: "", 
    location: "", 
    imageUrl: "",
    depreciationMonths: "",
    maintenanceCycle: ""
  });
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && asset) {
      setFormData({ 
        name: asset.name, 
        category: asset.category, 
        status: asset.status, 
        assignedTo: asset.assignedTo || "", 
        location: asset.location || "", 
        imageUrl: asset.imageUrl || "",
        depreciationMonths: asset.depreciationMonths ? String(asset.depreciationMonths) : "0",
        maintenanceCycle: asset.maintenanceCycle ? String(asset.maintenanceCycle) : "0"
      });
      setImagePreview(asset.imageUrl || null);
    }
  }, [isOpen, asset]);

  if (!isOpen || !asset) return null;

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
    onEdit(asset.assetId, {
      ...formData,
      depreciationMonths: Number(formData.depreciationMonths),
      maintenanceCycle: Number(formData.maintenanceCycle)
    }); 
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none font-medium bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* LỚP PHỦ ĐÓNG BĂNG UI KHI ĐANG SUBMIT TẠO PHIẾU */}
        {isSubmitting && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl">
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-3" />
            <p className="font-bold text-amber-800 text-lg shadow-sm">Đang gửi yêu cầu phê duyệt...</p>
            <p className="text-sm text-amber-600 mt-1">Vui lòng chờ trong giây lát</p>
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-amber-50 sticky top-0 z-10">
          <h2 className="text-xl font-bold flex items-center gap-2 text-amber-800">
            <Edit className="w-6 h-6" /> Yêu Cầu Bàn Giao / Báo Hỏng
          </h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="p-2 text-gray-400 hover:bg-white rounded-full disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY FORM */}
        <form id="editAssetForm" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          
          {/* CẢNH BÁO ENTERPRISE */}
          <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 leading-relaxed">
              Thông tin cập nhật sẽ được lưu thành <b>Phiếu Yêu Cầu Bàn Giao / Sửa Chữa</b> và gửi lên cấp Quản lý phê duyệt. Tài sản chưa thay đổi trạng thái cho đến khi được duyệt.
            </p>
          </div>

          <div className="bg-gray-100 px-4 py-3 rounded-xl border border-gray-200 flex justify-between items-center">
             <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mã Tài Sản</span>
             <span className="font-mono font-bold text-blue-700">{asset.assetId.substring(0,12).toUpperCase()}...</span>
          </div>

          {/* KHU VỰC HÌNH ẢNH */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-pink-500" /> Hình ảnh tình trạng tài sản
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
                <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageChange} disabled={isSubmitting} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-2">Dung lượng tối đa 10MB. Định dạng: JPG, PNG, WEBP.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-gray-400"/> Tên tài sản
              </label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} required disabled={isSubmitting} />
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
                <ShieldAlert className="w-4 h-4 text-amber-500"/> Trạng thái hiện tại
              </label>
              <select name="status" value={formData.status} onChange={handleChange} className={`${inputClass} cursor-pointer font-bold ${formData.status === 'Hỏng hóc' ? 'text-red-600 bg-red-50' : formData.status === 'Đang bảo trì' ? 'text-amber-600 bg-amber-50' : 'text-blue-700 bg-blue-50'}`} disabled={isSubmitting}>
                <option value="Sẵn sàng">Sẵn sàng (Kho)</option>
                <option value="Đang sử dụng">Đang sử dụng</option>
                <option value="Đang bảo trì">Đang bảo trì / Sửa chữa</option>
                <option value="Hỏng hóc">Hỏng / Chờ thanh lý</option>
              </select>
            </div>
          </div>

          {/* KHU VỰC KHẤU HAO & BẢO TRÌ (MỚI THÊM) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl shadow-sm">
            <div>
              <label className="block text-xs font-bold text-orange-800 dark:text-orange-300 uppercase mb-2 flex items-center gap-1.5">
                <Activity className="w-4 h-4"/> TG Khấu hao
              </label>
              <div className="relative">
                <input type="number" min="0" name="depreciationMonths" value={formData.depreciationMonths} onChange={handleChange} className="w-full px-4 py-2.5 pr-16 rounded-xl border border-orange-300 dark:border-orange-700 focus:ring-2 focus:ring-orange-500 outline-none font-medium bg-white dark:bg-gray-800 dark:text-white transition-all" placeholder="VD: 24" disabled={isSubmitting} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Tháng</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-orange-800 dark:text-orange-300 uppercase mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4"/> Chu kỳ bảo trì
              </label>
              <div className="relative">
                <input type="number" min="0" name="maintenanceCycle" value={formData.maintenanceCycle} onChange={handleChange} className="w-full px-4 py-2.5 pr-16 rounded-xl border border-orange-300 dark:border-orange-700 focus:ring-2 focus:ring-orange-500 outline-none font-medium bg-white dark:bg-gray-800 dark:text-white transition-all" placeholder="VD: 6" disabled={isSubmitting} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Tháng</span>
              </div>
              <p className="text-[10px] text-orange-600/80 mt-1.5 font-bold italic">* Nhập 0 nếu không yêu cầu bảo trì định kỳ.</p>
            </div>
          </div>

          <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4 mt-2">
            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4"/> Điều chuyển / Bàn giao
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  Giao cho ai?
                </label>
                <input type="text" name="assignedTo" value={formData.assignedTo} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500" placeholder="Bỏ trống nếu thu hồi về kho" disabled={isSubmitting} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500"/> Vị trí đặt
                </label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500" placeholder="VD: Phòng Kế Toán" disabled={isSubmitting} />
              </div>
            </div>
          </div>

        </form>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white sticky bottom-0 z-10">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2.5 font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Hủy bỏ
          </button>
          <button type="submit" form="editAssetForm" disabled={isSubmitting} className="px-6 py-2.5 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" /> Gửi Yêu Cầu
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditAssetModal;