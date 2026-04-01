"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Receipt, Plus, Trash2, Edit, AlertOctagon, RefreshCcw, 
  CheckCircle2, Clock, Download, TrendingDown, FileText, Wallet, Filter
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; 
import { 
  useGetExpensesQuery,
  useDeleteExpenseMutation,
  usePostExpenseMutation,
  Expense 
} from "@/state/api";

// --- COMPONENTS GIAO DIỆN LÕI ---
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import CreateExpenseModal from "./CreateExpenseModal";

// --- UTILS (SIÊU VŨ KHÍ) ---
import { formatVND, formatDate } from "@/utils/formatters"; 
import { exportTableToExcel } from "@/utils/exportUtils"; // 🚀 NÂNG CẤP LÊN ENGINE XUẤT EXCEL THÔNG MINH
import { cn } from "@/utils/helpers";

// ==========================================
// 1. HELPER: TÍNH TỔNG TIỀN TỪ CÁC DÒNG (LINES)
// ==========================================
const calculateTotalExpense = (expense: any) => {
  if (!expense.lines || expense.lines.length === 0) return 0;
  return expense.lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
};

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const ExpensesSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6 transition-all duration-500 ease-in-out">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/50 transition-all duration-500 ease-in-out"></div>)}
    </div>
    <div className="h-16 w-full rounded-2xl bg-slate-200 dark:bg-slate-800/50 transition-all duration-500 ease-in-out"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2 transition-all duration-500 ease-in-out"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: QUẢN LÝ CHI PHÍ
// ==========================================
export default function ExpensesPage() {
  const { t } = useTranslation();
  
  // 🚀 LÁ CHẮN HYDRATION: Tránh lỗi Mismatch Theme khi tải trang SSR
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🚀 BỐI CẢNH REDUX (CONTEXT ISOLATION)
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- STATE MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // 🚀 STATE BỘ LỌC NÂNG CAO
  const [filterPostingStatus, setFilterPostingStatus] = useState("ALL");

  // --- API HOOKS ---
  const { data: rawExpenses, isLoading, isError, refetch, isFetching } = useGetExpensesQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );
  
  const [deleteExpense, { isLoading: isDeleting }] = useDeleteExpenseMutation();
  const [postExpense, { isLoading: isPosting }] = usePostExpenseMutation();

  // 🚀 BÓC TÁCH VÀ LỌC DỮ LIỆU ĐỘNG
  const expensesList: any[] = useMemo(() => {
    let arr = Array.isArray(rawExpenses) ? rawExpenses : ((rawExpenses as any)?.data || []);
    
    return arr.map((exp: any) => ({
      ...exp,
      searchField: `${exp.reference || ""} ${exp.description || ""}`.toLowerCase()
    })).filter((exp: any) => {
      return filterPostingStatus === "ALL" || exp.postingStatus === filterPostingStatus;
    });
  }, [rawExpenses, filterPostingStatus]);

  // --- TÍNH TOÁN KPI ĐỘNG ---
  const summary = useMemo(() => {
    let totalAmount = 0;
    let pendingCount = 0;
    let postedCount = 0;

    expensesList.forEach((exp: any) => {
      const amount = calculateTotalExpense(exp);
      totalAmount += amount;
      if (exp.postingStatus === "DRAFT") pendingCount++;
      if (exp.postingStatus === "POSTED") postedCount++;
    });

    return { totalAmount, pendingCount, postedCount, totalCount: expensesList.length };
  }, [expensesList]);

  // --- HANDLERS ---
  const openModal = (expense?: Expense) => {
    setEditingExpense(expense || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, ref: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa chứng từ chi phí [${ref}]?`)) {
      try {
        await deleteExpense(id).unwrap();
        toast.success(`Đã xóa chứng từ ${ref} thành công!`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể xóa chứng từ đã hạch toán!");
      }
    }
  };

  const handlePost = async (id: string, ref: string) => {
    if (window.confirm(`Ghi sổ (Post) chứng từ [${ref}] vào sổ cái kế toán?\nSau khi ghi sổ sẽ không thể xóa.`)) {
      try {
        await postExpense(id).unwrap();
        toast.success(`Đã ghi sổ chứng từ ${ref} thành công!`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi khi ghi sổ chứng từ!");
      }
    }
  };

  // 🚀 ĐỘNG CƠ XUẤT BÁO CÁO SMART EXCEL
  const handleExportData = () => {
    if (expensesList.length === 0) {
      toast.error("Không có dữ liệu để xuất!"); return;
    }
    exportTableToExcel("smart-expenses-report", `Bao_Cao_Chi_Phi_${dayjs().format('DDMMYYYY')}`);
    toast.success("Xuất dữ liệu thành công!");
  };

  // --- CỘT DATATABLE ---
  const columns: ColumnDef<any>[] = [
    {
      header: "Chứng từ / Diễn giải",
      accessorKey: "searchField", 
      sortable: true,
      cell: (row: any) => (
        <div className="flex items-center gap-3 transition-all duration-500 ease-in-out">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center border border-rose-100 dark:border-rose-500/20 shrink-0 group-hover:scale-105 transition-transform duration-500 ease-in-out">
            <Receipt className="w-5 h-5 text-rose-500 dark:text-rose-400 transition-all duration-500 ease-in-out" />
          </div>
          <div className="flex flex-col max-w-[250px] transition-all duration-500 ease-in-out">
            <span className="font-bold text-slate-900 dark:text-white line-clamp-1 truncate transition-all duration-500 ease-in-out" title={row.description}>
              {row.description || "Không có diễn giải"}
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded w-fit border border-slate-200 dark:border-slate-700 transition-all duration-500 ease-in-out">
              {row.reference}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Ngày ghi nhận",
      accessorKey: "entryDate",
      sortable: true,
      cell: (row: any) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all duration-500 ease-in-out">
          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-all duration-500 ease-in-out" />
          {formatDate(row.entryDate)}
        </span>
      )
    },
    {
      header: "Tổng chi phí",
      accessorKey: "amount",
      align: "right",
      cell: (row: any) => {
        const total = calculateTotalExpense(row);
        return (
          <span className="font-black text-rose-600 dark:text-rose-400 tracking-tight text-base transition-all duration-500 ease-in-out">
            {formatVND(total)}
          </span>
        );
      }
    },
    {
      header: "Trạng thái Kế toán",
      accessorKey: "postingStatus",
      align: "center",
      cell: (row: any) => {
        const isPosted = row.postingStatus === "POSTED";
        return (
          <div className="flex justify-center transition-all duration-500 ease-in-out">
             <span className={cn(
               "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-all duration-500 ease-in-out",
               isPosted ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" 
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30"
             )}>
              {isPosted ? <CheckCircle2 className="w-3.5 h-3.5 transition-all duration-500 ease-in-out" /> : <Clock className="w-3.5 h-3.5 animate-pulse transition-all duration-500 ease-in-out" />}
              {isPosted ? "Đã Ghi Sổ" : "Bản Nháp"}
            </span>
          </div>
        );
      }
    },
    {
      header: "Tác vụ",
      accessorKey: "journalId",
      align: "right",
      cell: (row: any) => {
        const isPosted = row.postingStatus === "POSTED";
        return (
          <div className="flex items-center justify-end gap-1.5 transition-all duration-500 ease-in-out">
            {!isPosted && (
              <>
                <button onClick={() => handlePost(row.journalId, row.reference)} disabled={isPosting} title="Ghi sổ (Hạch toán)" className="p-2 text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 duration-500 ease-in-out">
                  <FileText className="w-4 h-4 transition-all duration-500 ease-in-out" />
                </button>
                <button onClick={() => openModal(row)} title="Sửa chứng từ" className="p-2 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white rounded-xl transition-all shadow-sm active:scale-95 duration-500 ease-in-out">
                  <Edit className="w-4 h-4 transition-all duration-500 ease-in-out" />
                </button>
                <button onClick={() => handleDelete(row.journalId, row.reference)} disabled={isDeleting} title="Xóa nháp" className="p-2 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 duration-500 ease-in-out">
                  <Trash2 className="w-4 h-4 transition-all duration-500 ease-in-out" />
                </button>
              </>
            )}
            {isPosted && (
              <span className="text-[10px] italic text-slate-400 dark:text-slate-500 px-2 font-medium bg-slate-100 dark:bg-slate-800 rounded-lg py-1 border border-slate-200 dark:border-slate-700 transition-all duration-500 ease-in-out">🔒 Kế toán đã khóa</span>
            )}
          </div>
        );
      }
    }
  ];

  // 🚀 BỘ LỌC NÂNG CAO (UI ĐỂ BƠM VÀO DATATABLE)
  const expenseFiltersNode = (
    <div className="flex flex-wrap items-center gap-4 w-full transition-all duration-500 ease-in-out">
      <div className="w-full sm:w-64 transition-all duration-500 ease-in-out">
        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block transition-all duration-500 ease-in-out">Lọc theo Tình trạng Kế toán</label>
        <div className="relative group transition-all duration-500 ease-in-out">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-rose-500 dark:group-focus-within:text-rose-400 transition-all duration-500 ease-in-out" />
          <select 
            value={filterPostingStatus} onChange={(e) => setFilterPostingStatus(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white duration-500 ease-in-out"
          >
            {/* 🚀 VÁ LỖI NỀN ĐEN OPTION */}
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="ALL">Tất cả chứng từ</option>
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="DRAFT">Chờ Kế toán duyệt (Nháp)</option>
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="POSTED">Đã hạch toán (Ghi sổ)</option>
          </select>
        </div>
      </div>
    </div>
  );

  // --- CẤU HÌNH MOTION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // 🚀 LÁ CHẮN HYDRATION UI
  if (!isMounted) return <ExpensesSkeleton />;

  // 🚀 LÁ CHẮN UI: KHÔNG CÓ CHI NHÁNH
  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
        <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse transition-all duration-500 ease-in-out" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-all duration-500 ease-in-out">Chưa chọn Chi nhánh</h2>
        <p className="text-slate-500 dark:text-slate-400 transition-all duration-500 ease-in-out">Vui lòng chọn Chi nhánh hoạt động ở góc trên màn hình để tải Dữ liệu Chi phí.</p>
      </div>
    );
  }

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
      <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse transition-all duration-500 ease-in-out" />
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-all duration-500 ease-in-out">Lỗi truy xuất Dữ liệu Chi phí</h2>
      <button onClick={() => refetch()} className="px-6 py-3 mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 transition-all duration-500 ease-in-out">
        <RefreshCcw className={cn("w-5 h-5 transition-all duration-500 ease-in-out", isFetching && "animate-spin")} /> Thử lại
      </button>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6 pb-10 transition-all duration-500 ease-in-out">
      
      {/* 🚀 1. ĐẠI TU HEADER & BỌC THÉP FLEXBOX */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }} 
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5 mb-6 sm:mb-8 md:mb-10 transform-gpu will-change-transform w-full transition-all duration-500 ease-in-out"
      >
        <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 w-24 h-24 sm:w-32 sm:h-32 bg-blue-500/15 dark:bg-blue-500/20 rounded-full blur-2xl sm:blur-3xl pointer-events-none z-0 transition-all duration-500 ease-in-out" />
        
        <div className="relative z-10 flex items-stretch gap-3 sm:gap-4 w-full md:w-auto min-w-0 transition-all duration-500 ease-in-out flex-1">
          <div className="w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_8px_rgba(79,70,229,0.4)] dark:shadow-[0_0_16px_rgba(79,70,229,0.3)] transition-all duration-500 ease-in-out" />
          
          <div className="flex flex-col justify-center py-0.5 min-w-0 transition-all duration-500 ease-in-out w-full">
            <h1 className="text-xl sm:text-2xl md:text-[28px] lg:text-3xl font-black tracking-tight text-slate-800 dark:text-slate-50 leading-tight sm:leading-none truncate break-words transition-all duration-500 ease-in-out">
              {t("Quản lý Chi phí")}
            </h1>
            <p className="text-xs sm:text-[13px] md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-1.5 md:mt-2 flex items-center gap-2 max-w-full md:max-w-xl leading-relaxed transition-all duration-500 ease-in-out">
              {t("Ghi nhận, phân loại và theo dõi dòng tiền ra (OPEX/CAPEX).")}
            </p>
          </div>
        </div>

        <div className="relative z-10 w-full md:w-auto shrink-0 flex flex-row items-center justify-start md:justify-end gap-2.5 sm:gap-3 mt-2 md:mt-0 overflow-x-auto scrollbar-hide pb-1 md:pb-0 transition-all duration-500 ease-in-out">
          <button 
            onClick={handleExportData}
            className="px-4 py-2.5 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm whitespace-nowrap duration-500 ease-in-out"
          >
            <Download className="w-4 h-4 transition-all duration-500 ease-in-out" /> <span className="hidden sm:inline transition-all duration-500 ease-in-out">Xuất File</span>
          </button>
          <button 
            onClick={() => openModal()} 
            className="px-5 py-2.5 flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 whitespace-nowrap duration-500 ease-in-out"
          >
            <Plus className="w-5 h-5 transition-all duration-500 ease-in-out" /> <span className="hidden sm:inline transition-all duration-500 ease-in-out">Ghi nhận Chi phí</span>
          </button>
        </div>
      </motion.div>

      {isLoading ? <ExpensesSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full transition-all duration-500 ease-in-out">
          
          {/* KPI CARDS (GLASSMORPHISM) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 transition-all duration-500 ease-in-out">
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-rose-500/10 hover:border-rose-400/50 dark:hover:border-rose-500/50 transition-all duration-500 ease-in-out cursor-default">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><TrendingDown className="w-24 h-24 text-rose-500 transition-all duration-500 ease-in-out"/></div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1 transition-all duration-500 ease-in-out"><Wallet className="w-3.5 h-3.5 transition-all duration-500 ease-in-out"/> Tổng Tiền Đã Chi</p>
              <h3 className="text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 relative z-10 tracking-tight truncate transition-all duration-500 ease-in-out">
                {formatVND(summary.totalAmount)}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 relative z-10 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit transition-all duration-500 ease-in-out">
                Từ {summary.totalCount} chứng từ {filterPostingStatus !== "ALL" && "(Đã lọc)"}
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-amber-500/10 hover:border-amber-400/50 dark:hover:border-amber-500/50 transition-all duration-500 ease-in-out cursor-default">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><Clock className="w-24 h-24 text-amber-500 transition-all duration-500 ease-in-out"/></div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1 transition-all duration-500 ease-in-out"><Clock className="w-3.5 h-3.5 transition-all duration-500 ease-in-out"/> Chờ Ghi Sổ (Draft)</p>
              <div className="flex items-center gap-3 relative z-10 transition-all duration-500 ease-in-out">
                <h3 className="text-4xl font-black text-amber-500 dark:text-amber-400 tracking-tight transition-all duration-500 ease-in-out">{summary.pendingCount}</h3>
                {summary.pendingCount > 0 && <span className="relative flex h-3 w-3 transition-all duration-500 ease-in-out"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 transition-all duration-500 ease-in-out"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 transition-all duration-500 ease-in-out"></span></span>}
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 relative z-10 flex items-center gap-1 transition-all duration-500 ease-in-out">Cần kế toán duyệt và hạch toán</p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-emerald-500/10 hover:border-emerald-400/50 dark:hover:border-emerald-500/50 transition-all duration-500 ease-in-out cursor-default">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><CheckCircle2 className="w-24 h-24 text-emerald-500 transition-all duration-500 ease-in-out"/></div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1 transition-all duration-500 ease-in-out"><CheckCircle2 className="w-3.5 h-3.5 transition-all duration-500 ease-in-out"/> Đã Ghi Sổ (Posted)</p>
              <h3 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 relative z-10 tracking-tight transition-all duration-500 ease-in-out">{summary.postedCount}</h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 relative z-10 flex items-center gap-1 transition-all duration-500 ease-in-out">Đã phản ánh vào Báo cáo tài chính</p>
            </motion.div>
          </div>

          {/* DATATABLE */}
          <motion.div variants={itemVariants} className="w-full relative transition-all duration-500 ease-in-out">
            <div className="glass-panel rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 transition-all duration-500 ease-in-out">
              {expensesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 transition-all duration-500 ease-in-out">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ease-in-out">
                    <Receipt className="w-10 h-10 opacity-50 transition-all duration-500 ease-in-out" />
                  </div>
                  <p className="font-bold text-slate-600 dark:text-slate-300 text-lg transition-all duration-500 ease-in-out">Danh sách trống</p>
                  <p className="text-sm mt-1 transition-all duration-500 ease-in-out">Không tìm thấy chứng từ chi phí nào khớp với bộ lọc.</p>
                </div>
              ) : (
                <DataTable 
                  data={expensesList} 
                  columns={columns} 
                  searchKey="searchField" 
                  searchPlaceholder="Tìm mã phiếu hoặc diễn giải..." 
                  itemsPerPage={10} 
                  advancedFilterNode={expenseFiltersNode}
                />
              )}
            </div>
          </motion.div>

        </motion.div>
      )}

      {/* SỬ DỤNG MODAL THEO KIẾN TRÚC MỚI */}
      <CreateExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingExpense(null); refetch(); }} 
      />

      {/* ==========================================
          BẢNG ẨN DÙNG ĐỂ XUẤT BÁO CÁO SMART EXCEL
          ========================================== */}
      <div className="hidden transition-all duration-500 ease-in-out">
        <table id="smart-expenses-report">
          <thead>
            <tr>
              <th colSpan={5} style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#1e293b', color: '#ffffff', padding: '15px' }}>
                BẢNG KÊ CHỨNG TỪ CHI PHÍ TỔNG HỢP
              </th>
            </tr>
            <tr>
              <th colSpan={5} style={{ textAlign: 'center', fontStyle: 'italic', padding: '10px' }}>
                Chi nhánh: {activeBranchId === "ALL" ? "Toàn Hệ Thống" : activeBranchId} | Ngày xuất: {dayjs().format('DD/MM/YYYY HH:mm')}
              </th>
            </tr>
            <tr>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Mã chứng từ</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Ngày ghi nhận</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Diễn giải</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Tổng tiền (VND)</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Trạng thái Kế toán</th>
            </tr>
          </thead>
          <tbody>
            {expensesList.map((exp: any, idx: number) => (
              <tr key={`exp-${idx}`}>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1', msoNumberFormat: '\@' } as any}>{exp.reference}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{formatDate(exp.entryDate)}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{exp.description}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#f43f5e' }}>{calculateTotalExpense(exp)}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: exp.postingStatus === "POSTED" ? '#10b981' : '#f59e0b' }}>
                  {exp.postingStatus === "POSTED" ? "Đã Ghi Sổ" : "Bản Nháp"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}