"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, Wallet, CalendarDays, Hash, 
  FileText, Loader2, CheckCircle2, DollarSign
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { 
  useProcessPaymentMutation, 
  useGetAccountsQuery,
  useGetDocumentByIdQuery
} from "@/state/api";

// --- COMPONENTS & UTILS ---
import Modal from "@/app/(components)/Modal";
import { formatVND, safeRound } from "@/utils/formatters"; // IMPORT SIÊU VŨ KHÍ

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string | null;
}

export default function PaymentModal({ isOpen, onClose, docId }: PaymentModalProps) {
  // --- FETCH DATA ---
  const { data: document, isLoading: loadingDoc } = useGetDocumentByIdQuery(docId || "", { skip: !isOpen || !docId });
  const { data: accounts = [], isLoading: loadingAccounts } = useGetAccountsQuery({ isActive: 'true' }, { skip: !isOpen });
  const [processPayment, { isLoading: isSubmitting }] = useProcessPaymentMutation();

  const cashAccounts = accounts.filter(acc => acc.accountType === "ASSET" && (acc.accountCode.startsWith("111") || acc.accountCode.startsWith("112")));

  // --- STATE ---
  const [formData, setFormData] = useState({
    amount: "",
    paymentMethod: "CASH",
    cashAccountId: "",
    reference: "",
    note: "",
    paymentDate: dayjs().format("YYYY-MM-DD")
  });

  useEffect(() => {
    if (isOpen && document) {
      // ÁP DỤNG SAFE ROUND CHO SỐ NỢ CÒN LẠI
      const remaining = safeRound((document.totalAmount || 0) - (document.paidAmount || 0));
      setFormData({
        amount: remaining > 0 ? remaining.toString() : "",
        paymentMethod: "BANK_TRANSFER",
        cashAccountId: "",
        reference: `PAY-${Date.now().toString().slice(-6)}`,
        note: `Thanh toán cho chứng từ ${document.documentNumber}`,
        paymentDate: dayjs().format("YYYY-MM-DD")
      });
    }
  }, [isOpen, document]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId) return;

    if (!formData.amount || !formData.cashAccountId || !formData.paymentDate) {
      toast.error("Vui lòng điền đủ thông tin bắt buộc!");
      return;
    }

    const payAmount = Number(formData.amount);
    if (payAmount <= 0) {
      toast.error("Số tiền thanh toán phải lớn hơn 0!");
      return;
    }

    // ÁP DỤNG SAFE ROUND TRƯỚC KHI SO SÁNH
    const remaining = safeRound((document?.totalAmount || 0) - (document?.paidAmount || 0));
    if (payAmount > remaining) {
      toast.error(`Số tiền thanh toán vượt quá dư nợ (${formatVND(remaining)})!`);
      return;
    }

    try {
      const payload = {
        amount: payAmount,
        paymentMethod: formData.paymentMethod,
        cashAccountId: formData.cashAccountId,
        reference: formData.reference,
        note: formData.note
      };

      await processPayment({ documentId: docId, data: payload }).unwrap();
      toast.success("Thanh toán thành công! Hệ thống đã ghi sổ Nhật ký chung.");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi xử lý thanh toán");
    }
  };

  // --- FOOTER RENDER ---
  const remainingDebt = safeRound((document?.totalAmount || 0) - (document?.paidAmount || 0));
  
  const modalFooter = (
    <div className="flex w-full items-center justify-between">
      <div className="hidden sm:block text-left">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dư nợ hiện tại</p>
        <p className="text-lg font-black text-rose-500">{formatVND(remainingDebt)}</p>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button 
          type="button" onClick={onClose} disabled={isSubmitting}
          className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Hủy
        </button>
        <button 
          type="submit" form="payment-form" disabled={isSubmitting || remainingDebt <= 0 || loadingDoc}
          className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý</> : <><CheckCircle2 className="w-4 h-4" /> Xác nhận Thanh toán</>}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thanh toán & Gạch nợ"
      subtitle={`Chứng từ: ${document?.documentNumber || "Đang tải..."}`}
      icon={<CreditCard className="w-6 h-6 text-blue-500" />}
      maxWidth="max-w-2xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6">
        {loadingDoc || loadingAccounts ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm font-medium">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            {/* THÔNG TIN CHỨNG TỪ (READONLY) */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Đối tác</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {document?.supplier?.name || document?.customer?.name || "Khách lẻ"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng giá trị</p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200">{formatVND(document?.totalAmount || 0)}</p>
              </div>
            </div>

            {/* FORM THANH TOÁN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2 space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  Số tiền thanh toán (VND) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                  <input 
                    type="number" name="amount" value={formData.amount} onChange={handleChange} required min="1" max={remainingDebt}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xl font-black text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  Ngày thanh toán <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} required
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  Mã giao dịch / UNC <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" name="reference" value={formData.reference} onChange={handleChange} required
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  Hình thức thanh toán
                </label>
                <select 
                  name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng</option>
                  <option value="CASH">Tiền mặt</option>
                  <option value="CREDIT">Cấn trừ công nợ</option>
                </select>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors">
                  <Wallet className="w-3.5 h-3.5" /> Xuất quỹ / Tài khoản <span className="text-rose-500">*</span>
                </label>
                <select 
                  name="cashAccountId" value={formData.cashAccountId} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">-- Chọn TK Tiền --</option>
                  {cashAccounts.map((acc: any) => (
                    <option key={acc.accountId} value={acc.accountId}>{acc.accountCode} - {acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  Ghi chú
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea 
                    name="note" value={formData.note} onChange={handleChange} rows={2}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>

            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}