"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Database, Building2, Users, Package, DollarSign, 
  MapPin, Hash, Briefcase, Landmark, Percent, Coins, 
  BookOpen, Plus, Search, Loader2, AlertOctagon, RefreshCcw
} from "lucide-react";

// --- REDUX & API ---
import { 
  // Inventory & Org
  useGetBranchesQuery, useGetWarehousesQuery, useGetBinsQuery, useGetDepartmentsQuery,
  // Partners
  useGetSuppliersQuery, useGetCustomersQuery,
  // Products
  useGetCategoriesQuery, useGetUoMsQuery,
  // Finance
  useGetTaxesQuery, useGetCurrenciesQuery, useGetAccountsQuery, useGetPriceListsQuery
} from "@/state/api";

// --- COMPONENTS ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

// ==========================================
// 1. CẤU HÌNH MENU & MODULES
// ==========================================
type MainTab = "ORG_INV" | "PARTNERS" | "PRODUCTS" | "FINANCE";

const MAIN_TABS = [
  { id: "ORG_INV", label: "Tổ chức & Kho bãi", icon: Building2, color: "text-blue-500", bg: "bg-blue-500" },
  { id: "PARTNERS", label: "Danh bạ Đối tác", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500" },
  { id: "PRODUCTS", label: "Thuộc tính Hàng hóa", icon: Package, color: "text-amber-500", bg: "bg-amber-500" },
  { id: "FINANCE", label: "Kế toán & Tài chính", icon: Landmark, color: "text-purple-500", bg: "bg-purple-500" }
];

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const MasterDataSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800/50 rounded-2xl"></div>)}
    </div>
    <div className="h-[400px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: MASTER DATA
// ==========================================
export default function MasterDataPage() {
  const { t } = useTranslation();

  // --- STATE ĐIỀU HƯỚNG ---
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("ORG_INV");
  const [activeSubTab, setActiveSubTab] = useState<string>("branches");

  // Reset subtab khi đổi main tab
  const handleMainTabChange = (tabId: MainTab) => {
    setActiveMainTab(tabId);
    if (tabId === "ORG_INV") setActiveSubTab("branches");
    if (tabId === "PARTNERS") setActiveSubTab("suppliers");
    if (tabId === "PRODUCTS") setActiveSubTab("categories");
    if (tabId === "FINANCE") setActiveSubTab("taxes");
  };

  // --- 💥 KÍCH HOẠT HÀNG LOẠT API (SÀI SẠCH API NHƯ YÊU CẦU) ---
  // Khối 1: Tổ chức & Kho
  const { data: branches = [], isLoading: l1 } = useGetBranchesQuery(undefined, { skip: activeMainTab !== "ORG_INV" });
  const { data: warehouses = [], isLoading: l2 } = useGetWarehousesQuery({}, { skip: activeMainTab !== "ORG_INV" });
  const { data: bins = [], isLoading: l3 } = useGetBinsQuery({}, { skip: activeMainTab !== "ORG_INV" });
  const { data: depts = [], isLoading: l4 } = useGetDepartmentsQuery({}, { skip: activeMainTab !== "ORG_INV" });

  // Khối 2: Đối tác
  const { data: suppliers = [], isLoading: l5 } = useGetSuppliersQuery(undefined, { skip: activeMainTab !== "PARTNERS" });
  const { data: customers = [], isLoading: l6 } = useGetCustomersQuery(undefined, { skip: activeMainTab !== "PARTNERS" });

  // Khối 3: Hàng hóa
  const { data: categories = [], isLoading: l7 } = useGetCategoriesQuery(undefined, { skip: activeMainTab !== "PRODUCTS" });
  const { data: uoms = [], isLoading: l8 } = useGetUoMsQuery(undefined, { skip: activeMainTab !== "PRODUCTS" });

  // Khối 4: Tài chính
  const { data: taxes = [], isLoading: l9 } = useGetTaxesQuery(undefined, { skip: activeMainTab !== "FINANCE" });
  const { data: currencies = [], isLoading: l10 } = useGetCurrenciesQuery(undefined, { skip: activeMainTab !== "FINANCE" });
  const { data: accounts = [], isLoading: l11 } = useGetAccountsQuery({}, { skip: activeMainTab !== "FINANCE" });
  const { data: priceLists = [], isLoading: l12 } = useGetPriceListsQuery(undefined, { skip: activeMainTab !== "FINANCE" });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9 || l10 || l11 || l12;

  // --- CẤU HÌNH SUB-MODULES THEO TAB ---
  const subModules = useMemo(() => {
    switch (activeMainTab) {
      case "ORG_INV": return [
        { id: "branches", title: "Chi nhánh", data: branches, icon: Building2, desc: "Trụ sở & Công ty con" },
        { id: "departments", title: "Phòng ban", data: depts, icon: Briefcase, desc: "Cơ cấu tổ chức" },
        { id: "warehouses", title: "Kho lưu trữ", data: warehouses, icon: Database, desc: "Nhà kho vật lý" },
        { id: "bins", title: "Vị trí Kệ (Bin)", data: bins, icon: MapPin, desc: "Tọa độ hàng hóa" }
      ];
      case "PARTNERS": return [
        { id: "suppliers", title: "Nhà Cung Cấp", data: suppliers, icon: Building2, desc: "Đối tác mua hàng" },
        { id: "customers", title: "Khách hàng", data: customers, icon: Users, desc: "Đối tác bán hàng" }
      ];
      case "PRODUCTS": return [
        { id: "categories", title: "Nhóm Hàng", data: categories, icon: Package, desc: "Phân loại sản phẩm" },
        { id: "uoms", title: "Đơn vị tính (UoM)", data: uoms, icon: Hash, desc: "Cái, Hộp, Thùng, Kg" }
      ];
      case "FINANCE": return [
        { id: "taxes", title: "Biểu Thuế", data: taxes, icon: Percent, desc: "VAT, Tiêu thụ ĐB" },
        { id: "currencies", title: "Tiền tệ & Tỷ giá", data: currencies, icon: Coins, desc: "VND, USD, EUR" },
        { id: "accounts", title: "Hệ thống Tài khoản", data: accounts, icon: BookOpen, desc: "Sổ cái Kế toán (COA)" },
        { id: "price_lists", title: "Bảng giá", data: priceLists, icon: DollarSign, desc: "Chính sách giá bán" }
      ];
      default: return [];
    }
  }, [activeMainTab, branches, depts, warehouses, bins, suppliers, customers, categories, uoms, taxes, currencies, accounts, priceLists]);

  const activeModule = subModules.find(m => m.id === activeSubTab) || subModules[0];

  // --- GENERATE CỘT BẢNG LINH HOẠT THEO DỮ LIỆU ---
  const tableColumns: ColumnDef<any>[] = useMemo(() => {
    // Cột chung cho hầu hết các Master Data (Code & Name)
    const baseCols: ColumnDef<any>[] = [
      {
        header: "Mã (Code)",
        accessorKey: "code",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase tracking-wider">
            {row.code || row.accountCode || row.taxCode || row.currencyCode || "N/A"}
          </span>
        )
      },
      {
        header: "Tên / Diễn giải",
        accessorKey: "name",
        sortable: true,
        cell: (row) => (
          <span className="font-bold text-slate-900 dark:text-white">
            {row.name || row.description || row.listName || "Chưa đặt tên"}
          </span>
        )
      }
    ];

    // Cột đặc thù tùy loại dữ liệu
    if (activeSubTab === "taxes") {
      baseCols.push({
        header: "Thuế suất (%)", accessorKey: "rate",
        cell: (row) => <span className="font-bold text-rose-500">{row.rate}%</span>
      });
    } else if (activeSubTab === "currencies") {
      baseCols.push({
        header: "Tỷ giá quy đổi", accessorKey: "exchangeRate",
        cell: (row) => <span className="font-bold text-emerald-500">{new Intl.NumberFormat('vi-VN').format(row.exchangeRate)} VND</span>
      });
    } else if (activeSubTab === "accounts") {
      baseCols.push({
        header: "Loại Tài khoản", accessorKey: "accountType",
        cell: (row) => <span className="text-xs uppercase font-semibold text-indigo-500">{row.accountType}</span>
      });
    } else if (activeSubTab === "suppliers" || activeSubTab === "customers") {
      baseCols.push({ header: "Mã số Thuế", accessorKey: "taxCode" });
      baseCols.push({ header: "Liên hệ", accessorKey: "phone" });
    }

    // Cột trạng thái (Active/Inactive)
    baseCols.push({
      header: "Trạng thái",
      accessorKey: "isActive",
      cell: (row) => {
        // Nếu object không có cờ isActive, mặc định coi như đang hoạt động
        const isActive = row.isActive !== false; 
        return (
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
            {isActive ? 'Hoạt động' : 'Tạm khóa'}
          </span>
        );
      }
    });

    return baseCols;
  }, [activeSubTab]);

  // --- ANIMATION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      <Header 
        title={t("Dữ liệu Nền tảng (Master Data)")} 
        subtitle={t("Trung tâm cấu hình cốt lõi của hệ thống ERP.")}
      />

      {/* 1. THANH ĐIỀU HƯỚNG CHÍNH (MAIN TABS) */}
      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200 dark:border-white/5">
          {MAIN_TABS.map(tab => (
            <button 
              key={tab.id}
              onClick={() => handleMainTabChange(tab.id as MainTab)} 
              className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeMainTab === tab.id ? tab.color : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              {activeMainTab === tab.id && <motion.div layoutId="masterTab" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm -z-10" />}
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeMainTab}
          variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }}
          className="flex flex-col gap-6 w-full"
        >
          {/* 2. CÁC THẺ MODULE CON (SUB-TABS KPI CARDS) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {subModules.map((mod) => {
              const isActive = activeSubTab === mod.id;
              const Icon = mod.icon;
              return (
                <motion.div 
                  key={mod.id} variants={itemVariants}
                  onClick={() => setActiveSubTab(mod.id)}
                  className={`cursor-pointer relative overflow-hidden rounded-2xl p-4 transition-all duration-200 border ${isActive ? 'bg-white dark:bg-slate-800 border-blue-500 shadow-md transform scale-[1.02]' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'}`}
                >
                  {/* Background Icon Watermark */}
                  <div className={`absolute -right-4 -bottom-4 p-4 opacity-[0.03] dark:opacity-5 ${isActive ? 'text-blue-500' : 'text-slate-500'}`}>
                    <Icon className="w-24 h-24" />
                  </div>

                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className={`p-2 rounded-xl ${isActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {/* Count Badge */}
                    <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-300" /> : mod.data?.length || 0}
                    </span>
                  </div>
                  
                  <div className="relative z-10">
                    <h4 className={`font-bold text-sm ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{mod.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{mod.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* 3. KHU VỰC HIỂN THỊ BẢNG DỮ LIỆU */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col h-[500px]">
            
            {/* Table Header */}
            <div className="flex flex-wrap items-center justify-between p-5 bg-white dark:bg-[#0B0F19] border-b border-slate-100 dark:border-white/5 shrink-0 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-800/30">
                  {activeModule && <activeModule.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeModule?.title}</h3>
                  <p className="text-xs text-slate-500">Quản lý danh sách {activeModule?.title.toLowerCase()} gốc</p>
                </div>
              </div>
              
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md">
                <Plus className="w-4 h-4" /> Thêm Mới
              </button>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900/50 p-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                  <p className="text-sm font-medium">Đang tải cấu hình hệ thống...</p>
                </div>
              ) : activeModule?.data && activeModule.data.length > 0 ? (
                <div className="h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 shadow-sm">
                  <DataTable 
                    data={activeModule.data} 
                    columns={tableColumns} 
                    searchKey="name" 
                    searchPlaceholder={`Tìm kiếm trong ${activeModule.title}...`} 
                    itemsPerPage={10} 
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/20">
                  <Database className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Chưa có dữ liệu {activeModule?.title}</p>
                  <p className="text-xs mt-1">Bấm "Thêm Mới" để thiết lập bản ghi đầu tiên.</p>
                </div>
              )}
            </div>

          </motion.div>

        </motion.div>
      </AnimatePresence>

    </div>
  );
}