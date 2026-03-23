"use client";

import React, { useState, useEffect } from "react";
import { 
  Receipt, CalendarDays, FileText, Wallet, 
  CreditCard, Link as LinkIcon, CheckCircle2, 
  Loader2, AlertCircle, Building2, Hash, DollarSign
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux";
import { 
  useCreateExpenseMutation, 
  useGetAccountsQuery, 
  useGetCostCentersQuery,
  useGetFiscalPeriodsQuery // 🚀 Lấy kỳ kế toán để ràng buộc sổ cái
} from "@/state/api";

// --- COMPONENTS CỐT LÕI ---
import Modal from "@/app/(components)/Modal";
import FileDropzone from "@/app/(components)/FileDropzone";

const getTodayInputFormat = () => new Date().toISOString().split('T')[0];

// ==========================================
// COMPONENT: MODAL TẠO CHỨNG TỪ CHI PHÍ
// ==========================================
interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateExpenseModal({ isOpen, onClose }: CreateExpenseModalProps) {
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- STATE ---
  const [formData, setFormData] = useState({
    entryDate: getTodayInputFormat(),
    fiscalPeriodId: "", // 🚀 Quản lý trạng thái kỳ kế toán
    reference: "",
    description: "",
    amount: "",
    expenseAccountId: "",
    paymentAccountId: "",
    costCenterId: "",
    attachmentUrl: "", 
  });

  // --- API HOOKS ---
  const { data: accounts = [], isLoading: loadingAccounts } = useGetAccountsQuery({ isActive: 'true' }, { skip: !isOpen });
  const { data: costCenters = [], isLoading: loadingCostCenters } = useGetCostCentersQuery(undefined, { skip: !isOpen });
  const { data: periods = [], isLoading: loadingPeriods } = useGetFiscalPeriodsQuery(undefined, { skip: !isOpen });
  
  const [createExpense, { isLoading: isSubmitting }] = useCreateExpenseMutation();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        entryDate: getTodayInputFormat(),
        fiscalPeriodId: "",
        reference: `PC-${Date.now().toString().slice(-6)}`,
        description: "",
        amount: "",
        expenseAccountId: "",
        paymentAccountId: "",
        costCenterId: "",
        attachmentUrl: "",
      });
    }
  }, [isOpen]);

  const expenseAccounts = accounts.filter(acc => acc.accountType === "EXPENSE");
  const paymentAccounts = accounts.filter(acc => acc.accountType === "ASSET" && (acc.accountCode.startsWith("111") || acc.accountCode.startsWith("112")));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUploadSuccess = (url: string) => {
    setFormData((prev) => ({ ...prev, attachmentUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeBranchId) {
      toast.error("Không tìm thấy Chi nhánh. Vui lòng F5 lại trang!");
      return;
    }

    if (!formData.fiscalPeriodId) {
      toast.error("Vui lòng chọn Kỳ Kế toán để ghi sổ chi phí!");
      return;
    }

    if (!formData.expenseAccountId || !formData.paymentAccountId || !formData.amount || !formData.entryDate) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc (*)");
      return;
    }

    if (Number(formData.amount) <= 0) {
      toast.error("Số tiền chi phải lớn hơn 0!");
      return;
    }

    try {
      const payload: any = {
        branchId: activeBranchId,
        fiscalPeriodId: formData.fiscalPeriodId, // 🚀 Gửi kèm kỳ kế toán
        entryDate: new Date(formData.entryDate).toISOString(),
        reference: formData.reference,
        description: formData.description || `Chi phí nội bộ: ${formData.reference}`,
        postingStatus: "DRAFT", 
        attachmentUrl: formData.attachmentUrl, 
        lines: [
          {
            accountId: formData.expenseAccountId,
            costCenterId: formData.costCenterId || null,
            debit: Number(formData.amount),
            credit: 0,
            description: formData.description
          },
          {
            accountId: formData.paymentAccountId,
            costCenterId: null,
            debit: 0,
            credit: Number(formData.amount),
            description: `Thanh toán: ${formData.description}`
          }
        ]
      };

      await createExpense(payload).unwrap();
      toast.success(`Đã lập Phiếu chi: ${formData.reference}`);
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi khi tạo chứng từ chi phí!");
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
        type="submit" form="create-expense-form" disabled={isSubmitting}
        className="px-6 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</> : "Lập Phiếu Chi"}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lập Chứng Từ Chi Phí (Payment Voucher)"
      subtitle="Ghi nhận các khoản chi tiêu nội bộ, dịch vụ mua ngoài"
      icon={<Wallet className="w-6 h-6 text-rose-500" />}
      maxWidth="max-w-5xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6">
        <form id="create-expense-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
          
          {/* CỘT TRÁI: UPLOAD HÓA ĐƠN / BIÊN LAI */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div className="sticky top-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-rose-500" /> Hóa đơn / Chứng từ gốc
              </h3>
              
              <FileDropzone 
                onUploadSuccess={handleUploadSuccess}
                accept="image/png, image/jpeg, application/pdf"
                label="Kéo thả Hóa đơn VAT, Biên lai (PDF, JPG)"
                maxSizeMB={5}
              />

              {formData.attachmentUrl && (
                 <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                   <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                     <CheckCircle2 className="w-4 h-4" /> Đã đính kèm chứng từ hợp lệ
                   </p>
                 </div>
              )}

              <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Lưu ý Kế toán
                </h4>
                <ul className="text-[11px] text-rose-600 dark:text-rose-400 space-y-1.5 list-disc pl-4">
                  <li>Mọi khoản chi trên 200,000 VND đều bắt buộc phải có hóa đơn đỏ / chứng từ hợp lệ đính kèm.</li>
                  <li>Hệ thống sẽ tự động hạch toán vào sổ Nhật ký chung ở trạng thái Nháp (DRAFT).</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN GIAO DỊCH */}
          <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            <div className="sm:col-span-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                1. Thông tin Chứng từ
              </h3>
            </div>

            {/* 🚀 CHỌN KỲ KẾ TOÁN */}
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-rose-500 transition-colors">
                Kỳ Kế Toán <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  name="fiscalPeriodId" value={formData.fiscalPeriodId} onChange={handleChange} required disabled={loadingPeriods}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-none transition-all text-slate-900 dark:text-white"
                >
                  <option value="">-- Chọn Kỳ Hạch Toán --</option>
                  {periods.map((p: any) => (
                    <option key={p.periodId} value={p.periodId} disabled={p.isClosed || p.status === "CLOSED"}>
                      {p.periodName} {p.isClosed || p.status === "CLOSED" ? "(Đã Khóa)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-rose-500 transition-colors">
                Ngày Chứng Từ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="date" name="entryDate" value={formData.entryDate} onChange={handleChange} required
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5 group sm:col-span-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-rose-500 transition-colors">
                Số Tham Chiếu (Hóa đơn) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" name="reference" value={formData.reference} onChange={handleChange} required
                  placeholder="VD: HD-123456"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-none uppercase transition-all"
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-rose-500 transition-colors">
                Diễn giải / Lý do chi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <textarea 
                  name="description" value={formData.description} onChange={handleChange} required rows={2}
                  placeholder="Ghi rõ lý do chi tiền..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                2. Hạch toán Giao dịch & Ngân sách
              </h3>
            </div>

            <div className="space-y-1.5 group sm:col-span-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-rose-500 transition-colors">
                Tổng Số Tiền Chi (VND) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-500" />
                <input 
                  type="number" name="amount" value={formData.amount} onChange={handleChange} required min="1"
                  placeholder="Nhập số tiền..."
                  className="w-full pl-10 pr-4 py-3 bg-rose-50/50 dark:bg-slate-800/80 border border-rose-200 dark:border-rose-500/30 rounded-xl text-xl font-black text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-focus-within:text-rose-500 transition-colors">
                <Receipt className="w-3.5 h-3.5" /> Ghi Nợ TK Chi Phí <span className="text-rose-500">*</span>
              </label>
              <select 
                name="expenseAccountId" value={formData.expenseAccountId} onChange={handleChange} required
                disabled={loadingAccounts}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all"
              >
                <option value="">-- Chọn TK chi phí (Loại 6/8) --</option>
                {expenseAccounts.map((acc: any) => (
                  <option key={acc.accountId} value={acc.accountId}>{acc.accountCode} - {acc.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-focus-within:text-rose-500 transition-colors">
                <CreditCard className="w-3.5 h-3.5" /> Nguồn Tiền Chi (Ghi Có) <span className="text-rose-500">*</span>
              </label>
              <select 
                name="paymentAccountId" value={formData.paymentAccountId} onChange={handleChange} required
                disabled={loadingAccounts}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all"
              >
                <option value="">-- Chọn TK tiền (111/112) --</option>
                {paymentAccounts.map((acc: any) => (
                  <option key={acc.accountId} value={acc.accountId}>{acc.accountCode} - {acc.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-focus-within:text-rose-500 transition-colors">
                <Building2 className="w-3.5 h-3.5" /> Gắn với TT Chi Phí / Phòng ban
              </label>
              <select 
                name="costCenterId" value={formData.costCenterId} onChange={handleChange}
                disabled={loadingCostCenters}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all"
              >
                <option value="">-- Bỏ qua nếu là chi phí chung --</option>
                {costCenters.map((cc: any) => (
                  <option key={cc.costCenterId} value={cc.costCenterId}>{cc.code} - {cc.name}</option>
                ))}
              </select>
            </div>

          </div>
        </form>
      </div>
    </Modal>
  );
}