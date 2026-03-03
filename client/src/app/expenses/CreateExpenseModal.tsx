"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Receipt, Plus, Trash2, CheckCircle2, 
  Loader2, FileText, CalendarDays, DollarSign, AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { 
  useCreateExpenseMutation,
  useGetAccountsQuery,
  useGetCostCentersQuery,
  Expense //
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL TẠO PHIẾU ĐỀ NGHỊ THANH TOÁN
// ==========================================
interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateExpenseModal({ isOpen, onClose }: CreateExpenseModalProps) {
  // --- API HOOKS ---
  const [createExpense, { isLoading: isSubmitting }] = useCreateExpenseMutation(); //
  const { data: accounts = [], isLoading: isLoadingAccounts } = useGetAccountsQuery({}); //
  const { data: costCenters = [], isLoading: isLoadingCostCenters } = useGetCostCentersQuery(); //

  // Lọc lấy danh sách tài khoản hoạt động
  const activeAccounts = useMemo(() => accounts.filter(acc => acc.isActive), [accounts]);

  // --- LOCAL STATE (FORM DATA) ---
  const [entryDate, setEntryDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  // Mảng các hạng mục chi phí (Dynamic Lines)
  // id ở đây chỉ dùng để quản lý Key trong React, không gửi lên server
  const [lines, setLines] = useState([
    { id: Date.now(), accountId: "", costCenterId: "", amount: "", notes: "" }
  ]);

  // Reset form khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setEntryDate(dayjs().format('YYYY-MM-DD'));
      setReference("");
      setDescription("");
      setLines([{ id: Date.now(), accountId: "", costCenterId: "", amount: "", notes: "" }]);
    }
  }, [isOpen]);

  // --- TÍNH TOÁN DATA VIZ: TỔNG TIỀN ---
  const totalAmount = useMemo(() => {
    return lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  }, [lines]);

  const formatVND = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  // --- HANDLERS DYNAMIC LINES ---
  const addLine = () => {
    setLines([...lines, { id: Date.now(), accountId: "", costCenterId: "", amount: "", notes: "" }]);
  };

  const removeLine = (id: number) => {
    if (lines.length === 1) {
      toast.error("Phải có ít nhất 1 hạng mục chi phí!");
      return;
    }
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: number, field: string, value: string) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  // --- SUBMIT TỜ TRÌNH ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !reference) {
      toast.error("Vui lòng nhập Diễn giải và Mã tham chiếu!");
      return;
    }

    const validLines = lines.filter(l => l.accountId && Number(l.amount) > 0);
    if (validLines.length === 0) {
      toast.error("Vui lòng điền đủ Tài khoản chi phí và Số tiền!");
      return;
    }

    try {
      /**
       * ✅ FIX TYPESCRIPT: 
       * Ép kiểu "any" tạm thời cho payload khi POST vì Backend sẽ tự sinh lineId.
       * Cấu trúc payload vẫn tuân thủ logic JournalLine: chi phí là Nợ (Debit).
       */
      const payload: any = {
        entryDate,
        reference,
        description,
        postingStatus: "DRAFT", //
        lines: validLines.map(l => ({
          accountId: l.accountId,
          costCenterId: l.costCenterId || null,
          debit: Number(l.amount), 
          credit: 0,
          description: l.notes || description
        }))
      };

      await createExpense(payload).unwrap(); //
      
      toast.success("Đã tạo Phiếu đề nghị thanh toán thành công!");
      onClose();
    } catch (error: any) {
      console.error("Lỗi tạo phiếu chi:", error);
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi tạo phiếu chi!");
    }
  };

  // --- ANIMATION CONFIG (60FPS) ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-4xl glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col max-h-[95vh]"
          >
            {/* 1. HEADER */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Lập Phiếu Đề Nghị Chi</h2>
                  <p className="text-xs text-slate-500 font-medium">Tạo yêu cầu thanh toán chi phí nội bộ</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. BODY FORM (SCROLLABLE) */}
            <div className="p-6 overflow-y-auto scrollbar-thin bg-white/30 dark:bg-black/10 flex flex-col gap-6">
              
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Phiếu chi sẽ được lưu ở trạng thái <b>Bản Nháp</b>. Bạn cần Trình ký để gửi lên cấp trên phê duyệt.</p>
              </div>

              {/* Thông tin chung */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" /> Ngày lập <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="date" 
                    value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Mã tham chiếu <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={reference} onChange={(e) => setReference(e.target.value)}
                    placeholder="VD: BILL-001" 
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white uppercase" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Diễn giải <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="Lý do chi tiền..." 
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                  />
                </div>
              </div>

              {/* Bảng hạng mục chi phí (Dynamic) */}
              <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-white/10">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Chi tiết Khoản chi</h3>
                  <button type="button" onClick={addLine} className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 px-2 py-1.5 rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Thêm dòng
                  </button>
                </div>
                
                <div className="p-4 flex flex-col gap-3">
                  <div className="hidden md:flex gap-3 text-[10px] font-bold text-slate-500 uppercase px-1">
                    <div className="flex-[2]">Loại chi phí (Tài khoản) *</div>
                    <div className="flex-[1.5]">Phòng ban / Dự án</div>
                    <div className="flex-[1.5]">Số tiền (VND) *</div>
                    <div className="w-8"></div>
                  </div>

                  <AnimatePresence initial={false}>
                    {lines.map((line) => (
                      <motion.div 
                        key={line.id} 
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col md:flex-row gap-3 items-start md:items-center"
                      >
                        <div className="w-full md:flex-[2]">
                          <select 
                            value={line.accountId} onChange={(e)=>updateLine(line.id, "accountId", e.target.value)} 
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Chọn tài khoản --</option>
                            {activeAccounts.map(a => <option key={a.accountId} value={a.accountId}>{a.accountCode} - {a.name}</option>)}
                          </select>
                        </div>
                        
                        <div className="w-full md:flex-[1.5]">
                          <select 
                            value={line.costCenterId} onChange={(e)=>updateLine(line.id, "costCenterId", e.target.value)} 
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Cả công ty --</option>
                            {costCenters?.map(c => <option key={c.costCenterId} value={c.costCenterId}>{c.name}</option>)}
                          </select>
                        </div>

                        <div className="w-full md:flex-[1.5] relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                          <input 
                            type="number" min="0" 
                            value={line.amount} onChange={(e)=>updateLine(line.id, "amount", e.target.value)} 
                            placeholder="0" 
                            className="w-full pl-8 pr-3 py-2 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 font-bold rounded-lg text-sm outline-none text-right" 
                          />
                        </div>

                        <button 
                          type="button" onClick={()=>removeLine(line.id)} 
                          className="p-2 text-rose-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                
                {/* 3. TỔNG CỘNG (DATA VIZ) */}
                <div className="bg-slate-800 dark:bg-[#0B0F19] text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tổng giá trị thanh toán</div>
                  <div className="text-2xl font-black text-emerald-400 tracking-tight">
                    {formatVND(totalAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. FOOTER */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end gap-3 shrink-0">
              <button onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Hủy</button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting || totalAmount <= 0} 
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Lưu Bản Nháp
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}