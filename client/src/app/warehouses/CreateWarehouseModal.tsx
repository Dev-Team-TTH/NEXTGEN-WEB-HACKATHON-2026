"use client";
import React, { useState, FormEvent } from "react";
import { X, Building2, MapPin } from "lucide-react";

const CreateWarehouseModal = ({ isOpen, onClose, onCreate, isLoading }: any) => {
  const [formData, setFormData] = useState({ name: "", address: "" });
  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  const inputClass = "w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm font-medium";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 bg-blue-600 border-b">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Mở Chi Nhánh Kho Mới
          </h2>
          <button onClick={onClose} className="p-1.5 text-blue-100 hover:text-white rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Tên Chi Nhánh / Kho <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Building2 className="h-4 w-4 text-gray-400" /></div>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="VD: Kho Miền Nam" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Địa chỉ vật lý</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin className="h-4 w-4 text-gray-400" /></div>
              <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className={inputClass} placeholder="VD: Khu Công Nghệ Cao..." />
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Hủy</button>
            <button type="submit" disabled={isLoading} className="px-6 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-70">
              {isLoading ? "Đang tạo..." : "Xác nhận Mở Kho"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWarehouseModal;