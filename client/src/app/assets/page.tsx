"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  MonitorSmartphone, Plus, Calculator, AlertOctagon, 
  RefreshCcw, Wrench, ArrowRightLeft, Trash2, CheckCircle2, 
  Ban, ShieldAlert, Laptop, Building, Activity, Search, 
  Filter, Crown, TrendingDown, PackageOpen, LayoutGrid, Zap, Download
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetAssetsQuery, 
  useDeleteAssetMutation, 
  useLogAssetMaintenanceMutation,
  useGetAssetCategoriesQuery,
  useGetDepartmentsQuery,
  Asset 
} from "@/state/api";

// --- COMPONENTS GIAO DIỆN LÕI ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

// --- UTILS (SIÊU VŨ KHÍ) ---
import { formatVND, formatDate } from "@/utils/formatters";
import { exportToCSV } from "@/utils/exportUtils";
import { cn } from "@/utils/helpers";

// --- SUB-MODALS NGHIỆP VỤ ---
import CreateAssetModal from "./CreateAssetModal";
import RunDepreciationModal from "./RunDepreciationModal";
import HandoverModal from "./HandoverModal";
import LiquidateModal from "./LiquidateModal";
import AdvancedAssetOperationsModal from "./AdvancedAssetOperationsModal";

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const getStatusUI = (status: string) => {
  switch (status) {
    case "ACTIVE": return { label: "Sẵn sàng", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30" };
    case "IN_USE": return { label: "Đang mượn", icon: MonitorSmartphone, color: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/30" };
    case "MAINTENANCE": return { label: "Bảo trì", icon: Wrench, color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30" };
    case "LIQUIDATED": return { label: "Đã thanh lý", icon: Ban, color: "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/30" };
    default: return { label: status || "N/A", icon: Activity, color: "text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700" };
  }
};

type TabType = "ALL" | "ACTIVE" | "IN_USE" | "MAINTENANCE" | "LIQUIDATED";

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const AssetsSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/50"></div>)}
    </div>
    <div className="h-16 w-full rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: TRUNG TÂM TÀI SẢN
// ==========================================
export default function AssetsPage() {
  const { t } = useTranslation();

  // --- STATE TABS & BỘ LỌC ---
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  
  // 🚀 STATE BỘ LỌC NÂNG CAO (ADVANCED FILTERS)
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  // --- STATE MODALS QUẢN LÝ VÒNG ĐỜI ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRunDepreciationOpen, setIsRunDepreciationOpen] = useState(false);
  const [isAdvancedOpsOpen, setIsAdvancedOpsOpen] = useState(false);
  const [handoverAssetId, setHandoverAssetId] = useState<string | null>(null);
  const [liquidateAssetId, setLiquidateAssetId] = useState<string | null>(null);

  // 👉 FETCH DATA TỪ API THẬT
  const { data: rawAssets = [], isLoading: loadingAssets, isError, refetch, isFetching } = useGetAssetsQuery({});
  const { data: categories = [], isLoading: loadingCats } = useGetAssetCategoriesQuery();
  const { data: departments = [], isLoading: loadingDepts } = useGetDepartmentsQuery({});
  
  const [deleteAsset, { isLoading: isDeleting }] = useDeleteAssetMutation();
  const [logMaintenance, { isLoading: isLoggingMaintenance }] = useLogAssetMaintenanceMutation();

  const isLoading = loadingAssets || loadingCats || loadingDepts;

  // --- 🚀 XỬ LÝ LỌC TRÊN CLIENT THÔNG MINH ---
  const assets = useMemo(() => {
    return rawAssets.map((asset: any) => ({
      ...asset,
      // Tạo trường ảo để Search DataTable mượt mà (Tên + Mã Code)
      assetSearchText: `${asset.name || ""} ${asset.assetCode || ""}`.toLowerCase()
    })).filter((asset: any) => {
      const matchTab = activeTab === "ALL" || asset.status === activeTab;
      const matchCat = filterCategory === "" || asset.categoryId === filterCategory;
      const assetDeptId = asset.departmentId || asset.department?.departmentId;
      const matchDept = filterDepartment === "" || assetDeptId === filterDepartment;
      
      return matchTab && matchCat && matchDept;
    });
  }, [rawAssets, activeTab, filterCategory, filterDepartment]);

  // --- TÍNH TOÁN KPI ---
  const kpis = useMemo(() => {
    let totalPurchasePrice = 0, totalCurrentValue = 0;
    let activeCount = 0, inUseCount = 0, maintenanceCount = 0;

    rawAssets.forEach(asset => {
      if (asset.status !== "LIQUIDATED") {
        totalPurchasePrice += asset.purchasePrice || 0;
        totalCurrentValue += asset.currentValue || 0;
        
        if (asset.status === "ACTIVE") activeCount++;
        if (asset.status === "IN_USE") inUseCount++;
        if (asset.status === "MAINTENANCE") maintenanceCount++;
      }
    });

    const activeAssetsTotal = activeCount + inUseCount + maintenanceCount;
    const utilizationRate = activeAssetsTotal > 0 ? Math.round((inUseCount / activeAssetsTotal) * 100) : 0;
    const depreciationRate = totalPurchasePrice > 0 ? Math.round(((totalPurchasePrice - totalCurrentValue) / totalPurchasePrice) * 100) : 0;

    return { 
      totalAssets: activeAssetsTotal,
      totalPurchasePrice, totalCurrentValue, 
      utilizationRate, depreciationRate, maintenanceCount 
    };
  }, [rawAssets]);

  // --- HANDLERS HOẠT ĐỘNG THẬT ---
  const handleQuickMaintenance = async (id: string, name: string) => {
    const description = window.prompt(`Nhập lý do bảo trì cho thiết bị "${name}":`);
    if (!description?.trim()) return;
    
    try {
      await logMaintenance({ id, data: { maintenanceDate: formatDate(new Date(), "YYYY-MM-DD"), description, cost: 0 } }).unwrap();
      toast.success(`Đã đưa ${name} vào diện bảo trì thành công!`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi ghi nhận bảo trì vào cơ sở dữ liệu!");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`HÀNH ĐỘNG NGUY HIỂM: Xóa cứng tài sản "${name}"?\nChỉ xóa được tài sản CHƯA TỪNG phát sinh khấu hao hoặc giao dịch. Nếu không, hãy dùng chức năng Thanh lý.`)) {
      try {
        await deleteAsset(id).unwrap();
        toast.success(`Đã xóa tài sản ${name} khỏi CSDL!`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Tài sản đã có lịch sử, không thể xóa cứng! Hãy Thanh lý.");
      }
    }
  };

  const handleExportAssets = () => {
    if (assets.length === 0) {
      toast.error("Không có dữ liệu tài sản để xuất!");
      return;
    }
    const exportData = assets.map((a: any) => ({
      "Mã tài sản": a.assetCode,
      "Tên tài sản": a.name,
      "Phân loại": a.category?.name || "Chưa phân loại",
      "Phòng ban": a.department?.name || "Kho chung",
      "Nguyên giá (VND)": a.purchasePrice,
      "Giá trị còn lại (VND)": a.currentValue,
      "Trạng thái": getStatusUI(a.status).label,
      "Phương pháp khấu hao": a.depreciationMethod
    }));

    exportToCSV(exportData, "Danh_Sach_Tai_San");
  };

  // --- CỘT BẢNG (DATATABLE COLUMNS) ---
  const columns: ColumnDef<any>[] = [
    {
      header: "Mã / Tên Tài sản",
      accessorKey: "assetSearchText", // 💡 Liên kết với trường ảo để Data Table tự Search Text
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm",
            row.status === "LIQUIDATED" 
              ? "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700" 
              : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-700/50"
          )}>
            <Laptop className={cn("w-5 h-5", row.status === "LIQUIDATED" ? "text-slate-400" : "text-blue-600 dark:text-blue-400")} />
          </div>
          <div className="flex flex-col max-w-[200px]">
            <span className={cn("font-bold truncate", row.status === "LIQUIDATED" ? "text-slate-500 line-through" : "text-slate-900 dark:text-white")} title={row.name}>
              {row.name}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded w-fit">
              {row.assetCode}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Phân loại / Vị trí",
      accessorKey: "categoryId",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1">
            <PackageOpen className="w-3.5 h-3.5 text-indigo-400" /> {row.category?.name || "Chưa phân loại"}
          </span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
            <Building className="w-3 h-3" /> {row.department?.name || "Kho chung"}
          </span>
        </div>
      )
    },
    {
      header: "Khấu hao (Nguyên giá -> Còn lại)",
      accessorKey: "purchasePrice",
      sortable: true,
      cell: (row) => {
        const purchase = row.purchasePrice || 0;
        const current = row.currentValue || 0;
        const percentRemain = purchase > 0 ? (current / purchase) * 100 : 0;
        const isLiquidated = row.status === "LIQUIDATED";

        return (
          <div className="flex flex-col w-40 sm:w-48">
            <div className="flex justify-between items-end mb-1 text-[11px]">
              <span className="text-slate-400">Gốc: <span className="font-medium text-slate-600 dark:text-slate-300">{formatVND(purchase)}</span></span>
              <span className={cn("font-bold", isLiquidated ? "text-slate-400" : "text-emerald-600 dark:text-emerald-400")}>
                {formatVND(current)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }} animate={{ width: `${percentRemain}%` }} transition={{ duration: 1, ease: "easeOut" }}
                className={cn("h-full rounded-full", isLiquidated ? "bg-slate-400" : percentRemain < 20 ? "bg-rose-500" : percentRemain < 50 ? "bg-amber-500" : "bg-emerald-500")}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: "Trạng thái",
      accessorKey: "status",
      cell: (row) => {
        const { label, icon: Icon, color } = getStatusUI(row.status);
        return (
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border", color)}>
            <Icon className="w-3 h-3" /> {label}
          </span>
        );
      }
    },
    {
      header: "Thao tác",
      accessorKey: "assetId",
      align: "right",
      cell: (row) => {
        const isLiquidated = row.status === "LIQUIDATED";
        const isMaintenance = row.status === "MAINTENANCE";
        const isClean = row.purchasePrice === row.currentValue;

        return (
          <div className="flex items-center justify-end gap-1">
            {!isLiquidated && !isMaintenance && (
              <>
                <button onClick={() => setHandoverAssetId(row.assetId)} title="Luân chuyển (Giao/Thu hồi)" className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-xl transition-colors active:scale-95">
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
                <button onClick={() => handleQuickMaintenance(row.assetId, row.name)} disabled={isLoggingMaintenance} title="Ghi nhận Hư hỏng" className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/20 rounded-xl transition-colors active:scale-95 disabled:opacity-50">
                  <Wrench className="w-4 h-4" />
                </button>
                <button onClick={() => setLiquidateAssetId(row.assetId)} title="Thanh lý tài sản" className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-colors active:scale-95">
                  <ShieldAlert className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={() => handleDelete(row.assetId, row.name)} disabled={!isClean || isLiquidated || isDeleting} title="Xóa vĩnh viễn" className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  // 🚀 BỘ LỌC NÂNG CAO (UI ĐỂ BƠM VÀO DATATABLE)
  const assetFiltersNode = (
    <div className="flex flex-wrap items-center gap-4 w-full">
      <div className="w-full sm:w-64">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Lọc theo Nhóm Tài sản</label>
        <div className="relative group">
          <PackageOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <select 
            value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
          >
            <option value="">-- Tất cả Nhóm Tài sản --</option>
            {categories.map((c: any) => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
          </select>
        </div>
      </div>
      
      <div className="w-full sm:w-64">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Lọc theo Phòng ban</label>
        <div className="relative group">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <select 
            value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
          >
            <option value="">-- Tất cả Phòng ban --</option>
            {departments.map((d: any) => <option key={d.departmentId} value={d.departmentId}>{d.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  // --- ANIMATION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Lỗi kết nối Hệ thống Tài sản</h2>
        <button onClick={() => refetch()} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 mt-4 transition-transform">
          <RefreshCcw className={cn("w-5 h-5", isFetching && "animate-spin")} /> Tải lại dữ liệu
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      {/* 1. HEADER CHUẨN ENTERPRISE */}
      <Header 
        title={t("Trung tâm Quản trị Tài sản")} 
        subtitle={t("Giám sát vòng đời, luân chuyển thiết bị và theo dõi tình trạng khấu hao.")}
        rightNode={
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button 
              onClick={handleExportAssets}
              className="p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all active:scale-95 whitespace-nowrap border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:block text-sm font-bold">Xuất File</span>
            </button>

            <button 
              onClick={() => setIsAdvancedOpsOpen(true)}
              className="p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 whitespace-nowrap"
            >
              <Crown className="w-5 h-5" />
              <span className="hidden sm:block text-sm font-bold">Nghiệp vụ Nâng cao</span>
            </button>

            <button 
              onClick={() => setIsRunDepreciationOpen(true)}
              className="p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              <Calculator className="w-5 h-5" />
              <span className="hidden sm:block text-sm font-bold">Chạy Khấu hao</span>
            </button>

            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Thêm Tài sản</span>
            </button>
          </div>
        }
      />

      {isLoading ? <AssetsSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          
          {/* 2. KHỐI THỐNG KÊ (KPI CARDS) - DATA VIZ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng Nguyên Giá Đầu tư</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate">{formatVND(kpis.totalPurchasePrice)}</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-2 flex items-center gap-1">
                <LayoutGrid className="w-3.5 h-3.5"/> Quản lý {kpis.totalAssets} thiết bị
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Giá trị sổ sách hiện tại</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">{formatVND(kpis.totalCurrentValue)}</h3>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${100 - kpis.depreciationRate}%` }} transition={{ duration: 1 }} className="h-full bg-emerald-500 rounded-full" />
                </div>
                <span className="text-[10px] font-bold text-slate-400">Hao mòn {kpis.depreciationRate}%</span>
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><TrendingDown className="w-24 h-24 text-indigo-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Hiệu suất sử dụng (Giao việc)</p>
              <div className="flex items-center gap-2 relative z-10">
                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{kpis.utilizationRate}%</h3>
                {kpis.utilizationRate > 85 && <Zap className="w-4 h-4 text-amber-500" fill="currentColor" />}
              </div>
              <div className="flex items-center gap-2 mt-2 relative z-10">
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${kpis.utilizationRate}%` }} transition={{ duration: 1 }} className={cn("h-full rounded-full", kpis.utilizationRate > 85 ? "bg-amber-500" : "bg-indigo-500")} />
                </div>
                <span className="text-[10px] font-bold text-slate-400">Lý tưởng {'>'} 85%</span>
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className={cn("glass p-5 rounded-3xl border shadow-sm flex flex-col justify-center relative overflow-hidden group transition-colors", kpis.maintenanceCount > 0 ? "border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-900/10" : "border-slate-200 dark:border-white/10")}>
              <div className="absolute -right-2 -bottom-2 opacity-[0.05] group-hover:scale-110 transition-transform"><Wrench className="w-20 h-20 text-amber-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Thiết bị đang bảo trì</p>
              <div className="flex items-center gap-3 relative z-10">
                <h3 className={cn("text-3xl font-black", kpis.maintenanceCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400")}>
                  {kpis.maintenanceCount}
                </h3>
                {kpis.maintenanceCount > 0 && (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                )}
              </div>
            </motion.div>

          </div>

          {/* 3. THANH CÔNG CỤ: TÌM KIẾM, LỌC & TABS */}
          <motion.div variants={itemVariants} className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm z-10 sticky top-4">
            
            {/* Tabs Ngữ cảnh */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-white/5">
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "ACTIVE", label: "Trong kho" },
                { id: "IN_USE", label: "Đang cấp phát" },
                { id: "MAINTENANCE", label: "Nằm viện" },
                { id: "LIQUIDATED", label: "Thanh lý" }
              ].map(tab => (
                <button 
                  key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} 
                  className={cn(
                    "relative px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap z-10",
                    activeTab === tab.id ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {activeTab === tab.id && <motion.div layoutId="assetFilterTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-lg -z-10 border border-slate-200/50 dark:border-slate-600" />}
                  {tab.label}
                </button>
              ))}
            </div>

          </motion.div>

          {/* 4. BẢNG DỮ LIỆU */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10">
            {assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Laptop className="w-10 h-10 opacity-50" />
                </div>
                <p className="font-bold text-slate-600 dark:text-slate-300 text-lg">Trống rỗng</p>
                <p className="text-sm mt-1">Không tìm thấy tài sản nào khớp với bộ lọc.</p>
              </div>
            ) : (
              <DataTable 
                data={assets} 
                columns={columns} 
                searchKey="assetSearchText" 
                searchPlaceholder="Lọc nhanh tên hoặc mã thiết bị..." 
                itemsPerPage={10} 
                // 🚀 BƠM BỘ LỌC VÀO TRONG BẢNG DATA TABLE
                advancedFilterNode={assetFiltersNode}
              />
            )}
          </motion.div>

        </motion.div>
      )}

      {/* ==========================================
          5. KHU VỰC TÍCH HỢP CÁC MODALS NGHIỆP VỤ 
          ========================================== */}
      <CreateAssetModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <RunDepreciationModal isOpen={isRunDepreciationOpen} onClose={() => setIsRunDepreciationOpen(false)} />
      <HandoverModal assetId={handoverAssetId} isOpen={!!handoverAssetId} onClose={() => setHandoverAssetId(null)} />
      <LiquidateModal assetId={liquidateAssetId} isOpen={!!liquidateAssetId} onClose={() => setLiquidateAssetId(null)} />
      <AdvancedAssetOperationsModal isOpen={isAdvancedOpsOpen} onClose={() => setIsAdvancedOpsOpen(false)} />

    </div>
  );
}