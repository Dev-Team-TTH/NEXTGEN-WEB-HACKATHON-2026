"use client";
import React, { useState, FormEvent } from "react";
import { X, Briefcase, MapPin, Building2, Tag } from "lucide-react";
import { useGetWarehousesQuery } from "@/state/api"; // Import hook lấy chi nhánh

const CreateAssetModal = ({ isOpen, onClose, onCreate, isLoading }: any) => {
  const { data: warehouses } = useGetWarehousesQuery(); // Lấy danh sách chi nhánh
  
  const [formData, setFormData] = useState({
    name: "", category: "Thiết bị", purchaseDate: "", purchasePrice: "", status: "ACTIVE", warehouseId: ""
  });

  if (!isOpen) return null;

  const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  const inputClass = "w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1 uppercase";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-teal-600 border-b">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Briefcase className="w-5 h-5" /> Ghi Nhận Tài Sản Mới</h2>
          <button onClick={onClose} className="text-teal-100 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-5">
          <div className="col-span-2">
            <label className={labelClass}>Tên Tài Sản <span className="text-red-500">*</span></label>
            <input type="text" name="name" required onChange={handleChange} className={`${inputClass} !pl-4`} placeholder="VD: Xe nâng Komatsu, Laptop Dell..." />
          </div>

          <div>
            <label className={labelClass}>Loại tài sản</label>
            <select name="category" onChange={handleChange} className={`${inputClass} !pl-4`}>
              <option value="Thiết bị">Thiết bị máy móc</option>
              <option value="Điện tử">Đồ điện tử / IT</option>
              <option value="Phương tiện">Phương tiện vận tải</option>
              <option value="Nội thất">Nội thất văn phòng</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Chi nhánh cấp phát</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center"><Building2 className="h-4 w-4 text-gray-400" /></div>
              <select name="warehouseId" onChange={handleChange} className={inputClass}>
                <option value="">-- Thuộc Tổng Công ty --</option>
                {warehouses?.map(wh => <option key={wh.warehouseId} value={wh.warehouseId}>{wh.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Ngày mua <span className="text-red-500">*</span></label>
            <input type="date" name="purchaseDate" required onChange={handleChange} className={`${inputClass} !pl-4`} />
          </div>

          <div>
            <label className={labelClass}>Giá trị mua (VNĐ) <span className="text-red-500">*</span></label>
            <input type="number" name="purchasePrice" required onChange={handleChange} className={`${inputClass} !pl-4`} placeholder="0" />
          </div>

          <div className="col-span-2 mt-4 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2 font-bold bg-gray-100 rounded-xl">Hủy</button>
            <button type="submit" disabled={isLoading} className="px-6 py-2 font-bold text-white bg-teal-600 rounded-xl">Lưu Tài Sản</button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateAssetModal;