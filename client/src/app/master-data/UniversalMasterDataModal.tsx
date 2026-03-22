"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Save, Database } from "lucide-react";
import Modal from "@/app/(components)/Modal";

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
    
    // 🚀 TỐI ƯU KIỂU DỮ LIỆU (TYPE-SAFETY CHO PRISMA BACKEND)
    if (type === "number") {
      finalValue = value === "" ? "" : Number(value);
    } 
    // Nếu là trường Select và User chọn tùy chọn "Trống", ép về null để Prisma không báo lỗi UUID
    else if (tagName === "SELECT" && value === "") {
      finalValue = null;
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🚀 BƯỚC LÀM SẠCH DATA TRƯỚC KHI GỬI (DATA SANITIZATION)
    const cleanedData = { ...formData };
    fields.forEach(f => {
      // Nếu trường không bắt buộc và đang là chuỗi rỗng, chuyển thành null
      if (!f.required && (cleanedData[f.name] === "" || cleanedData[f.name] === undefined)) {
        cleanedData[f.name] = null;
      }
    });

    await onSave(cleanedData);
  };

  const renderField = (field: MasterDataField) => {
    const commonClasses = "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm";
    
    switch (field.type) {
      case "textarea":
        return <textarea name={field.name} required={field.required} value={formData[field.name] ?? ""} onChange={handleChange} placeholder={field.placeholder} rows={3} className={`${commonClasses} resize-none`} />;
      case "select":
        return (
          <select name={field.name} required={field.required} value={formData[field.name] ?? ""} onChange={handleChange} className={`${commonClasses} cursor-pointer appearance-none`}>
            {/* 🚀 THÔNG MINH HÓA DROPDOWN: Cho phép chọn lại tùy chọn rỗng nếu trường không bắt buộc */}
            <option value="" disabled={field.required} className="text-slate-400">
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
    <>
      <button type="button" onClick={onClose} disabled={isSaving} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
        Hủy bỏ
      </button>
      <button form="dynamic-master-data-form" type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Ghi nhận Dữ liệu
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} icon={<Database className="w-6 h-6 text-blue-500" />} maxWidth="max-w-2xl" disableOutsideClick={isSaving} footer={modalFooter}
    >
      <form id="dynamic-master-data-form" onSubmit={handleSubmit} className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {fields.map((field) => (
          <div key={field.name} className={`space-y-1.5 group ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors">
              {field.label} {field.required && <span className="text-rose-500">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
        
        <div className="sm:col-span-2 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-white/5 mt-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Trạng thái Hoạt động</span>
          <button type="button" onClick={() => setFormData(prev => ({ ...prev, isActive: prev.isActive === false ? true : false }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isActive !== false ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${formData.isActive !== false ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
      </form>
    </Modal>
  );
}