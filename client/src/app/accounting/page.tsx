"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  BookOpen, Plus, Search, Lock, 
  Trash2, AlertOctagon, RefreshCcw, Loader2, CheckCircle2,
  FileEdit, ArrowRightLeft, Scale, ShieldAlert, FileText,
  TrendingDown, TrendingUp, CalendarDays, Download, Filter, Unlock
} from "lucide-react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { toast } from "react-hot-toast";

dayjs.extend(isBetween);

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; 
import { 
  useGetJournalEntriesQuery,
  usePostJournalEntryMutation,
  useDeleteJournalEntryMutation,
  JournalEntry
} from "@/state/api";

// --- COMPONENTS GIAO DIỆN LÕI ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

// --- SIÊU COMPONENTS VỆ TINH (MODALS) ---
import FiscalPeriodModal from "./FiscalPeriodModal";
import ManualJournalModal from "./ManualJournalModal";
import ReverseEntryModal from "./ReverseEntryModal";
import ExportModal from "@/app/(components)/ExportModal"; // 🚀 BỔ SUNG EXPORT MODAL

// --- UTILS ---
import { formatVND, formatDate, safeRound } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

const getPostingStatusUI = (status: string) => {
  switch (status) {
    case "POSTED": 
      return { 
        label: "Đã Ghi Sổ", 
        icon: CheckCircle2, 
        color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" 
      };
    case "DRAFT": 
      return { 
        label: "Bản Nháp", 
        icon: FileEdit, 
        color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30" 
      };
    case "REVERSED": 
      return { 
        label: "Đã Đảo Xóa", 
        icon: ArrowRightLeft, 
        color: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30" 
      };
    default: 
      return { 
        label: status || "N/A", 
        icon: FileText, 
        color: "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30" 
      };
  }
};

type JournalTab = "ALL" | "DRAFT" | "POSTED" | "REVERSED";

const AccountingSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6 transition-colors duration-500">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/50 transition-colors duration-500"></div>
      ))}
    </div>
    <div className="h-16 w-full rounded-2xl bg-slate-200 dark:bg-slate-800/50 transition-colors duration-500"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2 transition-colors duration-500"></div>
  </div>
);

export default function AccountingPage() {
  const { t } = useTranslation();
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  const [activeTab, setActiveTab] = useState<JournalTab>("ALL");
  const [filterPeriod, setFilterPeriod] = useState("THIS_MONTH");
  const [filterLockStatus, setFilterLockStatus] = useState("ALL");

  const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false);
  const [isManualJournalOpen, setIsManualJournalOpen] = useState(false);
  const [selectedEntryForReverse, setSelectedEntryForReverse] = useState<string | null>(null);
  const [selectedEntryForEdit, setSelectedEntryForEdit] = useState<JournalEntry | null>(null);

  // 🚀 BỔ SUNG STATE EXPORT MODAL
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportDataPayload, setExportDataPayload] = useState<any[]>([]);

  const dateFilters = useMemo(() => {
    const now = dayjs();
    switch (filterPeriod) {
      case "THIS_MONTH": 
        return { startDate: now.startOf('month').toISOString(), endDate: now.endOf('month').toISOString() };
      case "LAST_MONTH": 
        const lastMonth = now.subtract(1, 'month'); 
        return { startDate: lastMonth.startOf('month').toISOString(), endDate: lastMonth.endOf('month').toISOString() };
      case "THIS_QUARTER": 
        const startQuarterMonth = Math.floor(now.month() / 3) * 3; 
        return { startDate: now.month(startQuarterMonth).startOf('month').toISOString(), endDate: now.month(startQuarterMonth + 2).endOf('month').toISOString() };
      case "THIS_YEAR": 
        return { startDate: now.startOf('year').toISOString(), endDate: now.endOf('year').toISOString() };
      default: 
        return { startDate: undefined, endDate: undefined };
    }
  }, [filterPeriod]);

  const { data: rawEntries = [], isLoading, isError, refetch, isFetching } = useGetJournalEntriesQuery({
    branchId: activeBranchId,
    postingStatus: activeTab !== "ALL" ? activeTab : undefined,
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate
  }, { skip: !activeBranchId });

  const [postEntry, { isLoading: isPosting }] = usePostJournalEntryMutation();
  const [deleteEntry, { isLoading: isDeleting }] = useDeleteJournalEntryMutation();

  const entries = useMemo(() => {
    return rawEntries.map((entry: JournalEntry) => ({
      ...entry,
      searchField: `${entry.reference || ""} ${entry.description || ""}`.toLowerCase()
    })).filter((entry: any) => {
      let matchLock = true;
      if (filterLockStatus === "CLOSED") matchLock = entry.isPeriodClosed === true;
      if (filterLockStatus === "OPEN") matchLock = entry.isPeriodClosed === false;
      return matchLock;
    });
  }, [rawEntries, filterLockStatus]);

  const kpis = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let draftCount = 0;
    let postedCount = 0;
    
    rawEntries.forEach((entry: any) => {
      if (entry.postingStatus === "DRAFT") draftCount++;
      if (entry.postingStatus === "POSTED") postedCount++;
      if (entry.postingStatus === "POSTED") {
        const entryDebit = entry.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0;
        const entryCredit = entry.lines?.reduce((sum: number, line: any) => sum + (line.credit || 0), 0) || 0;
        totalDebit = safeRound(totalDebit + entryDebit);
        totalCredit = safeRound(totalCredit + entryCredit);
      }
    });
    
    return { 
      totalEntries: rawEntries.length, 
      draftCount, 
      postedCount, 
      totalDebit, 
      totalCredit 
    };
  }, [rawEntries]);

  const handlePostEntry = async (id: string, ref: string) => {
    if (window.confirm(`GHI SỔ BÚT TOÁN [${ref}]?\nSau khi ghi sổ, bạn sẽ không thể chỉnh sửa hay xóa mà chỉ có thể Đảo bút toán.`)) {
      try {
        await postEntry(id).unwrap();
        toast.success(`Đã ghi sổ thành công bút toán ${ref}`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi ghi sổ. Vui lòng kiểm tra lại phát sinh Nợ/Có.");
      }
    }
  };

  const handleDeleteEntry = async (id: string, ref: string) => {
    if (window.confirm(`Xóa vĩnh viễn Bản nháp [${ref}]?`)) {
      try {
        await deleteEntry(id).unwrap();
        toast.success(`Đã xóa bút toán ${ref}`);
      } catch (err: any) {
        toast.error("Không thể xóa bút toán này do ràng buộc hệ thống!");
      }
    }
  };

  // 🚀 ĐÃ SỬA: Thay vì xuất thẳng, mở cấu hình chọn cột
  const handlePrepareExport = () => {
    if (entries.length === 0) {
      toast.error("Không có dữ liệu bút toán để xuất!");
      return;
    }
    
    const exportData = entries.map((e: any) => {
      const entryDebit = e.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0;
      const entryCredit = e.lines?.reduce((sum: number, line: any) => sum + (line.credit || 0), 0) || 0;

      return {
        "Ngày hạch toán": formatDate(e.entryDate),
        "Mã tham chiếu": e.reference,
        "Diễn giải": e.description,
        "Tổng Nợ (VND)": safeRound(entryDebit),
        "Tổng Có (VND)": safeRound(entryCredit),
        "Trạng thái": getPostingStatusUI(e.postingStatus).label,
        "Tình trạng Đảo sổ": e.isReversed ? "Đã bị đảo" : "Bình thường"
      };
    });

    setExportDataPayload(exportData);
    setIsExportModalOpen(true);
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      header: "Ngày / Tham chiếu",
      accessorKey: "searchField",
      sortable: true,
      cell: (row: any) => (
        <div className="flex flex-col max-w-[200px] transition-colors duration-500">
          <span 
            className={cn(
              "font-black uppercase tracking-wider transition-colors duration-500",
              row.postingStatus === "DRAFT" ? "text-indigo-600 dark:text-indigo-400 cursor-pointer hover:text-indigo-800 hover:underline" : "text-slate-800 dark:text-slate-200"
            )}
            onClick={() => row.postingStatus === "DRAFT" && setSelectedEntryForEdit(row)}
            title={row.postingStatus === "DRAFT" ? "Click để xem chi tiết / sửa" : ""}
          >
            {row.reference || "JV-AUTO"}
          </span>
          <span className="text-[11px] font-bold text-slate-500 mt-0.5 flex items-center gap-1 transition-colors duration-500">
            <CalendarDays className="w-3.5 h-3.5"/> {formatDate(row.entryDate)}
          </span>
        </div>
      )
    },
    {
      header: "Diễn giải (Description)",
      accessorKey: "description",
      cell: (row: any) => (
        <div className="flex flex-col transition-colors duration-500">
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm line-clamp-2 transition-colors duration-500">
            {row.description || "Không có diễn giải"}
          </span>
          {row.isReversed && (
            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded w-fit flex items-center gap-1 mt-1 border border-rose-100 dark:border-rose-500/20 transition-colors duration-500">
              <ArrowRightLeft className="w-3 h-3"/> Đã bị đảo bởi: {row.reversalEntryId}
            </span>
          )}
        </div>
      )
    },
    {
      header: "Phát sinh NỢ (Debit)",
      accessorKey: "debit",
      align: "right",
      cell: (row: any) => {
        const totalDebit = safeRound(row.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0);
        return <span className="font-black text-emerald-600 dark:text-emerald-400 transition-colors duration-500">{formatVND(totalDebit)}</span>;
      }
    },
    {
      header: "Phát sinh CÓ (Credit)",
      accessorKey: "credit",
      align: "right",
      cell: (row: any) => {
        const totalCredit = safeRound(row.lines?.reduce((sum: number, line: any) => sum + (line.credit || 0), 0) || 0);
        return <span className="font-black text-blue-600 dark:text-blue-400 transition-colors duration-500">{formatVND(totalCredit)}</span>;
      }
    },
    {
      header: "Kiểm toán Cân đối",
      accessorKey: "balance",
      align: "center",
      cell: (row: any) => {
        const totalDebit = safeRound(row.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0);
        const totalCredit = safeRound(row.lines?.reduce((sum: number, line: any) => sum + (line.credit || 0), 0) || 0);
        const isBalanced = totalDebit === totalCredit && totalDebit > 0;

        return (
          <div className="flex justify-center transition-colors duration-500">
            {isBalanced ? (
              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg flex items-center gap-1 border border-emerald-200 dark:border-emerald-500/30 transition-colors duration-500">
                <Scale className="w-3.5 h-3.5"/> CÂN BẰNG
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-lg flex items-center gap-1 border border-rose-200 dark:border-rose-500/30 animate-pulse shadow-sm transition-colors duration-500">
                <ShieldAlert className="w-3.5 h-3.5"/> LỆCH TỔNG
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Trạng thái",
      accessorKey: "postingStatus",
      cell: (row: any) => {
        const ui = getPostingStatusUI(row.postingStatus);
        const Icon = ui.icon;
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-colors duration-500", ui.color)}>
            <Icon className="w-3.5 h-3.5" /> {ui.label}
          </span>
        );
      }
    },
    {
      header: "Thao tác",
      accessorKey: "journalId",
      align: "right",
      cell: (row: any) => {
        const isDraft = row.postingStatus === "DRAFT";
        const isPosted = row.postingStatus === "POSTED";
        const isPeriodClosed = row.isPeriodClosed;

        return (
          <div className="flex items-center justify-end gap-1.5 transition-colors duration-500">
            {isDraft && !isPeriodClosed && (
              <>
                <button 
                  onClick={() => setSelectedEntryForEdit(row)} 
                  title="Sửa Bút toán Nháp" 
                  className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/30 rounded-xl transition-colors shadow-sm duration-500"
                >
                  <FileEdit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handlePostEntry(row.journalId, row.reference)} 
                  disabled={isPosting} 
                  title="Ghi Sổ (Post)" 
                  className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:hover:bg-emerald-600 rounded-xl transition-colors shadow-sm duration-500"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteEntry(row.journalId, row.reference)} 
                  disabled={isDeleting} 
                  title="Xóa Bản Nháp" 
                  className="p-2 text-rose-400 hover:text-white bg-rose-50 hover:bg-rose-500 dark:bg-rose-500/10 dark:hover:bg-rose-600 rounded-xl transition-colors shadow-sm duration-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            {isPosted && !isPeriodClosed && !row.isReversed && (
              <button 
                onClick={() => setSelectedEntryForReverse(row.journalId)} 
                title="Đảo Bút toán (Reverse)" 
                className="px-3 py-1.5 text-[10px] font-black text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-lg transition-transform active:scale-95 shadow-md shadow-orange-500/30 flex items-center gap-1.5 duration-500"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> ĐẢO SỔ
              </button>
            )}

            {isPeriodClosed && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors duration-500" title="Kỳ kế toán đã đóng. Không thể thao tác.">
                <Lock className="w-3.5 h-3.5"/> KỲ ĐÃ KHÓA
              </span>
            )}
          </div>
        );
      }
    }
  ], [isPosting, isDeleting]); 

  const accountingFiltersNode = (
    <div className="flex flex-wrap items-center gap-4 w-full transition-colors duration-500">
      <div className="w-full sm:w-64">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block transition-colors duration-500">
          Kỳ Kế toán
        </label>
        <div className="relative group">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <select 
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white"
          >
            <option value="ALL">Toàn thời gian (Lịch sử)</option>
            <option value="THIS_MONTH">Tháng này</option>
            <option value="LAST_MONTH">Tháng trước</option>
            <option value="THIS_QUARTER">Quý này</option>
            <option value="THIS_YEAR">Năm tài chính hiện tại</option>
          </select>
        </div>
      </div>
      
      <div className="w-full sm:w-64">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block transition-colors duration-500">
          Trạng thái Khóa Sổ
        </label>
        <div className="relative group">
          {filterLockStatus === "CLOSED" ? (
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          ) : (
            <Unlock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          )}
          <select 
            value={filterLockStatus} 
            onChange={(e) => setFilterLockStatus(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white"
          >
            <option value="ALL">Tất cả trạng thái khóa</option>
            <option value="OPEN">Kỳ đang MỞ (Cho phép chỉnh sửa)</option>
            <option value="CLOSED">Kỳ đã ĐÓNG (Chỉ xem)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-colors duration-500">
        <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse transition-colors duration-500" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Chưa chọn Chi nhánh</h2>
        <p className="text-slate-500 transition-colors duration-500">Vui lòng chọn Chi nhánh hoạt động ở góc trên màn hình để xem Sổ cái.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-colors duration-500">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse transition-colors duration-500" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Lỗi truy xuất Dữ liệu Kế toán</h2>
        <button 
          onClick={() => refetch()} 
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 mt-4 transition-all"
        >
          <RefreshCcw className={cn("w-5 h-5", isFetching && "animate-spin")} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10 transition-colors duration-500">
      
      <Header 
        title={t("Sổ Nhật Ký Chung (General Journal)")} 
        subtitle={t("Trung tâm kiểm soát mọi bút toán Nợ/Có. Đảm bảo tính toàn vẹn và cân đối kế toán.")}
        rightNode={
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide transition-colors duration-500">
            <button 
              onClick={handlePrepareExport}
              className="px-4 py-2.5 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all active:scale-95 whitespace-nowrap border border-slate-200 dark:border-slate-700 shadow-sm text-sm font-bold duration-500"
            >
              <Download className="w-4 h-4 transition-colors duration-500" />
              <span className="hidden sm:inline transition-colors duration-500">Xuất Sổ cái</span>
            </button>
            <button 
              onClick={() => setIsFiscalModalOpen(true)}
              className="px-4 py-2.5 flex items-center gap-2 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500/50 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 whitespace-nowrap duration-500"
            >
              <Lock className="w-4 h-4 transition-colors duration-500" />
              <span className="hidden sm:inline transition-colors duration-500">Khóa Sổ Kế Toán</span>
            </button>
            <button 
              onClick={() => { setSelectedEntryForEdit(null); setIsManualJournalOpen(true); }}
              className="px-5 py-2.5 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 whitespace-nowrap duration-500"
            >
              <Plus className="w-5 h-5 transition-colors duration-500" />
              <span className="hidden sm:inline transition-colors duration-500">Tạo Bút toán Kép</span>
            </button>
          </div>
        }
      />

      {isLoading ? <AccountingSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full transition-colors duration-500">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 transition-colors duration-500">
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-indigo-400 transition-colors duration-500">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><BookOpen className="w-20 h-20 text-indigo-500 transition-colors duration-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10 transition-colors duration-500">Lưu lượng Sổ cái</p>
              <h3 className="text-3xl font-black text-indigo-700 dark:text-indigo-400 truncate relative z-10 transition-colors duration-500">{kpis.totalEntries} <span className="text-sm font-medium text-slate-500 transition-colors duration-500">bút toán</span></h3>
              <p className="text-[11px] font-bold text-slate-500 mt-2 relative z-10 transition-colors duration-500">Thuộc {filterPeriod === "ALL" ? "mọi thời đại" : "kỳ kế toán đã chọn"}</p>
            </motion.div>
            
            <motion.div variants={itemVariants} className={cn("glass p-5 rounded-3xl border shadow-sm relative overflow-hidden group transition-colors duration-500", kpis.draftCount > 0 ? "border-amber-300 bg-amber-50/30 dark:border-amber-500/30 dark:bg-amber-900/10" : "border-slate-200 dark:border-white/10")}>
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><FileEdit className="w-20 h-20 text-amber-500 transition-colors duration-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10 transition-colors duration-500">Bút toán Nháp (Drafts)</p>
              <div className="flex items-center gap-3 relative z-10 transition-colors duration-500">
                <h3 className={cn("text-3xl font-black transition-colors duration-500", kpis.draftCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400")}>
                  {kpis.draftCount}
                </h3>
                {kpis.draftCount > 0 && (
                  <span className="flex h-3 w-3 relative transition-colors duration-500">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 transition-colors duration-500"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 transition-colors duration-500"></span>
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-2 relative z-10 transition-colors duration-500">Cần kiểm tra trước khi ghi sổ</p>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-colors duration-500 lg:col-span-2">
               <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><Scale className="w-24 h-24 text-emerald-500 transition-colors duration-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 transition-colors duration-500">Bảng Cân đối Phát sinh (Trial Balance Preview)</p>
              <div className="flex items-center justify-between relative z-10 transition-colors duration-500">
                <div className="transition-colors duration-500">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 mb-0.5 flex items-center gap-1.5 transition-colors duration-500"><TrendingUp className="w-3.5 h-3.5 transition-colors duration-500"/> Tổng phát sinh NỢ</p>
                  <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 transition-colors duration-500">{formatVND(kpis.totalDebit)}</h3>
                </div>
                <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 mx-4 transition-colors duration-500" />
                <div className="text-right transition-colors duration-500">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-500 mb-0.5 flex items-center justify-end gap-1.5 transition-colors duration-500"><TrendingDown className="w-3.5 h-3.5 transition-colors duration-500"/> Tổng phát sinh CÓ</p>
                  <h3 className="text-2xl font-black text-blue-700 dark:text-blue-400 transition-colors duration-500">{formatVND(kpis.totalCredit)}</h3>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass-panel p-3 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-sm z-30 sticky top-4 transition-colors duration-500">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-colors duration-500">
              {[
                { id: "ALL", label: "Toàn bộ Sổ cái" },
                { id: "DRAFT", label: "Bản Nháp (Draft)" },
                { id: "POSTED", label: "Đã Ghi Sổ (Posted)" },
                { id: "REVERSED", label: "Đã Đảo (Reversed)" }
              ].map(tab => (
                <button 
                  key={tab.id} onClick={() => setActiveTab(tab.id as JournalTab)} 
                  className={cn(
                    "relative px-5 py-2.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap z-10 duration-500",
                    activeTab === tab.id ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {activeTab === tab.id && <motion.div layoutId="journalTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-xl -z-10 border border-slate-200/50 dark:border-slate-600 transition-colors duration-500" />}
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-white/10 transition-colors duration-500">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 transition-colors duration-500">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-5 transition-colors duration-500">
                  <BookOpen className="w-12 h-12 opacity-50 transition-colors duration-500" />
                </div>
                <p className="font-bold text-slate-600 dark:text-slate-300 text-xl transition-colors duration-500">Sổ cái trống</p>
                <p className="text-sm mt-1 max-w-[300px] text-center transition-colors duration-500">Chưa có phát sinh kế toán nào khớp với tiêu chí lọc.</p>
              </div>
            ) : (
              <DataTable 
                data={entries} 
                columns={columns} 
                searchKey="searchField" 
                searchPlaceholder="Lọc nhanh mã tham chiếu, diễn giải..." 
                itemsPerPage={15} 
                advancedFilterNode={accountingFiltersNode}
              />
            )}
          </motion.div>

        </motion.div>
      )}

      <FiscalPeriodModal isOpen={isFiscalModalOpen} onClose={() => { setIsFiscalModalOpen(false); refetch(); }} />
      <ManualJournalModal entry={selectedEntryForEdit} isOpen={isManualJournalOpen || !!selectedEntryForEdit} onClose={() => { setIsManualJournalOpen(false); setSelectedEntryForEdit(null); refetch(); }} />
      <ReverseEntryModal journalId={selectedEntryForReverse} isOpen={!!selectedEntryForReverse} onClose={() => { setSelectedEntryForReverse(null); refetch(); }} />

      {/* 🚀 ĐÍNH KÈM EXPORT MODAL */}
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        data={exportDataPayload} 
        filename="So_Nhat_Ky_Chung" 
      />

    </div>
  );
}