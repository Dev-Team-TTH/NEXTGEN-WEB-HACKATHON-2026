"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  CreditCard, Wallet, CalendarDays, Hash, 
  FileText, Loader2, CheckCircle2, DollarSign,
  AlertOctagon, Globe, TrendingUp, TrendingDown
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux";
import { 
  useProcessPaymentMutation, 
  useGetAccountsQuery,
  useGetDocumentByIdQuery,
  useGetFiscalPeriodsQuery 
} from "@/state/api";

// --- COMPONENTS & UTILS ---
import Modal from "@/app/(components)/Modal";
import { formatVND, safeRound } from "@/utils/formatters"; 
import { cn } from "@/utils/helpers";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string | null;
}

export default function PaymentModal({ isOpen, onClose, docId }: PaymentModalProps) {
  // --- BỐI CẢNH REDUX ---
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- FETCH DATA ---
  const { data: document, isLoading: loadingDoc } = useGetDocumentByIdQuery(docId || "", { skip: !isOpen || !docId });
  const { data: accounts = [], isLoading: loadingAccounts } = useGetAccountsQuery({ isActive: 'true' }, { skip: !isOpen });
  const { data: periods = [], isLoading: loadingPeriods } = useGetFiscalPeriodsQuery(undefined, { skip: !isOpen });
  
  const [processPayment, { isLoading: isSubmitting }] = useProcessPaymentMutation();

  // --- STATE LÕI ---
  const [formData, setFormData] = useState({
    amount: "",
    paymentMethod: "BANK_TRANSFER",
    accountId: "", // 🚀 Đổi từ cashAccountId thành accountId dùng chung, sẽ map lại lúc Submit
    fiscalPeriodId: "",
    reference: "",
    note: "",
    paymentDate: dayjs().format("YYYY-MM-DD"),
    paymentExchangeRate: 1 // 🚀 BỔ SUNG: Tỷ giá thực tế ngày thanh toán
  });

  // --- INIT DATA KHI MỞ MODAL ---
  useEffect(() => {
    if (isOpen && document) {
      const remaining = safeRound((document.totalAmount || 0) - (document.paidAmount || 0));
      setFormData({
        amount: remaining > 0 ? remaining.toString() : "",
        paymentMethod: "BANK_TRANSFER",
        accountId: "",
        fiscalPeriodId: "",
        reference: `PAY-${Date.now().toString().slice(-6)}`,
        note: `Thanh toán cho chứng từ ${document.documentNumber}`,
        paymentDate: dayjs().format("YYYY-MM-DD"),
        paymentExchangeRate: document.exchangeRate || 1
      });
    }
  }, [isOpen, document]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      // Nếu đổi phương thức thanh toán, reset lại tài khoản đã chọn
      if (name === "paymentMethod") newData.accountId = "";
      return newData;
    });
  };

  // 🚀 ENGINE 1: BỘ LỌC TÀI KHOẢN THÔNG MINH THEO PHƯƠNG THỨC THANH TOÁN
  const filteredAccounts = useMemo(() => {
    if (formData.paymentMethod === "CASH") {
      return accounts.filter(acc => acc.accountType === "ASSET" && acc.accountCode.startsWith("111"));
    } else if (formData.paymentMethod === "BANK_TRANSFER") {
      return accounts.filter(acc => acc.accountType === "ASSET" && acc.accountCode.startsWith("112"));
    }
    return []; // CREDIT (Cấn trừ) thường sử dụng tài khoản công nợ/trung gian khác cấu hình từ backend
  }, [accounts, formData.paymentMethod]);

  // 🚀 ENGINE 2: TÍNH TOÁN LÃI/LỖ CHÊNH LỆCH TỶ GIÁ (FX GAIN/LOSS)
  const isForeignCurrency = document?.currencyCode && document.currencyCode !== "VND";
  const originalRate = document?.exchangeRate || 1;
  const currentRate = Number(formData.paymentExchangeRate) || 1;
  const payAmount = Number(formData.amount) || 0;

  // Tính chênh lệch VND
  const originalVndValue = payAmount * originalRate;
  const currentVndValue = payAmount * currentRate;
  const fxDiff = currentVndValue - originalVndValue;

  // Xác định là Lãi hay Lỗ dựa trên loại chứng từ
  let isFxGain = false;
  let fxLabel = "";
  if (isForeignCurrency && fxDiff !== 0) {
    if (document?.type === "PURCHASE_ORDER" || document?.type === "PURCHASE_RECEIPT") {
      // Mua hàng (Phải trả): Tỷ giá tăng -> Lỗ (Phải trả nhiều VND hơn). Tỷ giá giảm -> Lãi
      isFxGain = fxDiff < 0; 
      fxLabel = isFxGain ? "Lãi tỷ giá (Có TK 515)" : "Lỗ tỷ giá (Nợ TK 635)";
    } else {
      // Bán hàng (Phải thu): Tỷ giá tăng -> Lãi (Thu được nhiều VND hơn). Tỷ giá giảm -> Lỗ
      isFxGain = fxDiff > 0;
      fxLabel = isFxGain ? "Lãi tỷ giá (Có TK 515)" : "Lỗ tỷ giá (Nợ TK 635)";
    }
  }

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId) return;

    if (!activeBranchId) {
      return toast.error("Không tìm thấy Chi nhánh. Vui lòng F5 lại trang!");
    }

    if (!formData.amount || !formData.paymentDate || !formData.fiscalPeriodId) {
      return toast.error("Vui lòng điền đủ thông tin bắt buộc (kể cả Kỳ kế toán)!");
    }

    if ((formData.paymentMethod === "CASH" || formData.paymentMethod === "BANK_TRANSFER") && !formData.accountId) {
      return toast.error("Vui lòng chọn Tài khoản chi/thu!");
    }

    if (payAmount <= 0) return toast.error("Số tiền thanh toán phải lớn hơn 0!");

    const remaining = safeRound((document?.totalAmount || 0) - (document?.paidAmount || 0));
    if (payAmount > remaining) {
      return toast.error(`Số tiền thanh toán vượt quá dư nợ (${formatVND(remaining)} ${document?.currencyCode})!`);
    }

    try {
      // 🚀 KHỚP NỐI 100% VỚI ProcessPaymentRequest CỦA BACKEND
      const payload: any = {
        amount: payAmount,
        paymentMethod: formData.paymentMethod,
        reference: formData.reference,
        note: formData.note,
        branchId: activeBranchId,
        fiscalPeriodId: formData.fiscalPeriodId,
        paymentDate: new Date(formData.paymentDate).toISOString(),
      };

      // Map đúng biến tài khoản theo Phương thức thanh toán
      if (formData.paymentMethod === "CASH") payload.cashAccountId = formData.accountId;
      if (formData.paymentMethod === "BANK_TRANSFER") payload.bankAccountId = formData.accountId;

      // Bơm tỷ giá thực tế nếu là ngoại tệ
      if (isForeignCurrency) {
        payload.paymentExchangeRate = currentRate;
      }

      await processPayment({ documentId: docId, data: payload }).unwrap();
      toast.success("Thanh toán thành công! Hệ thống đã ghi sổ Nhật ký chung.");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi xử lý thanh toán");
    }
  };

  // --- FOOTER RENDER ---
  const remainingDebt = safeRound((document?.totalAmount || 0) - (document?.paidAmount || 0));
  const currencyCode = document?.currencyCode || "VND";
  
  const modalFooter = (
    <div className="flex w-full items-center justify-between">
      <div className="hidden sm:block text-left">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dư nợ hiện tại</p>
        <p className="text-lg font-black text-rose-500 transition-colors duration-500">
          {formatVND(remainingDebt)} <span className="text-xs font-bold opacity-70">{currencyCode}</span>
        </p>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button 
          type="button" onClick={onClose} disabled={isSubmitting}
          className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-500"
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
      maxWidth="max-w-3xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6">
        {loadingDoc || loadingAccounts || loadingPeriods ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 transition-colors duration-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm font-medium">Đang tải dữ liệu kế toán...</p>
          </div>
        ) : (
          <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* THÔNG TIN CHỨNG TỪ (READONLY) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-colors duration-500">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Đối tác</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate transition-colors duration-500">
                  {document?.supplier?.name || document?.customer?.name || "Khách lẻ"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Đã thanh toán</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 transition-colors duration-500">
                  {formatVND(document?.paidAmount || 0)} <span className="text-[10px]">{currencyCode}</span>
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng giá trị</p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 transition-colors duration-500">
                  {formatVND(document?.totalAmount || 0)} <span className="text-[10px]">{currencyCode}</span>
                </p>
              </div>
            </div>

            {/* FORM THANH TOÁN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  Kỳ Kế Toán Ghi Sổ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    name="fiscalPeriodId" value={formData.fiscalPeriodId} onChange={handleChange} required
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors duration-500"
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
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  Ngày thanh toán thực tế <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} required
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors duration-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  Số tiền thực thu/chi ({currencyCode}) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                  <input 
                    type="number" name="amount" value={formData.amount} onChange={handleChange} required min="0.01" step="0.01" max={remainingDebt}
                    placeholder="Nhập số tiền..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xl font-black text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner transition-colors duration-500"
                  />
                </div>
              </div>

              {/* 🚀 MODULE ĐA TIỀN TỆ (Ngoại tệ) */}
              {isForeignCurrency && (
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 transition-colors duration-500">
                  <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 group-focus-within:text-blue-500 transition-colors flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Tỷ giá thực tế ngày thanh toán
                    </label>
                    <input 
                      type="number" name="paymentExchangeRate" value={formData.paymentExchangeRate} onChange={handleChange} required min="1"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-colors duration-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Tỷ giá gốc lúc ghi nhận: <b className="text-slate-700 dark:text-slate-300">{formatVND(originalRate)}</b></p>
                  </div>
                  
                  <div className="flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quy đổi VND & Chênh lệch tỷ giá</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white mb-1 transition-colors duration-500">
                      {formatVND(currentVndValue)}
                    </p>
                    {fxDiff !== 0 && (
                      <div className={cn("text-[11px] font-bold flex items-center gap-1", isFxGain ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                        {isFxGain ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {fxLabel}: {formatVND(Math.abs(fxDiff))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  Hình thức thanh toán
                </label>
                <select 
                  name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors duration-500"
                >
                  <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng</option>
                  <option value="CASH">Tiền mặt</option>
                  <option value="CREDIT">Cấn trừ công nợ</option>
                </select>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors">
                  <Wallet className="w-3.5 h-3.5" /> 
                  {formData.paymentMethod === "CASH" ? "TK Tiền mặt (111)" : formData.paymentMethod === "BANK_TRANSFER" ? "TK Ngân hàng (112)" : "Tài khoản đối ứng"} 
                  <span className="text-rose-500">*</span>
                </label>
                <select 
                  name="accountId" value={formData.accountId} onChange={handleChange} required={formData.paymentMethod !== "CREDIT"} disabled={formData.paymentMethod === "CREDIT"}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 text-slate-900 dark:text-white transition-colors duration-500"
                >
                  <option value="">-- Chọn Tài khoản --</option>
                  {filteredAccounts.map((acc: any) => (
                    <option key={acc.accountId} value={acc.accountId}>{acc.accountCode} - {acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  Mã tham chiếu / Số UNC <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" name="reference" value={formData.reference} onChange={handleChange} required
                    placeholder="VD: FT230001..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none uppercase text-slate-900 dark:text-white transition-colors duration-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  Ghi chú nội bộ
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea 
                    name="note" value={formData.note} onChange={handleChange} rows={1}
                    placeholder="Lý do chi tiền..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900 dark:text-white transition-colors duration-500"
                  />
                </div>
              </div>

            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl flex items-start gap-2 transition-colors duration-500">
              <AlertOctagon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 leading-relaxed">
                Hành động này sẽ tạo chứng từ thanh toán và tự động sinh <b className="font-bold">Bút toán Sổ cái (Auto-GL)</b>. Hãy đảm bảo bạn chọn đúng Tài khoản {formData.paymentMethod === "CASH" ? "Tiền mặt" : "Ngân hàng"} và Kỳ kế toán.
              </p>
            </div>
            
          </form>
        )}
      </div>
    </Modal>
  );
}