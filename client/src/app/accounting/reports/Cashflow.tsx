"use client";

import React, { useState, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { 
  TrendingUp, TrendingDown, DollarSign, CalendarDays, 
  Download, AlertOctagon, RefreshCcw, Activity
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from "recharts";
import dayjs from "dayjs";
import 'dayjs/locale/vi';

// --- REDUX & API ---
import { useGetCashflowReportQuery, CashflowData } from "@/state/api";

// --- COMPONENTS ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

dayjs.locale('vi');

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const CashflowSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-2xl"></div>)}
    </div>
    <div className="h-[400px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2"></div>
    <div className="h-[300px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: BÁO CÁO DÒNG TIỀN
// ==========================================
export default function CashflowReport() {
  // --- STATE LỌC THỜI GIAN ---
  // Mặc định lấy 6 tháng gần nhất để biểu đồ vẽ đẹp
  const [startDate, setStartDate] = useState(dayjs().subtract(6, 'month').startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));

  // 👉 FETCH DATA THẬT
  const { data: cashflowData = [], isLoading, isError, refetch, isFetching } = useGetCashflowReportQuery({
    startDate,
    endDate
  });

  // --- TÍNH TOÁN KPI TỔNG QUAN (Từ mảng dữ liệu trả về) ---
  const summary = useMemo(() => {
    return cashflowData.reduce((acc, curr) => ({
      totalIn: acc.totalIn + (curr.cashIn || 0),
      totalOut: acc.totalOut + (curr.cashOut || 0),
      netCash: acc.netCash + (curr.netCash || 0),
    }), { totalIn: 0, totalOut: 0, netCash: 0 });
  }, [cashflowData]);

  // --- ĐỊNH NGHĨA CỘT CHO BẢNG CHI TIẾT ---
  const columns: ColumnDef<CashflowData>[] = [
    {
      header: "Kỳ báo cáo",
      accessorKey: "period",
      sortable: true,
      cell: (row) => (
        <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          {row.period}
        </span>
      )
    },
    {
      header: "Dòng tiền vào (Cash In)",
      accessorKey: "cashIn",
      sortable: true,
      align: "right",
      cell: (row) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          +{formatVND(row.cashIn)}
        </span>
      )
    },
    {
      header: "Dòng tiền ra (Cash Out)",
      accessorKey: "cashOut",
      sortable: true,
      align: "right",
      cell: (row) => (
        <span className="font-bold text-rose-600 dark:text-rose-400">
          -{formatVND(row.cashOut)}
        </span>
      )
    },
    {
      header: "Lưu chuyển thuần (Net Cash)",
      accessorKey: "netCash",
      sortable: true,
      align: "right",
      cell: (row) => {
        const isPositive = row.netCash >= 0;
        return (
          <div className="flex flex-col items-end">
            <span className={`font-black px-2.5 py-1 rounded-lg ${isPositive ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
              {isPositive ? "+" : ""}{formatVND(row.netCash)}
            </span>
          </div>
        );
      }
    }
  ];

  // --- CẤU HÌNH MOTION (60fps Stagger) ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  // --- RENDER LỖI MẠNG ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Lỗi truy xuất Dữ liệu</h2>
        <p className="text-slate-500 mb-6">Mất kết nối với máy chủ phân tích tài chính.</p>
        <button onClick={() => refetch()} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 transition-transform">
          <RefreshCcw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      {/* 1. HEADER & ACTIONS */}
      <Header 
        title="Báo cáo Lưu chuyển Tiền tệ" 
        subtitle="Phân tích chi tiết Dòng tiền vào (Thu) và Dòng tiền ra (Chi) của doanh nghiệp."
        rightNode={
          <button className="px-5 py-2.5 flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất báo cáo</span>
          </button>
        }
      />

      {/* 2. KHU VỰC BỘ LỌC (DATA FILTER) */}
      <div className="flex flex-wrap items-center gap-4 p-4 glass-panel rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Chu kỳ phân tích:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
          <span className="text-slate-400 font-medium">đến</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <CashflowSkeleton />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          
          {/* 3. KHỐI THỐNG KÊ (KPI CARDS) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="glass p-6 rounded-3xl border-l-4 border-l-emerald-500">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tổng Dòng Tiền Vào</p>
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white truncate">{formatVND(summary.totalIn)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-6 rounded-3xl border-l-4 border-l-rose-500">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tổng Dòng Tiền Ra</p>
                <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
                  <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white truncate">{formatVND(summary.totalOut)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className={`glass p-6 rounded-3xl border-l-4 ${summary.netCash >= 0 ? 'border-l-blue-500' : 'border-l-rose-500 bg-rose-50 dark:bg-rose-900/10'}`}>
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Lưu Chuyển Thuần</p>
                <div className={`p-2.5 rounded-xl ${summary.netCash >= 0 ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-rose-100 dark:bg-rose-500/20'}`}>
                  <DollarSign className={`w-5 h-5 ${summary.netCash >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`} />
                </div>
              </div>
              <h3 className={`text-3xl font-black truncate ${summary.netCash >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {summary.netCash > 0 ? "+" : ""}{formatVND(summary.netCash)}
              </h3>
            </motion.div>
          </div>

          {/* 4. BIỂU ĐỒ TRỰC QUAN (DATA VIZ) */}
          <motion.div variants={itemVariants} className="glass p-6 rounded-3xl flex flex-col h-[450px]">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Xu hướng Dòng tiền</h3>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} dx={-10} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                    formatter={(value: any) => formatVND(Number(value) || 0)} 
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '13px', fontWeight: 700 }} />
                  <Area type="monotone" name="Dòng tiền Vào" dataKey="cashIn" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                  <Area type="monotone" name="Dòng tiền Ra" dataKey="cashOut" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* 5. BẢNG DỮ LIỆU CHI TIẾT */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5">
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-slate-800 dark:text-white">Bảng kê chi tiết theo kỳ</h3>
            </div>
            <DataTable 
              data={cashflowData} 
              columns={columns} 
              itemsPerPage={12} // Cho phép hiển thị trọn 1 năm nếu cần
            />
          </motion.div>

        </motion.div>
      )}

    </div>
  );
}