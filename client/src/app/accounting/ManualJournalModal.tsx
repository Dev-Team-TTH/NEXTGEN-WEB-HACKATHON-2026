"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calculator, Plus, Trash2, Save, FileEdit, 
  Scale, ShieldAlert, CheckCircle2, Loader2, 
  AlignLeft, Hash, CalendarDays, Building
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG: Context Chi nhánh
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
  // 🚀 BỐI CẢNH REDUX (ISOLATION GUARD)
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- API HOOKS (🚀 ĐÃ VÁ LỖI LUỒNG ĐỌC: BƠM BỐI CẢNH VÀO QUERY ĐỂ CHỐNG RÒ RỈ MASTER DATA) ---
  const { data: accounts = [], isLoading: loadingAccs } = useGetAccountsQuery(
    { branchId: activeBranchId } as any, 
    { skip: !isOpen || !activeBranchId }
  );
  
  const { data: costCenters = [], isLoading: loadingCCs } = useGetCostCentersQuery(
    { branchId: activeBranchId } as any, 
    { skip: !isOpen || !activeBranchId }
  );
  
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
        
        const existingLines = entry.lines?.map((l: any) => ({
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
      // Mutual exclusion for debit/credit
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
    
    // 🚀 LÁ CHẮN 1: BỐI CẢNH CHI NHÁNH
    if (!activeBranchId) {
      toast.error("Không tìm thấy bối cảnh Chi nhánh. Vui lòng tải lại trang!"); return;
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
        branchId: activeBranchId, // 🚀 KHÓA LỖ HỔNG ORPHAN DATA
        fiscalPeriodId, 
        entryDate: new Date(entryDate).toISOString(),
        reference,
        description,
        postingStatus: "DRAFT", 
        lines: validLines.map(l => ({
          accountId: l.accountId,
          costCenterId: l.costCenterId || null,
          description: l.description || description,
          // 🚀 LÁ CHẮN 2: KHỬ SAI SỐ TOÁN HỌC KHI LƯU DB BẰNG safeRound
          debit: safeRound(Number(l.debit) || 0),
          credit: safeRound(Number(l.credit) || 0)
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

  // --- LÁ CHẮN GIAO DIỆN KHI THIẾU CHI NHÁNH ---
  if (!activeBranchId && isOpen) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Cảnh báo Hệ thống" maxWidth="max-w-md">
        <div className="flex flex-col items-center justify-center py-10 text-center transition-colors duration-500">
          <Building className="w-16 h-16 text-amber-500 mb-4 animate-pulse transition-colors duration-500" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Chưa chọn Chi nhánh</h2>
          <p className="text-slate-500 text-sm transition-colors duration-500">Vui lòng chọn Chi nhánh làm việc trên thanh Header trước khi hạch toán.</p>
          <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold transition-colors duration-500 text-slate-800 dark:text-white">Đóng lại</button>
        </div>
      </Modal>
    );
  }

  const modalFooter = (
    <div className="flex items-center justify-end gap-3 w-full transition-colors duration-500">
      <button 
        type="button" onClick={onClose} disabled={isSubmitting} 
        className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors duration-500 shadow-sm disabled:opacity-50"
      >
        Hủy & Đóng
      </button>
      <button 
        onClick={handleSubmit} 
        disabled={isSubmitting || !balanceCheck.isBalanced || !fiscalPeriodId} 
        className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin transition-colors duration-500" /> : <Save className="w-5 h-5 transition-colors duration-500" />}
        LƯU BÚT TOÁN NHÁP
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entry ? "Chỉnh sửa Bút toán Nháp" : "Hạch toán Thủ công (Manual Journal)"}
      subtitle="Quy tắc Kế toán Kép (Double-Entry) với Ràng buộc Khóa sổ"
      icon={entry ? <FileEdit className="w-6 h-6 text-indigo-500 transition-colors duration-500" /> : <Calculator className="w-6 h-6 text-indigo-500 transition-colors duration-500" />}
      maxWidth="max-w-7xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col gap-6 bg-slate-50/50 dark:bg-transparent transition-colors duration-500">
        
        {/* KHỐI THÔNG TIN CHUNG */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transition-colors duration-500">
          <div className="space-y-1.5 group transition-colors duration-500">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500">Ngày hạch toán *</label>
            <input 
              type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-500 shadow-sm"
            />
          </div>
          <div className="space-y-1.5 group transition-colors duration-500">
            <label className="text-xs font-bold text-rose-500 uppercase flex items-center gap-1.5 transition-colors duration-500"><CalendarDays className="w-3.5 h-3.5 transition-colors duration-500"/> Kỳ Kế Toán *</label>
            {loadingPeriods ? <div className="h-[46px] w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl transition-colors duration-500" /> : (
              <select 
                value={fiscalPeriodId} onChange={(e) => setFiscalPeriodId(e.target.value)} required
                className="w-full px-4 py-3 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-sm font-bold text-rose-700 dark:text-rose-400 outline-none focus:ring-2 focus:ring-rose-500 transition-colors duration-500 shadow-sm cursor-pointer"
              >
                <option value="" className="transition-colors duration-500">-- Chọn Kỳ --</option>
                {periods.map((p: any) => <option key={p.periodId} value={p.periodId} disabled={p.isClosed || p.status === "CLOSED"} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900 transition-colors duration-500">{p.periodName} ({formatDate(p.startDate, 'MM/YYYY')}) {p.isClosed ? "(Đã Khóa)" : ""}</option>)}
              </select>
            )}
          </div>
          <div className="space-y-1.5 group transition-colors duration-500">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500"><Hash className="w-3.5 h-3.5 transition-colors duration-500"/> Mã tham chiếu</label>
            <input 
              type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="VD: JV-001..."
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-500 shadow-sm uppercase"
            />
          </div>
          <div className="space-y-1.5 lg:col-span-1 group transition-colors duration-500">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500"><AlignLeft className="w-3.5 h-3.5 transition-colors duration-500"/> Diễn giải chung *</label>
            <input 
              type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Lý do hạch toán..."
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-500 shadow-sm"
            />
          </div>
        </div>

        {/* KHỐI GRID DÒNG HẠCH TOÁN */}
        <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col transition-colors duration-500">
          <div className="px-5 py-4 bg-slate-50 dark:bg-[#0B0F19] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between transition-colors duration-500">
            <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-widest transition-colors duration-500">
              <Calculator className="w-4 h-4 text-indigo-500 transition-colors duration-500" /> Bảng chi tiết Nợ/Có
            </h4>
            <button onClick={addLine} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 dark:bg-indigo-500/20 dark:hover:bg-indigo-600 px-4 py-2 rounded-xl transition-all duration-500 shadow-sm active:scale-95">
              <Plus className="w-3.5 h-3.5 transition-colors duration-500"/> Thêm dòng
            </button>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar max-h-[350px] transition-colors duration-500">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px] transition-colors duration-500">
              <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors duration-500">
                <tr className="transition-colors duration-500">
                  <th className="px-4 py-3 w-[25%] transition-colors duration-500">Tài khoản (Account)</th>
                  <th className="px-4 py-3 w-[15%] transition-colors duration-500">TT Chi phí (Tùy chọn)</th>
                  <th className="px-4 py-3 w-[25%] transition-colors duration-500">Diễn giải dòng</th>
                  <th className="px-4 py-3 w-[15%] text-right text-emerald-600 dark:text-emerald-500 transition-colors duration-500">NỢ (Debit)</th>
                  <th className="px-4 py-3 w-[15%] text-right text-blue-600 dark:text-blue-500 transition-colors duration-500">CÓ (Credit)</th>
                  <th className="px-4 py-3 w-10 text-center transition-colors duration-500">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 transition-colors duration-500 bg-slate-50/30 dark:bg-slate-800/30">
                <AnimatePresence initial={false}>
                  {lines.map((line) => (
                    <motion.tr 
                      key={line.id}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                      className="group hover:bg-white dark:hover:bg-slate-800 transition-colors duration-500"
                    >
                      <td className="px-4 py-3 transition-colors duration-500">
                        {loadingAccs ? <div className="h-[42px] w-full bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse transition-colors duration-500" /> : (
                          <select 
                            value={line.accountId} onChange={(e) => updateLine(line.id, "accountId", e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800 dark:text-slate-200 shadow-sm cursor-pointer transition-colors duration-500"
                          >
                            <option value="" className="transition-colors duration-500">-- Chọn Tài khoản --</option>
                            {accounts.map((a: any) => <option key={a.accountId} value={a.accountId} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900 transition-colors duration-500">{a.accountCode} - {a.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 transition-colors duration-500">
                        {loadingCCs ? <div className="h-[42px] w-full bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse transition-colors duration-500" /> : (
                          <select 
                            value={line.costCenterId} onChange={(e) => updateLine(line.id, "costCenterId", e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 shadow-sm cursor-pointer transition-colors duration-500"
                          >
                            <option value="" className="transition-colors duration-500">-- Bỏ qua --</option>
                            {costCenters.map((c: any) => <option key={c.costCenterId} value={c.costCenterId} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900 transition-colors duration-500">{c.code} - {c.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 transition-colors duration-500">
                        <input 
                          type="text" value={line.description} onChange={(e) => updateLine(line.id, "description", e.target.value)}
                          placeholder="Ghi chú riêng cho dòng này..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm text-slate-900 dark:text-white transition-colors duration-500"
                        />
                      </td>
                      <td className="px-4 py-3 transition-colors duration-500">
                        <input 
                          type="number" min="0" value={line.debit} onChange={(e) => updateLine(line.id, "debit", e.target.value)}
                          placeholder="0" disabled={Number(line.credit) > 0}
                          className="w-full bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-right font-black text-emerald-600 dark:text-emerald-400 disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800 shadow-inner transition-colors duration-500"
                        />
                      </td>
                      <td className="px-4 py-3 transition-colors duration-500">
                        <input 
                          type="number" min="0" value={line.credit} onChange={(e) => updateLine(line.id, "credit", e.target.value)}
                          placeholder="0" disabled={Number(line.debit) > 0}
                          className="w-full bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/30 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-right font-black text-blue-600 dark:text-blue-400 disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800 shadow-inner transition-colors duration-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center transition-colors duration-500">
                        <button type="button" onClick={() => removeLine(line.id)} title="Xóa dòng" className="p-2 text-rose-400 hover:text-rose-600 bg-white hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-500/20 rounded-lg transition-all duration-500 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30 shadow-sm opacity-50 group-hover:opacity-100 focus:opacity-100">
                          <Trash2 className="w-4 h-4 transition-colors duration-500"/>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 glass p-5 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-sm transition-colors duration-500">
          <div className={cn(
            "px-5 py-3.5 rounded-2xl border flex items-center gap-4 transition-colors duration-500 shadow-sm",
            balanceCheck.isBalanced 
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400" 
              : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400"
          )}>
            {balanceCheck.isBalanced ? <CheckCircle2 className="w-8 h-8 transition-colors duration-500"/> : <ShieldAlert className="w-8 h-8 animate-pulse transition-colors duration-500"/>}
            <div className="transition-colors duration-500">
              <h4 className="font-black text-base uppercase tracking-wide transition-colors duration-500">{balanceCheck.isBalanced ? "SỔ ĐÃ CÂN BẰNG" : "SỔ ĐANG LỆCH TỔNG"}</h4>
              {!balanceCheck.isBalanced && <p className="text-xs font-bold mt-0.5 transition-colors duration-500">Độ lệch: {formatVND(balanceCheck.diff)}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-6 md:gap-12 pr-4 transition-colors duration-500">
            <div className="text-right transition-colors duration-500">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 transition-colors duration-500">Tổng Nợ (Debit)</p>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 transition-colors duration-500">{formatVND(balanceCheck.totalDebit)}</p>
            </div>
            <div className="h-12 w-px bg-slate-300 dark:bg-slate-700 transition-colors duration-500" />
            <div className="text-right transition-colors duration-500">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 transition-colors duration-500">Tổng Có (Credit)</p>
              <p className="text-3xl font-black text-blue-600 dark:text-blue-400 transition-colors duration-500">{formatVND(balanceCheck.totalCredit)}</p>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}