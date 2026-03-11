"use client";

import React, { useState, useEffect } from "react";
import { 
  MonitorSmartphone, Barcode, Tag, DollarSign, 
  CheckCircle2, Loader2, Link as LinkIcon, Building2, 
  AlertCircle, CalendarDays, TrendingDown
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useCreateAssetMutation, 
  useGetAssetCategoriesQuery, 
  useGetDepartmentsQuery 
} from "@/state/api";

// --- COMPONENTS CỐT LÕI ---
import Modal from "@/app/(components)/Modal";
import FileDropzone from "@/app/(components)/FileDropzone";

// ==========================================
// COMPONENT: MODAL TẠO TÀI SẢN MỚI
// ==========================================
interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM_STATE = {
  assetCode: "",
  name: "",
  categoryId: "",
  departmentId: "",
  purchasePrice: "",
  depreciationMethod: "STRAIGHT_LINE",
  depreciationMonths: "12",
  imageUrl: "", 
};

export default function CreateAssetModal({ isOpen, onClose }: CreateAssetModalProps) {
  // --- STATE ---
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // --- API HOOKS ---
  const { data: categories = [], isLoading: loadingCats } = useGetAssetCategoriesQuery(undefined, { skip: !isOpen });
  const { data: departments = [], isLoading: loadingDepts } = useGetDepartmentsQuery({}, { skip: !isOpen });
  
  const [createAsset, { isLoading: isSubmitting }] = useCreateAssetMutation();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...INITIAL_FORM_STATE,
        assetCode: `TS-${Date.now().toString().slice(-6)}` 
      });
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUploadSuccess = (url: string) => {
    setFormData((prev) => ({ ...prev, imageUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assetCode || !formData.name || !formData.categoryId || !formData.purchasePrice) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc (*)");
      return;
    }

    if (Number(formData.purchasePrice) < 0) {
      toast.error("Nguyên giá tài sản không được là số âm!");
      return;
    }

    try {
      const payload = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice || 0),
        currentValue: Number(formData.purchasePrice || 0),
        depreciationMonths: Number(formData.depreciationMonths || 0),
        status: "ACTIVE", 
      };

      await createAsset(payload).unwrap();
      toast.success(`Đã ghi nhận tài sản: ${formData.name}`);
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi khi tạo tài sản mới!");
    }
  };

  // --- THIẾT KẾ FOOTER CHUẨN ---
  const modalFooter = (
    <>
      <button
        type="button" onClick={onClose} disabled={isSubmitting}
        className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        Hủy bỏ
      </button>
      <button
        type="submit" form="create-asset-form" disabled={isSubmitting}
        className="px-6 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : "Ghi nhận Tài sản"}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ghi nhận Tài sản Cố định (FA)"
      subtitle="Thêm mới tài sản vào sổ bộ Kế toán"
      icon={<MonitorSmartphone className="w-6 h-6 text-teal-500" />}
      maxWidth="max-w-5xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6">
        <form id="create-asset-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
          
          {/* CỘT TRÁI: UPLOAD HỒ SƠ/ẢNH */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div className="sticky top-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-teal-500" /> Hình ảnh / Hồ sơ đính kèm
              </h3>
              
              <FileDropzone 
                onUploadSuccess={handleUploadSuccess}
                accept="image/png, image/jpeg, image/webp, application/pdf"
                label="Kéo thả ảnh hoặc Hóa đơn mua tài sản (PDF, JPG)"
                maxSizeMB={10}
              />

              {formData.imageUrl && (
                 <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                   <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                     <CheckCircle2 className="w-4 h-4" /> Đã lưu trữ hồ sơ an toàn
                   </p>
                 </div>
              )}

              <div className="mt-6 p-4 bg-teal-50 dark:bg-teal-500/10 rounded-2xl border border-teal-100 dark:border-teal-500/20">
                <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Quy chuẩn Kế toán
                </h4>
                <ul className="text-[11px] text-teal-600 dark:text-teal-400 space-y-1.5 list-disc pl-4">
                  <li>Tài sản có giá trị lớn hơn mức quy định (VD: 30tr) mới được xếp vào TSCĐ.</li>
                  <li>Nên đính kèm bản scan Hóa đơn GTGT để phục vụ đối soát.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN CHI TIẾT */}
          <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            <div className="sm:col-span-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                1. Thông tin Tài sản
              </h3>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors">
                Mã Định Danh <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" name="assetCode" value={formData.assetCode} onChange={handleChange} required
                  placeholder="VD: LAPTOP-001"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500 outline-none uppercase transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors">
                Bộ phận quản lý / sử dụng
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  name="departmentId" value={formData.departmentId} onChange={handleChange}
                  disabled={loadingDepts}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all appearance-none"
                >
                  <option value="">-- Chưa bàn giao --</option>
                  {departments.map((d: any) => <option key={d.departmentId || d.id} value={d.departmentId || d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors">
                Tên Tài sản <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" name="name" value={formData.name} onChange={handleChange} required
                  placeholder="VD: Máy tính xách tay Macbook Pro M3 16 inch"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors">
                Nhóm Tài sản (Phân loại Kế toán) <span className="text-rose-500">*</span>
              </label>
              <select 
                name="categoryId" value={formData.categoryId} onChange={handleChange} required
                disabled={loadingCats}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              >
                <option value="">-- Chọn nhóm tài sản --</option>
                {categories.map((c: any) => <option key={c.categoryId || c.id} value={c.categoryId || c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                2. Nguyên giá & Cấu hình Khấu hao
              </h3>
            </div>

            <div className="space-y-1.5 group sm:col-span-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors">
                Nguyên giá (Giá mua) VND <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <input 
                  type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} required min="0"
                  placeholder="Nhập giá trị mua ban đầu"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors">
                Phương pháp Khấu hao
              </label>
              <div className="relative">
                <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  name="depreciationMethod" value={formData.depreciationMethod} onChange={handleChange}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all appearance-none"
                >
                  <option value="STRAIGHT_LINE">Khấu hao Đường thẳng (Đều)</option>
                  <option value="DECLINING_BALANCE">Khấu hao Giảm dần</option>
                  <option value="NONE">Không trích khấu hao</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors">
                Thời gian trích (Số tháng)
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="number" name="depreciationMonths" value={formData.depreciationMonths} onChange={handleChange} min="0"
                  placeholder="VD: 36 tháng"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
              </div>
            </div>

          </div>
        </form>
      </div>
    </Modal>
  );
}