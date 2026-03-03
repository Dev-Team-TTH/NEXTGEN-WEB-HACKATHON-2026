"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, CreditCard, Loader2, CheckCircle2, 
  Wallet, Building2, FileText, AlertCircle, Banknote
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useProcessPaymentMutation,
  useGetDocumentByIdQuery
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL GẠCH NỢ / THANH TOÁN
// ==========================================
interface PaymentModalProps {
  docId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentModal({ docId, isOpen, onClose }: PaymentModalProps) {
  // --- API HOOKS ---
  // Chỉ gọi API kéo chi tiết phiếu khi docId có dữ liệu
  const { data: document, isLoading: isLoadingDoc } = useGetDocumentByIdQuery(docId || "", {
    skip: !docId,
  });
  const [processPayment, { isLoading: isSubmitting }] = useProcessPaymentMutation();

  // --- LOCAL STATE ---
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK_TRANSFER");
  const [reference, setReference] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // Tính toán số dư Nợ (Remaining Amount)
  const totalAmount = document?.totalAmount || 0;
  const paidAmount = document?.paidAmount || 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  // Tự động điền số tiền còn thiếu khi vừa mở Modal
  useEffect(() => {
    if (isOpen && remainingAmount > 0 && !amount) {
      setAmount(remainingAmount.toString());
    }
  }, [isOpen, remainingAmount, amount]);

  // Reset khi đóng
  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setPaymentMethod("BANK_TRANSFER");
      setReference("");
      setNote("");
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handlePayFull = () => {
    setAmount(remainingAmount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!docId) return;

    const payValue = Number(amount);
    if (payValue <= 0) {
      toast.error("Số tiền thanh toán phải lớn hơn 0!");
      return;
    }
    
    if (payValue > remainingAmount) {
      toast.error("Số tiền thanh toán không được vượt quá số công nợ còn lại!");
      return;
    }

    try {
      await processPayment({
        documentId: docId,
        data: {
          amount: payValue,
          method: paymentMethod,
          reference,
          note
        }
      }).unwrap();
      
      toast.success("Ghi nhận thanh toán thành công!");
      onClose(); 
    } catch (error: any) {
      console.error("Lỗi thanh toán:", error);
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi ghi nhận thanh toán!");
    }
  };

  // --- DATA VIZ: TÍNH TOÁN PROGRESS BAR ---
  const currentPayValue = Number(amount) || 0;
  const paidPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  const payingPercent = totalAmount > 0 ? (Math.min(currentPayValue, remainingAmount) / totalAmount) * 100 : 0;

  // --- FORMATTER ---
  const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

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
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Ghi nhận Thanh toán</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {document?.type === "PO" ? "Thanh toán cho Nhà cung cấp" : "Thu tiền từ Khách hàng"}
                  </p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 flex flex-col gap-6">
              
              {isLoadingDoc ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                  <p className="text-sm font-medium">Đang tải dữ liệu chứng từ...</p>
                </div>
              ) : (
                <>
                  {/* DATA VIZ: TỔNG QUAN CÔNG NỢ */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 flex flex-col gap-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mã Phiếu</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{document?.documentNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tổng Giá Trị</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{formatVND(totalAmount)}</p>
                      </div>
                    </div>

                    {/* Progress Bar Siêu Xịn */}
                    <div className="w-full space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-500">Đã trả: <span className="text-slate-700 dark:text-slate-300 font-bold">{formatVND(paidAmount)}</span></span>
                        <span className="text-rose-500">Còn nợ: <span className="font-bold">{formatVND(remainingAmount)}</span></span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                        {/* Phần đã thanh toán trước đó (Màu xám/xanh dương) */}
                        <div className="h-full bg-slate-400 dark:bg-slate-500" style={{ width: `${paidPercent}%` }}></div>
                        {/* Phần ĐANG thanh toán (Màu xanh lá rực rỡ) */}
                        <motion.div 
                          className="h-full bg-emerald-500" 
                          initial={{ width: 0 }}
                          animate={{ width: `${payingPercent}%` }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* FORM NHẬP LIỆU */}
                  <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                    
                    {/* Số tiền thanh toán */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-emerald-500" /> Số tiền thanh toán <span className="text-rose-500">*</span>
                        </label>
                        <button 
                          type="button" 
                          onClick={handlePayFull}
                          className="text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded transition-colors hover:bg-emerald-200 dark:hover:bg-emerald-500/40"
                        >
                          Điền toàn bộ ({formatVND(remainingAmount)})
                        </button>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          max={remainingAmount}
                          placeholder="Nhập số tiền..." 
                          className="w-full pl-4 pr-12 py-3 text-lg font-bold bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">VND</span>
                      </div>
                      {Number(amount) > remainingAmount && (
                        <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" /> Số tiền không được lớn hơn công nợ hiện tại.
                        </p>
                      )}
                    </div>

                    {/* Phương thức thanh toán */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-slate-400" /> Phương thức <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("BANK_TRANSFER")}
                          className={`p-3 border rounded-xl flex items-center gap-2 transition-all ${paymentMethod === "BANK_TRANSFER" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold" : "border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                        >
                          <Building2 className="w-4 h-4" /> Chuyển khoản
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("CASH")}
                          className={`p-3 border rounded-xl flex items-center gap-2 transition-all ${paymentMethod === "CASH" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold" : "border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                        >
                          <Banknote className="w-4 h-4" /> Tiền mặt
                        </button>
                      </div>
                    </div>

                    {/* Mã Tham chiếu */}
                    <div className="space-y-1.5 mt-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" /> Mã giao dịch / Tham chiếu
                      </label>
                      <input 
                        type="text" 
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="VD: UNC12345, Mã bill ngân hàng..." 
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white uppercase" 
                      />
                    </div>

                    {/* Ghi chú */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ghi chú</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ghi chú nội dung thanh toán..."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white resize-none"
                      />
                    </div>

                  </form>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                form="payment-form" 
                disabled={isSubmitting || isLoadingDoc || remainingAmount === 0 || Number(amount) > remainingAmount} 
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang ghi nhận...</> : <><CheckCircle2 className="w-4 h-4" /> Xác nhận Thu/Chi</>}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}