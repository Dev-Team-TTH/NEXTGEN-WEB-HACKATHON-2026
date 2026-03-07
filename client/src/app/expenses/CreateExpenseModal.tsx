"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Receipt, Loader2, Save, AlignLeft, Calendar, Hash, DollarSign, Wallet, FileText } from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- API & REDUX ---
import { useAppSelector } from "@/app/redux";
import { 
  useCreateExpenseMutation, 
  useUpdateExpenseMutation, 
  useGetAccountsQuery,
  Expense 
} from "@/state/api";

// --- IMPORT CORE MODAL ---
import Modal from "@/app/(components)/Modal";

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingExpense?: Expense | null;
}

export default function CreateExpenseModal({ isOpen, onClose, existingExpense }: CreateExpenseModalProps) {
  const { activeBranchId } = useAppSelector(state => state.global);

  // --- API HOOKS ---
  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
  const [updateExpense, { isLoading: isUpdating }] = useUpdateExpenseMutation();
  
  // Tải danh sách Tài khoản kế toán từ hệ thống
  const { data: accounts = [], isLoading: loadingAccounts } = useGetAccountsQuery(undefined, { skip: !isOpen });

  const isSubmitting = isCreating || isUpdating;

  // Lọc Tài khoản Chi phí (Bắt đầu bằng số 6, 8 hoặc loại EXPENSE)
  const expenseAccounts = useMemo(() => {
    return accounts.filter((acc: any) => 
      acc.accountCode.startsWith("6") || 
      acc.accountCode.startsWith("8") || 
      acc.accountType === "EXPENSE"
    );
  }, [accounts]);

  // Lọc Tài khoản Thanh toán (Tiền mặt/Ngân hàng: Bắt đầu 111, 112)
  const paymentAccounts = useMemo(() => {
    return accounts.filter((acc: any) => 
      acc.accountCode.startsWith("111") || 
      acc.accountCode.startsWith("112") || 
      acc.accountType === "CASH" || 
      acc.accountType === "BANK"
    );
  }, [accounts]);

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    reference: "",
    entryDate: new Date().toISOString().split('T')[0],
    description: "",
    amount: 0,
    expenseAccountId: "",
    paymentAccountId: ""
  });

  // --- BƠM DỮ LIỆU KHI MỞ ---
  useEffect(() => {
    if (isOpen) {
      if (existingExpense) {
        // Trích xuất từ các line để tự động map lại giao diện
        const totalAmount = existingExpense.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0;
        const debitLine = existingExpense.lines?.find((l: any) => l.debit > 0);
        const creditLine = existingExpense.lines?.find((l: any) => l.credit > 0);
        
        setFormData({
          reference: existingExpense.reference || "",
          entryDate: existingExpense.entryDate ? String(existingExpense.entryDate).split("T")[0] : new Date().toISOString().split('T')[0],
          description: existingExpense.description || "",
          amount: totalAmount,
          expenseAccountId: debitLine?.accountId || "",
          paymentAccountId: creditLine?.accountId || ""
        });
      } else {
        setFormData({
          reference: `EXP-${dayjs().format('YYMMDD')}-${Math.floor(Math.random() * 1000)}`,
          entryDate: new Date().toISOString().split('T')[0],
          description: "",
          amount: 0,
          expenseAccountId: "",
          paymentAccountId: ""
        });
      }
    }
  }, [isOpen, existingExpense]);

  // Tự động gán tài khoản mặc định nếu chưa chọn
  useEffect(() => {
    if (isOpen && !existingExpense && accounts.length > 0) {
      setFormData(prev => ({
        ...prev,
        expenseAccountId: prev.expenseAccountId || (expenseAccounts[0] as any)?.accountId || "",
        paymentAccountId: prev.paymentAccountId || (paymentAccounts[0] as any)?.accountId || ""
      }));
    }
  }, [isOpen, accounts, existingExpense, expenseAccounts, paymentAccounts]);

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      toast.error("Số tiền chi phí phải lớn hơn 0!"); return;
    }
    if (!formData.description) {
      toast.error("Vui lòng nhập diễn giải chi phí!"); return;
    }
    if (!formData.expenseAccountId || !formData.paymentAccountId) {
      toast.error("Vui lòng chọn Tài khoản Chi phí và Nguồn tiền!"); return;
    }
    if (!activeBranchId && !existingExpense) {
      toast.error("Không tìm thấy Chi nhánh làm việc. Vui lòng F5 trang."); return;
    }

    // Biến đổi UI Data thành Payload chuẩn Kế toán (Sinh 2 dòng Nợ/Có)
    const payloadData = {
      branchId: activeBranchId, 
      entryDate: new Date(formData.entryDate).toISOString(),
      reference: formData.reference,
      description: formData.description,
      postingStatus: "DRAFT", // Luôn ở nháp trước khi Duyệt
      lines: [
        { accountId: formData.expenseAccountId, debit: formData.amount, credit: 0, description: formData.description },
        { accountId: formData.paymentAccountId, debit: 0, credit: formData.amount, description: "Chi tiền thanh toán" }
      ]
    };

    try {
      if (existingExpense) {
        await updateExpense({ id: existingExpense.journalId, data: payloadData as any }).unwrap();
        toast.success("Cập nhật chứng từ chi phí thành công!");
      } else {
        await createExpense(payloadData as any).unwrap();
        toast.success("Đã ghi nhận khoản chi phí mới (Bản Nháp)!");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi hệ thống khi lưu chi phí!");
    }
  };

  // --- TRUYỀN FOOTER CHO CORE MODAL ---
  const modalFooter = (
    <>
      <button 
        type="button" 
        onClick={onClose} 
        disabled={isSubmitting} 
        className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
      >
        Hủy bỏ
      </button>
      <button 
        form="expense-form" 
        type="submit" 
        disabled={isSubmitting} 
        className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        {existingExpense ? "Cập nhật Chứng từ" : "Ghi nhận Chi phí"}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingExpense ? "Chỉnh sửa Chi phí" : "Ghi nhận Khoản chi Mới"}
      subtitle="Tạo chứng từ hạch toán chi phí OPEX/CAPEX"
      icon={<Receipt className="w-6 h-6 text-rose-500" />}
      maxWidth="max-w-2xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <form id="expense-form" onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Mã chứng từ */}
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-rose-500 transition-colors">
              <Hash className="w-3.5 h-3.5"/> Mã Chứng từ <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" required 
              value={formData.reference} 
              onChange={(e) => setFormData({...formData, reference: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-rose-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm"
            />
          </div>

          {/* Ngày chứng từ */}
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-rose-500 transition-colors">
              <Calendar className="w-3.5 h-3.5"/> Ngày phát sinh <span className="text-rose-500">*</span>
            </label>
            <input 
              type="date" required 
              value={formData.entryDate} 
              onChange={(e) => setFormData({...formData, entryDate: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Khối Cấu hình Sổ cái (Tài khoản) */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-white/5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-rose-500 transition-colors">
                <FileText className="w-3.5 h-3.5"/> Hạng mục Chi phí (Nợ) *
              </label>
              <select 
                required disabled={loadingAccounts}
                value={formData.expenseAccountId} onChange={(e) => setFormData({...formData, expenseAccountId: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-slate-900 dark:text-white shadow-sm disabled:opacity-50"
              >
                <option value="">-- Chọn Hạng mục chi phí --</option>
                {expenseAccounts.map((acc: any) => <option key={acc.accountId} value={acc.accountId}>{acc.accountCode} - {acc.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors">
                <Wallet className="w-3.5 h-3.5"/> Nguồn Tiền (Có) *
              </label>
              <select 
                required disabled={loadingAccounts}
                value={formData.paymentAccountId} onChange={(e) => setFormData({...formData, paymentAccountId: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white shadow-sm disabled:opacity-50"
              >
                <option value="">-- Chọn Quỹ/Ngân hàng --</option>
                {paymentAccounts.map((acc: any) => <option key={acc.accountId} value={acc.accountId}>{acc.accountCode} - {acc.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tổng Số tiền */}
        <div className="space-y-1.5 group">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-rose-500 transition-colors">
            <DollarSign className="w-3.5 h-3.5"/> Số tiền (VND) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input 
              type="number" required min={0} step={1000}
              value={formData.amount || ''} 
              onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
              className="w-full pl-5 pr-12 py-4 bg-rose-50/50 dark:bg-rose-900/10 border-2 border-rose-100 dark:border-rose-500/20 rounded-2xl text-xl font-black focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 outline-none text-rose-700 dark:text-rose-400 transition-all shadow-inner"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-rose-500/50">VND</span>
          </div>
        </div>

        {/* Diễn giải chi tiết */}
        <div className="space-y-1.5 group">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-rose-500 transition-colors">
            <AlignLeft className="w-3.5 h-3.5"/> Lý do / Diễn giải <span className="text-rose-500">*</span>
          </label>
          <textarea 
            rows={3} required
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Ghi rõ lý do chi tiền (VD: Thanh toán tiền điện văn phòng tháng 10...)"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm resize-none"
          />
        </div>

      </form>
    </Modal>
  );
}