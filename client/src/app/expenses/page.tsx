"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Receipt, Plus, Trash2, Edit, AlertOctagon, RefreshCcw, 
  CheckCircle2, Clock, Download, TrendingDown, FileText, Wallet, Filter
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG CONTEXT CHI NHÁNH
import { 
  useGetExpensesQuery,
  useDeleteExpenseMutation,
  usePostExpenseMutation,
  Expense 
} from "@/state/api";

// --- COMPONENTS GIAO DIỆN LÕI ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import CreateExpenseModal from "./CreateExpenseModal";

// --- UTILS (SIÊU VŨ KHÍ) ---
import { formatVND, formatDate } from "@/utils/formatters"; 
import { exportToCSV } from "@/utils/exportUtils";
import { cn } from "@/utils/helpers";

// ==========================================
// 1. HELPER: TÍNH TỔNG TIỀN TỪ CÁC DÒNG (LINES)
// ==========================================
const calculateTotalExpense = (expense: any) => {
  if (!expense.lines || expense.lines.length === 0) return 0;
  // Tổng chi phí thường là tổng số dư Nợ (Debit) của các dòng
  return expense.lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
};

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const ExpensesSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6 transition-colors duration-500">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/50 transition-colors duration-500"></div>)}
    </div>
    <div className="h-16 w-full rounded-2xl bg-slate-200 dark:bg-slate-800/50 transition-colors duration-500"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2 transition-colors duration-500"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: QUẢN LÝ CHI PHÍ
// ==========================================
export default function ExpensesPage() {
  const { t } = useTranslation();
  
  // 🚀 BỐI CẢNH REDUX (CONTEXT ISOLATION)
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- STATE MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // 🚀 STATE BỘ LỌC NÂNG CAO
  const [filterPostingStatus, setFilterPostingStatus] = useState("ALL");

  // --- API HOOKS (🚀 ĐÃ BƠM BỐI CẢNH CHI NHÁNH VÀ KHÓA KHI TRỐNG) ---
  const { data: rawExpenses, isLoading, isError, refetch, isFetching } = useGetExpensesQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );
  
  const [deleteExpense, { isLoading: isDeleting }] = useDeleteExpenseMutation();
  const [postExpense, { isLoading: isPosting }] = usePostExpenseMutation();

  // 🚀 BÓC TÁCH VÀ LỌC DỮ LIỆU ĐỘNG (Lọc theo trạng thái + Bơm trường ảo Search)
  const expensesList: any[] = useMemo(() => {
    let arr = Array.isArray(rawExpenses) ? rawExpenses : ((rawExpenses as any)?.data || []);
    
    return arr.map((exp: any) => ({
      ...exp,
      searchField: `${exp.reference || ""} ${exp.description || ""}`.toLowerCase()
    })).filter((exp: any) => {
      return filterPostingStatus === "ALL" || exp.postingStatus === filterPostingStatus;
    });
  }, [rawExpenses, filterPostingStatus]);

  // --- TÍNH TOÁN KPI ĐỘNG THEO DỮ LIỆU ĐÃ LỌC ---
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

  const handleExportData = () => {
    if (expensesList.length === 0) {
      toast.error("Không có dữ liệu để xuất!"); return;
    }
    const exportData = expensesList.map((exp: any) => ({
      "Mã chứng từ": exp.reference,
      "Ngày ghi nhận": formatDate(exp.entryDate),
      "Diễn giải": exp.description,
      "Tổng tiền (VND)": calculateTotalExpense(exp),
      "Trạng thái": exp.postingStatus === "POSTED" ? "Đã ghi sổ" : "Bản nháp"
    }));
    
    exportToCSV(exportData, "Danh_Sach_Chi_Phi");
    toast.success("Xuất dữ liệu thành công!");
  };

  // --- CỘT DATATABLE ---
  const columns: ColumnDef<any>[] = [
    {
      header: "Chứng từ / Diễn giải",
      accessorKey: "searchField", 
      sortable: true,
      cell: (row: any) => (
        <div className="flex items-center gap-3 transition-colors duration-500">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center border border-rose-100 dark:border-rose-500/20 shrink-0 group-hover:scale-105 transition-transform duration-500">
            <Receipt className="w-5 h-5 text-rose-500" />
          </div>
          <div className="flex flex-col max-w-[250px] transition-colors duration-500">
            <span className="font-bold text-slate-900 dark:text-white line-clamp-1 truncate transition-colors duration-500" title={row.description}>
              {row.description || "Không có diễn giải"}
            </span>
            <span className="text-[11px] font-mono text-slate-500 mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded w-fit border border-slate-200 dark:border-slate-700 transition-colors duration-500">
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
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors duration-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
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
          <span className="font-black text-rose-600 dark:text-rose-400 tracking-tight text-base transition-colors duration-500">
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
          <div className="flex justify-center transition-colors duration-500">
             <span className={cn(
               "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-colors duration-500",
               isPosted ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" 
                        : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30"
             )}>
              {isPosted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5 animate-pulse" />}
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
          <div className="flex items-center justify-end gap-1 transition-colors duration-500">
            {!isPosted && (
              <>
                <button onClick={() => handlePost(row.journalId, row.reference)} disabled={isPosting} title="Ghi sổ (Hạch toán)" className="p-2 text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 dark:bg-emerald-500/10 dark:hover:bg-emerald-600 rounded-xl transition-colors shadow-sm active:scale-95 disabled:opacity-50 duration-500">
                  <FileText className="w-4 h-4" />
                </button>
                <button onClick={() => openModal(row)} title="Sửa chứng từ" className="p-2 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-500 dark:bg-indigo-500/10 dark:hover:bg-indigo-600 rounded-xl transition-colors shadow-sm active:scale-95 duration-500">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(row.journalId, row.reference)} disabled={isDeleting} title="Xóa nháp" className="p-2 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 dark:bg-rose-500/10 dark:hover:bg-rose-600 rounded-xl transition-colors shadow-sm active:scale-95 disabled:opacity-50 duration-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            {isPosted && (
              <span className="text-[10px] italic text-slate-400 px-2 font-medium bg-slate-100 dark:bg-slate-800 rounded-lg py-1 border border-slate-200 dark:border-slate-700 transition-colors duration-500">🔒 Kế toán đã khóa</span>
            )}
          </div>
        );
      }
    }
  ];

  // 🚀 BỘ LỌC NÂNG CAO (UI ĐỂ BƠM VÀO DATATABLE)
  const expenseFiltersNode = (
    <div className="flex flex-wrap items-center gap-4 w-full transition-colors duration-500">
      <div className="w-full sm:w-64">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block transition-colors duration-500">Lọc theo Tình trạng Kế toán</label>
        <div className="relative group">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
          <select 
            value={filterPostingStatus} onChange={(e) => setFilterPostingStatus(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white duration-500"
          >
            <option value="ALL">Tất cả chứng từ</option>
            <option value="DRAFT">Chờ Kế toán duyệt (Nháp)</option>
            <option value="POSTED">Đã hạch toán (Ghi sổ)</option>
          </select>
        </div>
      </div>
    </div>
  );

  // --- CẤU HÌNH MOTION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // 🚀 LÁ CHẮN UI: KHÔNG CÓ CHI NHÁNH
  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-colors duration-500">
        <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Chưa chọn Chi nhánh</h2>
        <p className="text-slate-500 transition-colors duration-500">Vui lòng chọn Chi nhánh hoạt động ở góc trên màn hình để tải Dữ liệu Chi phí.</p>
      </div>
    );
  }

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-colors duration-500">
      <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Lỗi truy xuất Dữ liệu Chi phí</h2>
      <button onClick={() => refetch()} className="px-6 py-3 mt-4 bg-rose-600 text-white rounded-xl shadow-lg active:scale-95 flex items-center gap-2 transition-all duration-500">
        <RefreshCcw className={cn("w-5 h-5", isFetching && "animate-spin")} /> Thử lại
      </button>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6 pb-10 transition-colors duration-500">
      
      <Header 
        title={t("Quản lý Chi phí")} 
        subtitle={t("Ghi nhận, phân loại và theo dõi dòng tiền ra (OPEX/CAPEX).")}
        rightNode={
          <div className="flex items-center gap-3 transition-colors duration-500">
            <button 
              onClick={handleExportData}
              className="px-4 py-2.5 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm duration-500"
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Xuất File</span>
            </button>
            <button 
              onClick={() => openModal()} 
              className="px-5 py-2.5 flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 duration-500"
            >
              <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Ghi nhận Chi phí</span>
            </button>
          </div>
        }
      />

      {isLoading ? <ExpensesSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full transition-colors duration-500">
          
          {/* KPI CARDS (GLASSMORPHISM) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 transition-colors duration-500">
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:shadow-rose-500/10 hover:border-rose-400/50 transition-all duration-300">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><TrendingDown className="w-24 h-24 text-rose-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1 transition-colors duration-500"><Wallet className="w-3.5 h-3.5"/> Tổng Tiền Đã Chi</p>
              <h3 className="text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 relative z-10 tracking-tight truncate transition-colors duration-500">
                {formatVND(summary.totalAmount)}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 mt-2 relative z-10 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit transition-colors duration-500">
                Từ {summary.totalCount} chứng từ {filterPostingStatus !== "ALL" && "(Đã lọc)"}
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:shadow-amber-500/10 hover:border-amber-400/50 transition-all duration-300">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><Clock className="w-24 h-24 text-amber-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1 transition-colors duration-500"><Clock className="w-3.5 h-3.5"/> Chờ Ghi Sổ (Draft)</p>
              <div className="flex items-center gap-3 relative z-10 transition-colors duration-500">
                <h3 className="text-4xl font-black text-amber-500 tracking-tight transition-colors duration-500">{summary.pendingCount}</h3>
                {summary.pendingCount > 0 && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>}
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-2 relative z-10 flex items-center gap-1 transition-colors duration-500">Cần kế toán duyệt và hạch toán</p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:shadow-emerald-500/10 hover:border-emerald-400/50 transition-all duration-300">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><CheckCircle2 className="w-24 h-24 text-emerald-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1 transition-colors duration-500"><CheckCircle2 className="w-3.5 h-3.5"/> Đã Ghi Sổ (Posted)</p>
              <h3 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 relative z-10 tracking-tight transition-colors duration-500">{summary.postedCount}</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-2 relative z-10 flex items-center gap-1 transition-colors duration-500">Đã phản ánh vào Báo cáo tài chính</p>
            </motion.div>
          </div>

          {/* DATATABLE */}
          <motion.div variants={itemVariants} className="w-full relative transition-colors duration-500">
            <div className="glass-panel rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-white/10 transition-colors duration-500">
              <DataTable 
                data={expensesList} 
                columns={columns} 
                searchKey="searchField" 
                searchPlaceholder="Tìm mã phiếu hoặc diễn giải..." 
                itemsPerPage={10} 
                advancedFilterNode={expenseFiltersNode}
              />
            </div>
          </motion.div>

        </motion.div>
      )}

      {/* SỬ DỤNG MODAL THEO KIẾN TRÚC MỚI */}
      <CreateExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} 
      />

    </div>
  );
}