"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Target, DollarSign, TrendingDown, AlertTriangle, 
  Plus, Search, Loader2, RefreshCcw, Building, Calendar, 
  Trash2, CheckCircle2, Download
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetBudgetsQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
  useGetCostCentersQuery,
  Budget
} from "@/state/api";

// --- COMPONENTS & UTILS (SIÊU VŨ KHÍ) ---
import Header from "@/app/(components)/Header";
import Modal from "@/app/(components)/Modal";
import { formatVND } from "@/utils/formatters";
import { exportToCSV } from "@/utils/exportUtils";
import { cn } from "@/utils/helpers";

// ==========================================
// 1. HELPERS & FORMATTERS (DATA VIZ)
// ==========================================
/**
 * Thuật toán tính toán Tốc độ đốt tiền (Burn Rate) và Cảnh báo màu sắc
 * Giúp người dùng nhận diện nhanh tình trạng ngân sách qua UI
 */
const calculateBurnRate = (used: number, total: number) => {
  if (!total || total === 0) return { percent: 0, color: "bg-slate-300", text: "text-slate-500", status: "Chưa phân bổ" };
  const percent = Math.round((used / total) * 100);
  
  if (percent >= 100) return { percent, color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", status: "Vượt Ngân sách", isAlert: true };
  if (percent >= 80) return { percent, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", status: "Sắp cạn kiệt", isAlert: true };
  if (percent >= 50) return { percent, color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", status: "Đang tiêu thụ", isAlert: false };
  return { percent, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", status: "Dư dả an toàn", isAlert: false };
};

// ==========================================
// 2. SKELETON LOADING (TRẢI NGHIỆM NGƯỜI DÙNG MƯỢT MÀ)
// ==========================================
const BudgetsSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>)}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>)}
    </div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: QUẢN LÝ NGÂN SÁCH (BUDGETS)
// ==========================================
export default function BudgetsPage() {
  const { t } = useTranslation();

  // --- STATE QUẢN LÝ UI ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // --- FORM STATE (CHUẨN HÓA THEO BACKEND MỚI: COST CENTER & YEAR) ---
  const currentYear = new Date().getFullYear().toString();
  const [formData, setFormData] = useState({ 
    costCenterId: "", 
    year: currentYear, 
    totalAmount: "", 
    isActive: true 
  });

  // 👉 FETCH DATA TỪ RTK QUERY (SỬ DỤNG UNDEFINED ĐỂ FIX LỖI TS ASSIGNABLE)
  const { data: budgets = [], isLoading: loadingBudgets, isError, refetch } = useGetBudgetsQuery(undefined);
  const { data: costCenters = [], isLoading: loadingCCs } = useGetCostCentersQuery();
  
  const [createBudget, { isLoading: isCreating }] = useCreateBudgetMutation();
  const [updateBudget, { isLoading: isUpdating }] = useUpdateBudgetMutation();
  const [deleteBudget, { isLoading: isDeleting }] = useDeleteBudgetMutation();

  const isLoading = loadingBudgets || loadingCCs;
  const isSubmitting = isCreating || isUpdating;

  // --- XỬ LÝ MỞ FORM (CREATE/EDIT) ---
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
      setFormData({ costCenterId: "", year: currentYear, totalAmount: "", isActive: true });
    }
    setIsModalOpen(true);
  };

  // --- HANDLERS XỬ LÝ DỮ LIỆU ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.costCenterId || !formData.year || !formData.totalAmount) {
      toast.error("Vui lòng điền đầy đủ Trung tâm chi phí, Năm và Số tiền!");
      return;
    }

    try {
      const payload = {
        costCenterId: formData.costCenterId,
        year: Number(formData.year),
        totalAmount: Number(formData.totalAmount),
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
      toast.error(error?.data?.message || "Lỗi khi lưu Ngân sách!");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (window.confirm("Bạn chắc chắn muốn xóa ngân sách này? Mọi cảnh báo chi tiêu của trung tâm này sẽ bị hủy bỏ.")) {
      try {
        await deleteBudget(id).unwrap();
        toast.success("Đã xóa Ngân sách!");
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể xóa do ràng buộc dữ liệu!");
      }
    }
  };

  // --- LOGIC LỌC & MAP DỮ LIỆU (OPTIMIZED WITH USEMEMO) ---
  const mappedBudgets = useMemo(() => {
    return budgets.map(b => {
      const cc = costCenters.find((c: any) => c.costCenterId === b.costCenterId);
      const ccName = cc ? cc.name : `CC ID: ${b.costCenterId}`;
      const yearName = b.year.toString();
      return { ...b, ccName, yearName };
    }).filter(b => 
      b.ccName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.yearName.includes(searchQuery)
    );
  }, [budgets, costCenters, searchQuery]);

  // --- TÍNH TOÁN KPI TỔNG QUAN ---
  const kpis = useMemo(() => {
    let totalAllocated = 0, totalBurned = 0, overBudgetDepts = 0;
    mappedBudgets.forEach(b => {
      if (b.isActive) {
        totalAllocated += b.totalAmount;
        totalBurned += b.usedAmount;
        if (b.usedAmount > b.totalAmount) overBudgetDepts++;
      }
    });
    return { totalAllocated, totalBurned, overBudgetDepts };
  }, [mappedBudgets]);

  // --- HANDLER XUẤT DỮ LIỆU (CSV) ---
  const handleExportData = () => {
    if (mappedBudgets.length === 0) {
      toast.error("Không có dữ liệu ngân sách để xuất!"); return;
    }
    const exportData = mappedBudgets.map(b => {
      const viz = calculateBurnRate(b.usedAmount, b.totalAmount);
      return {
        "Trung tâm chi phí": b.ccName,
        "Năm Ngân sách": b.yearName,
        "Ngân sách cấp": b.totalAmount,
        "Đã sử dụng": b.usedAmount,
        "Tỷ lệ tiêu hao (%)": viz.percent,
        "Trạng thái": viz.status,
        "Cảnh báo": viz.isAlert ? "Nguy hiểm" : "An toàn",
        "Khóa/Mở": b.isActive ? "Đang hoạt động" : "Đã khóa"
      };
    });
    exportToCSV(exportData, "Danh_Sach_Ngan_Sach_ERP");
    toast.success("Đã xuất báo cáo ngân sách thành công!");
  };

  // --- ANIMATION VARIANTS ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // --- GIAO DIỆN LỖI ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Lỗi truy xuất dữ liệu Ngân sách</h2>
        <button onClick={() => refetch()} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95">
          <RefreshCcw className="w-4 h-4" /> Thử lại
        </button>
      </div>
    );
  }

  // --- FOOTER CỦA MODAL ---
  const modalFooter = (
    <>
      <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
        Hủy
      </button>
      <button type="submit" form="budget-form" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {editingBudget ? "Lưu Thay Đổi" : "Khởi tạo Ngân sách"}
      </button>
    </>
  );

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      <Header 
        title={t("Quản lý Ngân sách Chi tiêu")} 
        subtitle={t("Thiết lập hạn mức, kiểm soát dòng tiền và cảnh báo vượt ngân sách theo Trung tâm Chi phí.")}
        rightNode={
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportData}
              className="px-4 py-2.5 flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất Dữ liệu</span>
            </button>
            <button 
              onClick={() => handleOpenForm()}
              className="px-5 py-2.5 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Cấp Ngân sách</span>
            </button>
          </div>
        }
      />

      {isLoading ? <BudgetsSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          
          {/* KPI DASHBOARD CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border-l-4 border-l-indigo-500 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><Target className="w-20 h-20"/></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1.5"><Target className="w-4 h-4 text-indigo-500"/> Tổng Đã Cấp</p>
              <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 relative z-10">{formatVND(kpis.totalAllocated)}</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border-l-4 border-l-orange-500 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><TrendingDown className="w-20 h-20"/></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1.5"><TrendingDown className="w-4 h-4 text-orange-500"/> Đã Tiêu Hao</p>
              <h3 className="text-3xl font-black text-orange-600 dark:text-orange-400 relative z-10">{formatVND(kpis.totalBurned)}</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className={cn("glass p-5 rounded-3xl border-l-4 relative overflow-hidden group", kpis.overBudgetDepts > 0 ? "border-l-rose-500 bg-rose-50/30 dark:bg-rose-900/10" : "border-l-emerald-500")}>
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><AlertTriangle className="w-20 h-20"/></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1.5">
                <AlertTriangle className={cn("w-4 h-4", kpis.overBudgetDepts > 0 ? "text-rose-500" : "text-emerald-500")} /> Báo Động Ngân Sách
              </p>
              <h3 className={cn("text-3xl font-black relative z-10", kpis.overBudgetDepts > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                {kpis.overBudgetDepts} <span className="text-sm font-semibold opacity-70">TT Chi Phí</span>
              </h3>
            </motion.div>
          </div>

          {/* THANH TÌM KIẾM */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" placeholder="Lọc theo Trung tâm chi phí, năm..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
            />
          </div>

          {/* GRID DANH SÁCH NGÂN SÁCH */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {mappedBudgets.map(budget => {
                const viz = calculateBurnRate(budget.usedAmount, budget.totalAmount);
                return (
                  <motion.div 
                    layoutId={`budget-${budget.budgetId}`}
                    key={budget.budgetId} variants={itemVariants}
                    onClick={() => handleOpenForm(budget)}
                    className="flex flex-col bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", viz.isAlert ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{budget.ccName}</h4>
                          <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3"/> Năm {budget.yearName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!budget.isActive && <span className="px-2 py-0.5 bg-slate-200 text-slate-500 dark:bg-slate-700 text-[10px] font-bold rounded uppercase">Khóa</span>}
                        <button onClick={(e) => handleDelete(budget.budgetId, e)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Đã dùng</p>
                        <p className={cn("text-lg font-black", viz.text)}>{formatVND(budget.usedAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Hạn mức</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatVND(budget.totalAmount)}</p>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${Math.min(viz.percent, 100)}%` }} transition={{ duration: 1, ease: "easeOut" }}
                        className={cn("h-full rounded-full", viz.color, viz.percent > 100 && "animate-pulse")}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={viz.text}>{viz.status}</span>
                      <span className={viz.text}>{viz.percent}%</span>
                    </div>

                  </motion.div>
                );
              })}
              {mappedBudgets.length === 0 && (
                <div className="col-span-full py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  Chưa có giới hạn ngân sách nào được thiết lập cho tiêu chí này.
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
        icon={<Target className="w-6 h-6 text-emerald-500" />}
        maxWidth="max-w-lg"
        disableOutsideClick={isSubmitting}
        footer={modalFooter}
      >
        <form id="budget-form" onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Trung tâm Chi phí *</label>
            <select 
              value={formData.costCenterId} onChange={(e) => setFormData({...formData, costCenterId: e.target.value})}
              disabled={!!editingBudget} 
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white transition-all"
            >
              <option value="">-- Chọn Trung tâm --</option>
              {costCenters.map((c: any) => <option key={c.costCenterId} value={c.costCenterId}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Năm Ngân sách *</label>
            <select 
              value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})}
              disabled={!!editingBudget} 
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white transition-all"
            >
              <option value={currentYear}>{currentYear}</option>
              <option value={(Number(currentYear) + 1).toString()}>{Number(currentYear) + 1}</option>
              <option value={(Number(currentYear) + 2).toString()}>{Number(currentYear) + 2}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Hạn mức Tiền (VND) *</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
              <input 
                type="number" min="0" required
                value={formData.totalAmount} onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
                placeholder="VD: 100,000,000"
                className="w-full pl-10 pr-4 py-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-lg font-black text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Trạng thái Hoạt động</label>
            <div 
              onClick={() => setFormData({...formData, isActive: !formData.isActive})}
              className={cn("w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300", formData.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")}
            >
              <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-md" transition={{ type: "spring", stiffness: 500, damping: 30 }} animate={{ x: formData.isActive ? 24 : 0 }} />
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
}