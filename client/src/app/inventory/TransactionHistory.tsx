"use client";

import React, { useState, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { 
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft, 
  Settings2, FileText, AlertOctagon, RefreshCcw, Download,
  Filter
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useGetInventoryTransactionsQuery, InventoryTransaction } from "@/state/api";

// --- COMPONENTS & UTILS (SIÊU VŨ KHÍ) ---
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import { exportToCSV } from "@/utils/exportUtils";
import { formatDate, formatDateTime } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

// ==========================================
// 1. HELPER: UI MAPPERS
// ==========================================
const formatQty = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.abs(val));

const getDirectionUI = (direction: string) => {
  switch (direction) {
    case "IN": return { label: "Nhập kho", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/20", icon: ArrowDownLeft };
    case "OUT": return { label: "Xuất kho", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-500/20", icon: ArrowUpRight };
    case "TRANSFER": return { label: "Chuyển kho", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-500/20", icon: ArrowRightLeft };
    case "ADJUSTMENT": return { label: "Điều chỉnh", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/20", icon: Settings2 };
    default: return { label: "Khác", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-500/20", icon: FileText };
  }
};

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const HistorySkeleton = () => (
  <div className="w-full animate-pulse flex flex-col gap-6 mt-4">
    <div className="h-[400px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: LỊCH SỬ GIAO DỊCH KHO
// ==========================================
export default function TransactionHistory() {
  const [filterDirection, setFilterDirection] = useState<string>("ALL");

  // 👉 FETCH DATA THẬT
  const { data: responseData, isLoading, isError, refetch, isFetching } = useGetInventoryTransactionsQuery({});

  // Bóc tách mảng data
  const transactions: InventoryTransaction[] = useMemo(() => {
    if (!responseData) return [];
    if (Array.isArray(responseData)) return responseData;
    return (responseData as any).data || [];
  }, [responseData]);

  // Lọc dữ liệu & Bơm trường ảo để Search
  const filteredData = useMemo(() => {
    let arr = transactions.map((tx: any) => ({
      ...tx,
      // Trường ảo để DataTable có thể Search được cả Mã Phiếu (Ref)
      searchReference: tx.document?.documentNumber || tx.documentId || ""
    }));

    if (filterDirection !== "ALL") {
      arr = arr.filter((tx: any) => tx.movementDirection === filterDirection);
    }
    
    return arr;
  }, [transactions, filterDirection]);

  // --- HANDLER EXPORT THẺ KHO ---
  const handleExportData = () => {
    if (filteredData.length === 0) {
      toast.error("Không có dữ liệu thẻ kho để xuất!"); return;
    }
    
    const exportData = filteredData.map((tx: any) => ({
      "Thời gian": formatDateTime(tx.timestamp),
      "Loại giao dịch": getDirectionUI(tx.movementDirection).label,
      "Mã Sản phẩm": tx.product?.productCode || "N/A",
      "Tên Sản phẩm": tx.product?.name || "N/A",
      "Số lượng biến động": tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity,
      "Kho thao tác": tx.fromWarehouse?.name || tx.toWarehouse?.name || "Hệ thống",
      "Mã chứng từ (Ref)": tx.document?.documentNumber || tx.documentId,
      "Ghi chú": tx.document?.note || ""
    }));
    
    exportToCSV(exportData, "Lich_Su_The_Kho_Giao_Dich");
    toast.success("Xuất Lịch sử Thẻ kho thành công!");
  };

  // --- ĐỊNH NGHĨA CỘT CHO DATATABLE ---
  const columns: ColumnDef<any>[] = [
    {
      header: "Thời gian",
      accessorKey: "timestamp",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {formatDate(row.timestamp)}
          </span>
          <span className="text-xs text-slate-500">
            {formatDate(row.timestamp, "HH:mm:ss")}
          </span>
        </div>
      )
    },
    {
      header: "Loại giao dịch",
      accessorKey: "movementDirection",
      cell: (row) => {
        const { label, color, bg, icon: Icon } = getDirectionUI(row.movementDirection);
        return (
          <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold", bg, color)}>
            <Icon className="w-4 h-4" /> {label}
          </div>
        );
      }
    },
    {
      header: "Sản phẩm",
      accessorKey: "product",
      cell: (row) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-bold text-slate-900 dark:text-white truncate" title={row.product?.name}>{row.product?.name || "N/A"}</span>
          <span className="text-[10px] text-slate-500 font-mono">{row.product?.productCode}</span>
        </div>
      )
    },
    {
      header: "Số lượng",
      accessorKey: "quantity",
      align: "right",
      cell: (row) => {
        const isPositive = row.quantity > 0;
        return (
          <span className={cn(
            "font-extrabold text-base", 
            row.movementDirection === 'OUT' ? 'text-rose-500' : row.movementDirection === 'IN' ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'
          )}>
            {isPositive ? "+" : ""}{formatQty(row.quantity)}
          </span>
        );
      }
    },
    {
      header: "Kho thao tác",
      accessorKey: "warehouse",
      cell: (row) => {
        if (row.movementDirection === "TRANSFER") {
          return (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="truncate max-w-[80px]" title={row.fromWarehouse?.name}>{row.fromWarehouse?.name}</span>
              <ArrowRightLeft className="w-3 h-3 text-indigo-500 shrink-0" />
              <span className="truncate max-w-[80px]" title={row.toWarehouse?.name}>{row.toWarehouse?.name}</span>
            </div>
          );
        }
        return (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {row.fromWarehouse?.name || row.toWarehouse?.name || "Hệ thống"}
          </span>
        );
      }
    },
    {
      header: "Chứng từ (Ref)",
      accessorKey: "searchReference", // 💡 Trỏ vào trường ảo để Search DataTable
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
            {row.document?.documentNumber || row.documentId}
          </span>
          {row.document?.note && (
            <span className="text-[10px] text-slate-500 truncate max-w-[150px]" title={row.document.note}>
              {row.document.note}
            </span>
          )}
        </div>
      )
    }
  ];

  // 🚀 TẠO BỘ LỌC NÂNG CAO ĐỂ BƠM VÀO DATA TABLE
  const historyFiltersNode = (
    <div className="flex flex-wrap items-center justify-between gap-4 w-full">
      <div className="w-full sm:w-80">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Lọc theo Loại Giao dịch</label>
        <div className="relative group">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <select 
            value={filterDirection} onChange={(e) => setFilterDirection(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
          >
            <option value="ALL">Tất cả giao dịch kho</option>
            <option value="IN">Nhập kho (IN)</option>
            <option value="OUT">Xuất kho (OUT)</option>
            <option value="TRANSFER">Điều chuyển nội bộ (TRANSFER)</option>
            <option value="ADJUSTMENT">Kiểm kê / Điều chỉnh (ADJUSTMENT)</option>
          </select>
        </div>
      </div>

      {/* Tích hợp nút Xuất dữ liệu vào góc bộ lọc cho gọn gàng */}
      <button onClick={handleExportData} className="flex items-center gap-1.5 px-4 py-2 mt-4 sm:mt-0 rounded-xl text-sm font-bold transition-all active:scale-95 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm">
        <Download className="w-4 h-4" /> <span className="hidden sm:inline">Xuất Thẻ Kho</span>
      </button>
    </div>
  );

  // --- CẤU HÌNH MOTION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 w-full text-center glass rounded-3xl mt-6">
        <AlertOctagon className="w-12 h-12 text-rose-500 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Lỗi tải dữ liệu Thẻ kho</h3>
        <button onClick={() => refetch()} className="px-5 py-2 mt-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all active:scale-95 flex items-center gap-2">
          <RefreshCcw className={cn("w-4 h-4", isFetching && "animate-spin")} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full flex flex-col gap-4 mt-6">
      {/* KHU VỰC HIỂN THỊ DỮ LIỆU */}
      <motion.div variants={itemVariants} className="w-full">
        {isLoading ? (
          <HistorySkeleton />
        ) : (
          <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5">
            <DataTable 
              data={filteredData} 
              columns={columns} 
              itemsPerPage={10}
              searchKey="searchReference" 
              searchPlaceholder="Tìm mã chứng từ (Ref)..."
              // 🚀 BƠM ADVANCED FILTER VÀO DATATABLE ĐỂ ĐỒNG BỘ UI
              advancedFilterNode={historyFiltersNode}
            />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}