"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { X, Building2, MapPin } from "lucide-react";

interface EditWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (payload: { id: string; data: any }) => void;
  isLoading: boolean;
  currentWarehouse: any;
}

const EditWarehouseModal = ({ isOpen, onClose, onUpdate, isLoading, currentWarehouse }: EditWarehouseModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
  });

  // Tự động điền dữ liệu của chi nhánh đang chọn vào Form
  useEffect(() => {
    if (currentWarehouse) {
      setFormData({
        name: currentWarehouse.name || "",
        address: currentWarehouse.address || "",
      });
    }
  }, [currentWarehouse]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onUpdate({ id: currentWarehouse.warehouseId, data: formData });
  };

  const inputClass = "w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm font-medium transition-all";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-blue-600 border-b">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Cập Nhật Chi Nhánh
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 text-blue-100 hover:text-white hover:bg-blue-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            <div>
              <label className={labelClass}>
                Tên Chi Nhánh <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  value={formData.name} 
                  onChange={handleChange} 
                  className={inputClass} 
                  placeholder="VD: Chi nhánh Miền Nam..."
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Địa chỉ</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  className={inputClass} 
                  placeholder="Nhập địa chỉ cụ thể..."
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all disabled:opacity-70"
            >
              {isLoading ? "Đang lưu..." : "Lưu Thay Đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditWarehouseModal;