"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { X, UserCheck, Phone, MapPin, Shield, Building2 } from "lucide-react";

const EditUserModal = ({ isOpen, onClose, onUpdate, isLoading, currentUser }: any) => {
  
  const [formData, setFormData] = useState({
    name: "", phone: "", address: "", role: "STAFF"
  });

  // Tự động điền dữ liệu cũ khi mở Modal
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        phone: currentUser.phone || "",
        address: currentUser.address || "",
        role: currentUser.role || "STAFF",
      });
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onUpdate({ id: currentUser.userId, data: formData });
  };

  const inputClass = "w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm font-medium";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 bg-orange-500 border-b">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5" /> Cập Nhật Thông Tin Nhân Viên
          </h2>
          <button onClick={onClose} className="p-1.5 text-orange-100 hover:text-white hover:bg-orange-600 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className={labelClass}>Họ và Tên <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserCheck className="h-4 w-4 text-gray-400" /></div>
                <input type="text" name="name" required value={formData.name} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Số điện thoại</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-gray-400" /></div>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Địa chỉ</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin className="h-4 w-4 text-gray-400" /></div>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-gray-100 md:col-span-2 grid grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Vai trò (Phân quyền) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Shield className="h-4 w-4 text-gray-400" /></div>
                  <select name="role" value={formData.role} onChange={handleChange} className={`${inputClass} cursor-pointer font-bold text-gray-700`}>
                    <option value="ADMIN">ADMIN - Tổng công ty</option>
                    <option value="MANAGER">MANAGER - Quản lý Chi nhánh</option>
                    <option value="STAFF">STAFF - Thủ kho</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Hủy</button>
            <button type="submit" disabled={isLoading} className="px-6 py-2.5 font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-md transition-all disabled:opacity-70">
              {isLoading ? "Đang lưu..." : "Lưu Thay Đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;