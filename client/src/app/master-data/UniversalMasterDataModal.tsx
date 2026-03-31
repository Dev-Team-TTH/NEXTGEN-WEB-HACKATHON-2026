"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Save, Database } from "lucide-react";
import Modal from "@/app/(components)/Modal";
import { cn } from "@/utils/helpers"; 

export interface MasterDataField {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "tel" | "select" | "textarea";
  required?: boolean;
  options?: { label: string; value: string | number }[]; 
  placeholder?: string;
}

interface UniversalMasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  fields: MasterDataField[];
  initialData?: any;
  onSave: (data: any) => Promise<void>;
  isSaving: boolean;
}

export default function UniversalMasterDataModal({
  isOpen, onClose, title, subtitle, fields, initialData, onSave, isSaving
}: UniversalMasterDataModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        const emptyForm: Record<string, any> = {};
        fields.forEach(f => emptyForm[f.name] = f.type === "number" ? "" : "");
        emptyForm.isActive = true; 
        setFormData(emptyForm);
      }
    }
  }, [isOpen, initialData, fields]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, tagName } = e.target;
    let finalValue: any = value;
    
    // 🚀 TỐI ƯU KIỂU DỮ LIỆU: Bắt chặt số liệu và xử lý chuỗi rỗng an toàn
    if (type === "number") {
      finalValue = value === "" ? "" : Number(value);
    } 
    // Đảm bảo các trường Select không bắt buộc được trả về chuỗi rỗng để Filter tiếp ở Submit
    else if (tagName === "SELECT" && value === "") {
      finalValue = "";
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🚀 ENGINE LÀM SẠCH DỮ LIỆU (DATA SANITIZATION ENGINE)
    const cleanedData = { ...formData };
    
    fields.forEach(f => {
      // 1. Quét sạch chuỗi rỗng của các trường không bắt buộc (chuyển thành null để Prisma không crash Foreign Key)
      if (!f.required && (cleanedData[f.name] === "" || cleanedData[f.name] === undefined)) {
        cleanedData[f.name] = null;
      }
      
      // 2. Đảm bảo số luôn là Number (tránh dính text do copy-paste)
      if (f.type === "number" && cleanedData[f.name] !== null) {
         cleanedData[f.name] = Number(cleanedData[f.name]) || 0;
      }
    });

    // 3. Đảm bảo isActive luôn là Boolean
    cleanedData.isActive = cleanedData.isActive !== false;

    await onSave(cleanedData);
  };

  const renderField = (field: MasterDataField) => {
    const commonClasses = "w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors duration-500 shadow-sm";
    
    switch (field.type) {
      case "textarea":
        return <textarea name={field.name} required={field.required} value={formData[field.name] ?? ""} onChange={handleChange} placeholder={field.placeholder} rows={3} className={`${commonClasses} resize-none`} />;
      case "select":
        return (
          <select name={field.name} required={field.required} value={formData[field.name] ?? ""} onChange={handleChange} className={`${commonClasses} cursor-pointer appearance-none`}>
            {/* 🚀 THÔNG MINH HÓA DROPDOWN */}
            <option value="" disabled={field.required} className="text-slate-400 dark:text-slate-500">
              {field.required ? "-- Vui lòng chọn dữ liệu --" : "-- Trống (Không bắt buộc) --"}
            </option>
            {field.options?.map((opt, idx) => (
              <option key={`${opt.value}-${idx}`} value={opt.value} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        );
      default:
        return <input type={field.type} step={field.type === "number" ? "any" : undefined} name={field.name} required={field.required} value={formData[field.name] ?? ""} onChange={handleChange} placeholder={field.placeholder} className={commonClasses} />;
    }
  };

  const modalFooter = (
    <div className="flex justify-end gap-3 w-full transition-colors duration-500">
      <button type="button" onClick={onClose} disabled={isSaving} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors duration-500 disabled:opacity-50 shadow-sm">
        Hủy bỏ
      </button>
      <button form="dynamic-master-data-form" type="submit" disabled={isSaving} className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-500 active:scale-95 disabled:opacity-50">
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin transition-colors duration-500" /> : <Save className="w-4 h-4 transition-colors duration-500" />} Ghi nhận Dữ liệu
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} icon={<Database className="w-6 h-6 text-blue-500 transition-colors duration-500" />} maxWidth="max-w-2xl" disableOutsideClick={isSaving} footer={modalFooter}
    >
      <form id="dynamic-master-data-form" onSubmit={handleSubmit} className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-5 transition-colors duration-500 bg-slate-50/50 dark:bg-transparent">
        {fields.map((field) => (
          <div key={field.name} className={`space-y-1.5 group ${field.type === "textarea" ? "sm:col-span-2" : ""} transition-colors duration-500`}>
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors duration-500">
              {field.label} {field.required && <span className="text-rose-500 transition-colors duration-500">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
        
        <div className="sm:col-span-2 flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 mt-2 transition-colors duration-500 shadow-sm">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors duration-500">Trạng thái Hoạt động</span>
          <button type="button" onClick={() => setFormData(prev => ({ ...prev, isActive: prev.isActive === false ? true : false }))} className={cn("relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 shadow-inner", formData.isActive !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')}>
            <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300", formData.isActive !== false ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>
      </form>
    </Modal>
  );
}