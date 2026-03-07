"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Package, Map, ScanBarcode, ArrowRightLeft, 
  ClipboardEdit, AlertOctagon, RefreshCcw, Box, Lock, DollarSign, History, Layers,
  AlertTriangle, Clock, Download
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetInventoryBalancesQuery, 
  useGetLowStockAlertsQuery, 
  useGetExpiringBatchesQuery, 
  InventoryBalance 
} from "@/state/api";

// --- COMPONENTS ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import Warehouse3DViewer from "@/app/(components)/Warehouse3DViewer";
import UniversalScanner from "@/app/(components)/UniversalScanner";

// --- SUB-PAGES & MODALS ---
import ProductList from "./ProductList";
import TransactionHistory from "./TransactionHistory";
import AdjustStockModal from "./AdjustStockModal";
import TransferStockModal from "./TransferStockModal";

// --- UTILS ---
import { formatVND } from "@/utils/formatters";
import { exportToCSV } from "@/utils/exportUtils";

// ==========================================
// 1. SKELETON LOADING
// ==========================================
const InventorySkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="h-24 w-full bg-slate-200 dark:bg-slate-800/50 rounded-2xl"></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>)}
    </div>
    <div className="h-12 w-96 bg-slate-200 dark:bg-slate-800/50 rounded-xl mt-2"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2"></div>
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
  
  // --- STATE ĐIỀU HƯỚNG TABS ---
  const [activeTab, setActiveTab] = useState<TabType>("BALANCES");

  // --- STATE MODALS ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // 👉 FETCH DATA TỪ BACKEND
  const { data: responseData, isLoading, isError, refetch, isFetching } = useGetInventoryBalancesQuery({
    page: 1, limit: 50
  });
  const { data: lowStockAlerts = [] } = useGetLowStockAlertsQuery();
  const { data: expiringBatches = [] } = useGetExpiringBatchesQuery({ days: 30 });

  const balances: InventoryBalance[] = responseData?.data || [];

  // --- TÍNH TOÁN KPI TỔNG QUAN ---
  const summary = useMemo(() => {
    return balances.reduce((acc, curr) => ({
      totalValue: acc.totalValue + (curr.totalValue || 0),
      totalAvailable: acc.totalAvailable + (curr.quantity || 0),
      totalLocked: acc.totalLocked + (curr.lockedQty || 0),
    }), { totalValue: 0, totalAvailable: 0, totalLocked: 0 });
  }, [balances]);

  // --- HANDLER EXPORT TỒN KHO ---
  const handleExportBalances = () => {
    if (balances.length === 0) {
      toast.error("Không có dữ liệu tồn kho để xuất!"); return;
    }
    const exportData = balances.map(b => ({
      "Mã SP": b.product?.productCode || "N/A",
      "Tên Sản phẩm": b.product?.name || "N/A",
      "Kho lưu trữ": b.warehouse?.name || "N/A",
      "Vị trí kệ (Bin)": b.bin?.code || "Chưa xếp",
      "Tồn khả dụng": b.quantity,
      "Tồn đang khóa": b.lockedQty,
      "Đơn vị tính": b.product?.uom?.name || "N/A",
      "Giá vốn MAC (VND)": b.avgCost,
      "Tổng giá trị (VND)": b.totalValue
    }));
    exportToCSV(exportData, "Bao_Cao_Ton_Kho_Hien_Tai");
    toast.success("Xuất báo cáo tồn kho thành công!");
  };

  // --- ĐỊNH NGHĨA CỘT CHO TAB TỒN KHO THỰC TẾ ---
  const columns: ColumnDef<InventoryBalance>[] = [
    {
      header: "Vật tư / Sản phẩm",
      accessorKey: "product",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-500/30">
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
              {row.product?.name || "Sản phẩm không xác định"}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {row.product?.productCode} {row.variant ? `| ${row.variant.sku}` : ""}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Vị trí Kho",
      accessorKey: "warehouse",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {row.warehouse?.name || "Kho tổng"}
          </span>
          <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit mt-0.5">
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
      cell: (row) => (
        <div className="flex flex-col items-end">
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {formatQty(row.quantity)} <span className="text-xs font-normal text-slate-500">{row.product?.uom?.name}</span>
          </span>
          {row.lockedQty > 0 && (
            <span className="text-[10px] font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1.5 rounded flex items-center gap-1 mt-0.5">
              <Lock className="w-3 h-3" /> Đang khóa {formatQty(row.lockedQty)}
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
      cell: (row) => (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {formatVND(row.avgCost)}
        </span>
      )
    },
    {
      header: "Tổng Giá trị",
      accessorKey: "totalValue",
      sortable: true,
      align: "right",
      cell: (row) => (
        <span className="font-bold text-blue-600 dark:text-blue-400">
          {formatVND(row.totalValue)}
        </span>
      )
    }
  ];

  // --- CẤU HÌNH MOTION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // --- RENDER XỬ LÝ LỖI MẠNG ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Không thể tải dữ liệu Phân hệ Kho</h2>
        <button onClick={() => refetch()} className="px-6 py-3 mt-4 bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 flex items-center gap-2">
          <RefreshCcw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      <Header 
        title={t("Trung tâm Kho Bãi")} 
        subtitle={t("Giám sát danh mục vật tư, tồn kho thời gian thực và lịch sử luân chuyển.")}
        rightNode={
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button 
              onClick={handleExportBalances}
              className="p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:block text-sm font-bold">Xuất Báo cáo</span>
            </button>
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <ScanBarcode className="w-5 h-5" />
              <span className="hidden sm:block text-sm font-bold">Quét mã Bulk</span>
            </button>
            <button 
              onClick={() => setIsTransferModalOpen(true)}
              className="p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all active:scale-95 border border-indigo-200 dark:border-indigo-500/30 shadow-sm"
            >
              <ArrowRightLeft className="w-5 h-5" />
              <span className="hidden sm:block text-sm font-bold">Chuyển kho</span>
            </button>
            <button 
              onClick={() => setIsAdjustModalOpen(true)}
              className="p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            >
              <ClipboardEdit className="w-5 h-5" />
              <span className="hidden sm:block text-sm font-bold">Kiểm kê đơn</span>
            </button>
          </div>
        }
      />

      {isLoading ? (
        <InventorySkeleton />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          
          {/* SMART ALERTS WIDGETS */}
          <AnimatePresence>
            {(lowStockAlerts.length > 0 || expiringBatches.length > 0) && (
              <motion.div 
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
              >
                {/* WIDGET CẢNH BÁO TỒN KHO THẤP */}
                {lowStockAlerts.length > 0 && (
                  <motion.div 
                    animate={{ boxShadow: ["0px 0px 0px rgba(244,63,94,0)", "0px 0px 20px rgba(244,63,94,0.4)", "0px 0px 0px rgba(244,63,94,0)"] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-rose-50 to-white dark:from-rose-500/10 dark:to-slate-900 border border-rose-200 dark:border-rose-500/30 relative overflow-hidden group cursor-pointer"
                  >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all"></div>
                    <div className="p-3 bg-rose-100 dark:bg-rose-500/20 rounded-xl shrink-0">
                      <AlertTriangle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="flex flex-col z-10">
                      <h4 className="text-base font-bold text-rose-800 dark:text-rose-300">Cảnh báo Tồn kho an toàn</h4>
                      <p className="text-sm text-rose-600/80 dark:text-rose-400/80 mt-1 leading-relaxed">
                        Phát hiện <span className="font-bold text-rose-600 dark:text-rose-400 text-lg">{lowStockAlerts.length}</span> mặt hàng đã chạm đáy (Reorder Point). Cần lên kế hoạch nhập khẩu hoặc sản xuất ngay!
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* WIDGET CẢNH BÁO HẾT HẠN SỬ DỤNG (FEFO) */}
                {expiringBatches.length > 0 && (
                  <motion.div 
                    animate={{ boxShadow: ["0px 0px 0px rgba(245,158,11,0)", "0px 0px 20px rgba(245,158,11,0.4)", "0px 0px 0px rgba(245,158,11,0)"] }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: 1.25 }}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-900 border border-amber-200 dark:border-amber-500/30 relative overflow-hidden group cursor-pointer"
                  >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
                    <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl shrink-0">
                      <Clock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex flex-col z-10">
                      <h4 className="text-base font-bold text-amber-800 dark:text-amber-300">Cảnh báo Hàng sắp hết hạn</h4>
                      <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1 leading-relaxed">
                        Có <span className="font-bold text-amber-600 dark:text-amber-400 text-lg">{expiringBatches.length}</span> lô hàng sẽ hết hạn trong 30 ngày tới. Yêu cầu ưu tiên xuất kho theo tiêu chuẩn FEFO.
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* KHỐI THỐNG KÊ (KPI CARDS) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-emerald-500 group hover:-translate-y-1 transition-transform">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng Tồn Khả Dụng</p>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg"><Box className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white truncate">{formatQty(summary.totalAvailable)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-rose-500 group hover:-translate-y-1 transition-transform relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 relative z-10">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hàng Đang Khóa</p>
                <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg"><Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" /></div>
              </div>
              <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 relative z-10 truncate">{formatQty(summary.totalLocked)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-blue-500 group hover:-translate-y-1 transition-transform">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng Giá Trị (MAC)</p>
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg"><DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
              </div>
              <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400 truncate">{formatVND(summary.totalValue)}</h3>
            </motion.div>
          </div>

          {/* ĐIỀU HƯỚNG TAB TỔNG HỢP */}
          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200 dark:border-white/5">
              
              <button onClick={() => setActiveTab("BALANCES")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeTab === "BALANCES" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {activeTab === "BALANCES" && <motion.div layoutId="invTab" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm -z-10" />}
                <Box className="w-4 h-4" /> Tồn kho hiện tại
              </button>

              <button onClick={() => setActiveTab("PRODUCTS")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeTab === "PRODUCTS" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {activeTab === "PRODUCTS" && <motion.div layoutId="invTab" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm -z-10" />}
                <Layers className="w-4 h-4" /> Danh mục Hàng hóa
              </button>

              <button onClick={() => setActiveTab("HISTORY")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeTab === "HISTORY" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {activeTab === "HISTORY" && <motion.div layoutId="invTab" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm -z-10" />}
                <History className="w-4 h-4" /> Lịch sử (Thẻ kho)
              </button>

              <button onClick={() => setActiveTab("3D_MAP")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeTab === "3D_MAP" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {activeTab === "3D_MAP" && <motion.div layoutId="invTab" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm -z-10" />}
                <Map className="w-4 h-4" /> Bản đồ Kho 3D
              </button>

            </div>
          </div>

          {/* NỘI DUNG HIỂN THỊ TƯƠNG ỨNG VỚI TAB */}
          <div className="w-full relative">
            <AnimatePresence mode="wait">
              
              {activeTab === "BALANCES" && (
                <motion.div key="balances" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5">
                    <DataTable 
                      data={balances} 
                      columns={columns} 
                      searchKey="product" 
                      searchPlaceholder="Tìm kiếm tên sản phẩm, mã SKU..."
                      itemsPerPage={10}
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

    </div>
  );
}