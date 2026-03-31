"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Receipt, CalendarDays, FileText, Wallet, 
  CreditCard, Link as LinkIcon, CheckCircle2, 
  Loader2, AlertCircle, Building2, Hash, DollarSign,
  AlertTriangle, Target
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux";
import { 
  useCreateExpenseMutation, 
  useGetAccountsQuery, 
  useGetCostCentersQuery,
  useGetFiscalPeriodsQuery,
  useGetBudgetsQuery // 🚀 BỔ SUNG: Kéo API Ngân sách để kiểm soát
} from "@/state/api";

// --- COMPONENTS CỐT LÕI ---
import Modal from "@/app/(components)/Modal";
import FileDropzone from "@/app/(components)/FileDropzone";

// --- UTILS ---
import { safeRound, formatVND } from "@/utils/formatters"; // 🚀 BỔ SUNG: Khử sai số
import { cn } from "@/utils/helpers";

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
    fiscalPeriodId: "", 
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
  // 🚀 FETCH DỮ LIỆU NGÂN SÁCH THEO CHI NHÁNH
  const { data: budgets = [] } = useGetBudgetsQuery({ branchId: activeBranchId } as any, { skip: !isOpen || !activeBranchId });
  
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

  // 🚀 ĐỘNG CƠ KIỂM SOÁT NGÂN SÁCH THỜI GIAN THỰC (REAL-TIME BUDGET ENGINE)
  const budgetAlert = useMemo(() => {
    if (!formData.costCenterId || !formData.amount) return null;
    
    // Tìm ngân sách của phòng ban này trong năm hiện tại
    const currentYear = new Date(formData.entryDate).getFullYear();
    const activeBudget = budgets.find((b: any) => 
      b.costCenterId === formData.costCenterId && 
      b.year === currentYear && 
      b.isActive
    );

    if (!activeBudget) return { type: "INFO", message: "Phòng ban này không bị giới hạn ngân sách." };

    const amountToSpend = Number(formData.amount) || 0;
    const newUsedAmount = (activeBudget.usedAmount || 0) + amountToSpend;
    const remaining = activeBudget.totalAmount - (activeBudget.usedAmount || 0);

    if (newUsedAmount > activeBudget.totalAmount) {
      return { 
        type: "DANGER", 
        message: `CẢNH BÁO: Số tiền này sẽ làm VƯỢT NGÂN SÁCH của phòng ban! (Chỉ còn ${formatVND(remaining)}).`,
        exceededAmount: newUsedAmount - activeBudget.totalAmount
      };
    } else if (newUsedAmount >= activeBudget.totalAmount * 0.8) {
      return { 
        type: "WARNING", 
        message: `LƯU Ý: Số tiền này sẽ làm ngân sách tiêu hao trên 80% (Còn lại: ${formatVND(remaining - amountToSpend)}).` 
      };
    }

    return { type: "SAFE", message: `Ngân sách an toàn. Còn lại sau chi tiêu: ${formatVND(remaining - amountToSpend)}` };
  }, [formData.costCenterId, formData.amount, formData.entryDate, budgets]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeBranchId) {
      toast.error("Không tìm thấy Chi nhánh. Vui lòng F5 lại trang!"); return;
    }
    if (!formData.fiscalPeriodId) {
      toast.error("Vui lòng chọn Kỳ Kế toán để ghi sổ chi phí!"); return;
    }
    if (!formData.expenseAccountId || !formData.paymentAccountId || !formData.amount || !formData.entryDate) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc (*)"); return;
    }

    const amountNum = Number(formData.amount);
    if (amountNum <= 0) {
      toast.error("Số tiền chi phải lớn hơn 0!"); return;
    }

    // 🚀 LÁ CHẮN XÁC NHẬN KHI VƯỢT NGÂN SÁCH
    if (budgetAlert?.type === "DANGER") {
      if (!window.confirm("Khoản chi này VƯỢT NGÂN SÁCH ĐÃ CẤP. Bạn có chắc chắn muốn tiến hành lập phiếu chi không?")) {
        return;
      }
    }

    try {
      const payload: any = {
        branchId: activeBranchId,
        fiscalPeriodId: formData.fiscalPeriodId, 
        entryDate: new Date(formData.entryDate).toISOString(),
        reference: formData.reference.trim(),
        description: formData.description.trim() || `Chi phí nội bộ: ${formData.reference}`,
        postingStatus: "DRAFT", 
        attachmentUrl: formData.attachmentUrl, 
        lines: [
          {
            accountId: formData.expenseAccountId,
            costCenterId: formData.costCenterId || null,
            debit: safeRound(amountNum), // 🚀 BẢO VỆ SỔ CÁI BẰNG SAFEROUND
            credit: 0,
            description: formData.description.trim()
          },
          {
            accountId: formData.paymentAccountId,
            costCenterId: null,
            debit: 0,
            credit: safeRound(amountNum), // 🚀 BẢO VỆ SỔ CÁI BẰNG SAFEROUND
            description: `Thanh toán: ${formData.description.trim()}`
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
        className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-500 disabled:opacity-50 shadow-sm"
      >
        Hủy bỏ
      </button>
      <button
        type="submit" form="create-expense-form" disabled={isSubmitting}
        className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 rounded-xl shadow-xl shadow-rose-500/30 transition-all duration-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      icon={<Wallet className="w-6 h-6 text-rose-500 transition-colors duration-500" />}
      maxWidth="max-w-5xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6 transition-colors duration-500">
        <form id="create-expense-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8 transition-colors duration-500">
          
          {/* CỘT TRÁI: UPLOAD HÓA ĐƠN / BIÊN LAI */}
          <div className="w-full md:w-1/3 flex flex-col gap-4 transition-colors duration-500">
            <div className="sticky top-0 transition-colors duration-500">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2 transition-colors duration-500">
                <LinkIcon className="w-4 h-4 text-rose-500 transition-colors duration-500" /> Hóa đơn / Chứng từ gốc
              </h3>
              
              <FileDropzone 
                onUploadSuccess={handleUploadSuccess}
                accept="image/png, image/jpeg, application/pdf"
                label="Kéo thả Hóa đơn VAT, Biên lai (PDF, JPG)"
                maxSizeMB={5}
              />

              {formData.attachmentUrl && (
                 <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20 transition-colors duration-500 shadow-sm">
                   <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 transition-colors duration-500">
                     <CheckCircle2 className="w-4 h-4" /> Đã đính kèm chứng từ hợp lệ
                   </p>
                 </div>
              )}

              <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20 transition-colors duration-500 shadow-sm">
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 mb-2 flex items-center gap-1.5 transition-colors duration-500">
                  <AlertCircle className="w-4 h-4" /> Lưu ý Kế toán
                </h4>
                <ul className="text-[11px] text-rose-600 dark:text-rose-400 space-y-1.5 list-disc pl-4 transition-colors duration-500 font-medium">
                  <li>Mọi khoản chi trên 200,000 VND đều bắt buộc phải có hóa đơn đỏ / chứng từ hợp lệ đính kèm.</li>
                  <li>Hệ thống sẽ tự động hạch toán vào sổ Nhật ký chung ở trạng thái Nháp (DRAFT).</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN GIAO DỊCH */}
          <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-5 transition-colors duration-500">
            
            <div className="sm:col-span-2 transition-colors duration-500">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2 transition-colors duration-500">
                1. Thông tin Chứng từ
              </h3>
            </div>

            {/* CHỌN KỲ KẾ TOÁN */}
            <div className="space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-rose-500 transition-colors duration-500">
                Kỳ Kế Toán <span className="text-rose-500">*</span>
              </label>
              <div className="relative transition-colors duration-500">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-500" />
                <select 
                  name="fiscalPeriodId" value={formData.fiscalPeriodId} onChange={handleChange} required disabled={loadingPeriods}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-none transition-all text-slate-900 dark:text-white duration-500 shadow-sm cursor-pointer"
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

            <div className="space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-rose-500 transition-colors duration-500">
                Ngày Chứng Từ <span className="text-rose-500">*</span>
              </label>
              <div className="relative transition-colors duration-500">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-500" />
                <input 
                  type="date" name="entryDate" value={formData.entryDate} onChange={handleChange} required
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-none transition-all text-slate-900 dark:text-white duration-500 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5 group sm:col-span-2 transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-rose-500 transition-colors duration-500">
                Số Tham Chiếu (Hóa đơn) <span className="text-rose-500">*</span>
              </label>
              <div className="relative transition-colors duration-500">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-500" />
                <input 
                  type="text" name="reference" value={formData.reference} onChange={handleChange} required
                  placeholder="VD: HD-123456"
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-none uppercase transition-all duration-500 shadow-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-rose-500 transition-colors duration-500">
                Diễn giải / Lý do chi <span className="text-rose-500">*</span>
              </label>
              <div className="relative transition-colors duration-500">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400 transition-colors duration-500" />
                <textarea 
                  name="description" value={formData.description} onChange={handleChange} required rows={2}
                  placeholder="Ghi rõ lý do chi tiền..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all resize-none duration-500 shadow-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="sm:col-span-2 mt-2 transition-colors duration-500">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2 transition-colors duration-500">
                2. Hạch toán Giao dịch & Ngân sách
              </h3>
            </div>

            <div className="space-y-1.5 group sm:col-span-2 transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-rose-500 transition-colors duration-500">
                Tổng Số Tiền Chi (VND) <span className="text-rose-500">*</span>
              </label>
              <div className="relative transition-colors duration-500">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-500 transition-colors duration-500" />
                <input 
                  type="number" name="amount" value={formData.amount} onChange={handleChange} required min="1"
                  placeholder="Nhập số tiền..."
                  className={cn(
                    "w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border rounded-xl text-xl font-black focus:ring-2 outline-none transition-all shadow-inner duration-500",
                    budgetAlert?.type === "DANGER" ? "text-rose-600 border-rose-400 focus:ring-rose-500 dark:bg-rose-500/10" : "text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 focus:ring-rose-500"
                  )}
                />
              </div>
              
              {/* 🚀 UI HIỂN THỊ CẢNH BÁO NGÂN SÁCH (REAL-TIME) */}
              {budgetAlert && (
                <div className={cn(
                  "mt-2 px-3 py-2 rounded-lg text-xs font-bold flex items-start gap-1.5 transition-all duration-500 border",
                  budgetAlert.type === "DANGER" ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 animate-pulse" :
                  budgetAlert.type === "WARNING" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30" :
                  budgetAlert.type === "SAFE" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" :
                  "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                )}>
                  {budgetAlert.type === "DANGER" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : 
                   budgetAlert.type === "SAFE" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <Target className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span className="leading-relaxed">{budgetAlert.message}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-focus-within:text-rose-500 transition-colors duration-500">
                <Receipt className="w-3.5 h-3.5 transition-colors duration-500" /> Ghi Nợ TK Chi Phí <span className="text-rose-500">*</span>
              </label>
              <select 
                name="expenseAccountId" value={formData.expenseAccountId} onChange={handleChange} required
                disabled={loadingAccounts}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all duration-500 text-slate-900 dark:text-white shadow-sm cursor-pointer"
              >
                <option value="">-- Chọn TK chi phí (Loại 6/8) --</option>
                {expenseAccounts.map((acc: any) => (
                  <option key={acc.accountId} value={acc.accountId}>{acc.accountCode} - {acc.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-focus-within:text-rose-500 transition-colors duration-500">
                <CreditCard className="w-3.5 h-3.5 transition-colors duration-500" /> Nguồn Tiền Chi (Ghi Có) <span className="text-rose-500">*</span>
              </label>
              <select 
                name="paymentAccountId" value={formData.paymentAccountId} onChange={handleChange} required
                disabled={loadingAccounts}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all duration-500 text-slate-900 dark:text-white shadow-sm cursor-pointer"
              >
                <option value="">-- Chọn TK tiền (111/112) --</option>
                {paymentAccounts.map((acc: any) => (
                  <option key={acc.accountId} value={acc.accountId}>{acc.accountCode} - {acc.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5 group transition-colors duration-500">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-focus-within:text-rose-500 transition-colors duration-500">
                <Building2 className="w-3.5 h-3.5 transition-colors duration-500" /> Gắn với TT Chi Phí / Phòng ban
              </label>
              <select 
                name="costCenterId" value={formData.costCenterId} onChange={handleChange}
                disabled={loadingCostCenters}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all duration-500 text-slate-900 dark:text-white shadow-sm cursor-pointer"
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