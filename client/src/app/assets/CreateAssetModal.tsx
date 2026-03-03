"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Laptop, Loader2, CheckCircle2, 
  Tag, DollarSign, Settings2, Building, AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useCreateAssetMutation, 
  useGetAssetCategoriesQuery,
  useGetDepartmentsQuery
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL TẠO MỚI TÀI SẢN
// ==========================================
interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateAssetModal({ isOpen, onClose }: CreateAssetModalProps) {
  // --- API HOOKS ---
  const { data: categories, isLoading: loadingCategories } = useGetAssetCategoriesQuery();
  const { data: departments, isLoading: loadingDepartments } = useGetDepartmentsQuery({});
  const [createAsset, { isLoading: isSubmitting }] = useCreateAssetMutation();

  // --- LOCAL STATE (FORM DATA) ---
  const [formData, setFormData] = useState({
    assetCode: "",
    name: "",
    categoryId: "",
    departmentId: "", 
    purchasePrice: "",
    depreciationMethod: "STRAIGHT_LINE",
    depreciationMonths: "", 
    maintenanceCycleMonths: "", 
  });

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        assetCode: "",
        name: "",
        categoryId: "",
        departmentId: "",
        purchasePrice: "",
        depreciationMethod: "STRAIGHT_LINE",
        depreciationMonths: "",
        maintenanceCycleMonths: "",
      });
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate cơ bản
    if (!formData.name || !formData.assetCode || !formData.categoryId || !formData.purchasePrice) {
      toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }

    try {
      // ✅ CÁCH FIX TYPE SCRIPT THẦN THÁNH: Conditional Object Spreading
      // Tuyệt đối không dùng 'delete'. Nếu có dữ liệu thì chèn key đó vào, không thì bỏ qua.
      const payload = {
        assetCode: formData.assetCode,
        name: formData.name,
        categoryId: formData.categoryId,
        purchasePrice: Number(formData.purchasePrice),
        currentValue: Number(formData.purchasePrice), // Lúc mới mua, Giá trị còn lại = Nguyên giá
        depreciationMethod: formData.depreciationMethod,
        status: "ACTIVE", // Mặc định trạng thái Sẵn sàng sử dụng
        
        // Các trường tùy chọn (Optional)
        ...(formData.departmentId ? { departmentId: formData.departmentId } : {}),
        ...(formData.depreciationMethod !== "NONE" && formData.depreciationMonths ? { depreciationMonths: Number(formData.depreciationMonths) } : {}),
        ...(formData.maintenanceCycleMonths ? { maintenanceCycleMonths: Number(formData.maintenanceCycleMonths) } : {})
      };

      await createAsset(payload).unwrap();
      
      toast.success("Đã ghi nhận Tài sản mới vào hệ thống!");
      onClose(); 
    } catch (error: any) {
      console.error("Lỗi tạo tài sản:", error);
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi tạo tài sản!");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
        >
          {/* Khóa click ra ngoài khi đang submit API */}
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-3xl glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col max-h-[95vh] sm:max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Laptop className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Thêm Tài sản Mới</h2>
                  <p className="text-xs text-slate-500 font-medium">Đăng ký thiết bị, máy móc vào sổ tài sản công ty</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                disabled={isSubmitting} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              <form id="create-asset-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
                
                {/* 1. THÔNG TIN CƠ BẢN */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-500" /> Thông tin Định danh
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tên tài sản <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        placeholder="VD: Máy in Canon 2900" 
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mã tài sản (Mã dán thẻ) <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        name="assetCode" 
                        value={formData.assetCode} 
                        onChange={handleChange} 
                        placeholder="VD: TS-VP-001" 
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white uppercase" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nhóm / Phân loại <span className="text-rose-500">*</span></label>
                      <select 
                        name="categoryId" 
                        value={formData.categoryId} 
                        onChange={handleChange} 
                        disabled={loadingCategories} 
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white disabled:opacity-50"
                      >
                        <option value="">-- Chọn phân loại --</option>
                        {categories?.map(c => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-400" /> Vị trí / Phòng ban (Tùy chọn)
                      </label>
                      <select 
                        name="departmentId" 
                        value={formData.departmentId} 
                        onChange={handleChange} 
                        disabled={loadingDepartments} 
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white disabled:opacity-50"
                      >
                        <option value="">-- Kho lưu trữ chung --</option>
                        {departments?.map(d => <option key={d.departmentId} value={d.departmentId}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. THÔNG TIN TÀI CHÍNH & KHẤU HAO */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Tài chính & Khấu hao
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nguyên giá (VND) <span className="text-rose-500">*</span></label>
                      <input 
                        type="number" 
                        name="purchasePrice" 
                        value={formData.purchasePrice} 
                        onChange={handleChange} 
                        placeholder="VD: 35000000" 
                        min="0"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phương pháp Khấu hao</label>
                      <select 
                        name="depreciationMethod" 
                        value={formData.depreciationMethod} 
                        onChange={handleChange} 
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                      >
                        <option value="STRAIGHT_LINE">Đường thẳng (Straight Line)</option>
                        <option value="REDUCING_BALANCE">Số dư giảm dần (Reducing Balance)</option>
                        <option value="NONE">Không khấu hao</option>
                      </select>
                    </div>

                    {/* Hiệu ứng ẩn hiện ô nhập Tháng Khấu Hao */}
                    <AnimatePresence>
                      {formData.depreciationMethod !== "NONE" && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }} 
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5 overflow-hidden sm:col-span-2"
                        >
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Thời gian Khấu hao (Tháng) <span className="text-rose-500">*</span></label>
                          <input 
                            type="number" 
                            name="depreciationMonths" 
                            value={formData.depreciationMonths} 
                            onChange={handleChange} 
                            placeholder="VD: 36 (Tương đương 3 năm)" 
                            min="1"
                            className="w-full md:w-1/2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white" 
                          />
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-emerald-500" /> Hệ thống sẽ tự động trừ dần giá trị vào mỗi kỳ chạy lệnh Khấu hao.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 3. BẢO TRÌ */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-amber-500" /> Lịch Bảo trì
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chu kỳ Bảo trì (Tháng)</label>
                      <input 
                        type="number" 
                        name="maintenanceCycleMonths" 
                        value={formData.maintenanceCycleMonths} 
                        onChange={handleChange} 
                        placeholder="VD: 6 (Bảo trì 6 tháng/lần)" 
                        min="1"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white" 
                      />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isSubmitting} 
                className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                form="create-asset-form" 
                disabled={isSubmitting} 
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Ghi nhận Tài sản</>
                )}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}