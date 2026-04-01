"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic"; 
import { 
  Package, Map, ScanBarcode, ArrowRightLeft, 
  ClipboardEdit, AlertOctagon, RefreshCcw, Box, Lock, DollarSign, History, Layers,
  AlertTriangle, Clock, Download, Loader2
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux";
import { 
  useGetInventoryBalancesQuery, 
  useGetLowStockAlertsQuery, 
  useGetExpiringBatchesQuery, 
  InventoryBalance 
} from "@/state/api";

// --- COMPONENTS ---
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import RequirePermission from "@/app/(components)/RequirePermission";

// --- SUB-PAGES & MODALS ---
import ProductList from "./ProductList";
import TransactionHistory from "./TransactionHistory";
import AdjustStockModal from "./AdjustStockModal";
import TransferStockModal from "./TransferStockModal";

// --- UTILS ---
import { formatVND } from "@/utils/formatters";
import { exportTableToExcel } from "@/utils/exportUtils"; // 🚀 NÂNG CẤP ENGINE XUẤT EXCEL
import { cn } from "@/utils/helpers";

// 🚀 TỐI ƯU HÓA BUNDLE SIZE: Lazy Load các component siêu nặng
const Warehouse3DViewer = dynamic(() => import("@/app/(components)/Warehouse3DViewer"), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-[500px] w-full bg-slate-100/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 transition-all duration-500 ease-in-out">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
      <p className="text-sm font-bold text-slate-500 transition-all duration-500 ease-in-out">Đang tải Engine Đồ họa 3D...</p>
    </div>
  )
});

// Máy quét Barcode (liên quan đến API Camera) chỉ tải khi bật Modal
const UniversalScanner = dynamic(() => import("@/app/(components)/UniversalScanner"), { ssr: false });

// ==========================================
// 1. SKELETON LOADING
// ==========================================
const InventorySkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6 transition-all duration-500 ease-in-out">
    <div className="h-24 w-full bg-slate-200 dark:bg-slate-800/50 rounded-2xl transition-all duration-500 ease-in-out"></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800/50 transition-all duration-500 ease-in-out"></div>)}
    </div>
    <div className="h-12 w-96 bg-slate-200 dark:bg-slate-800/50 rounded-xl mt-2 transition-all duration-500 ease-in-out"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2 transition-all duration-500 ease-in-out"></div>
  </div>
);

// ==========================================
// 2. HELPER FORMAT FORMATTER
// ==========================================
const formatQty = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

type TabType = "BALANCES" | "PRODUCTS" | "HISTORY" | "3D_MAP";

// ==========================================
// COMPONENT CHÍNH: QUẢN LÝ KHO BÃI TỔNG HỢP
// ==========================================
export default function InventoryPage() {
  const { t } = useTranslation();
  
  // 🚀 LÁ CHẮN HYDRATION: Bảo vệ React DOM tránh lỗi kẹt chữ đen ở Dark Mode
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🚀 BỐI CẢNH REDUX (CONTEXT ISOLATION)
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- STATE ĐIỀU HƯỚNG TABS ---
  const [activeTab, setActiveTab] = useState<TabType>("BALANCES");

  // --- STATE MODALS ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // 🚀 STATE BỘ LỌC NÂNG CAO CHO TAB TỒN KHO
  const [filterWarehouse, setFilterWarehouse] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // 👉 FETCH DATA TỪ BACKEND
  const { data: responseData, isLoading, isError, refetch, isFetching } = useGetInventoryBalancesQuery({
    branchId: activeBranchId,
    page: 1, 
    limit: 50
  } as any, { skip: !activeBranchId });

  const { data: lowStockAlerts = [] } = useGetLowStockAlertsQuery({
    branchId: activeBranchId 
  } as any, { skip: !activeBranchId });

  const { data: expiringBatches = [] } = useGetExpiringBatchesQuery({ 
    branchId: activeBranchId, 
    days: 30 
  } as any, { skip: !activeBranchId });

  const balances: InventoryBalance[] = responseData?.data || [];

  // --- TRÍCH XUẤT DANH SÁCH KHO ĐỂ HIỂN THỊ DROPDOWN LỌC ---
  const uniqueWarehouses = useMemo(() => {
    const whs = new Set<string>();
    balances.forEach(b => {
      if (b.warehouse?.name) whs.add(b.warehouse.name);
    });
    return Array.from(whs);
  }, [balances]);

  // 🚀 THUẬT TOÁN LỌC VÀ CHUẨN BỊ DỮ LIỆU THÔNG MINH
  const filteredBalances = useMemo(() => {
    let arr = balances.map(b => ({
      ...b,
      productSearchName: `${b.product?.name || ""} ${b.product?.productCode || ""} ${b.variant?.sku || ""}`.trim()
    }));

    if (filterWarehouse !== "ALL") {
      arr = arr.filter(b => b.warehouse?.name === filterWarehouse);
    }
    
    if (filterStatus !== "ALL") {
      if (filterStatus === "IN_STOCK") arr = arr.filter(b => b.quantity > 0);
      if (filterStatus === "OUT_OF_STOCK") arr = arr.filter(b => b.quantity <= 0);
      if (filterStatus === "LOCKED") arr = arr.filter(b => b.lockedQty > 0);
    }
    
    return arr;
  }, [balances, filterWarehouse, filterStatus]);

  // --- TÍNH TOÁN KPI TỔNG QUAN ---
  const summary = useMemo(() => {
    return filteredBalances.reduce((acc, curr) => ({
      totalValue: acc.totalValue + (curr.totalValue || 0),
      totalAvailable: acc.totalAvailable + (curr.quantity || 0),
      totalLocked: acc.totalLocked + (curr.lockedQty || 0),
    }), { totalValue: 0, totalAvailable: 0, totalLocked: 0 });
  }, [filteredBalances]);

  const isFiltering = filterWarehouse !== "ALL" || filterStatus !== "ALL";

  // --- 🚀 HANDLER XUẤT BÁO CÁO TỒN KHO BẰNG SMART EXCEL ENGINE ---
  const handleExportBalances = () => {
    if (filteredBalances.length === 0) {
      toast.error("Không có dữ liệu tồn kho để xuất!"); return;
    }
    exportTableToExcel("smart-inventory-report", `Bao_Cao_Ton_Kho_${dayjs().format('DDMMYYYY')}`);
    toast.success("Đã xuất Báo cáo Tồn kho thành công!");
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      header: "Vật tư / Sản phẩm",
      accessorKey: "productSearchName", 
      sortable: true,
      cell: (row: any) => (
        <div className="flex items-center gap-3 transition-all duration-500 ease-in-out">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-500/30 transition-all duration-500 ease-in-out">
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 transition-all duration-500 ease-in-out" />
          </div>
          <div className="flex flex-col transition-all duration-500 ease-in-out">
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px] transition-all duration-500 ease-in-out" title={row.product?.name}>
              {row.product?.name || "Sản phẩm không xác định"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono transition-all duration-500 ease-in-out">
              {row.product?.productCode} {row.variant ? `| ${row.variant.sku}` : ""}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Vị trí Kho",
      accessorKey: "warehouse",
      cell: (row: any) => (
        <div className="flex flex-col transition-all duration-500 ease-in-out">
          <span className="font-semibold text-slate-700 dark:text-slate-200 transition-all duration-500 ease-in-out">
            {row.warehouse?.name || "Kho tổng"}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit mt-0.5 border border-slate-200 dark:border-slate-700 transition-all duration-500 ease-in-out">
            {row.bin ? `Kệ: ${row.bin.code}` : "Chưa xếp kệ"}
          </span>
        </div>
      )
    },
    {
      header: "Tồn khả dụng",
      accessorKey: "quantity",
      sortable: true,
      align: "right",
      cell: (row: any) => (
        <div className="flex flex-col items-end transition-all duration-500 ease-in-out">
          <span className={`font-bold transition-all duration-500 ease-in-out ${row.quantity <= 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatQty(row.quantity)} <span className="text-xs font-normal opacity-70 transition-all duration-500 ease-in-out">{row.product?.uom?.name}</span>
          </span>
          {row.lockedQty > 0 && (
            <span className="text-[10px] font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 px-1.5 rounded flex items-center gap-1 mt-0.5 transition-all duration-500 ease-in-out">
              <Lock className="w-3 h-3 transition-all duration-500 ease-in-out" /> Đang khóa {formatQty(row.lockedQty)}
            </span>
          )}
        </div>
      )
    },
    {
      header: "Giá vốn (MAC)",
      accessorKey: "avgCost",
      sortable: true,
      align: "right",
      cell: (row: any) => (
        <span className="font-medium text-slate-700 dark:text-slate-300 transition-all duration-500 ease-in-out">
          {formatVND(row.avgCost)}
        </span>
      )
    },
    {
      header: "Tổng Giá trị",
      accessorKey: "totalValue",
      sortable: true,
      align: "right",
      cell: (row: any) => (
        <span className="font-bold text-blue-600 dark:text-blue-400 transition-all duration-500 ease-in-out">
          {formatVND(row.totalValue)}
        </span>
      )
    }
  ], []);

  const inventoryFiltersNode = useMemo(() => (
    <div className="flex flex-wrap items-center gap-4 w-full transition-all duration-500 ease-in-out">
      <div className="w-full sm:w-64 transition-all duration-500 ease-in-out">
        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block transition-all duration-500 ease-in-out">Lọc theo Kho lưu trữ</label>
        <div className="relative group transition-all duration-500 ease-in-out">
          <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-all duration-500 ease-in-out" />
          <select 
            value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white duration-500 ease-in-out"
          >
            {/* 🚀 VÁ LỖI NỀN ĐEN OPTION */}
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="ALL">Tất cả Kho bãi</option>
            {uniqueWarehouses.map(w => (
              <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="w-full sm:w-64 transition-all duration-500 ease-in-out">
        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block transition-all duration-500 ease-in-out">Trạng thái Tồn kho</label>
        <div className="relative group transition-all duration-500 ease-in-out">
          <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-all duration-500 ease-in-out" />
          <select 
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white duration-500 ease-in-out"
          >
            {/* 🚀 VÁ LỖI NỀN ĐEN OPTION */}
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="ALL">Tất cả Trạng thái</option>
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="IN_STOCK">🟢 Còn hàng khả dụng (&gt;0)</option>
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="LOCKED">🔒 Hàng đang bị khóa chờ xuất</option>
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="OUT_OF_STOCK">🔴 Hết hàng trong kho (=0)</option>
          </select>
        </div>
      </div>
    </div>
  ), [filterWarehouse, filterStatus, uniqueWarehouses]);

  // --- CẤU HÌNH MOTION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // 🚀 LÁ CHẮN HYDRATION UI
  if (!isMounted) return <InventorySkeleton />;

  // 🚀 LÁ CHẮN UI: KHÔNG CÓ CHI NHÁNH
  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
        <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse transition-all duration-500 ease-in-out" />
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-50 mb-3 transition-all duration-500 ease-in-out">Chưa xác định Chi nhánh</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md transition-all duration-500 ease-in-out">Vui lòng chọn Chi nhánh hoạt động ở góc trên màn hình để truy cập Quản trị Kho bãi.</p>
      </div>
    );
  }

  // --- RENDER XỬ LÝ LỖI MẠNG ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse transition-all duration-500 ease-in-out" />
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-50 mb-3 transition-all duration-500 ease-in-out">Lỗi tải dữ liệu Phân hệ Kho</h2>
        <button onClick={() => refetch()} className="px-6 py-3 mt-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 transition-all duration-500 ease-in-out">
          <RefreshCcw className={`w-5 h-5 transition-all duration-500 ease-in-out ${isFetching ? 'animate-spin' : ''}`} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10 transition-all duration-500 ease-in-out">
      
      {/* 🚀 ĐẠI TU HEADER VÀ VÁ LỖI FLEXBOX CHE NÚT BẤM (INLINE HEADER) */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }} 
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5 mb-6 sm:mb-8 md:mb-10 transform-gpu will-change-transform w-full transition-all duration-500 ease-in-out"
      >
        <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 w-24 h-24 sm:w-32 sm:h-32 bg-blue-500/15 dark:bg-blue-500/20 rounded-full blur-2xl sm:blur-3xl pointer-events-none z-0 transition-all duration-500 ease-in-out" />
        
        {/* Khối Title: Dùng flex-1 min-w-0 để không bóp méo nút */}
        <div className="relative z-10 flex items-stretch gap-3 sm:gap-4 w-full md:w-auto min-w-0 transition-all duration-500 ease-in-out flex-1">
          <div className="w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_8px_rgba(79,70,229,0.4)] dark:shadow-[0_0_16px_rgba(79,70,229,0.3)] transition-all duration-500 ease-in-out" />
          
          <div className="flex flex-col justify-center py-0.5 min-w-0 transition-all duration-500 ease-in-out w-full">
            <h1 className="text-xl sm:text-2xl md:text-[28px] lg:text-3xl font-black tracking-tight text-slate-800 dark:text-slate-50 leading-tight sm:leading-none truncate break-words transition-all duration-500 ease-in-out">
              {t("Trung tâm Kho Bãi")}
            </h1>
            <p className="text-xs sm:text-[13px] md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-1.5 md:mt-2 flex items-center gap-2 max-w-full md:max-w-xl leading-relaxed transition-all duration-500 ease-in-out">
              {t("Giám sát danh mục vật tư, tồn kho thời gian thực và lịch sử luân chuyển.")}
            </p>
          </div>
        </div>

        {/* Khối Buttons: Dùng shrink-0 để bảo vệ Layout */}
        <div className="relative z-10 w-full md:w-auto shrink-0 flex flex-row items-center justify-start md:justify-end gap-2.5 sm:gap-3 mt-2 md:mt-0 overflow-x-auto scrollbar-hide pb-1 md:pb-0 transition-all duration-500 ease-in-out">
          <RequirePermission permissions={["MANAGE_INVENTORY"]}>
            <button 
              onClick={handleExportBalances}
              className="px-4 py-2.5 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all active:scale-95 whitespace-nowrap border border-slate-200 dark:border-slate-700 shadow-sm text-sm font-bold duration-500 ease-in-out"
            >
              <Download className="w-4 h-4 transition-all duration-500 ease-in-out" />
              <span className="hidden sm:inline transition-all duration-500 ease-in-out">Xuất Báo cáo</span>
            </button>
          </RequirePermission>

          <button 
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-2.5 flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 whitespace-nowrap duration-500 ease-in-out"
          >
            <ScanBarcode className="w-4 h-4 transition-all duration-500 ease-in-out" />
            <span className="hidden sm:inline transition-all duration-500 ease-in-out">Quét mã Bulk</span>
          </button>
          
          <RequirePermission permissions={["MANAGE_INVENTORY"]}>
            <button 
              onClick={() => setIsTransferModalOpen(true)}
              className="px-4 py-2.5 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold transition-all active:scale-95 whitespace-nowrap border border-indigo-200 dark:border-indigo-500/30 shadow-sm duration-500 ease-in-out"
            >
              <ArrowRightLeft className="w-4 h-4 transition-all duration-500 ease-in-out" />
              <span className="hidden sm:inline transition-all duration-500 ease-in-out">Chuyển kho</span>
            </button>
          </RequirePermission>

          <RequirePermission permissions={["MANAGE_INVENTORY"]}>
            <button 
              onClick={() => setIsAdjustModalOpen(true)}
              className="px-5 py-2.5 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 whitespace-nowrap duration-500 ease-in-out"
            >
              <ClipboardEdit className="w-5 h-5 transition-all duration-500 ease-in-out" />
              <span className="hidden sm:inline transition-all duration-500 ease-in-out">Kiểm kê đơn</span>
            </button>
          </RequirePermission>
        </div>
      </motion.div>

      {isLoading ? (
        <InventorySkeleton />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full transition-all duration-500 ease-in-out">
          
          <AnimatePresence>
            {(lowStockAlerts.length > 0 || expiringBatches.length > 0) && (
              <motion.div 
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 transition-all duration-500 ease-in-out"
              >
                {lowStockAlerts.length > 0 && (
                  <motion.div 
                    animate={{ boxShadow: ["0px 0px 0px rgba(244,63,94,0)", "0px 0px 20px rgba(244,63,94,0.4)", "0px 0px 0px rgba(244,63,94,0)"] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-rose-50 to-white dark:from-rose-500/10 dark:to-slate-900 border border-rose-200 dark:border-rose-500/30 relative overflow-hidden group cursor-pointer transition-all duration-500 ease-in-out"
                  >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-500 ease-in-out"></div>
                    <div className="p-3 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0 transition-all duration-500 ease-in-out">
                      <AlertTriangle className="w-7 h-7 text-rose-600 dark:text-rose-400 transition-all duration-500 ease-in-out" />
                    </div>
                    <div className="flex flex-col z-10 transition-all duration-500 ease-in-out">
                      <h4 className="text-base font-bold text-rose-800 dark:text-rose-300 transition-all duration-500 ease-in-out">Cảnh báo Tồn kho an toàn</h4>
                      <p className="text-sm text-rose-600/80 dark:text-rose-400/80 mt-1 leading-relaxed transition-all duration-500 ease-in-out">
                        Phát hiện <span className="font-bold text-rose-600 dark:text-rose-400 text-lg transition-all duration-500 ease-in-out">{lowStockAlerts.length}</span> mặt hàng đã chạm đáy (Reorder Point). Cần lên kế hoạch nhập khẩu hoặc sản xuất ngay!
                      </p>
                    </div>
                  </motion.div>
                )}

                {expiringBatches.length > 0 && (
                  <motion.div 
                    animate={{ boxShadow: ["0px 0px 0px rgba(245,158,11,0)", "0px 0px 20px rgba(245,158,11,0.4)", "0px 0px 0px rgba(245,158,11,0)"] }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: 1.25 }}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-900 border border-amber-200 dark:border-amber-500/30 relative overflow-hidden group cursor-pointer transition-all duration-500 ease-in-out"
                  >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-500 ease-in-out"></div>
                    <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl shrink-0 transition-all duration-500 ease-in-out">
                      <Clock className="w-7 h-7 text-amber-600 dark:text-amber-400 transition-all duration-500 ease-in-out" />
                    </div>
                    <div className="flex flex-col z-10 transition-all duration-500 ease-in-out">
                      <h4 className="text-base font-bold text-amber-800 dark:text-amber-300 transition-all duration-500 ease-in-out">Cảnh báo Hàng sắp hết hạn</h4>
                      <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1 leading-relaxed transition-all duration-500 ease-in-out">
                        Có <span className="font-bold text-amber-600 dark:text-amber-400 text-lg transition-all duration-500 ease-in-out">{expiringBatches.length}</span> lô hàng sẽ hết hạn trong 30 ngày tới. Yêu cầu ưu tiên xuất kho theo tiêu chuẩn FEFO.
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 transition-all duration-500 ease-in-out">
            {/* 🚀 VÁ LỖI HOVER & CHỮ ĐEN */}
            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-emerald-500 group hover:-translate-y-1 transition-all duration-500 ease-in-out hover:border-emerald-400 dark:hover:border-emerald-500/50">
              <div className="flex justify-between items-start mb-2 transition-all duration-500 ease-in-out">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center transition-all duration-500 ease-in-out">
                  Tổng Tồn Khả Dụng
                  {isFiltering && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 transition-all duration-500 ease-in-out">Đã lọc</span>}
                </p>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg transition-all duration-500 ease-in-out"><Box className="w-4 h-4 text-emerald-600 dark:text-emerald-400 transition-all duration-500 ease-in-out" /></div>
              </div>
              <h3 className="text-3xl font-black text-slate-800 dark:text-slate-50 truncate transition-all duration-500 ease-in-out">{formatQty(summary.totalAvailable)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-rose-500 group hover:-translate-y-1 transition-all relative overflow-hidden duration-500 ease-in-out hover:border-rose-400 dark:hover:border-rose-500/50">
              <div className="flex justify-between items-start mb-2 relative z-10 transition-all duration-500 ease-in-out">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center transition-all duration-500 ease-in-out">
                  Hàng Đang Khóa
                  {isFiltering && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 transition-all duration-500 ease-in-out">Đã lọc</span>}
                </p>
                <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg transition-all duration-500 ease-in-out"><Lock className="w-4 h-4 text-rose-600 dark:text-rose-400 transition-all duration-500 ease-in-out" /></div>
              </div>
              <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 relative z-10 truncate transition-all duration-500 ease-in-out">{formatQty(summary.totalLocked)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-blue-500 group hover:-translate-y-1 transition-all duration-500 ease-in-out hover:border-blue-400 dark:hover:border-blue-500/50">
              <div className="flex justify-between items-start mb-2 transition-all duration-500 ease-in-out">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center transition-all duration-500 ease-in-out">
                  Tổng Giá Trị (MAC)
                  {isFiltering && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 transition-all duration-500 ease-in-out">Đã lọc</span>}
                </p>
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg transition-all duration-500 ease-in-out"><DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400 transition-all duration-500 ease-in-out" /></div>
              </div>
              <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400 truncate transition-all duration-500 ease-in-out">{formatVND(summary.totalValue)}</h3>
            </motion.div>
          </div>

          <div className="w-full overflow-x-auto scrollbar-hide transition-all duration-500 ease-in-out">
            <div className="flex items-center gap-1 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700/50 transition-all duration-500 ease-in-out">
              
              <button onClick={() => setActiveTab("BALANCES")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out ${activeTab === "BALANCES" ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}>
                {activeTab === "BALANCES" && <motion.div layoutId="invTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-xl -z-10 border border-slate-200/50 dark:border-slate-600 transition-all duration-500 ease-in-out" />}
                <Box className="w-4 h-4 transition-all duration-500 ease-in-out" /> Tồn kho hiện tại
              </button>

              <button onClick={() => setActiveTab("PRODUCTS")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out ${activeTab === "PRODUCTS" ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}>
                {activeTab === "PRODUCTS" && <motion.div layoutId="invTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-xl -z-10 border border-slate-200/50 dark:border-slate-600 transition-all duration-500 ease-in-out" />}
                <Layers className="w-4 h-4 transition-all duration-500 ease-in-out" /> Danh mục Hàng hóa
              </button>

              <button onClick={() => setActiveTab("HISTORY")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out ${activeTab === "HISTORY" ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}>
                {activeTab === "HISTORY" && <motion.div layoutId="invTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-xl -z-10 border border-slate-200/50 dark:border-slate-600 transition-all duration-500 ease-in-out" />}
                <History className="w-4 h-4 transition-all duration-500 ease-in-out" /> Lịch sử (Thẻ kho)
              </button>

              <button onClick={() => setActiveTab("3D_MAP")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out ${activeTab === "3D_MAP" ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}>
                {activeTab === "3D_MAP" && <motion.div layoutId="invTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-xl -z-10 border border-slate-200/50 dark:border-slate-600 transition-all duration-500 ease-in-out" />}
                <Map className="w-4 h-4 transition-all duration-500 ease-in-out" /> Bản đồ Kho 3D
              </button>

            </div>
          </div>

          <div className="w-full relative transition-all duration-500 ease-in-out">
            <AnimatePresence mode="wait">
              
              {activeTab === "BALANCES" && (
                <motion.div key="balances" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <div className="glass-panel rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 transition-all duration-500 ease-in-out">
                    <DataTable 
                      data={filteredBalances} 
                      columns={columns} 
                      searchKey="productSearchName" 
                      searchPlaceholder="Tìm mã SKU, tên vật tư..."
                      itemsPerPage={10}
                      advancedFilterNode={inventoryFiltersNode}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === "PRODUCTS" && (
                <motion.div key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <ProductList />
                </motion.div>
              )}

              {activeTab === "HISTORY" && (
                <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <TransactionHistory />
                </motion.div>
              )}

              {activeTab === "3D_MAP" && (
                <motion.div key="3d_map" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
                  <Warehouse3DViewer />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </motion.div>
      )}

      {/* MODALS */}
      <UniversalScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
      <AdjustStockModal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} />
      <TransferStockModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} />

      {/* ==========================================
          BẢNG ẨN DÙNG ĐỂ XUẤT BÁO CÁO EXCEL THÔNG MINH
          ========================================== */}
      <div className="hidden transition-all duration-500 ease-in-out">
        <table id="smart-inventory-report">
          <thead>
            <tr>
               <th colSpan={9} style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#1e293b', color: '#ffffff', padding: '15px' }}>
                 BÁO CÁO TỔN KHO TỔNG HỢP
               </th>
            </tr>
            <tr>
               <th colSpan={9} style={{ textAlign: 'center', fontStyle: 'italic', padding: '10px' }}>
                 Chi nhánh: {activeBranchId === "ALL" ? "Toàn Hệ Thống" : activeBranchId} | Ngày xuất: {dayjs().format('DD/MM/YYYY HH:mm')}
               </th>
            </tr>
            <tr>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Mã SP</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Tên Sản phẩm</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Kho lưu trữ</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Vị trí kệ (Bin)</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Tồn khả dụng</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Tồn đang khóa</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>ĐVT</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Giá vốn MAC (VND)</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Tổng giá trị (VND)</th>
            </tr>
          </thead>
          <tbody>
            {filteredBalances.map((b, idx) => (
              <tr key={`inv-${idx}`}>
                 <td style={{ padding: '8px', border: '1px solid #cbd5e1', msoNumberFormat: '\@' } as any}>{b.product?.productCode || "N/A"}</td>
                 <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{b.product?.name || "N/A"}</td>
                 <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{b.warehouse?.name || "N/A"}</td>
                 <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{b.bin?.code || "Chưa xếp"}</td>
                 <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: b.quantity > 0 ? '#10b981' : '#f43f5e', fontWeight: 'bold' }}>{b.quantity}</td>
                 <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{b.lockedQty}</td>
                 <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{b.product?.uom?.name || "N/A"}</td>
                 <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{b.avgCost}</td>
                 <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#3b82f6' }}>{b.totalValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}