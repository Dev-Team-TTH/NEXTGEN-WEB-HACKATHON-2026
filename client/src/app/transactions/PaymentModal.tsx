"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, Building, Banknote, CalendarClock, 
  Loader2, CheckCircle2, AlertOctagon, ArrowRight,
  TrendingDown, FileText, Wallet, Receipt, Globe, Zap
} from "lucide-react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetDocumentByIdQuery, 
  useProcessPaymentMutation,
  useGetAccountsQuery,
  useGetActiveExchangeRatesQuery
} from "@/state/api";
import { useAppSelector } from "@/app/redux"; 

// --- IMPORT CORE MODAL & UTILS ---
import Modal from "@/app/(components)/Modal";
import { formatVND } from "@/utils/formatters";

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const formatCurrency = (val: number, currencyCode: string = "VND") => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: currencyCode }).format(val || 0);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string | null; 
}

// ==========================================
// COMPONENT CHÍNH: WIZARD THANH TOÁN
// ==========================================
export default function PaymentModal({ isOpen, onClose, docId }: PaymentModalProps) {
  
  // --- LẤY BỐI CẢNH ERP TỪ REDUX ---
  const { activeBranchId, activeFiscalPeriodId, baseCurrency } = useAppSelector(state => state.global);

  // --- API HOOKS ---
  const { data: document, isLoading: loadingDoc } = useGetDocumentByIdQuery(docId || "", { skip: !isOpen || !docId });
  const { data: accounts = [], isLoading: loadingAccounts } = useGetAccountsQuery({}, { skip: !isOpen });
  const { data: activeRates = [], isLoading: loadingRates } = useGetActiveExchangeRatesQuery(undefined, { skip: !isOpen });
  
  const [processPayment, { isLoading: isSubmitting }] = useProcessPaymentMutation();

  // --- PHÂN LOẠI TÀI KHOẢN KẾ TOÁN ---
  const paymentAccounts = useMemo(() => accounts.filter(acc => 
    acc.accountType === "CASH" || acc.accountType === "BANK" || 
    acc.accountCode.startsWith("111") || acc.accountCode.startsWith("112")
  ), [accounts]);

  const arApAccounts = useMemo(() => accounts.filter(acc => 
    acc.accountCode.startsWith("131") || acc.accountCode.startsWith("331")
  ), [accounts]);

  const fxGainAccounts = useMemo(() => accounts.filter(acc => acc.accountCode.startsWith("515")), [accounts]);
  const fxLossAccounts = useMemo(() => accounts.filter(acc => acc.accountCode.startsWith("635")), [accounts]);

  // --- LOCAL STATE ---
  const [amount, setAmount] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  
  // State phục vụ tỷ giá (FX)
  const [exchangeRate, setExchangeRate] = useState<string>("");
  const [arApAccountId, setArApAccountId] = useState<string>("");
  const [fxGainAccountId, setFxGainAccountId] = useState<string>("");
  const [fxLossAccountId, setFxLossAccountId] = useState<string>("");

  // --- TÍNH TOÁN CÔNG NỢ & THUẬT TOÁN TỶ GIÁ ---
  const docCurrency = (document as any)?.currencyCode || baseCurrency;
  const isForeignCurrency = docCurrency !== baseCurrency;
  const originalRate = (document as any)?.exchangeRate || 1;

  // Lấy tỷ giá LIVE từ Vietcombank (Cronjob)
  const liveRateData = activeRates.find((r: any) => r.currencyCode === docCurrency);
  const liveRate = liveRateData ? Number(liveRateData.rate) : originalRate;
  const isUsingLiveRate = !!liveRateData; 

  const totalAmount = document?.totalAmount || 0;
  const paidAmount = document?.paidAmount || 0;
  const remainingAmount = totalAmount - paidAmount;

  // Dự phóng sau thanh toán
  const inputAmount = Number(amount) || 0;
  const newRemaining = Math.max(0, remainingAmount - inputAmount);

  // Auto-fill Data & Reset khi Modal mở
  useEffect(() => {
    if (isOpen && document) {
      setAmount("");
      setReference("");
      
      // ⚡ AUTO-FILL: Tự động nhét Tỷ giá LIVE vào Form
      setExchangeRate(liveRate.toString()); 
      
      if (paymentAccounts.length > 0 && !accountId) {
        const firstAcc = paymentAccounts[0] as any;
        setAccountId(firstAcc.accountId || firstAcc.id);
      }
      if (arApAccounts.length > 0 && !arApAccountId) setArApAccountId((arApAccounts[0] as any).accountId);
      if (fxGainAccounts.length > 0 && !fxGainAccountId) setFxGainAccountId((fxGainAccounts[0] as any).accountId);
      if (fxLossAccounts.length > 0 && !fxLossAccountId) setFxLossAccountId((fxLossAccounts[0] as any).accountId);
    }
  }, [isOpen, document, activeRates.length]); 

  // --- HANDLERS ---
  const handlePayFull = () => setAmount(remainingAmount.toString());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId) return;

    if (inputAmount <= 0) return toast.error("Số tiền thanh toán phải lớn hơn 0!");
    if (inputAmount > remainingAmount + 0.001) return toast.error("Số tiền vượt quá dư nợ hiện tại!");
    if (!accountId) return toast.error("Vui lòng chọn Nguồn tiền!");

    const selectedAcc = paymentAccounts.find((a: any) => (a.accountId || a.id) === accountId) as any;
    const isCash = selectedAcc?.accountType === "CASH" || selectedAcc?.accountCode?.startsWith("111");
    const paymentMethod = isCash ? "CASH" : "BANK";

    try {
      const payload: any = {
        amount: inputAmount,
        paymentMethod,
        reference,
        note: `Thanh toán cho chứng từ ${document?.documentNumber}`,
        branchId: activeBranchId || undefined,
        fiscalPeriodId: activeFiscalPeriodId || undefined,
      };

      if (isCash) payload.cashAccountId = accountId;
      else payload.bankAccountId = accountId;

      if (isForeignCurrency) {
        if (!arApAccountId) return toast.error("Vui lòng chọn Tài khoản Công nợ để hạch toán chênh lệch!");
        payload.paymentExchangeRate = Number(exchangeRate);
        payload.arApAccountId = arApAccountId;
        payload.fxGainAccountId = fxGainAccountId;
        payload.fxLossAccountId = fxLossAccountId;
      }

      await processPayment({ documentId: docId, data: payload }).unwrap();
      
      toast.success("Đã ghi nhận thanh toán & Hạch toán Sổ cái thành công!");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi giao dịch! Vui lòng thử lại.");
    }
  };

  // --- FOOTER RENDER CHO CORE MODAL ---
  const modalFooter = (
    <div className="flex w-full items-center justify-end gap-3">
      <button 
        type="button" onClick={onClose} disabled={isSubmitting} 
        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-white font-bold rounded-xl transition-colors disabled:opacity-50"
      >
        Hủy bỏ
      </button>
      <button 
        type="submit" form="payment-form" disabled={isSubmitting || inputAmount <= 0} 
        className="flex items-center justify-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingDown className="w-5 h-5" />} 
        Xác nhận Gạch Nợ
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen && !!docId}
      onClose={onClose}
      title="Thanh toán & Gạch Nợ"
      subtitle={`Tham chiếu: ${(document as any)?.documentNumber || docId}`}
      icon={<CreditCard className="w-6 h-6 text-blue-500" />}
      maxWidth="max-w-5xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="flex flex-col md:flex-row h-full overflow-hidden bg-slate-50/50 dark:bg-transparent">
        
        {/* === CỘT TRÁI: THÔNG TIN CÔNG NỢ & DATA VIZ === */}
        <div className="w-full md:w-[45%] bg-slate-50 dark:bg-slate-900/80 border-r border-slate-200 dark:border-white/5 p-6 sm:p-8 flex flex-col relative overflow-hidden shrink-0">
          <div className="absolute -left-10 -bottom-10 opacity-[0.03] dark:opacity-5 pointer-events-none">
            <Receipt className="w-64 h-64 text-blue-500" />
          </div>

          <div className="relative z-10 h-full flex flex-col">
            {loadingDoc ? (
              <div className="py-20 flex flex-col items-center justify-center text-blue-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4"/>
                <span className="font-bold text-slate-500">Đang quét sổ cái...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-6 flex-1">
                
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Building className="w-3.5 h-3.5"/> Đối tác Giao dịch</p>
                  <p className="font-black text-lg text-slate-800 dark:text-white leading-tight">
                    {(document as any)?.supplier?.name || (document as any)?.customer?.name || "Khách hàng Vãng lai"}
                  </p>
                </div>

                <div className="flex flex-col gap-3 mt-auto">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-slate-500">Tổng Giá trị {docCurrency}:</span>
                    <span className="text-slate-800 dark:text-slate-200">{formatCurrency(totalAmount, docCurrency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-blue-600 dark:text-blue-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Đã trả:</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatCurrency(paidAmount, docCurrency)}</span>
                  </div>
                  
                  <div className="h-px w-full bg-slate-200 dark:bg-slate-700/50 my-2" />
                  
                  <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                    <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-1">Dư nợ cần thanh toán</p>
                    <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{formatCurrency(remainingAmount, docCurrency)}</p>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <span>Trạng thái Nợ</span>
                    <span className="text-blue-600 dark:text-blue-500">Dự phóng: {formatCurrency(newRemaining, docCurrency)}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                    <div style={{ width: `${totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0}%` }} className="h-full bg-slate-400 dark:bg-slate-600" />
                    <motion.div 
                      layout transition={{ type: "spring", stiffness: 120, damping: 25 }}
                      className="h-full bg-blue-500"
                      style={{ width: `${totalAmount > 0 ? (inputAmount / totalAmount) * 100 : 0}%`, backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}
                    />
                    <motion.div 
                      layout transition={{ type: "spring", stiffness: 120, damping: 25 }}
                      style={{ width: `${totalAmount > 0 ? (newRemaining / totalAmount) * 100 : 0}%` }}
                      className="h-full bg-rose-500"
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* === CỘT PHẢI: FORM NHẬP LIỆU GIAO DỊCH === */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col relative bg-white dark:bg-transparent scrollbar-hide">
          <AnimatePresence mode="wait">
            {remainingAmount === 0 ? (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                 className="flex flex-col items-center justify-center text-center h-full"
               >
                  <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6"><CheckCircle2 className="w-12 h-12 text-emerald-500" /></div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">Giao dịch Hoàn tất</h3>
                  <p className="text-sm font-medium text-slate-500 mt-2 max-w-[250px]">Chứng từ này đã được thanh toán 100%.</p>
               </motion.div>
            ) : (
              <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-md mx-auto w-full pb-6">
                
                <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Chi tiết Ủy Nhiệm</h3>

                {/* Cảnh báo thiếu bối cảnh */}
                {(!activeBranchId || !activeFiscalPeriodId) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-700">
                    ⚠️ Bạn chưa chọn Chi nhánh hoặc Kỳ kế toán trên hệ thống. Phiếu sẽ được lưu nhưng không hạch toán vào Sổ cái.
                  </div>
                )}

                <div className="space-y-2 group">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors"><Banknote className="w-4 h-4"/> Số tiền Giao dịch *</label>
                    <button type="button" onClick={handlePayFull} className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors shadow-sm">TẤT TOÁN MAX</button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 group-focus-within:text-blue-500 transition-colors text-lg">{docCurrency === 'VND' ? '₫' : docCurrency}</span>
                    <input 
                      type="number" min="0" max={remainingAmount} step="any" required
                      value={amount} onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Nhập số ${docCurrency}...`}
                      className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-2xl font-black text-blue-600 dark:text-blue-400 focus:border-2 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* THÔNG TIN FX NẾU LÀ NGOẠI TỆ */}
                <AnimatePresence>
                  {isForeignCurrency && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-2xl space-y-4 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-2">
                          <Globe className="w-4 h-4"/> Chênh Lệch Tỷ Giá (FX)
                        </h4>
                        <span className="text-[10px] font-bold text-orange-500 bg-orange-100 dark:bg-orange-500/20 px-2 py-1 rounded-md">Gốc: {formatVND(originalRate)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 relative group">
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">Tỷ giá Hôm nay {isUsingLiveRate && <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500 animate-pulse"/>}</label>
                          <input 
                            type="number" min="0" required value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          {isUsingLiveRate && <p className="text-[9px] text-emerald-600 font-bold mt-1">Đã đồng bộ tự động từ Ngân hàng.</p>}
                        </div>
                        <div className="space-y-1.5 group">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tài khoản Công nợ *</label>
                          <select required value={arApAccountId} onChange={(e) => setArApAccountId(e.target.value)} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500">
                            {arApAccounts.map((a: any) => <option key={a.accountId} value={a.accountId}>{a.accountCode} - {a.name}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 group">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">TK Lãi Tỷ giá (515)</label>
                          <select value={fxGainAccountId} onChange={(e) => setFxGainAccountId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] outline-none">
                            {fxGainAccounts.map((a: any) => <option key={a.accountId} value={a.accountId}>{a.accountCode}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5 group">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">TK Lỗ Tỷ giá (635)</label>
                          <select value={fxLossAccountId} onChange={(e) => setFxLossAccountId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] outline-none">
                            {fxLossAccounts.map((a: any) => <option key={a.accountId} value={a.accountId}>{a.accountCode}</option>)}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2 group z-20">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors"><Wallet className="w-4 h-4"/> Nguồn tiền / Tài khoản *</label>
                  <div className="relative">
                    {loadingAccounts ? (
                      <div className="w-full h-[52px] bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
                    ) : (
                      <select 
                        required value={accountId} onChange={(e) => setAccountId(e.target.value)}
                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                      >
                        <option value="">-- Chọn quỹ Tiền mặt / Ngân hàng --</option>
                        {paymentAccounts.map((acc: any) => (
                          <option key={acc.accountId || acc.id} value={acc.accountId || acc.id}>{acc.accountCode} - {acc.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"><ArrowRight className="w-4 h-4 text-slate-400 rotate-90" /></div>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-blue-500 transition-colors"><FileText className="w-4 h-4"/> Tham chiếu / Ghi chú</label>
                  <input 
                    type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Mã UNC, Hóa đơn..."
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                  />
                </div>

              </form>
            )}
          </AnimatePresence>
        </div>

      </div>
    </Modal>
  );
}