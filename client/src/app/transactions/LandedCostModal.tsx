"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Ship, Loader2, CheckCircle2, 
  Calculator, Plus, Trash2, AlertCircle, TrendingUp, DollarSign 
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetLandedCostsQuery,
  useCreateLandedCostMutation,
  useDeleteLandedCostMutation,
  useAllocateLandedCostMutation
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL PHÂN BỔ CHI PHÍ (LANDED COST)
// ==========================================
interface LandedCostModalProps {
  docId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LandedCostModal({ docId, isOpen, onClose }: LandedCostModalProps) {
  // --- API HOOKS ---
  const { data: landedCosts = [], isLoading: isLoadingCosts } = useGetLandedCostsQuery(
    { documentId: docId }, 
    { skip: !docId } // Chỉ gọi API khi có docId
  );
  
  const [createLandedCost, { isLoading: isCreating }] = useCreateLandedCostMutation();
  const [deleteLandedCost] = useDeleteLandedCostMutation();
  const [allocateCost, { isLoading: isAllocating }] = useAllocateLandedCostMutation();

  // --- LOCAL STATE (FORM) ---
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [allocationMethod, setAllocationMethod] = useState("BY_VALUE");

  // --- HANDLERS ---
  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId) return;

    if (!expenseName || !amount || Number(amount) <= 0) {
      toast.error("Vui lòng nhập tên chi phí và số tiền lớn hơn 0!");
      return;
    }

    try {
      await createLandedCost({
        documentId: docId,
        expenseName,
        amount: Number(amount),
        allocationMethod,
        status: "PENDING"
      }).unwrap();
      
      toast.success("Đã thêm chi phí. Vui lòng ấn Phân bổ để tính vào giá vốn!");
      // Reset form
      setExpenseName("");
      setAmount("");
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi khi thêm chi phí!");
    }
  };

  const handleDelete = async (costId: string) => {
    try {
      await deleteLandedCost(costId).unwrap();
      toast.success("Đã xóa chi phí!");
    } catch (error: any) {
      toast.error(error?.data?.message || "Không thể xóa chi phí đã phân bổ!");
    }
  };

  const handleAllocate = async (costId: string) => {
    try {
      await allocateCost(costId).unwrap();
      toast.success("Phân bổ thành công! Giá vốn kho đã được cập nhật.");
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi thuật toán phân bổ. Vui lòng kiểm tra lại chứng từ!");
    }
  };

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
          {/* Backdrop click */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-4xl glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col md:flex-row max-h-[95vh]"
          >
            {/* ==========================================
                CỘT TRÁI: FORM THÊM CHI PHÍ
                ========================================== */}
            <div className="w-full md:w-[45%] flex flex-col border-r border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                    <Ship className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Landed Cost</h2>
                    <p className="text-xs text-slate-500 font-medium">Cộng chi phí vào Giá vốn</p>
                  </div>
                </div>
                <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Input */}
              <div className="p-6 flex-1 overflow-y-auto">
                <form id="landed-cost-form" onSubmit={handleAddCost} className="space-y-5">
                  
                  {/* Tên chi phí */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tên loại chi phí <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      value={expenseName}
                      onChange={(e) => setExpenseName(e.target.value)}
                      placeholder="VD: Phí Hải Quan, Phí bốc dỡ..." 
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white" 
                    />
                  </div>

                  {/* Số tiền */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Số tiền (VND) <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="VD: 5000000" 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white" 
                      />
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Phương thức phân bổ */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quy tắc Phân bổ</label>
                    <select 
                      value={allocationMethod}
                      onChange={(e) => setAllocationMethod(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                    >
                      <option value="BY_VALUE">Theo Giá trị (Khuyên dùng)</option>
                      <option value="BY_QUANTITY">Theo Số lượng</option>
                      <option value="MANUAL">Thủ công</option>
                    </select>
                    <p className="text-[10px] text-slate-500 flex items-start gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-orange-500" />
                      Theo giá trị: Sản phẩm càng đắt tiền sẽ phải gánh phí vận chuyển càng cao. Đây là chuẩn IFRS.
                    </p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isCreating}
                    className="w-full flex items-center justify-center gap-2 py-3 mt-4 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-sm font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Thêm vào danh sách
                  </button>

                </form>
              </div>
            </div>

            {/* ==========================================
                CỘT PHẢI: DANH SÁCH CHI PHÍ ĐÃ THÊM
                ========================================== */}
            <div className="w-full md:w-[55%] bg-slate-50/80 dark:bg-[#0B0F19]/80 p-6 flex flex-col relative">
              <button onClick={onClose} className="hidden md:flex absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors z-20">
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" /> Các Chi phí chờ Phân bổ
              </h3>

              <div className="flex-1 overflow-y-auto scrollbar-thin pr-2 space-y-3">
                {isLoadingCosts ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                  </div>
                ) : landedCosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                    <Calculator className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm font-medium">Chưa có chi phí nào được ghi nhận</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {landedCosts.map((cost) => (
                      <motion.div 
                        key={cost.landedCostId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-base">{cost.expenseName}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              Quy tắc: {cost.allocationMethod === "BY_VALUE" ? "Theo Giá trị" : "Theo Số lượng"}
                            </p>
                          </div>
                          <span className="font-black text-orange-600 dark:text-orange-400">
                            {formatVND(cost.amount)}
                          </span>
                        </div>

                        {/* Thanh trạng thái & Nút hành động */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                          {cost.isAllocated ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-md">
                              <CheckCircle2 className="w-4 h-4" /> Đã phân bổ vào kho
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-md">
                              <AlertCircle className="w-4 h-4" /> Chờ xử lý
                            </span>
                          )}

                          <div className="flex gap-2">
                            {!cost.isAllocated && (
                              <>
                                <button 
                                  onClick={() => handleDelete(cost.landedCostId)}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors"
                                  title="Xóa chi phí"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleAllocate(cost.landedCostId)}
                                  disabled={isAllocating}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-md active:scale-95 transition-all disabled:opacity-50"
                                >
                                  {isAllocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calculator className="w-3 h-3" />}
                                  Chạy Phân bổ
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}