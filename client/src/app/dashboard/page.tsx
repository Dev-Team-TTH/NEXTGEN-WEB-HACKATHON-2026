"use client";

import React, { useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { useTheme } from "next-themes";
import { 
  Wallet, TrendingUp, TrendingDown, Package, 
  Activity, Bell, Star, CalendarDays, ArrowRight,
  RefreshCcw, AlertOctagon, DollarSign, CreditCard,
  CheckCircle2, FileText, Download 
} from "lucide-react";
import dayjs from "dayjs";
import 'dayjs/locale/vi';
import { toast } from "react-hot-toast";

// --- RECHARTS (DATA VIZ) ---
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from "recharts";

// --- REDUX & API ---
import { 
  useGetDashboardMetricsQuery, 
  useGetPendingApprovalsQuery 
} from "@/state/api";
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG CONTEXT CHI NHÁNH

// --- UTILS ---
import { formatVND } from "@/utils/formatters";
import { exportToCSV } from "@/utils/exportUtils";
import { cn } from "@/utils/helpers";

dayjs.locale('vi');

// ==========================================
// STRICT TYPES
// ==========================================
interface CashflowItem {
  period: string;
  cashIn: number;
  cashOut: number;
}

interface RevenueExpenseItem {
  name: string;
  DoanhThu: number;
  ChiPhi: number;
}

interface ProductMetrics {
  name: string;
  revenue: number;
  imageUrl?: string;
}

interface ActivityLog {
  user?: { fullName: string };
  action: string;
  tableName: string;
  timestamp: string | Date;
}

interface DashboardMetricsStrict {
  summary?: {
    totalInventoryValue: number;
    currentCashBalance: number;
    totalAccountsReceivable: number;
    totalAccountsPayable: number;
  };
  financials?: {
    totalCashIn: number;
    totalCashOut: number;
    currentMonth: { revenue: number; expense: number; netProfit: number };
  };
  tasks?: {
    pendingApprovals: number;
  };
  popularProducts?: ProductMetrics[];
  recentActivities?: ActivityLog[];
  cashflow?: CashflowItem[];
  revenueExpense?: RevenueExpenseItem[];
}

// ==========================================
// 1. HIGH-END SKELETON (SHIMMER + NOISE)
// ==========================================
const ShimmerSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("relative overflow-hidden bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl transition-colors duration-500", className)}>
    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none transition-colors duration-500"></div>
    <motion.div
      className="absolute top-0 bottom-0 w-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent skew-x-[-20deg] transition-colors duration-500"
      initial={{ left: "-100%" }}
      animate={{ left: "200%" }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
    />
  </div>
);

const DashboardSkeleton = () => (
  <div className="flex flex-col gap-6 w-full transition-colors duration-500">
    <ShimmerSkeleton className="h-12 w-1/3 rounded-xl" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <ShimmerSkeleton key={i} className="h-36 rounded-2xl" />)}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <ShimmerSkeleton className="h-[400px] rounded-3xl" />
      <ShimmerSkeleton className="h-[400px] rounded-3xl" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => <ShimmerSkeleton key={i} className="h-[300px] rounded-3xl" />)}
    </div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: DASHBOARD TRUNG TÂM
// ==========================================
export default function DashboardPage() {
  const { theme } = useTheme();
  
  // 🚀 BỐI CẢNH REDUX (CONTEXT ISOLATION)
  const currentUser = useAppSelector((state: any) => state.global?.currentUser);
  const { activeBranchId } = useAppSelector((state: any) => state.global);
  
  // 👉 FETCH REAL DATA TỪ BACKEND (🚀 ĐÃ BƠM BỐI CẢNH CHI NHÁNH VÀ KHÓA KHI TRỐNG)
  const { data, isLoading, isError, refetch, isFetching } = useGetDashboardMetricsQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );
  
  const { data: rawPendingApprovals } = useGetPendingApprovalsQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );

  const safeData = data as DashboardMetricsStrict | undefined;
  
  const pendingApprovals = useMemo(() => {
    if (!rawPendingApprovals) return [];
    return Array.isArray(rawPendingApprovals) ? rawPendingApprovals : (rawPendingApprovals as any).data || [];
  }, [rawPendingApprovals]);

  const summary = safeData?.summary || { totalInventoryValue: 0, currentCashBalance: 0, totalAccountsReceivable: 0, totalAccountsPayable: 0 };
  const popularProducts = safeData?.popularProducts || [];
  const recentActivities = safeData?.recentActivities || [];

  const cashflowData = safeData?.cashflow || [];
  const revenueExpenseData = safeData?.revenueExpense || [];
  const pendingTaskCount = safeData?.tasks?.pendingApprovals || pendingApprovals.length;

  const handleExportReport = () => {
    if (cashflowData.length === 0 && revenueExpenseData.length === 0) {
      toast.error("Không có dữ liệu biểu đồ để xuất!");
      return;
    }
    const exportData = cashflowData.map(c => ({
      "Kỳ kế toán": c.period,
      "Dòng tiền Vào (VND)": c.cashIn,
      "Dòng tiền Ra (VND)": c.cashOut,
      "Lưu chuyển thuần": c.cashIn - c.cashOut
    }));
    exportToCSV(exportData, `Bao_Cao_Tong_Quan_Dashboard_${dayjs().format('DDMMYYYY')}`);
    toast.success("Xuất báo cáo tổng quan thành công!");
  };

  // --- ANIMATION CONFIG (APPLE SPRING PHYSICS) ---
  const containerVariants: Variants = { 
    hidden: { opacity: 0 }, 
    show: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1, delayChildren: 0.05 } 
    } 
  };
  
  const itemVariants: Variants = { 
    hidden: { opacity: 0, y: 30, scale: 0.95 }, 
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 25, mass: 0.8 } } 
  };

  // 🚀 LÁ CHẮN UI: KHÔNG CÓ CHI NHÁNH
  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] w-full text-center transition-colors duration-500">
        <div className="w-24 h-24 bg-amber-100 dark:bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-6 transition-colors duration-500">
          <AlertOctagon className="w-12 h-12 animate-pulse transition-colors duration-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-3 transition-colors duration-500">Chưa xác định Chi nhánh</h2>
        <p className="text-slate-500 max-w-md mb-8 transition-colors duration-500">Vui lòng chọn Chi nhánh hoạt động ở menu trên cùng để hệ thống tải Báo cáo Tổng quan (Dashboard).</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] w-full text-center transition-colors duration-500">
        <div className="w-24 h-24 bg-rose-100 dark:bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6 transition-colors duration-500">
          <AlertOctagon className="w-12 h-12 animate-pulse transition-colors duration-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-3 transition-colors duration-500">Lỗi tải dữ liệu Dashboard</h2>
        <p className="text-slate-500 max-w-md mb-8 transition-colors duration-500">Không thể kết nối đến máy chủ tổng hợp. Vui lòng kiểm tra lại đường truyền hoặc xem API có đang hoạt động không.</p>
        <button onClick={() => refetch()} className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors duration-500">
          <RefreshCcw className={cn("w-5 h-5", isFetching && 'animate-spin')} /> Thử lại ngay
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-12 overflow-x-hidden transition-colors duration-500">
      
      {/* HEADER DASHBOARD */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2 transition-colors duration-500"
      >
        <div className="transition-colors duration-500">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors duration-500">
            Xin chào, {currentUser?.fullName?.split(" ").pop() || "Quản trị viên"}! 👋
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 transition-colors duration-500">
            <CalendarDays className="w-4 h-4 transition-colors duration-500" /> Hôm nay là {dayjs().format('dddd, [ngày] DD [tháng] MM [năm] YYYY')}
          </p>
        </div>
        <div className="flex items-center gap-3 transition-colors duration-500">
          <button 
            onClick={handleExportReport} 
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm font-bold text-sm duration-500"
          >
            <Download className="w-4 h-4 transition-colors duration-500" />
            <span className="hidden sm:inline transition-colors duration-500">Xuất Báo Cáo</span>
          </button>

          <button onClick={() => refetch()} disabled={isFetching} className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50 duration-500">
            <RefreshCcw className={cn("w-5 h-5 transition-colors duration-500", isFetching && 'animate-spin')} />
          </button>
          <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl flex items-center gap-2 transition-colors duration-500">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse transition-colors duration-500"></div>
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 transition-colors duration-500">Hệ thống Real-time Đang chạy</span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full transition-colors duration-500">
        
        {/* ==========================================
            KHỐI 1: 4 THẺ CHỈ SỐ KPI (KPI CARDS)
            ========================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 transition-colors duration-500">
          
          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl p-6 bg-emerald-600 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] group hover:-translate-y-1 transition-transform duration-300 cursor-default">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500 ease-out">
              <Wallet className="w-32 h-32" />
            </div>
            <div className="relative z-10 transition-colors duration-500">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm transition-colors duration-500">
                <DollarSign className="w-6 h-6 text-white transition-colors duration-500" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 mb-1 transition-colors duration-500">Tiền mặt & Tiền gửi</p>
              <h3 className="text-3xl font-black truncate transition-colors duration-500">{formatVND(summary.currentCashBalance)}</h3>
              <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg text-xs font-semibold backdrop-blur-sm transition-colors duration-500">
                <TrendingUp className="w-3.5 h-3.5 transition-colors duration-500" /> Thực tế hiện tại
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 group hover:border-amber-300 hover:shadow-lg transition-all duration-300 cursor-default">
            <div className="absolute right-0 top-0 p-6 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-out">
              <TrendingUp className="w-24 h-24 text-amber-500 transition-colors duration-500" />
            </div>
            <div className="relative z-10 transition-colors duration-500">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 border border-amber-100 dark:border-amber-500/20 group-hover:bg-amber-100 transition-colors duration-500">
                <CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400 transition-colors duration-500" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 transition-colors duration-500">Tổng nợ Phải Thu (KH)</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white truncate transition-colors duration-500">{formatVND(summary.totalAccountsReceivable)}</h3>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded transition-colors duration-500">
                Đang chờ khách hàng thanh toán
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 group hover:border-rose-300 hover:shadow-lg transition-all duration-300 cursor-default">
            <div className="absolute right-0 top-0 p-6 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-out">
              <TrendingDown className="w-24 h-24 text-rose-500 transition-colors duration-500" />
            </div>
            <div className="relative z-10 transition-colors duration-500">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center mb-4 border border-rose-100 dark:border-rose-500/20 group-hover:bg-rose-100 transition-colors duration-500">
                <Activity className="w-6 h-6 text-rose-600 dark:text-rose-400 transition-colors duration-500" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 transition-colors duration-500">Tổng nợ Phải Trả (NCC)</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white truncate transition-colors duration-500">{formatVND(summary.totalAccountsPayable)}</h3>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded transition-colors duration-500">
                Công nợ cần thanh toán
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 group hover:border-indigo-300 hover:shadow-lg transition-all duration-300 cursor-default">
            <div className="absolute right-0 top-0 p-6 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-out">
              <Package className="w-24 h-24 text-indigo-500 transition-colors duration-500" />
            </div>
            <div className="relative z-10 transition-colors duration-500">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-500/20 group-hover:bg-indigo-100 transition-colors duration-500">
                <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400 transition-colors duration-500" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 transition-colors duration-500">Tổng Giá trị Tồn Kho</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white truncate transition-colors duration-500">{formatVND(summary.totalInventoryValue)}</h3>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded transition-colors duration-500">
                Dữ liệu kho thực tế
              </div>
            </div>
          </motion.div>

        </div>

        {/* ==========================================
            KHỐI 2: ĐỒ THỊ BIỂU DIỄN DỮ LIỆU (CHARTS)
            ========================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 transition-colors duration-500">
          
          {/* Chart 1: Dòng tiền (Cashflow) */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors duration-500">
            <div className="flex items-center justify-between mb-6 transition-colors duration-500">
              <div className="transition-colors duration-500">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 transition-colors duration-500">
                  <Activity className="w-5 h-5 text-indigo-500 transition-colors duration-500"/> Lưu chuyển Tiền tệ
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1 transition-colors duration-500">Phân tích Thu/Chi theo kỳ kế toán</p>
              </div>
              <div className="flex gap-4 text-xs font-bold transition-colors duration-500">
                <div className="flex items-center gap-1.5 transition-colors duration-500"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm transition-colors duration-500"></div> Thu vào</div>
                <div className="flex items-center gap-1.5 transition-colors duration-500"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm transition-colors duration-500"></div> Chi ra</div>
              </div>
            </div>
            
            <div style={{ width: '100%', height: 320, minHeight: 320 }}>
              {cashflowData.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 bg-slate-50 dark:bg-slate-800/50 transition-colors duration-500">
                  <Activity className="w-10 h-10 opacity-30 mb-2 transition-colors duration-500" />
                  <p className="text-sm font-bold transition-colors duration-500">Chưa có dữ liệu dòng tiền để phân tích</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={cashflowData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis tickFormatter={(val) => `${val / 1000000}M`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600 }} width={60} />
                    <RechartsTooltip 
                      cursor={{ stroke: theme === 'dark' ? '#475569' : '#cbd5e1', strokeWidth: 1, strokeDasharray: '5 5' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a', fontWeight: 'bold' }}
                      formatter={(val: any) => formatVND(Number(val) || 0)}
                    />
                    <Area type="monotone" dataKey="cashIn" name="Thu vào" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.15} activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} animationDuration={1500} animationEasing="ease-out" />
                    <Area type="monotone" dataKey="cashOut" name="Chi ra" stroke="#f43f5e" strokeWidth={3} fill="#f43f5e" fillOpacity={0.15} activeDot={{ r: 6, strokeWidth: 0, fill: '#f43f5e' }} animationDuration={1500} animationEasing="ease-out" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Chart 2: Doanh thu & Chi phí (Bar Chart) */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors duration-500">
            <div className="flex items-center justify-between mb-6 transition-colors duration-500">
              <div className="transition-colors duration-500">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 transition-colors duration-500">
                  <TrendingUp className="w-5 h-5 text-blue-500 transition-colors duration-500"/> Hiệu quả Kinh doanh
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1 transition-colors duration-500">So sánh Doanh thu / Chi phí bán hàng</p>
              </div>
            </div>
            
            <div style={{ width: '100%', height: 320, minHeight: 320 }}>
              {revenueExpenseData.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 bg-slate-50 dark:bg-slate-800/50 transition-colors duration-500">
                  <TrendingUp className="w-10 h-10 opacity-30 mb-2 transition-colors duration-500" />
                  <p className="text-sm font-bold transition-colors duration-500">Chưa phát sinh doanh thu / chi phí</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={revenueExpenseData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis tickFormatter={(val) => `${val / 1000000}M`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600 }} width={60} />
                    <RechartsTooltip 
                      cursor={{ fill: theme === 'dark' ? '#334155' : '#f1f5f9', opacity: 0.4 }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#fff' : '#0f172a', fontWeight: 'bold' }}
                      formatter={(val: any) => formatVND(Number(val) || 0)}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }} />
                    <Bar dataKey="DoanhThu" name="Doanh Thu Bán Hàng" fill="#3b82f6" radius={[6, 6, 0, 0]} animationDuration={1500} animationEasing="ease-out" />
                    <Bar dataKey="ChiPhi" name="Chi Phí Hoạt Động" fill="#f59e0b" radius={[6, 6, 0, 0]} animationDuration={1500} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

        </div>

        {/* ==========================================
            KHỐI 3: DANH SÁCH CHI TIẾT (LISTS)
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 transition-colors duration-500">
          
          {/* List 1: Chứng từ chờ duyệt */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px] transition-colors duration-500">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/50 rounded-t-3xl transition-colors duration-500">
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 transition-colors duration-500">
                <Bell className="w-4 h-4 text-amber-500 transition-colors duration-500"/> Cần Xử Lý ({pendingTaskCount})
              </h3>
              <button className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-md hover:bg-indigo-100 transition-colors duration-500">Xem tất cả</button>
            </div>
            <div className="p-2 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 transition-colors duration-500">
              {pendingApprovals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 transition-colors duration-500">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 opacity-50 mb-2 transition-colors duration-500" />
                  <span className="text-sm font-bold transition-colors duration-500">Không có việc cần xử lý</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 transition-colors duration-500">
                  {/* 🚀 FIX: Sửa lỗi thiếu thẻ </div> tại vòng map pendingApprovals */}
                  {pendingApprovals.map((req: any) => (
                    <motion.div 
                      key={req.requestId} 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl cursor-pointer transition-colors group flex items-start gap-3 duration-500"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0 transition-colors duration-500">
                        <FileText className="w-5 h-5 text-amber-500 transition-colors duration-500" />
                      </div>
                      <div className="flex-1 min-w-0 transition-colors duration-500">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 transition-colors duration-500">
                          Tờ trình #{req.document?.documentNumber || req.requestId}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate transition-colors duration-500">
                          Người tạo: {req.requester?.fullName || 'Hệ thống'}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all mt-2 duration-500" />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* List 2: Sản phẩm bán chạy */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px] transition-colors duration-500">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/50 rounded-t-3xl transition-colors duration-500">
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 transition-colors duration-500">
                <Star className="w-4 h-4 text-orange-500 transition-colors duration-500"/> Top Bán Chạy
              </h3>
            </div>
            <div className="p-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 transition-colors duration-500">
              {popularProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 transition-colors duration-500">
                  <Package className="w-12 h-12 opacity-30 mb-2 transition-colors duration-500" />
                  <span className="text-sm font-bold transition-colors duration-500">Chưa có dữ liệu bán hàng</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 transition-colors duration-500">
                  {popularProducts.map((prod: ProductMetrics, idx: number) => (
                    <motion.div 
                      key={idx} 
                      whileHover={{ x: 5 }}
                      className="flex items-center gap-3 cursor-default transition-colors duration-500"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-500">
                        {prod.imageUrl ? <img src={prod.imageUrl} alt="Prod" className="w-full h-full object-cover transition-colors duration-500"/> : <Package className="w-5 h-5 text-slate-400 transition-colors duration-500"/>}
                      </div>
                      <div className="flex-1 min-w-0 transition-colors duration-500">
                        <div className="flex justify-between items-end mb-1 transition-colors duration-500">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-2 transition-colors duration-500">{prod.name}</p>
                          <span className="text-[10px] font-black text-emerald-600 transition-colors duration-500">{formatVND(prod.revenue)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden transition-colors duration-500">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(10, (prod.revenue / (popularProducts[0]?.revenue || 1)) * 100)}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-colors duration-500" 
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* List 3: Nhật ký hoạt động */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px] transition-colors duration-500">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/50 rounded-t-3xl transition-colors duration-500">
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 transition-colors duration-500">
                <Activity className="w-4 h-4 text-blue-500 transition-colors duration-500"/> Hoạt động gần đây
              </h3>
            </div>
            <div className="p-5 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 transition-colors duration-500">
              {recentActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 transition-colors duration-500">
                  <span className="text-sm font-bold transition-colors duration-500">Hệ thống đang tĩnh lặng</span>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 dark:border-slate-700 ml-3 pl-5 py-2 space-y-6 transition-colors duration-500">
                  {recentActivities.map((log: ActivityLog, idx: number) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative hover:bg-slate-50 dark:hover:bg-slate-800/30 p-2 -ml-2 rounded-xl transition-colors duration-500"
                    >
                      <div className="absolute -left-[37px] top-3 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 bg-blue-500 shadow-sm transition-colors duration-500"></div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight transition-colors duration-500">
                        <span className="text-blue-600 dark:text-blue-400 transition-colors duration-500">{log.user?.fullName || 'Hệ thống'}</span> đã {log.action === "CREATE" ? "tạo mới" : log.action === "UPDATE" ? "cập nhật" : "xóa"} dữ liệu trong phân hệ {log.tableName}.
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 mt-1 transition-colors duration-500">{dayjs(log.timestamp).format('HH:mm - DD/MM/YYYY')}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}