"use client";

import React, { useState, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { 
  Scale, AlertOctagon, RefreshCcw, FileSpreadsheet, 
  CalendarDays, Download, CheckCircle2, Search
} from "lucide-react";
import dayjs from "dayjs";
import 'dayjs/locale/vi';
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useGetTrialBalanceReportQuery, TrialBalanceData } from "@/state/api";

// --- COMPONENTS & UTILS ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import { formatVND } from "@/utils/formatters";
import { exportToCSV } from "@/utils/exportUtils";

dayjs.locale('vi');

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const formatVNDDisplay = (val: number) => {
  if (!val || val === 0) return "-";
  return formatVND(val);
};

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const TrialBalanceSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="flex gap-4">
      <div className="h-12 w-48 bg-slate-200 dark:bg-slate-800/50 rounded-xl"></div>
      <div className="h-12 w-48 bg-slate-200 dark:bg-slate-800/50 rounded-xl"></div>
    </div>
    <div className="h-[600px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: BẢNG CÂN ĐỐI SỐ PHÁT SINH
// ==========================================
export default function TrialBalanceReport() {
  // --- STATE LỌC THỜI GIAN ---
  // Mặc định lấy từ đầu tháng đến hiện tại
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  // 👉 FETCH DATA THẬT
  const { data: trialBalance = [], isLoading, isError, refetch, isFetching } = useGetTrialBalanceReportQuery({
    startDate,
    endDate
  });

  // --- TÍNH TOÁN DÒNG TỔNG CỘNG (TOTALS) ---
  const totals = useMemo(() => {
    return trialBalance.reduce((acc, row) => {
      acc.openingDebit += row.openingDebit || 0;
      acc.openingCredit += row.openingCredit || 0;
      acc.periodDebit += row.periodDebit || 0;
      acc.periodCredit += row.periodCredit || 0;
      acc.closingDebit += row.closingDebit || 0;
      acc.closingCredit += row.closingCredit || 0;
      return acc;
    }, {
      openingDebit: 0, openingCredit: 0,
      periodDebit: 0, periodCredit: 0,
      closingDebit: 0, closingCredit: 0
    });
  }, [trialBalance]);

  // Kiểm tra tính cân bằng của báo cáo (Quy tắc Kế toán Kép)
  const isBalanced = 
    totals.openingDebit === totals.openingCredit &&
    totals.periodDebit === totals.periodCredit &&
    totals.closingDebit === totals.closingCredit;

  // --- HANDLER EXPORT DỮ LIỆU ---
  const handleExportData = () => {
    if (trialBalance.length === 0) {
      toast.error("Không có dữ liệu để xuất!"); return;
    }

    const exportData = trialBalance.map(row => ({
      "Số hiệu TK": row.accountCode,
      "Tên Tài khoản": row.accountName,
      "Dư Nợ ĐK (VND)": row.openingDebit || 0,
      "Dư Có ĐK (VND)": row.openingCredit || 0,
      "PS Nợ Kỳ (VND)": row.periodDebit || 0,
      "PS Có Kỳ (VND)": row.periodCredit || 0,
      "Dư Nợ CK (VND)": row.closingDebit || 0,
      "Dư Có CK (VND)": row.closingCredit || 0
    }));

    // Thêm dòng Tổng Cộng vào file Excel
    exportData.push({
      "Số hiệu TK": "TỔNG CỘNG",
      "Tên Tài khoản": "",
      "Dư Nợ ĐK (VND)": totals.openingDebit,
      "Dư Có ĐK (VND)": totals.openingCredit,
      "PS Nợ Kỳ (VND)": totals.periodDebit,
      "PS Có Kỳ (VND)": totals.periodCredit,
      "Dư Nợ CK (VND)": totals.closingDebit,
      "Dư Có CK (VND)": totals.closingCredit
    } as any);

    exportToCSV(exportData, `Bang_Can_Doi_SPS_${startDate}_den_${endDate}`);
    toast.success("Xuất Bảng Cân đối thành công!");
  };

  // --- ĐỊNH NGHĨA CỘT CHO DATATABLE (Chuẩn IFRS) ---
  const columns: ColumnDef<TrialBalanceData>[] = [
    {
      header: "Tài khoản (Account)",
      accessorKey: "accountCode",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col max-w-[200px] sm:max-w-[300px]">
          <span className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 truncate">
            {row.accountCode} - {row.accountName}
          </span>
        </div>
      )
    },
    // DƯ ĐẦU KỲ
    {
      header: "Dư Nợ ĐK",
      accessorKey: "openingDebit",
      align: "right",
      cell: (row) => <span className="font-semibold text-blue-600 dark:text-blue-400">{formatVNDDisplay(row.openingDebit)}</span>
    },
    {
      header: "Dư Có ĐK",
      accessorKey: "openingCredit",
      align: "right",
      cell: (row) => <span className="font-semibold text-orange-600 dark:text-orange-400">{formatVNDDisplay(row.openingCredit)}</span>
    },
    // PHÁT SINH TRONG KỲ
    {
      header: "PS Nợ (Kỳ)",
      accessorKey: "periodDebit",
      align: "right",
      cell: (row) => <span className="font-black text-blue-600 dark:text-blue-400">{formatVNDDisplay(row.periodDebit)}</span>
    },
    {
      header: "PS Có (Kỳ)",
      accessorKey: "periodCredit",
      align: "right",
      cell: (row) => <span className="font-black text-orange-600 dark:text-orange-400">{formatVNDDisplay(row.periodCredit)}</span>
    },
    // DƯ CUỐI KỲ
    {
      header: "Dư Nợ CK",
      accessorKey: "closingDebit",
      align: "right",
      cell: (row) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatVNDDisplay(row.closingDebit)}</span>
    },
    {
      header: "Dư Có CK",
      accessorKey: "closingCredit",
      align: "right",
      cell: (row) => <span className="font-semibold text-rose-600 dark:text-rose-400">{formatVNDDisplay(row.closingCredit)}</span>
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
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Lỗi truy xuất Báo cáo</h2>
        <p className="text-slate-500 mb-6">Mất kết nối với máy chủ hoặc dữ liệu tài chính bị lỗi.</p>
        <button onClick={() => refetch()} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 transition-transform">
          <RefreshCcw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} /> Tải lại dữ liệu
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      {/* 1. HEADER & ACTIONS */}
      <Header 
        title="Bảng Cân đối Số phát sinh" 
        subtitle="Báo cáo Trial Balance tổng hợp số dư tài khoản chuẩn IFRS."
        rightNode={
          <button onClick={handleExportData} className="px-5 py-2.5 flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
        }
      />

      {/* 2. KHU VỰC BỘ LỌC (DATA FILTER) */}
      <div className="flex flex-wrap items-center gap-4 p-4 glass-panel rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Kỳ báo cáo:</span>
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

        <div className="ml-auto flex items-center gap-3">
          {/* Badge Báo động Cân bằng */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-inner ${
            isBalanced 
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" 
              : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 animate-pulse"
          }`}>
            {isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
            {isBalanced ? "Đã cân đối Nợ/Có" : "LỆCH BẢNG CÂN ĐỐI!"}
          </div>
        </div>
      </div>

      {/* 3. HIỂN THỊ DỮ LIỆU */}
      {isLoading ? (
        <TrialBalanceSkeleton />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-4 w-full">
          
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5">
            <DataTable 
              data={trialBalance} 
              columns={columns} 
              searchKey="accountCode" 
              searchPlaceholder="Tìm kiếm Số hiệu Tài khoản (VD: 111, 131...)"
              itemsPerPage={50} // Báo cáo nên để hiển thị dài
            />
            
            {/* DÒNG TỔNG CỘNG CHUẨN KẾ TOÁN */}
            {trialBalance.length > 0 && (
              <div className="bg-slate-800 text-white dark:bg-[#0B0F19] dark:border-t dark:border-white/10 w-full overflow-x-auto">
                <div className="min-w-max flex px-4 py-4 text-sm font-black uppercase tracking-wider">
                  {/* Cột 1: Label */}
                  <div className="w-[200px] sm:w-[300px] shrink-0 pl-2">
                    <span className="flex items-center gap-2"><Scale className="w-4 h-4 text-blue-400" /> TỔNG CỘNG</span>
                  </div>
                  
                  {/* Cột 2,3: Đầu kỳ */}
                  <div className="flex-1 flex justify-end pr-4 text-blue-300">{formatVNDDisplay(totals.openingDebit)}</div>
                  <div className="flex-1 flex justify-end pr-4 text-orange-300">{formatVNDDisplay(totals.openingCredit)}</div>
                  
                  {/* Cột 4,5: Trong kỳ */}
                  <div className="flex-1 flex justify-end pr-4 text-blue-400 text-base">{formatVNDDisplay(totals.periodDebit)}</div>
                  <div className="flex-1 flex justify-end pr-4 text-orange-400 text-base">{formatVNDDisplay(totals.periodCredit)}</div>
                  
                  {/* Cột 6,7: Cuối kỳ */}
                  <div className="flex-1 flex justify-end pr-4 text-emerald-400">{formatVNDDisplay(totals.closingDebit)}</div>
                  <div className="flex-1 flex justify-end pr-4 text-rose-400">{formatVNDDisplay(totals.closingCredit)}</div>
                </div>
              </div>
            )}
          </motion.div>

        </motion.div>
      )}

    </div>
  );
}