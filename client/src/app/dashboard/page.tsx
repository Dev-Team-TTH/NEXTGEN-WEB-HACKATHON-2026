"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Package, ClipboardCheck,
  WalletCards, AlertOctagon, RefreshCcw, Activity, Clock
} from "lucide-react";
import dayjs from "dayjs";
import 'dayjs/locale/vi';

// --- GỌI API THẬT TỪ REDUX (Theo đúng cấu trúc api.ts của bạn) ---
import { useGetDashboardMetricsQuery, useGetCashflowReportQuery } from "@/state/api"; 
import Header from "@/app/(components)/Header";

dayjs.locale('vi');

// ==========================================
// 1. COMPONENT: SKELETON LOADING
// ==========================================
const DashboardSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse">
    <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl mb-2"></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="h-[400px] lg:col-span-2 rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>
      <div className="h-[400px] rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>
    </div>
  </div>
);

// ==========================================
// 2. HELPER FORMAT FORMATTER
// ==========================================
const formatVND = (val: number | undefined | null) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val || 0);

const formatNumber = (val: number | undefined | null) => 
  new Intl.NumberFormat('vi-VN').format(val || 0);

// ==========================================
// 3. COMPONENT CHÍNH: BẢNG ĐIỀU KHIỂN
// ==========================================
export default function DashboardPage() {
  const { t } = useTranslation();

  // 👉 FETCH DATA THẬT (GỌI 2 API CÙNG LÚC)
  const { data: metrics, isLoading: loadMetrics, isError: errMetrics, refetch: refetchMetrics, isFetching: fetchMetrics } = useGetDashboardMetricsQuery();
  // Gọi API Cashflow riêng biệt theo đúng chuẩn của bạn
  const { data: cashflow, isLoading: loadCashflow, isError: errCashflow, refetch: refetchCashflow } = useGetCashflowReportQuery({});

  const isLoading = loadMetrics || loadCashflow;
  const isError = errMetrics || errCashflow;

  // --- CẤU HÌNH MOTION ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, filter: "blur(5px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  // --- LUỒNG XỬ LÝ LỖI ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Không thể tải dữ liệu Bảng điều khiển</h2>
        <p className="text-slate-500 mb-6">Mất kết nối đến máy chủ hoặc phiên đăng nhập đã hết hạn.</p>
        <button onClick={() => { refetchMetrics(); refetchCashflow(); }} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg active:scale-95">
          <RefreshCcw className={`w-5 h-5 ${fetchMetrics ? 'animate-spin' : ''}`} /> Thử lại
        </button>
      </div>
    );
  }

  // --- LUỒNG CHỜ DATA ---
  if (isLoading || !metrics) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      <Header 
        title={t("Bảng điều khiển")} 
        subtitle={t("Dữ liệu thời gian thực được trích xuất từ các phân hệ cốt lõi.")} 
      />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
        
        {/* ==========================================
            SECTION 1: BỘ CHỈ SỐ KPI (Map đúng với Interface DashboardMetrics)
            ========================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Card 1: Doanh thu tháng này */}
          <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-blue-500 group hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Doanh Thu (Tháng)</p>
              <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
                <WalletCards className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 truncate">
              {formatVND(metrics.financials?.currentMonth?.revenue)}
            </h3>
            <p className="text-slate-400 text-xs mt-1 pt-2 border-t border-slate-100 dark:border-white/5 truncate">
              Lợi nhuận: <span className="text-blue-500 font-bold">{formatVND(metrics.financials?.currentMonth?.netProfit)}</span>
            </p>
          </motion.div>

          {/* Card 2: Dòng tiền thực tế (Cash Balance) */}
          <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-emerald-500 group hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tiền Mặt & TGNH</p>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 truncate">
              {formatVND(metrics.summary?.currentCashBalance)}
            </h3>
            <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400">
              <span className="text-emerald-500 font-medium">In: {formatNumber(metrics.financials?.totalCashIn)}</span>
              <span>|</span>
              <span className="text-rose-500 font-medium">Out: {formatNumber(metrics.financials?.totalCashOut)}</span>
            </div>
          </motion.div>

          {/* Card 3: Giá trị Tồn Kho */}
          <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-amber-500 group hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng Giá Trị Kho</p>
              <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 truncate">
              {formatVND(metrics.summary?.totalInventoryValue)}
            </h3>
            <p className="text-slate-400 text-xs mt-1 border-t border-slate-100 dark:border-white/5 pt-2 truncate">
              Phải thu: <span className="text-amber-500">{formatVND(metrics.summary?.totalAccountsReceivable)}</span>
            </p>
          </motion.div>

          {/* Card 4: Công việc / Phê duyệt */}
          <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-indigo-500 group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
            {(metrics.tasks?.pendingApprovals || 0) > 0 && (
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-rose-500/20 rounded-full animate-ping pointer-events-none"></div>
            )}
            <div className="flex justify-between items-start mb-4 relative z-10">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phiếu Chờ Duyệt</p>
              <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                <ClipboardCheck className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-1 relative z-10 truncate">
              {formatNumber(metrics.tasks?.pendingApprovals)} <span className="text-sm font-medium text-slate-500">yêu cầu</span>
            </h3>
          </motion.div>
        </div>

        {/* ==========================================
            SECTION 2: BIỂU ĐỒ & HOẠT ĐỘNG (DATA VIZ)
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* BIỂU ĐỒ 1: BÁO CÁO DÒNG TIỀN (Map với api getCashflowReport) */}
          <motion.div variants={itemVariants} className="glass p-5 sm:p-6 rounded-2xl lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Báo cáo Dòng tiền (Tháng)</h3>
            </div>
            
            <div className="w-full h-[300px] sm:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflow || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCashIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCashOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  {/* Trục X map với trường 'period' trong CashflowData */}
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  {/* Trục Y format thành đơn vị Triệu (M) */}
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} dx={-10} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', border: 'none', color: '#fff' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value: any) => formatVND(Number(value) || 0)} 
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                  {/* Map với trường cashIn và cashOut trong CashflowData */}
                  <Area type="monotone" name="Tiền Thu (Cash In)" dataKey="cashIn" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCashIn)" />
                  <Area type="monotone" name="Tiền Chi (Cash Out)" dataKey="cashOut" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCashOut)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* DANH SÁCH: HOẠT ĐỘNG GẦN ĐÂY (Map với recentActivities) */}
          <motion.div variants={itemVariants} className="glass p-5 sm:p-6 rounded-2xl flex flex-col h-[400px] sm:h-[446px]">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-white/5">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Hoạt động Hệ thống</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {metrics.recentActivities && metrics.recentActivities.length > 0 ? (
                metrics.recentActivities.map((log) => (
                  <div key={log.logId} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-50 dark:ring-blue-900/20 z-10"></div>
                      <div className="w-px h-full bg-slate-200 dark:bg-slate-700 mt-1 group-last:hidden"></div>
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                        {log.action} <span className="text-blue-600 dark:text-blue-400">{log.entityName}</span>
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-700 dark:text-slate-400">{log.user?.fullName || "System"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {dayjs(log.timestamp).format('HH:mm - DD/MM')}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Activity className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">Chưa có hoạt động mới</p>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}