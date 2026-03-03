"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { X, FileEdit, Plus, Trash2, CheckCircle2, AlertOctagon, Loader2, Calculator } from "lucide-react";
import toast from "react-hot-toast";

// --- REDUX & API ---
import { 
  useCreateJournalEntryMutation, 
  useGetAccountsQuery, 
  useGetCostCentersQuery 
} from "@/state/api";

interface ManualJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManualJournalModal({ isOpen, onClose }: ManualJournalModalProps) {
  // --- API HOOKS ---
  const { data: accounts } = useGetAccountsQuery({});
  const { data: costCenters } = useGetCostCentersQuery();
  const [createJournalEntry, { isLoading: isSubmitting }] = useCreateJournalEntryMutation();

  // --- LOCAL STATE ---
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Mảng các dòng định khoản (lines)
  const [lines, setLines] = useState([
    { id: 1, accountId: "", costCenterId: "", debit: "", credit: "", desc: "" },
    { id: 2, accountId: "", costCenterId: "", debit: "", credit: "", desc: "" },
  ]);

  useEffect(() => {
    if (isOpen) {
      setDescription(""); setReference(""); setEntryDate(new Date().toISOString().split("T")[0]);
      setLines([
        { id: Date.now(), accountId: "", costCenterId: "", debit: "", credit: "", desc: "" },
        { id: Date.now() + 1, accountId: "", costCenterId: "", debit: "", credit: "", desc: "" },
      ]);
    }
  }, [isOpen]);

  // Tính tổng Nợ và Có
  const { totalDebit, totalCredit } = useMemo(() => {
    let td = 0; let tc = 0;
    lines.forEach(l => {
      td += Number(l.debit) || 0;
      tc += Number(l.credit) || 0;
    });
    return { totalDebit: td, totalCredit: tc };
  }, [lines]);

  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  // Xử lý Thay đổi
  const updateLine = (id: number, field: string, value: string) => {
    setLines(lines.map(l => {
      if (l.id === id) {
        const newLine = { ...l, [field]: value };
        // Không cho phép nhập cả Nợ và Có trên 1 dòng
        if (field === "debit" && Number(value) > 0) newLine.credit = "";
        if (field === "credit" && Number(value) > 0) newLine.debit = "";
        return newLine;
      }
      return l;
    }));
  };

  const addLine = () => setLines([...lines, { id: Date.now(), accountId: "", costCenterId: "", debit: "", credit: "", desc: "" }]);
  const removeLine = (id: number) => {
    if (lines.length <= 2) return toast.error("Phải có ít nhất 2 dòng hạch toán!");
    setLines(lines.filter(l => l.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !reference) return toast.error("Vui lòng nhập Diễn giải và Mã Tham chiếu!");
    if (!isBalanced) return toast.error("Tổng Nợ phải bằng Tổng Có!");

    const validLines = lines.filter(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) return toast.error("Vui lòng điền đủ Tài khoản và Số tiền!");

    try {
      await createJournalEntry({
        entryDate,
        reference,
        description,
        postingStatus: "DRAFT", // Luôn lưu nháp trước khi duyệt
        lines: validLines.map(l => ({
          accountId: l.accountId,
          costCenterId: l.costCenterId || null,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.desc
        }))
      }).unwrap();
      toast.success("Đã tạo bút toán nháp thành công!");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi khi lưu bút toán!");
    }
  };

  const formatVND = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } }, exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } } };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div variants={backdropVariants} initial="hidden" animate="visible" exit="hidden" className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />
          <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative w-full max-w-5xl glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col max-h-[95vh]">
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center"><FileEdit className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                <div><h2 className="text-xl font-bold text-slate-900 dark:text-white">Tạo Bút Toán Thủ Công</h2><p className="text-xs text-slate-500">Kế toán ghi nhận nghiệp vụ phát sinh</p></div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto scrollbar-thin flex flex-col gap-6">
              {/* Thông tin chung */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Ngày HT <span className="text-rose-500">*</span></label>
                  <input type="date" value={entryDate} onChange={(e)=>setEntryDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Chứng từ gốc (Ref) <span className="text-rose-500">*</span></label>
                  <input type="text" value={reference} onChange={(e)=>setReference(e.target.value)} placeholder="VD: PT-001..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Diễn giải chung <span className="text-rose-500">*</span></label>
                  <input type="text" value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="VD: Chi tiền điện..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none text-slate-900 dark:text-white" />
                </div>
              </div>

              {/* Bảng hạch toán */}
              <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-white/10">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Chi tiết Định khoản</h3>
                  <button onClick={addLine} className="text-xs font-bold text-blue-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Thêm dòng</button>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="hidden sm:flex gap-3 text-[10px] font-bold text-slate-500 uppercase px-1">
                    <div className="flex-[3]">Tài khoản (Account)</div>
                    <div className="flex-[2]">Diễn giải dòng</div>
                    <div className="flex-[1.5]">Nợ (Debit)</div>
                    <div className="flex-[1.5]">Có (Credit)</div>
                    <div className="w-8"></div>
                  </div>

                  <AnimatePresence>
                    {lines.map((l) => (
                      <motion.div key={l.id} initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="flex flex-col sm:flex-row gap-3 items-start">
                        <select value={l.accountId} onChange={(e)=>updateLine(l.id, "accountId", e.target.value)} className="flex-[3] w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none">
                          <option value="">Chọn TK...</option>
                          {accounts?.map(a => <option key={a.accountId} value={a.accountId}>{a.accountCode} - {a.name}</option>)}
                        </select>
                        <input type="text" value={l.desc} onChange={(e)=>updateLine(l.id, "desc", e.target.value)} placeholder="Diễn giải..." className="flex-[2] w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none" />
                        <input type="number" min="0" value={l.debit} onChange={(e)=>updateLine(l.id, "debit", e.target.value)} placeholder="0" className="flex-[1.5] w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 font-bold rounded-lg text-sm outline-none text-right" disabled={Number(l.credit)>0} />
                        <input type="number" min="0" value={l.credit} onChange={(e)=>updateLine(l.id, "credit", e.target.value)} placeholder="0" className="flex-[1.5] w-full px-3 py-2 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 font-bold rounded-lg text-sm outline-none text-right" disabled={Number(l.debit)>0} />
                        <button onClick={()=>removeLine(l.id)} className="w-8 h-[38px] flex items-center justify-center text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                
                {/* Tổng Nợ / Có */}
                <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-t border-slate-200 dark:border-white/10">
                  <div className={`flex items-center gap-2 text-sm font-bold ${isBalanced ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isBalanced ? <CheckCircle2 className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5 animate-pulse" />}
                    {isBalanced ? "Đã Cân Bằng" : `Lệch: ${formatVND(Math.abs(totalDebit - totalCredit))}`}
                  </div>
                  <div className="flex gap-6 mt-2 sm:mt-0 font-black text-lg">
                    <span className="text-blue-600">{formatVND(totalDebit)}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-orange-600">{formatVND(totalCredit)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end gap-3 shrink-0">
              <button onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Hủy</button>
              <button onClick={handleSubmit} disabled={isSubmitting || !isBalanced} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Lưu Bút toán Nháp
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}