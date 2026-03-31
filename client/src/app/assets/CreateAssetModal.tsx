"use client";

import React, { useState, useEffect } from "react";
import { 
  MonitorSmartphone, Barcode, Tag, DollarSign, 
  CheckCircle2, Loader2, Link as LinkIcon, Building2, 
  AlertCircle, CalendarDays, TrendingDown, Wallet, Lock
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG CONTEXT CHI NHÁNH
import { 
  useCreateAssetMutation, 
  useGetAssetCategoriesQuery, 
  useGetDepartmentsQuery,
  useGetFiscalPeriodsQuery, 
  useGetAccountsQuery       
} from "@/state/api";

import Modal from "@/app/(components)/Modal";
import FileDropzone from "@/app/(components)/FileDropzone";
import { safeRound } from "@/utils/formatters"; // 🚀 BỔ SUNG: Khử sai số
import { cn } from "@/utils/helpers";

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
  fiscalPeriodId: "",  
  paymentAccountId: "" 
};

export default function CreateAssetModal({ isOpen, onClose }: CreateAssetModalProps) {
  // 🚀 BỐI CẢNH REDUX (CONTEXT ISOLATION)
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // 👉 FETCH DATA TỪ API THẬT
  const { data: categories = [], isLoading: loadingCats } = useGetAssetCategoriesQuery(
    { branchId: activeBranchId } as any, 
    { skip: !isOpen || !activeBranchId }
  );
  
  const { data: departments = [], isLoading: loadingDepts } = useGetDepartmentsQuery(
    { branchId: activeBranchId } as any, 
    { skip: !isOpen || !activeBranchId }
  );
  
  const { data: periods = [], isLoading: loadingPeriods } = useGetFiscalPeriodsQuery(undefined, { skip: !isOpen });
  
  const { data: accounts = [], isLoading: loadingAccounts } = useGetAccountsQuery(
    { isActive: 'true', branchId: activeBranchId } as any, 
    { skip: !isOpen || !activeBranchId }
  );
  
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
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      // 🚀 LOGIC KẾ TOÁN: Nếu chọn KHÔNG KHẤU HAO, tự động ép Số tháng về 0
      if (name === "depreciationMethod" && value === "NONE") {
        newData.depreciationMonths = "0";
      }
      return newData;
    });
  };

  const handleUploadSuccess = (url: string) => {
    setFormData((prev) => ({ ...prev, imageUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeBranchId) return toast.error("Không tìm thấy Chi nhánh. Vui lòng F5!");

    if (!formData.assetCode || !formData.name || !formData.categoryId || !formData.purchasePrice || !formData.fiscalPeriodId || !formData.paymentAccountId) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc (*), bao gồm cả thông tin hạch toán!");
      return;
    }

    const priceNum = Number(formData.purchasePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Nguyên giá tài sản không hợp lệ (không được âm)!");
      return;
    }

    // 🚀 BẢO VỆ DỮ LIỆU KHẤU HAO
    const method = formData.depreciationMethod;
    const months = method === "NONE" ? 0 : Number(formData.depreciationMonths || 0);

    if (method !== "NONE" && months <= 0) {
      toast.error("Vui lòng nhập Thời gian trích (Số tháng) lớn hơn 0 đối với phương pháp này!");
      return;
    }

    try {
      const payload = {
        ...formData,
        branchId: activeBranchId, 
        purchasePrice: safeRound(priceNum), // 🚀 SAFEROUND: Chống sai số Float
        currentValue: safeRound(priceNum),  // 🚀 SAFEROUND
        depreciationMonths: months,         // 🚀 Gửi giá trị đã làm sạch
        status: "AVAILABLE", 
      };

      await createAsset(payload).unwrap();
      toast.success(`Đã ghi nhận tài sản và hạch toán Sổ cái: ${formData.name}`);
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi khi tạo tài sản mới!");
    }
  };

  const modalFooter = (
    <div className="flex w-full justify-end gap-3 transition-colors duration-500">
      <button
        type="button" onClick={onClose} disabled={isSubmitting}
        className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-500 disabled:opacity-50"
      >
        Hủy bỏ
      </button>
      <button
        type="submit" form="create-asset-form" disabled={isSubmitting}
        className="px-6 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-500/30 transition-all duration-500 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : "Ghi nhận Tài sản"}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen} onClose={onClose}
      title="Ghi nhận Tài sản Cố định (FA)"
      subtitle="Thêm mới tài sản vào sổ bộ và tự động hạch toán Sổ cái Kế toán"
      icon={<MonitorSmartphone className="w-6 h-6 text-teal-500 transition-colors duration-500" />}
      maxWidth="max-w-5xl" disableOutsideClick={isSubmitting} footer={modalFooter}
    >
      <div className="p-6 transition-colors duration-500">
        <form id="create-asset-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8 transition-colors duration-500">
          
          <div className="w-full md:w-1/3 flex flex-col gap-4 transition-colors duration-500">
            <div className="sticky top-0 transition-colors duration-500">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2 transition-colors duration-500">
                <LinkIcon className="w-4 h-4 text-teal-500 transition-colors duration-500" /> Hình ảnh / Hồ sơ đính kèm
              </h3>
              <FileDropzone 
                onUploadSuccess={handleUploadSuccess} accept="image/png, image/jpeg, image/webp, application/pdf"
                label="Kéo thả ảnh hoặc Hóa đơn mua tài sản (PDF, JPG)" maxSizeMB={10}
              />
              {formData.imageUrl && (
                 <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20 transition-colors duration-500 shadow-sm">
                   <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 transition-colors duration-500"><CheckCircle2 className="w-4 h-4" /> Đã lưu trữ hồ sơ an toàn</p>
                 </div>
              )}
              <div className="mt-6 p-4 bg-teal-50 dark:bg-teal-500/10 rounded-2xl border border-teal-100 dark:border-teal-500/20 transition-colors duration-500 shadow-sm">
                <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 mb-2 flex items-center gap-1.5 transition-colors duration-500"><AlertCircle className="w-4 h-4" /> Quy chuẩn Kế toán</h4>
                <ul className="text-[11px] text-teal-600 dark:text-teal-400 space-y-1.5 list-disc pl-4 transition-colors duration-500 font-medium">
                  <li>Tài sản có giá trị lớn hơn mức quy định (VD: 30tr) mới được xếp vào TSCĐ.</li>
                  <li>Hệ thống sẽ <b className="font-bold">tự động ghi sổ (Auto-GL)</b> tăng tài sản và giảm tiền/tăng công nợ.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-5 transition-colors duration-500">
            <div className="sm:col-span-2 transition-colors duration-500">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2 transition-colors duration-500">1. Thông tin Tài sản</h3>
            </div>

            <div className="space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors duration-500">
                Mã Định Danh <span className="text-rose-500">*</span>
              </label>
              <div className="relative transition-colors duration-500">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-500" />
                <input 
                  type="text" name="assetCode" value={formData.assetCode} onChange={handleChange} required
                  placeholder="VD: LAPTOP-001"
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500 outline-none uppercase transition-all duration-500 shadow-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors duration-500">
                Bộ phận quản lý / sử dụng
              </label>
              <div className="relative transition-colors duration-500">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-500" />
                <select 
                  name="departmentId" value={formData.departmentId} onChange={handleChange} disabled={loadingDepts}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-500 shadow-sm cursor-pointer text-slate-900 dark:text-white"
                >
                  <option value="">-- Kho lưu trữ tạm (Chưa bàn giao) --</option>
                  {departments.map((d: any) => <option key={d.departmentId || d.id} value={d.departmentId || d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors duration-500">
                Tên Tài sản <span className="text-rose-500">*</span>
              </label>
              <div className="relative transition-colors duration-500">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-500" />
                <input 
                  type="text" name="name" value={formData.name} onChange={handleChange} required
                  placeholder="VD: Máy tính xách tay Macbook Pro M3 16 inch"
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-500 shadow-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors duration-500">
                Nhóm Tài sản (Xác định TK Nợ) <span className="text-rose-500">*</span>
              </label>
              <select 
                name="categoryId" value={formData.categoryId} onChange={handleChange} required disabled={loadingCats}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-500 shadow-sm cursor-pointer text-slate-900 dark:text-white"
              >
                <option value="">-- Chọn nhóm tài sản --</option>
                {categories.map((c: any) => <option key={c.categoryId || c.id} value={c.categoryId || c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2 mt-2 transition-colors duration-500">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2 transition-colors duration-500">2. Hạch toán Kế toán & Khấu hao</h3>
            </div>

            <div className="space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors duration-500">
                Kỳ Kế Toán Ghi Sổ <span className="text-rose-500">*</span>
              </label>
              <div className="relative transition-colors duration-500">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-500" />
                <select 
                  name="fiscalPeriodId" value={formData.fiscalPeriodId} onChange={handleChange} required disabled={loadingPeriods}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-500 shadow-sm cursor-pointer text-slate-900 dark:text-white"
                >
                  <option value="">-- Chọn Kỳ Hạch Toán --</option>
                  {periods.map((p: any) => (
                    <option key={p.periodId} value={p.periodId} disabled={p.isClosed || p.status === "CLOSED"}>{p.periodName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors duration-500">
                Nguồn Tiền (Ghi Có) <span className="text-rose-500">*</span>
              </label>
              <div className="relative transition-colors duration-500">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-500" />
                <select 
                  name="paymentAccountId" value={formData.paymentAccountId} onChange={handleChange} required disabled={loadingAccounts}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-500 shadow-sm cursor-pointer text-slate-900 dark:text-white"
                >
                  <option value="">-- Tiền mặt / Ngân hàng (111/112) --</option>
                  {accounts.filter((a: any) => a.accountCode.startsWith("111") || a.accountCode.startsWith("112") || a.accountCode.startsWith("331")).map((acc: any) => (
                    <option key={acc.accountId} value={acc.accountId}>{acc.accountCode} - {acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 group sm:col-span-2 transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors duration-500">
                Nguyên giá (Giá mua) VND <span className="text-rose-500">*</span>
              </label>
              <div className="relative transition-colors duration-500">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 transition-colors duration-500" />
                <input 
                  type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} required min="0"
                  placeholder="Nhập giá trị mua ban đầu"
                  className="w-full pl-10 pr-4 py-3 bg-emerald-50/50 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-700/50 rounded-xl text-xl font-black text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none transition-all duration-500 shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500 transition-colors duration-500">Phương pháp Khấu hao</label>
              <div className="relative transition-colors duration-500">
                <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-500" />
                <select 
                  name="depreciationMethod" value={formData.depreciationMethod} onChange={handleChange}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-500 shadow-sm cursor-pointer text-slate-900 dark:text-white"
                >
                  <option value="STRAIGHT_LINE">Khấu hao Đường thẳng (Đều)</option>
                  <option value="DECLINING_BALANCE">Khấu hao Giảm dần</option>
                  <option value="NONE">Không trích khấu hao</option>
                </select>
              </div>
            </div>

            {/* 🚀 LÁ CHẮN BẢO VỆ: Khóa input Số tháng nếu chọn KHÔNG KHẤU HAO */}
            <div className="space-y-1.5 group transition-colors duration-500">
              <label className={cn("text-xs font-bold uppercase transition-colors duration-500 flex items-center gap-1.5", formData.depreciationMethod === "NONE" ? "text-slate-400" : "text-slate-600 dark:text-slate-400 group-focus-within:text-teal-500")}>
                Thời gian trích (Số tháng) {formData.depreciationMethod === "NONE" && <Lock className="w-3 h-3 text-rose-500"/>}
              </label>
              <div className="relative transition-colors duration-500">
                <CalendarDays className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-500", formData.depreciationMethod === "NONE" ? "text-slate-300 dark:text-slate-700" : "text-slate-400")} />
                <input 
                  type="number" name="depreciationMonths" value={formData.depreciationMonths} onChange={handleChange} min="0"
                  placeholder="VD: 36 tháng" disabled={formData.depreciationMethod === "NONE"}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-500 shadow-sm text-slate-900 dark:text-white disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>
            </div>

          </div>
        </form>
      </div>
    </Modal>
  );
}