"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { 
  TrendingUp, TrendingDown, DollarSign, CalendarDays, 
  Download, AlertOctagon, RefreshCcw, Activity, AlertTriangle
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from "recharts";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG: Import để lấy Chi nhánh
import { useGetCashflowReportQuery, CashflowData } from "@/state/api";

// --- COMPONENTS & UTILS ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import { formatVND, safeRound } from "@/utils/formatters"; // 🚀 BỔ SUNG: safeRound để khử rác phân số
import { exportToCSV } from "@/utils/exportUtils";
import { cn } from "@/utils/helpers";

// Lấy 6 tháng trước bằng JS thuần, không dùng thư viện ngoài
const getSixMonthsAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  d.setDate(1);
  return d.toISOString().split('T')[0];
};

const getEndOftoday = () => {
  return new Date().toISOString().split('T')[0];
};

// ==========================================
// 1. SKELETON LOADING
// ==========================================
const CashflowSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6 transition-colors duration-500">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-2xl transition-colors duration-500"></div>)}
    </div>
    <div className="h-[400px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2 transition-colors duration-500"></div>
    <div className="h-[300px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2 transition-colors duration-500"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export default function CashflowReport() {
  
  // 🚀 BỐI CẢNH REDUX (CÔ LẬP DỮ LIỆU ĐA CHI NHÁNH)
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  const [startDate, setStartDate] = useState(getSixMonthsAgo());
  const [endDate, setEndDate] = useState(getEndOftoday());
  const [dateError, setDateError] = useState("");

  // 🚀 KIỂM TRA TÍNH HỢP LỆ CỦA THỜI GIAN TRƯỚC KHI FETCH
  useEffect(() => {
    if (new Date(startDate) > new Date(endDate)) {
      setDateError("Ngày bắt đầu không được lớn hơn ngày kết thúc!");
    } else {
      setDateError("");
    }
  }, [startDate, endDate]);

  // 👉 FETCH DATA (🚀 BẢO VỆ BẰNG NHÁNH VÀ CHẶN LỖI THỜI GIAN)
  const { data: cashflowData = [], isLoading, isError, refetch, isFetching } = useGetCashflowReportQuery({
    branchId: activeBranchId, 
    startDate,
    endDate
  } as any, { skip: !activeBranchId || !!dateError }); // 🚀 BỎ QUA NẾU LỖI LOGIC NGÀY THÁNG

  // --- TÍNH TOÁN DÒNG TỔNG CỘNG ---
  const summary = useMemo(() => {
    return cashflowData.reduce((acc, curr) => ({
      // 🚀 KHỬ SAI SỐ DẤU PHẨY ĐỘNG (FLOAT PRECISION BUG) BẰNG SAFEROUND
      totalIn: safeRound(acc.totalIn + (curr.cashIn || 0)),
      totalOut: safeRound(acc.totalOut + (curr.cashOut || 0)),
      netCash: safeRound(acc.netCash + (curr.netCash || 0)),
    }), { totalIn: 0, totalOut: 0, netCash: 0 });
  }, [cashflowData]);

  // --- HANDLER EXPORT DỮ LIỆU ---
  const handleExportData = () => {
    if (cashflowData.length === 0) {
      toast.error("Không có dữ liệu để xuất!"); return;
    }
    const exportData = cashflowData.map(row => ({
      "Kỳ báo cáo": row.period,
      "Dòng tiền vào (VND)": row.cashIn || 0,
      "Dòng tiền ra (VND)": row.cashOut || 0,
      "Lưu chuyển thuần (VND)": row.netCash || 0
    }));
    exportToCSV(exportData, `Bao_Cao_Luu_Chuyen_Tien_Te_${startDate}_den_${endDate}`);
    toast.success("Xuất báo cáo dòng tiền thành công!");
  };

  // --- 🚀 TỐI ƯU BỘ NHỚ: ĐỊNH NGHĨA CỘT DATATABLE ---
  const columns: ColumnDef<CashflowData>[] = useMemo(() => [
    {
      header: "Kỳ báo cáo",
      accessorKey: "period",
      sortable: true,
      cell: (row) => (
        <span className="font-bold text-slate-800 dark:text-white flex items-center gap-2 transition-colors duration-500">
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
        <span className="font-bold text-emerald-600 dark:text-emerald-400 transition-colors duration-500">
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
        <span className="font-bold text-rose-600 dark:text-rose-400 transition-colors duration-500">
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
          <div className="flex flex-col items-end transition-colors duration-500">
            <span className={cn(
              "font-black px-2.5 py-1 rounded-lg transition-colors duration-500 shadow-sm", 
              isPositive ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
            )}>
              {isPositive ? "+" : ""}{formatVND(row.netCash)}
            </span>
          </div>
        );
      }
    }
  ], []);

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } } };

  // 🚀 LÁ CHẮN UI: KHÔNG CÓ CHI NHÁNH
  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-colors duration-500">
        <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Chưa chọn Chi nhánh</h2>
        <p className="text-slate-500 transition-colors duration-500">Vui lòng chọn Chi nhánh hoạt động ở góc trên màn hình để xem Báo cáo.</p>
      </div>
    );
  }

  // --- GIAO DIỆN LỖI FETCH ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-colors duration-500">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Lỗi truy xuất Dữ liệu</h2>
        <p className="text-slate-500 mb-6 transition-colors duration-500">Mất kết nối với máy chủ phân tích tài chính.</p>
        <button onClick={() => refetch()} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 transition-transform">
          <RefreshCcw className={cn("w-5 h-5", isFetching && "animate-spin")} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10 transition-colors duration-500">
      
      <Header 
        title="Báo cáo Lưu chuyển Tiền tệ" 
        subtitle="Phân tích chi tiết Dòng tiền vào (Thu) và Dòng tiền ra (Chi) của doanh nghiệp."
        rightNode={
          <button onClick={handleExportData} disabled={!!dateError} className="px-5 py-2.5 flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất báo cáo</span>
          </button>
        }
      />

      {/* FILTER PANEL */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4 p-4 glass-panel rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors duration-500">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <CalendarDays className="w-5 h-5 text-slate-400 shrink-0" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors duration-500 whitespace-nowrap">Chu kỳ phân tích:</span>
          
          <div className="flex items-center gap-2 ml-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={cn("px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-medium outline-none text-slate-900 dark:text-white shadow-sm transition-colors duration-500 cursor-pointer", dateError ? "border-rose-500 focus:ring-2 focus:ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500")}
            />
            <span className="text-slate-400 font-medium transition-colors duration-500">đến</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={cn("px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-medium outline-none text-slate-900 dark:text-white shadow-sm transition-colors duration-500 cursor-pointer", dateError ? "border-rose-500 focus:ring-2 focus:ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500")}
            />
          </div>
        </div>
        
        {/* 🚀 HIỂN THỊ LỖI NGÀY THÁNG TRỰC QUAN */}
        {dateError && (
          <div className="flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-md border border-rose-200 dark:border-rose-500/20 animate-pulse transition-colors duration-500">
            <AlertTriangle className="w-4 h-4" /> {dateError}
          </div>
        )}
      </div>

      {isLoading ? (
        <CashflowSkeleton />
      ) : dateError ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 transition-colors duration-500">
           <AlertTriangle className="w-16 h-16 mb-4 opacity-50 text-rose-500 transition-colors duration-500" />
           <span className="text-lg font-bold text-rose-500 transition-colors duration-500">Bộ lọc thời gian không hợp lệ</span>
           <span className="text-sm mt-1 transition-colors duration-500">Vui lòng điều chỉnh lại Ngày bắt đầu và Ngày kết thúc.</span>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="glass p-6 rounded-3xl border-l-4 border-l-emerald-500 transition-colors duration-500 hover:shadow-md">
              <div className="flex justify-between items-start mb-4 transition-colors duration-500">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider transition-colors duration-500">Tổng Dòng Tiền Vào</p>
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl transition-colors duration-500">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white truncate transition-colors duration-500">{formatVND(summary.totalIn)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-6 rounded-3xl border-l-4 border-l-rose-500 transition-colors duration-500 hover:shadow-md">
              <div className="flex justify-between items-start mb-4 transition-colors duration-500">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider transition-colors duration-500">Tổng Dòng Tiền Ra</p>
                <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl transition-colors duration-500">
                  <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white truncate transition-colors duration-500">{formatVND(summary.totalOut)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className={cn(
              "glass p-6 rounded-3xl border-l-4 transition-colors duration-500 hover:shadow-md",
              summary.netCash >= 0 ? "border-l-blue-500" : "border-l-rose-500 bg-rose-50 dark:bg-rose-900/10"
            )}>
              <div className="flex justify-between items-start mb-4 transition-colors duration-500">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider transition-colors duration-500">Lưu Chuyển Thuần</p>
                <div className={cn("p-2.5 rounded-xl transition-colors duration-500", summary.netCash >= 0 ? "bg-blue-100 dark:bg-blue-500/20" : "bg-rose-100 dark:bg-rose-500/20")}>
                  <DollarSign className={cn("w-5 h-5 transition-colors duration-500", summary.netCash >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400")} />
                </div>
              </div>
              <h3 className={cn("text-3xl font-black truncate transition-colors duration-500", summary.netCash >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400")}>
                {summary.netCash > 0 ? "+" : ""}{formatVND(summary.netCash)}
              </h3>
            </motion.div>
          </div>

          {/* BIỂU ĐỒ DIỄN BIẾN DÒNG TIỀN */}
          <motion.div variants={itemVariants} className="glass p-6 rounded-3xl flex flex-col h-[450px] transition-colors duration-500 border border-slate-200/50 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-2 mb-6 transition-colors duration-500">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white transition-colors duration-500">Xu hướng Dòng tiền</h3>
            </div>
            
            <div className="w-full h-[350px] min-h-[350px]">
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
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

          {/* BẢNG DỮ LIỆU CHI TIẾT */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5 transition-colors duration-500">
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 transition-colors duration-500">
              <h3 className="font-bold text-slate-800 dark:text-white transition-colors duration-500">Bảng kê chi tiết theo kỳ</h3>
            </div>
            <DataTable 
              data={cashflowData} 
              columns={columns} 
              itemsPerPage={12} 
            />
          </motion.div>

        </motion.div>
      )}

    </div>
  );
}