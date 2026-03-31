"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Target, DollarSign, TrendingDown, AlertTriangle, 
  Plus, Search, Loader2, RefreshCcw, Building, Calendar, 
  Trash2, CheckCircle2, Download, AlertOctagon, Filter
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; 
import { 
  useGetBudgetsQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
  useGetCostCentersQuery,
  Budget
} from "@/state/api";

// --- COMPONENTS & UTILS ---
import Header from "@/app/(components)/Header";
import Modal from "@/app/(components)/Modal";
import { formatVND } from "@/utils/formatters";
import { exportToCSV } from "@/utils/exportUtils";
import { cn } from "@/utils/helpers";

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const calculateBurnRate = (used: number, total: number) => {
  if (!total || total === 0) return { percent: 0, color: "bg-slate-300 dark:bg-slate-600", text: "text-slate-500", status: "Chưa phân bổ" };
  const percent = Math.round((used / total) * 100);
  
  if (percent >= 100) return { percent, color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", status: "Vượt Ngân sách", isAlert: true };
  if (percent >= 80) return { percent, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", status: "Sắp cạn kiệt", isAlert: true };
  if (percent >= 50) return { percent, color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", status: "Đang tiêu thụ", isAlert: false };
  return { percent, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", status: "Dư dả an toàn", isAlert: false };
};

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const BudgetsSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6 transition-colors duration-500">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 transition-colors duration-500">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-3xl transition-colors duration-500"></div>)}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-colors duration-500">
      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800/50 rounded-3xl transition-colors duration-500"></div>)}
    </div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: QUẢN LÝ NGÂN SÁCH
// ==========================================
export default function BudgetsPage() {
  const { t } = useTranslation();

  // 🚀 BỐI CẢNH REDUX (CONTEXT ISOLATION)
  const { activeBranchId } = useAppSelector((state: any) => state.global);
  const currentYearStr = new Date().getFullYear().toString();

  // --- STATE QUẢN LÝ UI ---
  const [searchQuery, setSearchQuery] = useState("");
  // 🚀 BỔ SUNG: BỘ LỌC THEO NĂM (Mặc định năm hiện hành)
  const [filterYear, setFilterYear] = useState<string>(currentYearStr);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // --- FORM STATE ---
  const [formData, setFormData] = useState({ 
    costCenterId: "", 
    year: currentYearStr, 
    totalAmount: "", 
    isActive: true 
  });

  // 👉 FETCH DATA
  const { data: budgets = [], isLoading: loadingBudgets, isError, refetch } = useGetBudgetsQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );
  
  const { data: costCenters = [], isLoading: loadingCCs } = useGetCostCentersQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );
  
  const [createBudget, { isLoading: isCreating }] = useCreateBudgetMutation();
  const [updateBudget, { isLoading: isUpdating }] = useUpdateBudgetMutation();
  const [deleteBudget, { isLoading: isDeleting }] = useDeleteBudgetMutation();

  const isLoading = loadingBudgets || loadingCCs;
  const isSubmitting = isCreating || isUpdating;

  // --- LẤY DANH SÁCH NĂM CÓ TRONG DATA (ĐỂ TẠO DROPDOWN ĐỘNG) ---
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYearStr); // Luôn có năm hiện tại
    budgets.forEach((b: Budget) => yearsSet.add(b.year.toString()));
    return Array.from(yearsSet).sort().reverse(); // Mới nhất lên đầu
  }, [budgets, currentYearStr]);

  // --- XỬ LÝ MỞ FORM ---
  const handleOpenForm = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        costCenterId: budget.costCenterId,
        year: budget.year.toString(),
        totalAmount: budget.totalAmount.toString(),
        isActive: budget.isActive
      });
    } else {
      setEditingBudget(null);
      setFormData({ costCenterId: "", year: filterYear !== "ALL" ? filterYear : currentYearStr, totalAmount: "", isActive: true });
    }
    setIsModalOpen(true);
  };

  // --- HANDLERS XỬ LÝ DỮ LIỆU ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeBranchId) { toast.error("Lỗi: Không tìm thấy Chi nhánh hoạt động!"); return; }
    if (!formData.costCenterId || !formData.year || !formData.totalAmount) { toast.error("Vui lòng điền đủ thông tin!"); return; }

    const totalAmountNum = Number(formData.totalAmount);
    if (isNaN(totalAmountNum) || totalAmountNum <= 0) { toast.error("Ngân sách phải lớn hơn 0!"); return; }

    try {
      const payload = {
        branchId: activeBranchId, 
        costCenterId: formData.costCenterId,
        year: Number(formData.year),
        totalAmount: totalAmountNum,
        isActive: formData.isActive
      };

      if (editingBudget) {
        await updateBudget({ id: editingBudget.budgetId, data: payload }).unwrap();
        toast.success("Cập nhật Ngân sách thành công!");
      } else {
        await createBudget(payload).unwrap();
        toast.success("Thiết lập Ngân sách mới thành công!");
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi khi lưu Ngân sách! (Có thể bị trùng lặp Năm và Trung tâm)");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (window.confirm("CẢNH BÁO: Xóa ngân sách này sẽ hủy bỏ mọi cảnh báo chi tiêu. Tiếp tục?")) {
      try {
        await deleteBudget(id).unwrap();
        toast.success("Đã xóa Ngân sách!");
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể xóa do ràng buộc dữ liệu!");
      }
    }
  };

  // --- 🚀 LOGIC LỌC ĐA CHIỀU (BẢO VỆ TÍNH TOÁN KPI) ---
  const mappedBudgets = useMemo(() => {
    return budgets
      .filter((b: Budget) => filterYear === "ALL" || b.year.toString() === filterYear) // 🚀 LỌC THEO NĂM TRƯỚC
      .map((b: Budget) => {
        const cc = costCenters.find((c: any) => c.costCenterId === b.costCenterId);
        return { ...b, ccName: cc ? cc.name : `CC ID: ${b.costCenterId}`, yearName: b.year.toString() };
      })
      .filter((b: any) => b.ccName.toLowerCase().includes(searchQuery.toLowerCase()) || b.yearName.includes(searchQuery));
  }, [budgets, costCenters, filterYear, searchQuery]);

  // --- TÍNH TOÁN KPI (ĐÃ AN TOÀN TOÁN HỌC VÌ ĐÃ ĐƯỢC LỌC THEO NĂM) ---
  const kpis = useMemo(() => {
    let totalAllocated = 0, totalBurned = 0, overBudgetDepts = 0;
    mappedBudgets.forEach((b: any) => {
      if (b.isActive) {
        totalAllocated += b.totalAmount;
        totalBurned += b.usedAmount;
        if (b.usedAmount > b.totalAmount) overBudgetDepts++;
      }
    });
    return { totalAllocated, totalBurned, overBudgetDepts };
  }, [mappedBudgets]);

  // --- HANDLER XUẤT DỮ LIỆU ---
  const handleExportData = () => {
    if (mappedBudgets.length === 0) { toast.error("Không có dữ liệu để xuất!"); return; }
    const exportData = mappedBudgets.map((b: any) => {
      const viz = calculateBurnRate(b.usedAmount, b.totalAmount);
      return {
        "Trung tâm chi phí": b.ccName,
        "Năm Ngân sách": b.yearName,
        "Ngân sách cấp": b.totalAmount,
        "Đã sử dụng": b.usedAmount,
        "Tỷ lệ tiêu hao (%)": viz.percent,
        "Trạng thái": viz.status,
        "Cảnh báo": viz.isAlert ? "Nguy hiểm" : "An toàn",
        "Hoạt động": b.isActive ? "Có" : "Không"
      };
    });
    exportToCSV(exportData, `Bao_Cao_Ngan_Sach_${filterYear}`);
    toast.success("Đã xuất báo cáo ngân sách!");
  };

  // --- ANIMATION VARIANTS ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // --- GIAO DIỆN LỖI THIẾU BỐI CẢNH ---
  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-colors duration-500">
        <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse transition-colors duration-500" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Chưa chọn Chi nhánh</h2>
        <p className="text-slate-500 transition-colors duration-500">Vui lòng chọn Chi nhánh hoạt động ở góc trên màn hình để tải Ngân sách.</p>
      </div>
    );
  }

  // --- GIAO DIỆN LỖI FETCH ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center transition-colors duration-500">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-pulse transition-colors duration-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Lỗi truy xuất dữ liệu Ngân sách</h2>
        <button onClick={() => refetch()} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-sm duration-500">
          <RefreshCcw className="w-4 h-4 transition-colors duration-500" /> Thử lại
        </button>
      </div>
    );
  }

  const modalFooter = (
    <div className="flex items-center justify-end gap-3 w-full transition-colors duration-500">
      <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors duration-500 disabled:opacity-50 shadow-sm">
        Hủy
      </button>
      <button type="submit" form="budget-form" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed duration-500">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin transition-colors duration-500" /> : <CheckCircle2 className="w-4 h-4 transition-colors duration-500" />}
        {editingBudget ? "Lưu Thay Đổi" : "Khởi tạo Ngân sách"}
      </button>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6 pb-10 transition-colors duration-500">
      
      <Header 
        title={t("Quản lý Ngân sách Chi tiêu")} 
        subtitle={t("Thiết lập hạn mức, kiểm soát dòng tiền và cảnh báo vượt ngân sách theo Trung tâm Chi phí.")}
        rightNode={
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide transition-colors duration-500">
            <button 
              onClick={handleExportData}
              className="px-4 py-2.5 flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm whitespace-nowrap duration-500"
            >
              <Download className="w-4 h-4 transition-colors duration-500" />
              <span className="hidden sm:inline transition-colors duration-500">Xuất Dữ liệu</span>
            </button>
            <button 
              onClick={() => handleOpenForm()}
              className="px-5 py-2.5 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 whitespace-nowrap duration-500"
            >
              <Plus className="w-5 h-5 transition-colors duration-500" />
              <span className="hidden sm:inline transition-colors duration-500">Cấp Ngân sách</span>
            </button>
          </div>
        }
      />

      {isLoading ? <BudgetsSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full transition-colors duration-500">
          
          {/* KPI DASHBOARD CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 transition-colors duration-500">
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border-l-4 border-l-indigo-500 relative overflow-hidden group hover:shadow-md transition-all duration-500">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><Target className="w-20 h-20 transition-colors duration-500"/></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1.5 transition-colors duration-500"><Target className="w-4 h-4 text-indigo-500 transition-colors duration-500"/> Tổng Đã Cấp {filterYear !== "ALL" && `(${filterYear})`}</p>
              <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 relative z-10 transition-colors duration-500">{formatVND(kpis.totalAllocated)}</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border-l-4 border-l-orange-500 relative overflow-hidden group hover:shadow-md transition-all duration-500">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><TrendingDown className="w-20 h-20 transition-colors duration-500"/></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1.5 transition-colors duration-500"><TrendingDown className="w-4 h-4 text-orange-500 transition-colors duration-500"/> Đã Tiêu Hao {filterYear !== "ALL" && `(${filterYear})`}</p>
              <h3 className="text-3xl font-black text-orange-600 dark:text-orange-400 relative z-10 transition-colors duration-500">{formatVND(kpis.totalBurned)}</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className={cn("glass p-5 rounded-3xl border-l-4 relative overflow-hidden group hover:shadow-md transition-all duration-500", kpis.overBudgetDepts > 0 ? "border-l-rose-500 bg-rose-50/30 dark:bg-rose-900/10" : "border-l-emerald-500")}>
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><AlertTriangle className="w-20 h-20 transition-colors duration-500"/></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1.5 transition-colors duration-500">
                <AlertTriangle className={cn("w-4 h-4 transition-colors duration-500", kpis.overBudgetDepts > 0 ? "text-rose-500" : "text-emerald-500")} /> Báo Động Vượt Mức
              </p>
              <h3 className={cn("text-3xl font-black relative z-10 transition-colors duration-500", kpis.overBudgetDepts > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                {kpis.overBudgetDepts} <span className="text-sm font-semibold opacity-70 transition-colors duration-500">TT Chi Phí</span>
              </h3>
            </motion.div>
          </div>

          {/* 🚀 THANH CÔNG CỤ TÌM KIẾM VÀ LỌC NIÊN ĐỘ ĐƯỢC TÁI CẤU TRÚC */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-500">
            <div className="relative w-full sm:w-96 transition-colors duration-500">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-500" />
              <input 
                type="text" placeholder="Tìm theo Trung tâm chi phí..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-colors text-slate-900 dark:text-white duration-500"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto transition-colors duration-500">
              <Filter className="w-5 h-5 text-slate-400 shrink-0 transition-colors duration-500" />
              <select 
                value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
                className="w-full sm:w-48 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm transition-colors duration-500"
              >
                <option value="ALL">Tất cả các năm</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>Năm Ngân sách {y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* GRID DANH SÁCH NGÂN SÁCH */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-colors duration-500">
            <AnimatePresence>
              {mappedBudgets.map((budget: any) => {
                const viz = calculateBurnRate(budget.usedAmount, budget.totalAmount);
                return (
                  <motion.div 
                    layoutId={`budget-${budget.budgetId}`}
                    key={budget.budgetId} variants={itemVariants}
                    onClick={() => handleOpenForm(budget)}
                    className="flex flex-col glass-panel rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all cursor-pointer group duration-500"
                  >
                    <div className="flex justify-between items-start mb-5 transition-colors duration-500">
                      <div className="flex items-center gap-3 transition-colors duration-500">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-500 shadow-inner", viz.isAlert ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700")}>
                          <Building className="w-6 h-6 transition-colors duration-500" />
                        </div>
                        <div className="transition-colors duration-500">
                          <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[160px] text-lg transition-colors duration-500">{budget.ccName}</h4>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1 mt-1 border border-emerald-200 dark:border-emerald-500/20 w-fit transition-colors duration-500">
                            <Calendar className="w-3 h-3 transition-colors duration-500"/> Năm {budget.yearName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 transition-colors duration-500">
                        {!budget.isActive && <span className="px-2 py-1 bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400 text-[10px] font-bold rounded uppercase transition-colors duration-500 shadow-sm">Khóa</span>}
                        <button onClick={(e) => handleDelete(budget.budgetId, e)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-colors duration-500 opacity-0 group-hover:opacity-100 shadow-sm border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30">
                          <Trash2 className="w-4 h-4 transition-colors duration-500" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-end mb-3 transition-colors duration-500">
                      <div className="transition-colors duration-500">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 transition-colors duration-500">Đã dùng</p>
                        <p className={cn("text-xl font-black transition-colors duration-500", viz.text)}>{formatVND(budget.usedAmount)}</p>
                      </div>
                      <div className="text-right transition-colors duration-500">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 transition-colors duration-500">Hạn mức</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors duration-500">{formatVND(budget.totalAmount)}</p>
                      </div>
                    </div>

                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3 shadow-inner transition-colors duration-500">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${Math.min(viz.percent, 100)}%` }} transition={{ duration: 1, ease: "easeOut" }}
                        className={cn("h-full rounded-full transition-colors duration-500", viz.color, viz.percent >= 100 && "animate-pulse")}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center text-xs font-bold transition-colors duration-500">
                      <span className={cn("transition-colors duration-500", viz.text)}>{viz.status}</span>
                      <span className={cn("transition-colors px-2 py-0.5 rounded shadow-sm duration-500", viz.color.replace('bg-', 'text-').replace('500', '700'), viz.color.replace('bg-', 'bg-').replace('500', '100'))}>
                        {viz.percent}%
                      </span>
                    </div>

                  </motion.div>
                );
              })}
              {mappedBudgets.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/20 transition-colors duration-500">
                  <Target className="w-16 h-16 opacity-20 mx-auto mb-4 transition-colors duration-500" />
                  <p className="font-bold text-lg text-slate-600 dark:text-slate-300 transition-colors duration-500">Chưa có ngân sách nào được lập</p>
                  <p className="text-sm mt-1 transition-colors duration-500">Không tìm thấy giới hạn chi tiêu nào cho niên độ hoặc trung tâm đã chọn.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </motion.div>
      )}

      {/* MODAL CẤU HÌNH NGÂN SÁCH */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBudget ? "Điều chỉnh Ngân sách" : "Cấp Ngân sách Mới"}
        subtitle="Thiết lập giới hạn chi tiêu và cảnh báo cho trung tâm chi phí."
        icon={<Target className="w-6 h-6 text-emerald-500 transition-colors duration-500" />}
        maxWidth="max-w-lg"
        disableOutsideClick={isSubmitting}
        footer={modalFooter}
      >
        <form id="budget-form" onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 transition-colors duration-500">
          <div className="space-y-1.5 group transition-colors duration-500">
            <label className="text-xs font-bold text-slate-500 uppercase group-focus-within:text-emerald-500 transition-colors duration-500">Trung tâm Chi phí *</label>
            <div className="relative transition-colors duration-500">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-500" />
              <select 
                value={formData.costCenterId} onChange={(e) => setFormData({...formData, costCenterId: e.target.value})}
                disabled={!!editingBudget} 
                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white transition-colors duration-500 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
              >
                <option value="">-- Chọn Trung tâm --</option>
                {costCenters.map((c: any) => <option key={c.costCenterId} value={c.costCenterId}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 group transition-colors duration-500">
            <label className="text-xs font-bold text-slate-500 uppercase group-focus-within:text-emerald-500 transition-colors duration-500">Năm Ngân sách *</label>
            <div className="relative transition-colors duration-500">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-500" />
              <select 
                value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})}
                disabled={!!editingBudget} 
                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white transition-colors duration-500 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
              >
                <option value={currentYearStr}>{currentYearStr}</option>
                <option value={(Number(currentYearStr) + 1).toString()}>{Number(currentYearStr) + 1}</option>
                <option value={(Number(currentYearStr) + 2).toString()}>{Number(currentYearStr) + 2}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 group transition-colors duration-500">
            <label className="text-xs font-bold text-slate-500 uppercase group-focus-within:text-emerald-500 transition-colors duration-500">Hạn mức Tiền (VND) *</label>
            <div className="relative transition-colors duration-500">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 transition-colors duration-500" />
              <input 
                type="number" min="1" required
                value={formData.totalAmount} onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
                placeholder="VD: 100,000,000"
                className="w-full pl-10 pr-4 py-3.5 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xl font-black text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner transition-colors duration-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm transition-colors duration-500">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors duration-500">Trạng thái Hoạt động</label>
              <p className="text-[10px] text-slate-500 font-medium transition-colors duration-500 mt-0.5">Mở khóa để hệ thống tính toán cảnh báo</p>
            </div>
            <div 
              onClick={() => setFormData({...formData, isActive: !formData.isActive})}
              className={cn("w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shadow-inner", formData.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")}
            >
              <motion.div layout className="w-5 h-5 bg-white rounded-full shadow-md" transition={{ type: "spring", stiffness: 500, damping: 30 }} animate={{ x: formData.isActive ? 28 : 0 }} />
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
}