"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, MonitorSmartphone, Barcode, Tag, DollarSign, 
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

// --- COMPONENTS ---
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
  depreciationMethod: "STRAIGHT_LINE", // Khấu hao đường thẳng (Mặc định)
  depreciationMonths: "12",
  imageUrl: "", // Link ảnh hoặc PDF hồ sơ tài sản
};

export default function CreateAssetModal({ isOpen, onClose }: CreateAssetModalProps) {
  // --- STATE ---
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // --- API HOOKS ---
  const { data: categories = [], isLoading: loadingCats } = useGetAssetCategoriesQuery(undefined, { skip: !isOpen });
  const { data: departments = [], isLoading: loadingDepts } = useGetDepartmentsQuery({}, { skip: !isOpen });
  
  const [createAsset, { isLoading: isSubmitting }] = useCreateAssetMutation();

  // Reset form khi đóng/mở
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...INITIAL_FORM_STATE,
        assetCode: `TS-${Date.now().toString().slice(-6)}` // Tự động sinh mã gợi ý
      });
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler nhận URL ảnh/file từ Dropzone
  const handleUploadSuccess = (url: string) => {
    setFormData((prev) => ({ ...prev, imageUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate cơ bản
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
        currentValue: Number(formData.purchasePrice || 0), // Lúc mới mua, giá trị hiện tại = Nguyên giá
        depreciationMonths: Number(formData.depreciationMonths || 0),
        status: "ACTIVE", // Mặc định trạng thái Đang sử dụng
      };

      await createAsset(payload).unwrap();
      toast.success(`Đã ghi nhận tài sản: ${formData.name}`);
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi khi tạo tài sản mới!");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl">
                  <MonitorSmartphone className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">Ghi nhận Tài sản Cố định (FA)</h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Thêm mới tài sản vào sổ bộ Kế toán</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                disabled={isSubmitting}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* --- BODY (SCROLLABLE) --- */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
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
                  
                  {/* Nhóm 1: Định danh */}
                  <div className="sm:col-span-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                      1. Thông tin Tài sản
                    </h3>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors">
                      Mã Định Danh (Asset Code) <span className="text-rose-500">*</span>
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

                  {/* Nhóm 2: Khấu hao */}
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

            {/* --- FOOTER --- */}
            <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-slate-800/80 flex justify-end gap-3 shrink-0">
              <button
                type="button" onClick={onClose} disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit" form="create-asset-form" disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : "Ghi nhận Tài sản"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}