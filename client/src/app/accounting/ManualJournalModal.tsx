"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calculator, Plus, Trash2, Save, FileEdit, 
  Scale, ShieldAlert, CheckCircle2, Loader2, 
  AlignLeft, Hash, CalendarDays
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux";
import { 
  useGetAccountsQuery,
  useGetCostCentersQuery,
  useGetFiscalPeriodsQuery,
  useCreateJournalEntryMutation,
  useUpdateJournalEntryMutation,
  JournalEntry
} from "@/state/api";

// --- IMPORT CORE MODAL & UTILS ---
import Modal from "@/app/(components)/Modal";
import { formatVND, safeRound, formatDate } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

// ==========================================
// 1. INTERFACES
// ==========================================
interface JournalLineForm {
  id: string; 
  accountId: string;
  costCenterId: string;
  description: string;
  debit: number | string;
  credit: number | string;
}

interface ManualJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: JournalEntry | null; 
}

const getTodayInputFormat = () => new Date().toISOString().split('T')[0];

const generateJVReference = () => {
  const d = new Date();
  const dateStr = `${d.getFullYear().toString().slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `JV-${dateStr}-${rand}`;
};

// ==========================================
// COMPONENT CHÍNH: WIZARD TẠO BÚT TOÁN KÉP
// ==========================================
export default function ManualJournalModal({ isOpen, onClose, entry }: ManualJournalModalProps) {

  // 🚀 BỐI CẢNH (CONTEXT)
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- API HOOKS ---
  const { data: accounts = [], isLoading: loadingAccs } = useGetAccountsQuery(undefined, { skip: !isOpen });
  const { data: costCenters = [], isLoading: loadingCCs } = useGetCostCentersQuery(undefined, { skip: !isOpen });
  const { data: periods = [], isLoading: loadingPeriods } = useGetFiscalPeriodsQuery(undefined, { skip: !isOpen });
  
  const [createEntry, { isLoading: isCreating }] = useCreateJournalEntryMutation();
  const [updateEntry, { isLoading: isUpdating }] = useUpdateJournalEntryMutation();

  const isSubmitting = isCreating || isUpdating;

  // --- STATE BẢN GHI (HEADER CHUẨN HÓA) ---
  const [entryDate, setEntryDate] = useState(getTodayInputFormat());
  const [fiscalPeriodId, setFiscalPeriodId] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  // --- STATE CHI TIẾT BÚT TOÁN (LINES) ---
  const [lines, setLines] = useState<JournalLineForm[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setEntryDate(new Date(entry.entryDate).toISOString().split('T')[0]);
        setFiscalPeriodId(entry.fiscalPeriodId || ""); 
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
        setEntryDate(getTodayInputFormat());
        setFiscalPeriodId("");
        setReference(generateJVReference());
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

  const addLine = () => setLines([...lines, ...generateEmptyLines(1)]);
  const removeLine = (id: string) => {
    if (lines.length <= 2) return toast.error("Một bút toán kế toán kép phải có ít nhất 2 dòng!");
    setLines(lines.filter(l => l.id !== id));
  };
  const updateLine = (id: string, field: keyof JournalLineForm, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      const updatedLine = { ...line, [field]: value };
      if (field === 'debit' && Number(value) > 0) updatedLine.credit = "";
      if (field === 'credit' && Number(value) > 0) updatedLine.debit = "";
      return updatedLine;
    }));
  };

  const balanceCheck = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    lines.forEach(line => {
      totalDebit = safeRound(totalDebit + (Number(line.debit) || 0));
      totalCredit = safeRound(totalCredit + (Number(line.credit) || 0));
    });
    const isBalanced = totalDebit === totalCredit && totalDebit > 0;
    const diff = safeRound(Math.abs(totalDebit - totalCredit));
    return { totalDebit, totalCredit, isBalanced, diff };
  }, [lines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🚀 LÁ CHẮN CHI NHÁNH
    if (!activeBranchId) {
      toast.error("Không tìm thấy Chi nhánh làm việc. Vui lòng F5 lại trang!"); return;
    }

    if (!fiscalPeriodId) {
      toast.error("Vui lòng chọn Kỳ Kế Toán (Fiscal Period) để khóa sổ!"); return;
    }
    if (!balanceCheck.isBalanced) {
      toast.error("Bút toán LỆCH TỔNG! Tổng Nợ phải bằng Tổng Có."); return;
    }
    const validLines = lines.filter(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) {
      toast.error("Vui lòng nhập đầy đủ Tài khoản và Số tiền cho ít nhất 2 dòng (Nợ/Có)!"); return;
    }

    try {
      const payload = {
        branchId: activeBranchId, // 🚀 BƠM CONTEXT CHI NHÁNH VÀO PAYLOAD
        fiscalPeriodId, 
        entryDate: new Date(entryDate).toISOString(),
        reference,
        description,
        postingStatus: "DRAFT", 
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

  const modalFooter = (
    <>
      <button 
        type="button" onClick={onClose} disabled={isSubmitting} 
        className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors duration-500 disabled:opacity-50"
      >
        Hủy & Đóng
      </button>
      <button 
        onClick={handleSubmit} 
        disabled={isSubmitting || !balanceCheck.isBalanced || !fiscalPeriodId} 
        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        LƯU BÚT TOÁN NHÁP
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entry ? "Chỉnh sửa Bút toán Nháp" : "Hạch toán Thủ công (Manual Journal)"}
      subtitle="Quy tắc Kế toán Kép (Double-Entry) với Ràng buộc Khóa sổ"
      icon={entry ? <FileEdit className="w-6 h-6 text-indigo-500" /> : <Calculator className="w-6 h-6 text-indigo-500" />}
      maxWidth="max-w-7xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col gap-6 transition-colors duration-500">
        
        {/* KHỐI THÔNG TIN CHUNG */}
        <div className="glass p-6 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transition-colors duration-500">
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500">Ngày hạch toán *</label>
            <input 
              type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-500 shadow-sm"
            />
          </div>
          
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-rose-500 uppercase flex items-center gap-1.5 group-focus-within:text-rose-600 transition-colors duration-500"><CalendarDays className="w-3.5 h-3.5"/> Kỳ Kế Toán *</label>
            {loadingPeriods ? <div className="h-[52px] w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl transition-colors duration-500" /> : (
              <select 
                value={fiscalPeriodId} onChange={(e) => setFiscalPeriodId(e.target.value)} required
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 transition-colors duration-500 shadow-sm cursor-pointer"
              >
                <option value="">-- Chọn Kỳ --</option>
                {periods.map((p: any) => (
                  // 🚀 LÁ CHẮN BẢO MẬT: Khóa không cho phép chọn Kỳ Kế toán đã đóng
                  <option key={p.periodId} value={p.periodId} disabled={p.isClosed || p.status === "CLOSED"}>
                    {p.periodName} {p.isClosed || p.status === "CLOSED" ? "(Đã Khóa)" : `(${formatDate(p.startDate, 'MM/YYYY')})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500"><Hash className="w-3.5 h-3.5"/> Mã tham chiếu</label>
            <input 
              type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="VD: JV-001..."
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-500 shadow-sm"
            />
          </div>
          
          <div className="space-y-1.5 lg:col-span-1 group">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500"><AlignLeft className="w-3.5 h-3.5"/> Diễn giải chung *</label>
            <input 
              type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Lý do hạch toán..."
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-500 shadow-sm"
            />
          </div>
        </div>

        {/* KHỐI GRID DÒNG HẠCH TOÁN */}
        <div className="glass-panel rounded-3xl overflow-hidden shadow-sm flex flex-col transition-colors duration-500">
          <div className="px-5 py-4 bg-slate-50 dark:bg-[#0B0F19] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between transition-colors duration-500">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 transition-colors duration-500">
              <Calculator className="w-5 h-5 text-indigo-500" /> Bảng chi tiết Nợ/Có
            </h4>
            <button onClick={addLine} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 dark:bg-indigo-500/20 dark:hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5"/> Thêm dòng
            </button>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar max-h-[300px]">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
              <thead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10 transition-colors duration-500">
                <tr>
                  <th className="px-4 py-3 w-[25%]">Tài khoản (Account)</th>
                  <th className="px-4 py-3 w-[15%]">TT Chi phí (Tùy chọn)</th>
                  <th className="px-4 py-3 w-[25%]">Diễn giải dòng</th>
                  <th className="px-4 py-3 w-[15%] text-right text-emerald-600 dark:text-emerald-500">NỢ (Debit)</th>
                  <th className="px-4 py-3 w-[15%] text-right text-blue-600 dark:text-blue-500">CÓ (Credit)</th>
                  <th className="px-4 py-3 w-10 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-transparent transition-colors duration-500">
                <AnimatePresence initial={false}>
                  {lines.map((line, index) => (
                    <motion.tr 
                      key={line.id}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                      className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-500"
                    >
                      <td className="px-4 py-3">
                        {loadingAccs ? <div className="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse transition-colors duration-500" /> : (
                          <select 
                            value={line.accountId} onChange={(e) => updateLine(line.id, "accountId", e.target.value)}
                            className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 dark:text-slate-200 transition-colors duration-500 cursor-pointer"
                          >
                            <option value="">-- Chọn Tài khoản --</option>
                            {accounts.map((a: any) => <option key={a.accountId} value={a.accountId}>{a.accountCode} - {a.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {loadingCCs ? <div className="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse transition-colors duration-500" /> : (
                          <select 
                            value={line.costCenterId} onChange={(e) => updateLine(line.id, "costCenterId", e.target.value)}
                            className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 transition-colors duration-500 cursor-pointer"
                          >
                            <option value="">-- Bỏ qua --</option>
                            {costCenters.map((c: any) => <option key={c.costCenterId} value={c.costCenterId}>{c.code} - {c.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" value={line.description} onChange={(e) => updateLine(line.id, "description", e.target.value)}
                          placeholder="Ghi chú riêng cho dòng này..."
                          className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" min="0" step="any" value={line.debit} onChange={(e) => updateLine(line.id, "debit", e.target.value)}
                          placeholder="0" disabled={Number(line.credit) > 0}
                          className="w-full bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-right font-black text-emerald-600 dark:text-emerald-400 disabled:opacity-30 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition-colors duration-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" min="0" step="any" value={line.credit} onChange={(e) => updateLine(line.id, "credit", e.target.value)}
                          placeholder="0" disabled={Number(line.debit) > 0}
                          className="w-full bg-blue-50/30 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-right font-black text-blue-600 dark:text-blue-400 disabled:opacity-30 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition-colors duration-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button type="button" onClick={() => removeLine(line.id)} className="p-2 text-rose-400 hover:text-rose-600 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
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

        {/* 3. BẢNG CÂN ĐỐI (BALANCE CHECK) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 bg-slate-50/80 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors duration-500">
          <div className={cn(
            "px-4 py-3 rounded-2xl border flex items-center gap-3 transition-colors duration-500 shadow-sm",
            balanceCheck.isBalanced 
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400" 
              : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400"
          )}>
            {balanceCheck.isBalanced ? <CheckCircle2 className="w-6 h-6"/> : <ShieldAlert className="w-6 h-6 animate-pulse"/>}
            <div>
              <h4 className="font-black">{balanceCheck.isBalanced ? "SỔ ĐÃ CÂN BẰNG" : "SỔ ĐANG LỆCH TỔNG"}</h4>
              {!balanceCheck.isBalanced && <p className="text-xs font-bold mt-0.5">Độ lệch: {formatVND(balanceCheck.diff)}</p>}
            </div>
          </div>
          <div className="flex items-center gap-6 md:gap-10 pr-2">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 transition-colors duration-500">Tổng Nợ (Debit)</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 transition-colors duration-500">{formatVND(balanceCheck.totalDebit)}</p>
            </div>
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 transition-colors duration-500" />
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 transition-colors duration-500">Tổng Có (Credit)</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 transition-colors duration-500">{formatVND(balanceCheck.totalCredit)}</p>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}