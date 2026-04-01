"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  MonitorSmartphone, Plus, Calculator, AlertOctagon, 
  RefreshCcw, Wrench, ArrowRightLeft, Trash2, CheckCircle2, 
  Ban, ShieldAlert, Laptop, Building, Activity, Search, 
  Filter, Crown, TrendingDown, PackageOpen, LayoutGrid, Zap, Download
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; 
import { 
  useGetAssetsQuery, 
  useDeleteAssetMutation, 
  useLogAssetMaintenanceMutation,
  useGetAssetCategoriesQuery,
  useGetDepartmentsQuery,
  Asset 
} from "@/state/api";

// --- COMPONENTS GIAO DIỆN LÕI ---
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

// --- UTILS (SIÊU VŨ KHÍ) ---
import { formatVND, formatDate } from "@/utils/formatters";
import { exportTableToExcel } from "@/utils/exportUtils"; // 🚀 NÂNG CẤP LÊN ENGINE XUẤT EXCEL THÔNG MINH
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
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6 transition-all duration-500 ease-in-out">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/50 transition-all duration-500 ease-in-out"></div>)}
    </div>
    <div className="h-16 w-full rounded-2xl bg-slate-200 dark:bg-slate-800/50 transition-all duration-500 ease-in-out"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl transition-all duration-500 ease-in-out"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: TRUNG TÂM TÀI SẢN
// ==========================================
export default function AssetsPage() {
  const { t } = useTranslation();

  // 🚀 LÁ CHẮN HYDRATION: Tránh lỗi Mismatch Theme khi tải trang SSR
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🚀 BỐI CẢNH REDUX (CONTEXT ISOLATION)
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- STATE TABS & BỘ LỌC ---
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  // --- STATE MODALS QUẢN LÝ VÒNG ĐỜI ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRunDepreciationOpen, setIsRunDepreciationOpen] = useState(false);
  const [isAdvancedOpsOpen, setIsAdvancedOpsOpen] = useState(false);
  const [handoverAssetId, setHandoverAssetId] = useState<string | null>(null);
  const [liquidateAssetId, setLiquidateAssetId] = useState<string | null>(null);

  // 👉 FETCH DATA TỪ API THẬT
  const { data: rawAssets = [], isLoading: loadingAssets, isError, refetch, isFetching } = useGetAssetsQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );
  
  const { data: categories = [], isLoading: loadingCats } = useGetAssetCategoriesQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );
  
  const { data: departments = [], isLoading: loadingDepts } = useGetDepartmentsQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );
  
  const [deleteAsset, { isLoading: isDeleting }] = useDeleteAssetMutation();
  const [logMaintenance, { isLoading: isLoggingMaintenance }] = useLogAssetMaintenanceMutation();

  const isLoading = loadingAssets || loadingCats || loadingDepts;

  // --- XỬ LÝ LỌC TRÊN CLIENT ---
  const assets = useMemo(() => {
    return rawAssets.map((asset: any) => ({
      ...asset,
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

  // 🚀 ĐỘNG CƠ EXPORT SMART EXCEL
  const handleExportAssets = () => {
    if (assets.length === 0) {
      toast.error("Không có dữ liệu tài sản để xuất!");
      return;
    }
    exportTableToExcel("smart-assets-report", `Bao_Cao_Tai_San_${dayjs().format('DDMMYYYY')}`);
    toast.success("Đã xuất Báo cáo Tài sản thành công!");
  };

  // --- CỘT BẢNG (DATATABLE COLUMNS) ---
  const columns: ColumnDef<any>[] = [
    {
      header: "Mã / Tên Tài sản",
      accessorKey: "assetSearchText", 
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3 transition-all duration-500 ease-in-out">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-all duration-500 ease-in-out",
            row.status === "LIQUIDATED" 
              ? "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700" 
              : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-700/50"
          )}>
            <Laptop className={cn("w-5 h-5 transition-all duration-500 ease-in-out", row.status === "LIQUIDATED" ? "text-slate-400" : "text-blue-600 dark:text-blue-400")} />
          </div>
          <div className="flex flex-col max-w-[200px] transition-all duration-500 ease-in-out">
            <span className={cn("font-bold truncate transition-all duration-500 ease-in-out", row.status === "LIQUIDATED" ? "text-slate-500 dark:text-slate-400 line-through" : "text-slate-900 dark:text-white")} title={row.name}>
              {row.name}
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded w-fit transition-all duration-500 ease-in-out">
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
        <div className="flex flex-col transition-all duration-500 ease-in-out">
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1 transition-all duration-500 ease-in-out">
            <PackageOpen className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 transition-all duration-500 ease-in-out" /> {row.category?.name || "Chưa phân loại"}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 transition-all duration-500 ease-in-out">
            <Building className="w-3 h-3 transition-all duration-500 ease-in-out" /> {row.department?.name || "Kho chung"}
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
          <div className="flex flex-col w-40 sm:w-48 transition-all duration-500 ease-in-out">
            <div className="flex justify-between items-end mb-1 text-[11px] transition-all duration-500 ease-in-out">
              <span className="text-slate-400 dark:text-slate-500 transition-all duration-500 ease-in-out">Gốc: <span className="font-medium text-slate-600 dark:text-slate-300">{formatVND(purchase)}</span></span>
              <span className={cn("font-bold transition-all duration-500 ease-in-out", isLiquidated ? "text-slate-400 dark:text-slate-500" : "text-emerald-600 dark:text-emerald-400")}>
                {formatVND(current)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner transition-all duration-500 ease-in-out">
              <motion.div 
                initial={{ width: 0 }} animate={{ width: `${percentRemain}%` }} transition={{ duration: 1, ease: "easeOut" }}
                className={cn("h-full rounded-full transition-all duration-500 ease-in-out", isLiquidated ? "bg-slate-400 dark:bg-slate-600" : percentRemain < 20 ? "bg-rose-500" : percentRemain < 50 ? "bg-amber-500" : "bg-emerald-500")}
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
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all duration-500 ease-in-out", color)}>
            <Icon className="w-3 h-3 transition-all duration-500 ease-in-out" /> {label}
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
          <div className="flex items-center justify-end gap-1 transition-all duration-500 ease-in-out">
            {!isLiquidated && !isMaintenance && (
              <>
                <button onClick={() => setHandoverAssetId(row.assetId)} title="Luân chuyển (Giao/Thu hồi)" className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-xl transition-all active:scale-95 duration-500 ease-in-out">
                  <ArrowRightLeft className="w-4 h-4 transition-all duration-500 ease-in-out" />
                </button>
                <button onClick={() => handleQuickMaintenance(row.assetId, row.name)} disabled={isLoggingMaintenance} title="Ghi nhận Hư hỏng" className="p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/20 rounded-xl transition-all active:scale-95 disabled:opacity-50 duration-500 ease-in-out">
                  <Wrench className="w-4 h-4 transition-all duration-500 ease-in-out" />
                </button>
                <button onClick={() => setLiquidateAssetId(row.assetId)} title="Thanh lý tài sản" className="p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/20 rounded-xl transition-all active:scale-95 duration-500 ease-in-out">
                  <ShieldAlert className="w-4 h-4 transition-all duration-500 ease-in-out" />
                </button>
              </>
            )}
            <button onClick={() => handleDelete(row.assetId, row.name)} disabled={!isClean || isLiquidated || isDeleting} title="Xóa vĩnh viễn" className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-600 dark:hover:text-rose-400 dark:hover:bg-rose-500/20 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed duration-500 ease-in-out">
              <Trash2 className="w-4 h-4 transition-all duration-500 ease-in-out" />
            </button>
          </div>
        );
      }
    }
  ];

  // 🚀 BỘ LỌC NÂNG CAO (UI ĐỂ BƠM VÀO DATATABLE)
  const assetFiltersNode = (
    <div className="flex flex-wrap items-center gap-4 w-full transition-all duration-500 ease-in-out">
      <div className="w-full sm:w-64 transition-all duration-500 ease-in-out">
        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block transition-all duration-500 ease-in-out">Lọc theo Nhóm Tài sản</label>
        <div className="relative group transition-all duration-500 ease-in-out">
          <PackageOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-all duration-500 ease-in-out" />
          <select 
            value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white duration-500 ease-in-out"
          >
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="">-- Tất cả Nhóm Tài sản --</option>
            {categories.map((c: any) => <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
          </select>
        </div>
      </div>
      
      <div className="w-full sm:w-64 transition-all duration-500 ease-in-out">
        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block transition-all duration-500 ease-in-out">Lọc theo Phòng ban</label>
        <div className="relative group transition-all duration-500 ease-in-out">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-all duration-500 ease-in-out" />
          <select 
            value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white duration-500 ease-in-out"
          >
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="">-- Tất cả Phòng ban --</option>
            {departments.map((d: any) => <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" key={d.departmentId} value={d.departmentId}>{d.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  // --- ANIMATION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // 🚀 LÁ CHẮN HYDRATION UI
  if (!isMounted) return <AssetsSkeleton />;

  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
        <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse transition-all duration-500 ease-in-out" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-all duration-500 ease-in-out">Chưa chọn Chi nhánh</h2>
        <p className="text-slate-500 dark:text-slate-400 transition-all duration-500 ease-in-out">Vui lòng chọn Chi nhánh hoạt động ở góc trên màn hình để tải Dữ liệu Tài sản.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse transition-all duration-500 ease-in-out" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-all duration-500 ease-in-out">Lỗi kết nối Hệ thống Tài sản</h2>
        <button onClick={() => refetch()} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 mt-4 transition-transform duration-500 ease-in-out">
          <RefreshCcw className={cn("w-5 h-5 transition-all duration-500 ease-in-out", isFetching && "animate-spin")} /> Tải lại dữ liệu
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10 transition-all duration-500 ease-in-out">
      
      {/* 🚀 ĐẠI TU HEADER & BỌC THÉP FLEXBOX */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }} 
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5 mb-6 sm:mb-8 md:mb-10 transform-gpu will-change-transform w-full transition-all duration-500 ease-in-out"
      >
        <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 w-24 h-24 sm:w-32 sm:h-32 bg-blue-500/15 dark:bg-blue-500/20 rounded-full blur-2xl sm:blur-3xl pointer-events-none z-0 transition-all duration-500 ease-in-out" />
        
        <div className="relative z-10 flex items-stretch gap-3 sm:gap-4 w-full md:w-auto min-w-0 transition-all duration-500 ease-in-out flex-1">
          <div className="w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_8px_rgba(79,70,229,0.4)] dark:shadow-[0_0_16px_rgba(79,70,229,0.3)] transition-all duration-500 ease-in-out" />
          
          <div className="flex flex-col justify-center py-0.5 min-w-0 transition-all duration-500 ease-in-out w-full">
            <h1 className="text-xl sm:text-2xl md:text-[28px] lg:text-3xl font-black tracking-tight text-slate-800 dark:text-slate-50 leading-tight sm:leading-none truncate break-words transition-all duration-500 ease-in-out">
              {t("Trung tâm Quản trị Tài sản")}
            </h1>
            <p className="text-xs sm:text-[13px] md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-1.5 md:mt-2 flex items-center gap-2 max-w-full md:max-w-xl leading-relaxed transition-all duration-500 ease-in-out">
              {t("Giám sát vòng đời, luân chuyển thiết bị và theo dõi tình trạng khấu hao.")}
            </p>
          </div>
        </div>

        <div className="relative z-10 w-full md:w-auto shrink-0 flex flex-row items-center justify-start md:justify-end gap-2.5 sm:gap-3 mt-2 md:mt-0 overflow-x-auto scrollbar-hide pb-1 md:pb-0 transition-all duration-500 ease-in-out">
          <button 
            onClick={handleExportAssets}
            className="p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all active:scale-95 whitespace-nowrap border border-slate-200 dark:border-slate-700 shadow-sm text-sm font-bold duration-500 ease-in-out"
          >
            <Download className="w-4 h-4 transition-all duration-500 ease-in-out" />
            <span className="hidden sm:block transition-all duration-500 ease-in-out">Xuất Dữ liệu</span>
          </button>

          <button 
            onClick={() => setIsAdvancedOpsOpen(true)}
            className="p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 whitespace-nowrap text-sm font-bold duration-500 ease-in-out"
          >
            <Crown className="w-5 h-5 transition-all duration-500 ease-in-out" />
            <span className="hidden sm:block transition-all duration-500 ease-in-out">Nghiệp vụ Mở rộng</span>
          </button>

          <button 
            onClick={() => setIsRunDepreciationOpen(true)}
            className="p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap text-sm font-bold duration-500 ease-in-out"
          >
            <Calculator className="w-5 h-5 transition-all duration-500 ease-in-out" />
            <span className="hidden sm:block transition-all duration-500 ease-in-out">Chạy Khấu hao</span>
          </button>

          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 whitespace-nowrap duration-500 ease-in-out"
          >
            <Plus className="w-5 h-5 transition-all duration-500 ease-in-out" />
            <span className="hidden sm:inline transition-all duration-500 ease-in-out">Thêm Tài sản</span>
          </button>
        </div>
      </motion.div>

      {isLoading ? <AssetsSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full transition-all duration-500 ease-in-out">
          
          {/* 2. KHỐI THỐNG KÊ (KPI CARDS) - DATA VIZ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 transition-all duration-500 ease-in-out">
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-500 ease-in-out cursor-default">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 transition-all duration-500 ease-in-out">Tổng Nguyên Giá Đầu tư</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 truncate transition-all duration-500 ease-in-out">{formatVND(kpis.totalPurchasePrice)}</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-2 flex items-center gap-1 transition-all duration-500 ease-in-out">
                <LayoutGrid className="w-3.5 h-3.5 transition-all duration-500 ease-in-out"/> Quản lý {kpis.totalAssets} thiết bị
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all duration-500 ease-in-out cursor-default">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 transition-all duration-500 ease-in-out">Giá trị sổ sách hiện tại</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate transition-all duration-500 ease-in-out">{formatVND(kpis.totalCurrentValue)}</h3>
              <div className="flex items-center gap-2 mt-2 transition-all duration-500 ease-in-out">
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden transition-all duration-500 ease-in-out">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${100 - kpis.depreciationRate}%` }} transition={{ duration: 1 }} className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-in-out" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 transition-all duration-500 ease-in-out">Hao mòn {kpis.depreciationRate}%</span>
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all duration-500 ease-in-out cursor-default">
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><TrendingDown className="w-24 h-24 text-indigo-500 transition-all duration-500 ease-in-out"/></div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 relative z-10 transition-all duration-500 ease-in-out">Hiệu suất sử dụng (Giao việc)</p>
              <div className="flex items-center gap-2 relative z-10 transition-all duration-500 ease-in-out">
                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 transition-all duration-500 ease-in-out">{kpis.utilizationRate}%</h3>
                {kpis.utilizationRate > 85 && <Zap className="w-4 h-4 text-amber-500 transition-all duration-500 ease-in-out" fill="currentColor" />}
              </div>
              <div className="flex items-center gap-2 mt-2 relative z-10 transition-all duration-500 ease-in-out">
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden transition-all duration-500 ease-in-out">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${kpis.utilizationRate}%` }} transition={{ duration: 1 }} className={cn("h-full rounded-full transition-all duration-500 ease-in-out", kpis.utilizationRate > 85 ? "bg-amber-500" : "bg-indigo-500")} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 transition-all duration-500 ease-in-out">Lý tưởng {'>'} 85%</span>
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className={cn("glass p-5 rounded-3xl border shadow-sm flex flex-col justify-center relative overflow-hidden group transition-all duration-500 ease-in-out cursor-default", kpis.maintenanceCount > 0 ? "border-amber-300 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-900/10" : "border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50")}>
              <div className="absolute -right-2 -bottom-2 opacity-[0.05] group-hover:scale-110 transition-transform duration-500 ease-in-out"><Wrench className="w-20 h-20 text-amber-500 transition-all duration-500 ease-in-out"/></div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 relative z-10 transition-all duration-500 ease-in-out">Thiết bị đang bảo trì</p>
              <div className="flex items-center gap-3 relative z-10 transition-all duration-500 ease-in-out">
                <h3 className={cn("text-3xl font-black transition-all duration-500 ease-in-out", kpis.maintenanceCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500")}>
                  {kpis.maintenanceCount}
                </h3>
                {kpis.maintenanceCount > 0 && (
                  <span className="flex h-3 w-3 relative transition-all duration-500 ease-in-out">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 transition-all duration-500 ease-in-out"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 transition-all duration-500 ease-in-out"></span>
                  </span>
                )}
              </div>
            </motion.div>

          </div>

          {/* 3. THANH CÔNG CỤ: TÌM KIẾM, LỌC & TABS */}
          <motion.div variants={itemVariants} className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 glass p-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm z-10 sticky top-4 transition-all duration-500 ease-in-out">
            
            {/* Tabs Ngữ cảnh */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-500 ease-in-out">
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
                    "relative px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap z-10 duration-500 ease-in-out",
                    activeTab === tab.id ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {activeTab === tab.id && <motion.div layoutId="assetFilterTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-lg -z-10 transition-all duration-500 ease-in-out border border-slate-200/50 dark:border-slate-600" />}
                  {tab.label}
                </button>
              ))}
            </div>

          </motion.div>

          {/* 4. BẢNG DỮ LIỆU */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-500 ease-in-out">
            {assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 transition-all duration-500 ease-in-out">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ease-in-out">
                  <Laptop className="w-10 h-10 opacity-50 transition-all duration-500 ease-in-out" />
                </div>
                <p className="font-bold text-slate-600 dark:text-slate-300 text-lg transition-all duration-500 ease-in-out">Trống rỗng</p>
                <p className="text-sm mt-1 transition-all duration-500 ease-in-out">Không tìm thấy tài sản nào khớp với bộ lọc.</p>
              </div>
            ) : (
              <DataTable 
                data={assets} 
                columns={columns} 
                searchKey="assetSearchText" 
                searchPlaceholder="Lọc nhanh tên hoặc mã thiết bị..." 
                itemsPerPage={10} 
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

      {/* ==========================================
          BẢNG ẨN DÙNG ĐỂ XUẤT BÁO CÁO SMART EXCEL
          ========================================== */}
      <div className="hidden transition-all duration-500 ease-in-out">
        <table id="smart-assets-report">
          <thead>
            <tr>
              <th colSpan={8} style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#1e293b', color: '#ffffff', padding: '15px' }}>
                BÁO CÁO HIỆN TRẠNG TÀI SẢN
              </th>
            </tr>
            <tr>
              <th colSpan={8} style={{ textAlign: 'center', fontStyle: 'italic', padding: '10px' }}>
                Chi nhánh: {activeBranchId === "ALL" ? "Toàn Hệ Thống" : activeBranchId} | Ngày xuất: {dayjs().format('DD/MM/YYYY HH:mm')}
              </th>
            </tr>
            <tr>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Mã tài sản</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Tên tài sản</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Phân loại</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Phòng ban/Vị trí</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Nguyên giá (VND)</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Giá trị còn lại (VND)</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Khấu hao (%)</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a: any, idx: number) => {
              const purchase = a.purchasePrice || 0;
              const current = a.currentValue || 0;
              const depreciationRate = purchase > 0 ? Math.round(((purchase - current) / purchase) * 100) : 0;
              
              return (
                <tr key={`ast-${idx}`}>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', msoNumberFormat: '\@' } as any}>{a.assetCode}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{a.name}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{a.category?.name || "Chưa phân loại"}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{a.department?.name || "Kho chung"}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: '#64748b' }}>{purchase}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#10b981' }}>{current}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: '#f43f5e' }}>{depreciationRate}%</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{getStatusUI(a.status).label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}