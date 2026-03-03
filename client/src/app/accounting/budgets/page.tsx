"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Target, DollarSign, TrendingDown, TrendingUp, AlertTriangle, 
  Plus, Search, Loader2, RefreshCcw, Building, Calendar, 
  Trash2, Edit3, X, CheckCircle2, Activity
} from "lucide-react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetBudgetsQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
  useGetDepartmentsQuery,
  useGetFiscalPeriodsQuery,
  Budget
} from "@/state/api";

// --- COMPONENTS ---
import Header from "@/app/(components)/Header";

// ==========================================
// 1. HELPERS & FORMATTERS (DATA VIZ)
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

// Thuật toán tính toán Tốc độ đốt tiền (Burn Rate) và Cảnh báo màu sắc
const calculateBurnRate = (used: number, total: number) => {
  if (!total || total === 0) return { percent: 0, color: "bg-slate-300", text: "text-slate-500", status: "Chưa phân bổ" };
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

  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // --- FORM STATE ---
  const [formData, setFormData] = useState({ departmentId: "", periodId: "", totalAmount: "", isActive: true });

  // 👉 FETCH DATA THẬT (GỌI CHÉO 3 API)
  const { data: budgets = [], isLoading: loadingBudgets, isError, refetch } = useGetBudgetsQuery({});
  const { data: departments = [], isLoading: loadingDepts } = useGetDepartmentsQuery({});
  const { data: periods = [], isLoading: loadingPeriods } = useGetFiscalPeriodsQuery({});
  
  const [createBudget, { isLoading: isCreating }] = useCreateBudgetMutation();
  const [updateBudget, { isLoading: isUpdating }] = useUpdateBudgetMutation();
  const [deleteBudget, { isLoading: isDeleting }] = useDeleteBudgetMutation();

  const isLoading = loadingBudgets || loadingDepts || loadingPeriods;
  const isSubmitting = isCreating || isUpdating;

  // --- XỬ LÝ MỞ FORM ---
  const handleOpenForm = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        departmentId: budget.departmentId,
        periodId: budget.periodId,
        totalAmount: budget.totalAmount.toString(),
        isActive: budget.isActive
      });
    } else {
      setEditingBudget(null);
      setFormData({ departmentId: "", periodId: "", totalAmount: "", isActive: true });
    }
    setIsModalOpen(true);
  };

  // --- HANDLERS DỮ LIỆU ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.departmentId || !formData.periodId || !formData.totalAmount) {
      toast.error("Vui lòng điền đầy đủ Phòng ban, Kỳ và Số tiền!");
      return;
    }

    try {
      const payload = {
        departmentId: formData.departmentId,
        periodId: formData.periodId,
        totalAmount: Number(formData.totalAmount),
        usedAmount: editingBudget ? editingBudget.usedAmount : 0, // Khi tạo mới, đã dùng = 0
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
    e.stopPropagation(); // Ngăn chặn trigger sự kiện click của thẻ Card
    if (window.confirm("Bạn chắc chắn muốn xóa ngân sách này? Mọi cảnh báo chi tiêu của phòng ban này sẽ bị hủy bỏ.")) {
      try {
        await deleteBudget(id).unwrap();
        toast.success("Đã xóa Ngân sách!");
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể xóa do ràng buộc dữ liệu!");
      }
    }
  };

  // --- LỌC & MAP DỮ LIỆU ĐỂ HIỂN THỊ (DATA VIZ) ---
  const mappedBudgets = useMemo(() => {
    return budgets.map(b => {
      // Map ID sang Name cho đẹp
      const deptName = departments.find(d => d.departmentId === b.departmentId)?.name || `Dept ID: ${b.departmentId}`;
      const periodName = periods.find(p => p.periodId === b.periodId)?.periodName || `Period ID: ${b.periodId}`;
      return { ...b, deptName, periodName };
    }).filter(b => 
      b.deptName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.periodName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [budgets, departments, periods, searchQuery]);

  // --- TÍNH KPI TỔNG QUAN ---
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

  // --- ANIMATION CONFIG ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95 }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Lỗi truy xuất dữ liệu Ngân sách</h2>
        <button onClick={() => refetch()} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl text-sm font-bold flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      {/* 1. HEADER */}
      <Header 
        title={t("Quản lý Ngân sách Chi tiêu")} 
        subtitle={t("Thiết lập hạn mức, kiểm soát dòng tiền và cảnh báo vượt ngân sách theo phòng ban.")}
        rightNode={
          <button 
            onClick={() => handleOpenForm()}
            className="px-5 py-2.5 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Cấp Ngân sách</span>
          </button>
        }
      />

      {isLoading ? <BudgetsSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          
          {/* 2. KHỐI KPI TÀI CHÍNH TỔNG */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border-l-4 border-l-indigo-500 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><Target className="w-20 h-20"/></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1.5"><Target className="w-4 h-4 text-indigo-500"/> Tổng Đã Cấp</p>
              <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 relative z-10">{formatVND(kpis.totalAllocated)}</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border-l-4 border-l-orange-500 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><TrendingDown className="w-20 h-20"/></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1.5"><TrendingDown className="w-4 h-4 text-orange-500"/> Đã Tiêu Hao (Burned)</p>
              <h3 className="text-3xl font-black text-orange-600 dark:text-orange-400 relative z-10">{formatVND(kpis.totalBurned)}</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className={`glass p-5 rounded-3xl border-l-4 relative overflow-hidden group ${kpis.overBudgetDepts > 0 ? 'border-l-rose-500 bg-rose-50/30 dark:bg-rose-900/10' : 'border-l-emerald-500'}`}>
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><AlertTriangle className="w-20 h-20"/></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1.5">
                <AlertTriangle className={`w-4 h-4 ${kpis.overBudgetDepts > 0 ? 'text-rose-500' : 'text-emerald-500'}`}/> Báo Động Đỏ
              </p>
              <h3 className={`text-3xl font-black relative z-10 ${kpis.overBudgetDepts > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {kpis.overBudgetDepts} <span className="text-sm font-semibold opacity-70">Phòng ban</span>
              </h3>
              <p className="text-[10px] font-medium text-slate-500 mt-1 relative z-10">{kpis.overBudgetDepts > 0 ? 'Có phòng ban chi tiêu vượt định mức!' : 'Tất cả đều trong tầm kiểm soát'}</p>
            </motion.div>
          </div>

          {/* 3. THANH TÌM KIẾM */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" placeholder="Tìm kiếm theo phòng ban, kỳ kế toán..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>

          {/* 4. LƯỚI CARD NGÂN SÁCH (DATA VIZ TIẾN TRÌNH) */}
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
                    {/* Header Thẻ */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${viz.isAlert ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{budget.deptName}</h4>
                          <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3"/> {budget.periodName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!budget.isActive && <span className="px-2 py-0.5 bg-slate-200 text-slate-500 dark:bg-slate-700 text-[10px] font-bold rounded uppercase">Bị Khóa</span>}
                        <button onClick={(e) => handleDelete(budget.budgetId, e)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Số tiền Data Viz */}
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Đã sử dụng</p>
                        <p className={`text-lg font-black ${viz.text}`}>{formatVND(budget.usedAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Hạn mức</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatVND(budget.totalAmount)}</p>
                      </div>
                    </div>

                    {/* Thanh Burn Rate */}
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${Math.min(viz.percent, 100)}%` }} transition={{ duration: 1 }}
                        className={`h-full rounded-full ${viz.color} ${viz.percent > 100 ? 'animate-pulse' : ''}`}
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
                  Chưa có giới hạn ngân sách nào được thiết lập.
                </div>
              )}
            </AnimatePresence>
          </div>

        </motion.div>
      )}

      {/* ==========================================
          5. INLINE MODAL: TẠO/SỬA NGÂN SÁCH
          ========================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <div className="absolute inset-0" onClick={!isSubmitting ? () => setIsModalOpen(false) : undefined} />
            
            <motion.div 
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-emerald-500/20 overflow-hidden z-10"
            >
              <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-emerald-50/50 dark:bg-emerald-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {editingBudget ? "Điều chỉnh Ngân sách" : "Cấp Ngân sách Mới"}
                    </h2>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Phòng ban thụ hưởng *</label>
                  <select 
                    value={formData.departmentId} onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                    disabled={!!editingBudget} // Không cho đổi phòng ban khi đang sửa
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="">-- Chọn Phòng ban --</option>
                    {departments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Kỳ Kế toán *</label>
                  <select 
                    value={formData.periodId} onChange={(e) => setFormData({...formData, periodId: e.target.value})}
                    disabled={!!editingBudget} // Không cho đổi kỳ khi đang sửa
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="">-- Chọn Kỳ --</option>
                    {periods.map(p => <option key={p.periodId} value={p.periodId}>{p.periodName} ({dayjs(p.startDate).format('MM/YY')})</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Hạn mức Tiền (VND) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                    <input 
                      type="number" min="0" required
                      value={formData.totalAmount} onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
                      placeholder="VD: 100000000"
                      className="w-full pl-10 pr-4 py-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-lg font-black text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Trạng thái Hoạt động</label>
                  <div 
                    onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                    className={`w-12 h-6 flex items-center bg-slate-300 rounded-full p-1 cursor-pointer transition-colors ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-md" style={{ x: formData.isActive ? 24 : 0 }} />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
                  <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">
                    Hủy
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {editingBudget ? "Lưu Thay Đổi" : "Khởi tạo Ngân sách"}
                  </button>
                </div>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}