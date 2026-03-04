"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, CreditCard, Building, Banknote, CalendarClock, 
  Loader2, CheckCircle2, AlertOctagon, ArrowRight,
  TrendingDown, FileText, Wallet, Receipt
} from "lucide-react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetDocumentByIdQuery, 
  useProcessPaymentMutation,
  useGetAccountsQuery
} from "@/state/api";

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string | null; 
}

// ==========================================
// COMPONENT CHÍNH: WIZARD THANH TOÁN (GẠCH NỢ)
// ==========================================
export default function PaymentModal({ isOpen, onClose, docId }: PaymentModalProps) {
  
  // --- API HOOKS ---
  const { data: document, isLoading: loadingDoc } = useGetDocumentByIdQuery(docId || "", { skip: !isOpen || !docId });
  const { data: accounts = [], isLoading: loadingAccounts } = useGetAccountsQuery({}, { skip: !isOpen });
  const [processPayment, { isLoading: isSubmitting }] = useProcessPaymentMutation();

  // Lọc chỉ lấy các tài khoản thuộc nhóm Tiền mặt (CASH) hoặc Ngân hàng (BANK)
  const paymentAccounts = useMemo(() => {
    return accounts.filter(acc => 
      acc.accountType === "CASH" || 
      acc.accountType === "BANK" || 
      acc.accountCode.startsWith("111") || 
      acc.accountCode.startsWith("112")
    );
  }, [accounts]);

  // --- LOCAL STATE ---
  const [amount, setAmount] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

  // Tính toán công nợ
  const totalAmount = document?.totalAmount || 0;
  const paidAmount = document?.paidAmount || 0;
  const remainingAmount = totalAmount - paidAmount;

  // Dự phóng sau thanh toán (Real-time Simulation)
  const inputAmount = Number(amount) || 0;
  const newRemaining = Math.max(0, remainingAmount - inputAmount);

  // Auto-fill Data & Reset
  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setReference("");
      setPaymentDate(dayjs().format('YYYY-MM-DD'));
      if (paymentAccounts.length > 0 && !accountId) {
        // ✅ FIX TYPESCRIPT LỖI 'id' does not exist trên Account
        const firstAcc = paymentAccounts[0] as any;
        setAccountId(firstAcc.accountId || firstAcc.id);
      }
    }
  }, [isOpen, paymentAccounts]);

  // --- HANDLERS ---
  const handlePayFull = () => {
    setAmount(remainingAmount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId) return;

    if (inputAmount <= 0) {
      toast.error("Số tiền thanh toán phải lớn hơn 0!"); return;
    }
    if (inputAmount > remainingAmount) {
      toast.error("Số tiền vượt quá dư nợ hiện tại!"); return;
    }
    if (!accountId) {
      toast.error("Vui lòng chọn Nguồn tiền / Tài khoản giao dịch!"); return;
    }

    try {
      await processPayment({
        documentId: docId,
        data: {
          amount: inputAmount,
          accountId,
          reference,
          paymentDate: new Date(paymentDate).toISOString()
        }
      }).unwrap();
      
      toast.success("Đã ghi nhận thanh toán & Gạch nợ thành công!");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi giao dịch! Vui lòng thử lại.");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: { 
      opacity: 1, scale: 1, y: 0, 
      transition: { type: "spring", stiffness: 350, damping: 30, mass: 1 } 
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && docId && (
        <motion.div
          variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-xl"
          style={{ perspective: 1500 }}
        >
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-4xl bg-white dark:bg-[#0B0F19] rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/10 overflow-hidden z-10 flex flex-col md:flex-row"
          >
            
            {/* === CỘT TRÁI: THÔNG TIN HÓA ĐƠN & DỮ LIỆU TRỰC QUAN === */}
            <div className="w-full md:w-[45%] bg-slate-50 dark:bg-slate-900/80 border-r border-slate-200 dark:border-white/5 p-6 sm:p-8 flex flex-col relative overflow-hidden shrink-0">
              {/* Hình nền Watermark */}
              <div className="absolute -left-10 -bottom-10 opacity-[0.03] dark:opacity-5 pointer-events-none">
                <Receipt className="w-64 h-64 text-indigo-500" />
              </div>

              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3.5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/30">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Thanh toán</h2>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 mt-1">
                      <FileText className="w-3.5 h-3.5"/> {(document as any)?.documentNumber || docId}
                    </p>
                  </div>
                </div>

                {loadingDoc ? (
                  <div className="py-20 flex flex-col items-center justify-center text-emerald-500">
                    <Loader2 className="w-10 h-10 animate-spin mb-4"/>
                    <span className="font-bold text-slate-500">Đang quét sổ cái...</span>
                  </div>
                ) : !document ? (
                  <div className="py-20 flex flex-col items-center justify-center text-rose-500">
                    <AlertOctagon className="w-12 h-12 mb-4 opacity-50"/>
                    <span className="font-bold text-slate-500">Lỗi truy xuất</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 flex-1">
                    
                    {/* Đối tác (✅ Đã fix TS: Property partner does not exist) */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Building className="w-3.5 h-3.5"/> Đối tác Giao dịch</p>
                      <p className="font-black text-lg text-slate-800 dark:text-white leading-tight">
                        {(document as any)?.partner?.name || "Khách hàng Vãng lai"}
                      </p>
                    </div>

                    {/* Dư nợ Data Viz */}
                    <div className="flex flex-col gap-3 mt-auto">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-slate-500">Tổng Giá trị:</span>
                        <span className="text-slate-800 dark:text-slate-200">{formatVND(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Đã trả:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{formatVND(paidAmount)}</span>
                      </div>
                      
                      <div className="h-px w-full bg-slate-200 dark:bg-slate-700/50 my-2" />
                      
                      <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                        <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-1">Dư nợ cần thanh toán</p>
                        <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{formatVND(remainingAmount)}</p>
                      </div>
                    </div>

                    {/* Simulation Bar (✅ Đã fix lỗi 17001 gộp 2 thuộc tính style) */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <span>Trạng thái Nợ</span>
                        <span className="text-emerald-600 dark:text-emerald-500">Dự phóng: {formatVND(newRemaining)}</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                        {/* Phần đã trả trong quá khứ */}
                        <div style={{ width: `${totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0}%` }} className="h-full bg-slate-400 dark:bg-slate-600" />
                        
                        {/* Phần sắp trả (Màu xanh chạy) */}
                        <motion.div 
                          layout transition={{ type: "spring", stiffness: 120, damping: 25 }}
                          className="h-full bg-emerald-500"
                          style={{ 
                            width: `${totalAmount > 0 ? (inputAmount / totalAmount) * 100 : 0}%`,
                            backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)', 
                            backgroundSize: '1rem 1rem' 
                          }}
                        />
                        
                        {/* Phần nợ còn lại */}
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
            <div className="flex-1 p-6 sm:p-10 flex flex-col justify-center relative bg-white dark:bg-transparent">
              {remainingAmount === 0 ? (
                 <div className="flex flex-col items-center justify-center text-center h-full">
                    <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">Giao dịch Hoàn tất</h3>
                    <p className="text-sm font-medium text-slate-500 mt-2 max-w-[250px]">Chứng từ này đã được thanh toán 100%. Không phát sinh dư nợ.</p>
                    <button onClick={onClose} className="mt-8 px-8 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold rounded-xl active:scale-95 transition-all">
                      Đóng cửa sổ
                    </button>
                 </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-md mx-auto w-full">
                  
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 border-b border-slate-100 dark:border-slate-800 pb-4">Chi tiết Ủy Nhiệm Chi / Thu</h3>

                  {/* Số tiền thanh toán */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Banknote className="w-4 h-4 text-emerald-500"/> Số tiền Giao dịch *</label>
                      <button type="button" onClick={handlePayFull} className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors shadow-sm active:scale-95">
                        TẤT TOÁN MAX
                      </button>
                    </div>
                    <div className="relative group">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 group-focus-within:text-emerald-500 transition-colors text-lg">₫</span>
                      <input 
                        type="number" min="0" max={remainingAmount} required
                        value={amount} onChange={(e) => setAmount(e.target.value)}
                        placeholder="Nhập số tiền..."
                        className="w-full pl-11 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-white/5 rounded-2xl text-2xl font-black text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:bg-white dark:focus:bg-[#0B0F19] outline-none shadow-inner transition-all"
                      />
                    </div>
                  </div>

                  {/* Chọn Tài khoản Ngân hàng / Cash */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Wallet className="w-4 h-4 text-blue-500"/> Nguồn tiền / Tài khoản *</label>
                    <div className="relative">
                      {loadingAccounts ? (
                        <div className="w-full px-4 py-3.5 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse h-[52px]" />
                      ) : (
                        <select 
                          required value={accountId} onChange={(e) => setAccountId(e.target.value)}
                          className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[#0B0F19] appearance-none cursor-pointer transition-colors"
                        >
                          <option value="">-- Chọn quỹ Tiền mặt / Ngân hàng --</option>
                          {paymentAccounts.map((acc: any) => (
                            // ✅ FIX TYPESCRIPT: acc as any
                            <option key={acc.accountId || acc.id} value={acc.accountId || acc.id}>
                              {acc.accountCode} - {acc.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ArrowRight className="w-4 h-4 text-slate-400 rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Ngày thanh toán */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-purple-500"/> Ngày GD *</label>
                      <input 
                        type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-[#0B0F19] transition-colors"
                      />
                    </div>
                    {/* Mã tham chiếu */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><FileText className="w-4 h-4 text-amber-500"/> Tham chiếu</label>
                      <input 
                        type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                        placeholder="Mã UNC, Hóa đơn..."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-[#0B0F19] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Nút Submit */}
                  <div className="mt-6 flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors">
                      Hủy bỏ
                    </button>
                    <button type="submit" disabled={isSubmitting || inputAmount <= 0} className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingDown className="w-5 h-5" />}
                      Xác nhận Gạch Nợ
                    </button>
                  </div>
                </form>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}