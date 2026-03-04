"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Calculator, Plus, Trash2, Save, FileEdit, 
  Scale, ShieldAlert, CheckCircle2, Loader2, 
  AlignLeft, Hash, Building2
} from "lucide-react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetAccountsQuery,
  useGetCostCentersQuery,
  useCreateJournalEntryMutation,
  useUpdateJournalEntryMutation,
  JournalEntry
} from "@/state/api";

// ==========================================
// 1. HELPERS & INTERFACES
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

interface JournalLineForm {
  id: string; // Fake ID for React Map Key
  accountId: string;
  costCenterId: string;
  description: string;
  debit: number | string;
  credit: number | string;
}

interface ManualJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: JournalEntry | null; // Truyền vào nếu là Edit Bản Nháp
}

// ==========================================
// COMPONENT CHÍNH: WIZARD TẠO BÚT TOÁN KÉP
// ==========================================
export default function ManualJournalModal({ isOpen, onClose, entry }: ManualJournalModalProps) {

  // --- API HOOKS (Dữ liệu nền) ---
  const { data: accounts = [], isLoading: loadingAccs } = useGetAccountsQuery(undefined, { skip: !isOpen });
  const { data: costCenters = [], isLoading: loadingCCs } = useGetCostCentersQuery(undefined, { skip: !isOpen });
  
  const [createEntry, { isLoading: isCreating }] = useCreateJournalEntryMutation();
  const [updateEntry, { isLoading: isUpdating }] = useUpdateJournalEntryMutation();

  const isSubmitting = isCreating || isUpdating;

  // --- STATE BẢN GHI (HEADER) ---
  const [entryDate, setEntryDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  // --- STATE CHI TIẾT BÚT TOÁN (LINES) ---
  const [lines, setLines] = useState<JournalLineForm[]>([]);

  // Khởi tạo Form khi mở Modal
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        // Chế độ Edit Bản Nháp
        setEntryDate(dayjs(entry.entryDate).format('YYYY-MM-DD'));
        setReference(entry.reference || "");
        setDescription(entry.description || "");
        
        const existingLines = entry.lines?.map(l => ({
          id: l.lineId || Date.now().toString() + Math.random(),
          accountId: l.accountId,
          costCenterId: l.costCenterId || "",
          description: l.description || "",
          debit: l.debit || "",
          credit: l.credit || ""
        })) || [];
        setLines(existingLines.length > 0 ? existingLines : generateEmptyLines(2));
      } else {
        // Chế độ Tạo mới (Mặc định 2 dòng: Nợ / Có)
        setEntryDate(dayjs().format('YYYY-MM-DD'));
        setReference(`JV-${dayjs().format('YYMMDD')}-${Math.floor(Math.random() * 1000)}`);
        setDescription("");
        setLines(generateEmptyLines(2));
      }
    }
  }, [isOpen, entry]);

  const generateEmptyLines = (count: number) => {
    return Array.from({ length: count }).map(() => ({
      id: Date.now().toString() + Math.random(),
      accountId: "",
      costCenterId: "",
      description: "",
      debit: "",
      credit: ""
    }));
  };

  // --- HANDLERS CÁC DÒNG (GRID LOGIC) ---
  const addLine = () => setLines([...lines, ...generateEmptyLines(1)]);
  
  const removeLine = (id: string) => {
    if (lines.length <= 2) return toast.error("Một bút toán kế toán kép phải có ít nhất 2 dòng!");
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof JournalLineForm, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      const updatedLine = { ...line, [field]: value };
      
      // UX Logic: Gõ Nợ thì tự xóa Có, và ngược lại
      if (field === 'debit' && Number(value) > 0) updatedLine.credit = "";
      if (field === 'credit' && Number(value) > 0) updatedLine.debit = "";
      
      return updatedLine;
    }));
  };

  // --- AUTO-BALANCING ENGINE (DATA VIZ) ---
  const balanceCheck = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    lines.forEach(line => {
      totalDebit += Number(line.debit) || 0;
      totalCredit += Number(line.credit) || 0;
    });

    const isBalanced = totalDebit === totalCredit && totalDebit > 0;
    const diff = Math.abs(totalDebit - totalCredit);

    return { totalDebit, totalCredit, isBalanced, diff };
  }, [lines]);

  // --- SUBMIT FORM ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceCheck.isBalanced) {
      toast.error("Bút toán LỆCH TỔNG! Tổng Nợ phải bằng Tổng Có."); return;
    }

    const validLines = lines.filter(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) {
      toast.error("Vui lòng nhập đầy đủ Tài khoản và Số tiền cho ít nhất 2 dòng (Nợ/Có)!"); return;
    }

    try {
      const payload = {
        entryDate: new Date(entryDate).toISOString(),
        reference,
        description,
        postingStatus: "DRAFT", // Luôn lưu dưới dạng nháp trước
        lines: validLines.map(l => ({
          accountId: l.accountId,
          costCenterId: l.costCenterId || null,
          description: l.description || description,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0
        }))
      };

      if (entry) {
        await updateEntry({ id: entry.journalId, data: payload }).unwrap();
        toast.success("Cập nhật Bản nháp thành công!");
      } else {
        await createEntry(payload).unwrap();
        toast.success("Khởi tạo Bút toán Kép thành công!");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi ghi nhận bút toán!");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 30 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-xl"
          style={{ perspective: 1500 }}
        >
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-6xl bg-slate-50 dark:bg-[#0B0F19] rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/10 overflow-hidden z-10 flex flex-col h-[90vh]"
          >
            {/* 1. HEADER KHU VỰC THAO TÁC */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shrink-0 z-20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
                  {entry ? <FileEdit className="w-6 h-6" /> : <Calculator className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {entry ? "Chỉnh sửa Bút toán Nháp" : "Hạch toán Thủ công (Manual Journal)"}
                  </h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Quy tắc Kế toán Kép (Double-Entry)</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-colors hidden sm:block">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 2. BODY KHU VỰC NHẬP LIỆU */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col gap-6 bg-slate-50/50 dark:bg-transparent">
              
              {/* KHỐI THÔNG TIN CHUNG (HEADER BÚT TOÁN) */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">Ngày hạch toán *</label>
                  <input 
                    type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Hash className="w-3.5 h-3.5"/> Mã tham chiếu</label>
                  <input 
                    type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="VD: JV-001..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5"/> Diễn giải chung *</label>
                  <input 
                    type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Lý do hạch toán..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  />
                </div>
              </div>

              {/* KHỐI GRID DÒNG HẠCH TOÁN */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-5 py-4 bg-slate-50 dark:bg-[#0B0F19] border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-500" /> Bảng chi tiết Nợ/Có
                  </h4>
                  <button onClick={addLine} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 dark:bg-indigo-500/20 dark:hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5"/> Thêm dòng
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
                    <thead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 w-[25%]">Tài khoản (Account)</th>
                        <th className="px-4 py-3 w-[15%]">TT Chi phí (Tùy chọn)</th>
                        <th className="px-4 py-3 w-[25%]">Diễn giải dòng</th>
                        <th className="px-4 py-3 w-[15%] text-right text-emerald-600 dark:text-emerald-500">NỢ (Debit)</th>
                        <th className="px-4 py-3 w-[15%] text-right text-blue-600 dark:text-blue-500">CÓ (Credit)</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      <AnimatePresence initial={false}>
                        {lines.map((line, index) => (
                          <motion.tr 
                            key={line.id}
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                          >
                            {/* Chọn Tài Khoản */}
                            <td className="px-4 py-3">
                              {loadingAccs ? <div className="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /> : (
                                <select 
                                  value={line.accountId} onChange={(e) => updateLine(line.id, "accountId", e.target.value)}
                                  className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 dark:text-slate-200"
                                >
                                  <option value="">-- Chọn Tài khoản --</option>
                                  {accounts.map(a => <option key={a.accountId} value={a.accountId}>{a.accountCode} - {a.name}</option>)}
                                </select>
                              )}
                            </td>

                            {/* Chọn Cost Center */}
                            <td className="px-4 py-3">
                              {loadingCCs ? <div className="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /> : (
                                <select 
                                  value={line.costCenterId} onChange={(e) => updateLine(line.id, "costCenterId", e.target.value)}
                                  className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                                >
                                  <option value="">-- Bỏ qua --</option>
                                  {costCenters.map(c => <option key={c.costCenterId} value={c.costCenterId}>{c.code} - {c.name}</option>)}
                                </select>
                              )}
                            </td>

                            {/* Diễn giải dòng */}
                            <td className="px-4 py-3">
                              <input 
                                type="text" value={line.description} onChange={(e) => updateLine(line.id, "description", e.target.value)}
                                placeholder="Ghi chú riêng cho dòng này..."
                                className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </td>

                            {/* Số tiền NỢ */}
                            <td className="px-4 py-3">
                              <input 
                                type="number" min="0" value={line.debit} onChange={(e) => updateLine(line.id, "debit", e.target.value)}
                                placeholder="0" disabled={Number(line.credit) > 0}
                                className="w-full bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-right font-black text-emerald-600 dark:text-emerald-400 disabled:opacity-30 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                              />
                            </td>

                            {/* Số tiền CÓ */}
                            <td className="px-4 py-3">
                              <input 
                                type="number" min="0" value={line.credit} onChange={(e) => updateLine(line.id, "credit", e.target.value)}
                                placeholder="0" disabled={Number(line.debit) > 0}
                                className="w-full bg-blue-50/30 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-right font-black text-blue-600 dark:text-blue-400 disabled:opacity-30 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                              />
                            </td>

                            {/* Xóa dòng */}
                            <td className="px-4 py-3 text-center">
                              <button type="button" onClick={() => removeLine(line.id)} className="p-2 text-rose-400 hover:text-white bg-white hover:bg-rose-500 dark:bg-slate-800 dark:hover:bg-rose-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shadow-sm">
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 3. FOOTER: BẢNG CÂN ĐỐI & SUBMIT (STICKY BOTTOM) */}
            <div className="bg-white dark:bg-[#090D14] border-t border-slate-200 dark:border-white/5 p-6 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
              
              {/* Data Viz: Trạng thái cân bằng */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                
                {/* Trạng thái Lệch/Cân */}
                <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 transition-colors ${balanceCheck.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400' : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400'}`}>
                  {balanceCheck.isBalanced ? <CheckCircle2 className="w-6 h-6"/> : <ShieldAlert className="w-6 h-6 animate-pulse"/>}
                  <div>
                    <h4 className="font-black">{balanceCheck.isBalanced ? "SỔ ĐÃ CÂN BẰNG" : "SỔ ĐANG LỆCH TỔNG"}</h4>
                    {!balanceCheck.isBalanced && <p className="text-xs font-bold mt-0.5">Độ lệch: {formatVND(balanceCheck.diff)}</p>}
                  </div>
                </div>

                {/* Khối Tổng Nợ / Có */}
                <div className="flex items-center gap-6 md:gap-10">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng Nợ (Debit)</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatVND(balanceCheck.totalDebit)}</p>
                  </div>
                  <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng Có (Credit)</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatVND(balanceCheck.totalCredit)}</p>
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" onClick={onClose} disabled={isSubmitting} 
                  className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Hủy & Đóng
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !balanceCheck.isBalanced} 
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  LƯU BÚT TOÁN NHÁP
                </button>
              </div>

            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}