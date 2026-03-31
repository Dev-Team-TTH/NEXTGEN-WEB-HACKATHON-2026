"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { 
  Scale, AlertOctagon, RefreshCcw, FileSpreadsheet, 
  CalendarDays, Download, CheckCircle2, Search
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG: Lấy bối cảnh Chi nhánh
import { 
  useGetTrialBalanceReportQuery, 
  useGetFiscalPeriodsQuery,
  TrialBalanceData 
} from "@/state/api";

// --- COMPONENTS & UTILS ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import { formatVND, formatDate, safeRound } from "@/utils/formatters"; // 🚀 BỔ SUNG: safeRound để khử sai số Float
import { exportToCSV } from "@/utils/exportUtils";
import { cn } from "@/utils/helpers";

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
      <div className="h-12 w-64 bg-slate-200 dark:bg-slate-800/50 rounded-xl transition-colors duration-500"></div>
    </div>
    <div className="h-[600px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl transition-colors duration-500"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: BẢNG CÂN ĐỐI SỐ PHÁT SINH
// ==========================================
export default function TrialBalanceReport() {
  
  // 🚀 BỐI CẢNH REDUX (CÔ LẬP DỮ LIỆU ĐA CHI NHÁNH)
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- STATE KỲ KẾ TOÁN (CHUẨN HÓA) ---
  const [fiscalPeriodId, setFiscalPeriodId] = useState<string>("");

  // 👉 FETCH DATA THẬT (🚀 BẢO VỆ BẰNG NHÁNH VÀ BYPASS TYPE ERROR BẰNG `as any`)
  const { data: periods = [] } = useGetFiscalPeriodsQuery(undefined, { skip: !activeBranchId });
  const { data: trialBalance = [], isLoading, isError, refetch, isFetching } = useGetTrialBalanceReportQuery({
    branchId: activeBranchId, // 🚀 BƠM NGỮ CẢNH VÀO BÁO CÁO
    fiscalPeriodId: fiscalPeriodId || undefined
  } as any, { skip: !activeBranchId });

  // --- TÍNH TOÁN DÒNG TỔNG CỘNG (TOTALS) ---
  const totals = useMemo(() => {
    return trialBalance.reduce((acc, row) => {
      // 🚀 KHỬ SAI SỐ DẤU PHẨY ĐỘNG (FLOAT PRECISION BUG) BẰNG SAFEROUND
      acc.openingDebit = safeRound(acc.openingDebit + (row.openingDebit || 0));
      acc.openingCredit = safeRound(acc.openingCredit + (row.openingCredit || 0));
      acc.periodDebit = safeRound(acc.periodDebit + (row.periodDebit || 0));
      acc.periodCredit = safeRound(acc.periodCredit + (row.periodCredit || 0));
      acc.closingDebit = safeRound(acc.closingDebit + (row.closingDebit || 0));
      acc.closingCredit = safeRound(acc.closingCredit + (row.closingCredit || 0));
      return acc;
    }, {
      openingDebit: 0, openingCredit: 0,
      periodDebit: 0, periodCredit: 0,
      closingDebit: 0, closingCredit: 0
    });
  }, [trialBalance]);

  // 🚀 KIỂM TOÁN TÍNH CÂN BẰNG BÁO CÁO TÀI CHÍNH
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

    exportToCSV(exportData, `Bang_Can_Doi_SPS_Ky_${fiscalPeriodId || 'All'}`);
    toast.success("Xuất Bảng Cân đối thành công!");
  };

  // --- 🚀 TỐI ƯU HIỆU NĂNG BỘ NHỚ: CỘT BẢNG (DATATABLE COLUMNS) ĐƯỢC BỌC USEMEMO ---
  const columns: ColumnDef<TrialBalanceData>[] = useMemo(() => [
    {
      header: "Tài khoản (Account)",
      accessorKey: "accountCode",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col max-w-[200px] sm:max-w-[300px] transition-colors duration-500">
          <span className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors duration-500">
            {row.accountCode} - {row.accountName}
          </span>
        </div>
      )
    },
    {
      header: "Dư Nợ ĐK",
      accessorKey: "openingDebit",
      align: "right",
      cell: (row) => <span className="font-semibold text-blue-600 dark:text-blue-400 transition-colors duration-500">{formatVNDDisplay(row.openingDebit)}</span>
    },
    {
      header: "Dư Có ĐK",
      accessorKey: "openingCredit",
      align: "right",
      cell: (row) => <span className="font-semibold text-orange-600 dark:text-orange-400 transition-colors duration-500">{formatVNDDisplay(row.openingCredit)}</span>
    },
    {
      header: "PS Nợ (Kỳ)",
      accessorKey: "periodDebit",
      align: "right",
      cell: (row) => <span className="font-black text-blue-600 dark:text-blue-400 transition-colors duration-500">{formatVNDDisplay(row.periodDebit)}</span>
    },
    {
      header: "PS Có (Kỳ)",
      accessorKey: "periodCredit",
      align: "right",
      cell: (row) => <span className="font-black text-orange-600 dark:text-orange-400 transition-colors duration-500">{formatVNDDisplay(row.periodCredit)}</span>
    },
    {
      header: "Dư Nợ CK",
      accessorKey: "closingDebit",
      align: "right",
      cell: (row) => <span className="font-semibold text-emerald-600 dark:text-emerald-400 transition-colors duration-500">{formatVNDDisplay(row.closingDebit)}</span>
    },
    {
      header: "Dư Có CK",
      accessorKey: "closingCredit",
      align: "right",
      cell: (row) => <span className="font-semibold text-rose-600 dark:text-rose-400 transition-colors duration-500">{formatVNDDisplay(row.closingCredit)}</span>
    }
  ], []);

  // --- CẤU HÌNH MOTION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // 🚀 LÁ CHẮN UI: KHÔNG CÓ CHI NHÁNH
  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-colors duration-500">
        <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Chưa chọn Chi nhánh</h2>
        <p className="text-slate-500 transition-colors duration-500">Vui lòng chọn Chi nhánh hoạt động ở góc trên màn hình để xem Bảng Cân Đối.</p>
      </div>
    );
  }

  // --- RENDER LỖI MẠNG ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-colors duration-500">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Lỗi truy xuất Báo cáo</h2>
        <p className="text-slate-500 mb-6 transition-colors duration-500">Mất kết nối với máy chủ hoặc dữ liệu tài chính bị lỗi.</p>
        <button onClick={() => refetch()} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 transition-transform">
          <RefreshCcw className={cn("w-5 h-5", isFetching && "animate-spin")} /> Tải lại dữ liệu
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10 transition-colors duration-500">
      
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

      {/* 2. KHU VỰC BỘ LỌC (DATA FILTER - CHUẨN THEO KỲ KẾ TOÁN) */}
      <div className="flex flex-wrap items-center gap-4 p-4 glass-panel rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors duration-500">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors duration-500">Kỳ Kế Toán:</span>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-72">
          <select 
            value={fiscalPeriodId}
            onChange={(e) => setFiscalPeriodId(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white shadow-sm cursor-pointer transition-colors duration-500"
          >
            <option value="">-- Tất cả các kỳ (Lũy kế) --</option>
            {periods.map((p: any) => (
              <option key={p.periodId} value={p.periodId}>
                {p.periodName} ({formatDate(p.startDate, 'MM/YYYY')})
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3 mt-4 sm:mt-0">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-colors duration-500",
            isBalanced 
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30" 
              : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 animate-pulse border border-rose-200 dark:border-rose-500/30"
          )}>
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
          
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-md border border-slate-100 dark:border-white/5 transition-colors duration-500">
            <DataTable 
              data={trialBalance} 
              columns={columns} 
              searchKey="accountCode" 
              searchPlaceholder="Tìm kiếm Số hiệu Tài khoản (VD: 111, 131...)"
              itemsPerPage={50} 
            />
            
            {trialBalance.length > 0 && (
              <div className="bg-slate-800 text-white dark:bg-[#0B0F19] border-t border-transparent dark:border-white/10 w-full overflow-x-auto transition-colors duration-500">
                <div className="min-w-max flex px-4 py-4 text-sm font-black uppercase tracking-wider">
                  <div className="w-[200px] sm:w-[300px] shrink-0 pl-2">
                    <span className="flex items-center gap-2"><Scale className="w-4 h-4 text-blue-400" /> TỔNG CỘNG</span>
                  </div>
                  
                  <div className="flex-1 flex justify-end pr-4 text-blue-300 transition-colors duration-500">{formatVNDDisplay(totals.openingDebit)}</div>
                  <div className="flex-1 flex justify-end pr-4 text-orange-300 transition-colors duration-500">{formatVNDDisplay(totals.openingCredit)}</div>
                  <div className="flex-1 flex justify-end pr-4 text-blue-400 text-base transition-colors duration-500">{formatVNDDisplay(totals.periodDebit)}</div>
                  <div className="flex-1 flex justify-end pr-4 text-orange-400 text-base transition-colors duration-500">{formatVNDDisplay(totals.periodCredit)}</div>
                  <div className="flex-1 flex justify-end pr-4 text-emerald-400 transition-colors duration-500">{formatVNDDisplay(totals.closingDebit)}</div>
                  <div className="flex-1 flex justify-end pr-4 text-rose-400 transition-colors duration-500">{formatVNDDisplay(totals.closingCredit)}</div>
                </div>
              </div>
            )}
          </motion.div>

        </motion.div>
      )}

    </div>
  );
}