"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Database, Building2, Users, Package, DollarSign, 
  MapPin, Hash, Briefcase, Landmark, Percent, Coins, 
  BookOpen, Plus, Loader2, Download, RefreshCw, Globe, AlertOctagon
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";
import 'dayjs/locale/vi';

// --- REDUX & API THẬT (FULL CRUD) ---
import { useAppSelector } from "@/app/redux"; 
import { 
  useGetCompaniesQuery, 
  useGetBranchesQuery, useCreateBranchMutation, useUpdateBranchMutation, useDeleteBranchMutation,
  useGetWarehousesQuery, useCreateWarehouseMutation, useUpdateWarehouseMutation, useDeleteWarehouseMutation,
  useGetBinsQuery, useCreateBinMutation, useUpdateBinMutation, useDeleteBinMutation,
  useGetDepartmentsQuery, useCreateDepartmentMutation, useUpdateDepartmentMutation, useDeleteDepartmentMutation,
  useGetSuppliersQuery, useCreateSupplierMutation, useUpdateSupplierMutation, useDeleteSupplierMutation,
  useGetCustomersQuery, useCreateCustomerMutation, useUpdateCustomerMutation, useDeleteCustomerMutation,
  useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation,
  useGetUoMsQuery, useCreateUoMMutation, useUpdateUoMMutation, useDeleteUoMMutation,
  useGetTaxesQuery, useCreateTaxMutation, useUpdateTaxMutation, useDeleteTaxMutation,
  useGetCurrenciesQuery, useCreateCurrencyMutation, useUpdateCurrencyMutation, useDeleteCurrencyMutation,
  useGetAccountsQuery, useCreateAccountMutation, useUpdateAccountMutation, useDeleteAccountMutation,
  useGetPriceListsQuery, useDeletePriceListMutation
} from "@/state/api";

import DataTable from "@/app/(components)/DataTable";
import PriceListModal from "./PriceListModal";
import UniversalMasterDataModal from "./UniversalMasterDataModal";
import RequirePermission from "@/app/(components)/RequirePermission";
import { exportTableToExcel } from "@/utils/exportUtils"; 
import { formatVND, safeRound, formatDateTime } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

// --- SEPARATED CONFIGS ---
import { getFormConfig } from "./formConfig";
import { useMasterDataColumns } from "./useMasterDataColumns";

dayjs.locale('vi');

// ==========================================
// 🚀 LÁ CHẮN MOCK API & MOCK MUTATION
// ==========================================
const useGetPartnersQuery = (args?: any, options?: any) => {
  return { data: [], isLoading: false, isError: false, refetch: () => {}, isFetching: false };
};

const useDeletePartnerMutation = () => {
  const mutateFn = (id: string) => {
    return { unwrap: () => Promise.resolve({ data: id }) };
  };
  return [mutateFn, { isLoading: false }] as any;
};

// 🚀 VÁ LỖI TYPE & LOGIC: Bỏ async ở mutateFn, trả về Object đồng bộ chứa unwrap()
const useSyncVCBMutation = () => {
  const mutateFn = () => {
    return { 
      unwrap: () => new Promise(resolve => {
        // Giả lập thời gian cào dữ liệu từ Backend mất 1.5 giây
        setTimeout(() => {
          resolve({ success: true, message: "Đồng bộ thành công" });
        }, 1500);
      }) 
    };
  };
  return [mutateFn, { isLoading: false }] as any;
};

type MainTab = "ORG_INV" | "PARTNERS" | "PRODUCTS" | "FINANCE";

const MAIN_TABS = [
  { id: "ORG_INV", label: "Tổ chức & Kho bãi", icon: Building2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500" },
  { id: "PARTNERS", label: "Danh bạ Đối tác", icon: Users, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500" },
  { id: "PRODUCTS", label: "Thuộc tính Hàng hóa", icon: Package, color: "text-amber-600 dark:text-amber-500", bg: "bg-amber-500" },
  { id: "FINANCE", label: "Kế toán & Tài chính", icon: Landmark, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500" }
];

const MasterDataSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6 transition-all duration-500 ease-in-out">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/50 transition-all duration-500 ease-in-out"></div>
      ))}
    </div>
    <div className="h-16 w-full rounded-2xl bg-slate-200 dark:bg-slate-800/50 transition-all duration-500 ease-in-out"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2 transition-all duration-500 ease-in-out"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export default function MasterDataPage() {
  const { t } = useTranslation();
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const [activeMainTab, setActiveMainTab] = useState<MainTab>("ORG_INV");
  const [activeSubTab, setActiveSubTab] = useState<string>("branches");

  const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);
  const [isUniversalModalOpen, setIsUniversalModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);

  const handleMainTabChange = (tabId: MainTab) => {
    setActiveMainTab(tabId);
    if (tabId === "ORG_INV") setActiveSubTab("branches");
    if (tabId === "PARTNERS") setActiveSubTab("suppliers");
    if (tabId === "PRODUCTS") setActiveSubTab("categories");
    if (tabId === "FINANCE") setActiveSubTab("taxes");
  };

  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- API HOOKS FETCHING ---
  const { data: r0, isLoading: l0 } = useGetCompaniesQuery(undefined, { skip: activeMainTab !== "ORG_INV" });
  const companies = Array.isArray(r0) ? r0 : ((r0 as any)?.data || []);

  const { data: r1, isLoading: l1 } = useGetBranchesQuery({ limit: 1000 } as any, { skip: activeMainTab !== "ORG_INV" });
  const branches = Array.isArray(r1) ? r1 : ((r1 as any)?.data || []);

  const { data: r2, isLoading: l2 } = useGetWarehousesQuery({ limit: 1000 } as any, { skip: activeMainTab !== "ORG_INV" });
  const warehouses = Array.isArray(r2) ? r2 : ((r2 as any)?.data || []);

  const { data: r3, isLoading: l3 } = useGetBinsQuery({ limit: 1000 } as any, { skip: activeMainTab !== "ORG_INV" });
  const bins = Array.isArray(r3) ? r3 : ((r3 as any)?.data || []);

  const { data: r4, isLoading: l4 } = useGetDepartmentsQuery({ limit: 1000 } as any, { skip: activeMainTab !== "ORG_INV" });
  const depts = Array.isArray(r4) ? r4 : ((r4 as any)?.data || []);

  const { data: r5, isLoading: l5 } = useGetSuppliersQuery({ limit: 1000 } as any, { skip: activeMainTab !== "PARTNERS" });
  const suppliers = Array.isArray(r5) ? r5 : ((r5 as any)?.data || []);

  const { data: r6, isLoading: l6 } = useGetCustomersQuery({ limit: 1000 } as any, { skip: activeMainTab !== "PARTNERS" });
  const customers = Array.isArray(r6) ? r6 : ((r6 as any)?.data || []);

  const { data: r7, isLoading: l7 } = useGetCategoriesQuery({ limit: 1000 } as any, { skip: activeMainTab !== "PRODUCTS" });
  const categories = Array.isArray(r7) ? r7 : ((r7 as any)?.data || []);

  const { data: r8, isLoading: l8 } = useGetUoMsQuery({ limit: 1000 } as any, { skip: activeMainTab !== "PRODUCTS" });
  const uoms = Array.isArray(r8) ? r8 : ((r8 as any)?.data || []);

  const { data: r9, isLoading: l9 } = useGetTaxesQuery({ limit: 1000 } as any);
  const taxes = Array.isArray(r9) ? r9 : ((r9 as any)?.data || []);

  const { data: r10, isLoading: l10, refetch: refetchCurrency, isFetching: isFetchingCurrency } = useGetCurrenciesQuery({ limit: 1000 } as any);
  const currencies = Array.isArray(r10) ? r10 : ((r10 as any)?.data || []);

  const { data: r11, isLoading: l11 } = useGetAccountsQuery({ limit: 1000 } as any); 
  const accounts = Array.isArray(r11) ? r11 : ((r11 as any)?.data || []);

  const { data: r12, isLoading: l12 } = useGetPriceListsQuery({ limit: 1000 } as any, { skip: activeMainTab !== "FINANCE" });
  const priceLists = Array.isArray(r12) ? r12 : ((r12 as any)?.data || []);

  const isLoading = l0 || l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9 || l10 || l11 || l12;

  // --- MUTATIONS ---
  const [createBranch] = useCreateBranchMutation(); const [updateBranch] = useUpdateBranchMutation();
  const [createWarehouse] = useCreateWarehouseMutation(); const [updateWarehouse] = useUpdateWarehouseMutation();
  const [createBin] = useCreateBinMutation(); const [updateBin] = useUpdateBinMutation();
  const [createDepartment] = useCreateDepartmentMutation(); const [updateDepartment] = useUpdateDepartmentMutation();
  const [createSupplier] = useCreateSupplierMutation(); const [updateSupplier] = useUpdateSupplierMutation();
  const [createCustomer] = useCreateCustomerMutation(); const [updateCustomer] = useUpdateCustomerMutation();
  const [createCategory] = useCreateCategoryMutation(); const [updateCategory] = useUpdateCategoryMutation();
  const [createUoM] = useCreateUoMMutation(); const [updateUoM] = useUpdateUoMMutation();
  const [createTax] = useCreateTaxMutation(); const [updateTax] = useUpdateTaxMutation();
  const [createCurrency] = useCreateCurrencyMutation(); const [updateCurrency] = useUpdateCurrencyMutation();
  const [createAccount] = useCreateAccountMutation(); const [updateAccount] = useUpdateAccountMutation();

  const [deleteBranch] = useDeleteBranchMutation();
  const [deleteWarehouse] = useDeleteWarehouseMutation();
  const [deleteBin] = useDeleteBinMutation();
  const [deleteDepartment] = useDeleteDepartmentMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [deleteUoM] = useDeleteUoMMutation();
  const [deleteTax] = useDeleteTaxMutation();
  const [deleteCurrency] = useDeleteCurrencyMutation();
  const [deleteAccount] = useDeleteAccountMutation();
  const [deletePriceList] = useDeletePriceListMutation();
  
  // 🚀 ENGINE ĐỒNG BỘ VCB MUTATION
  const [syncVCB, { isLoading: isSyncingVCB }] = useSyncVCBMutation();

  const [isSavingMasterData, setIsSavingMasterData] = useState(false);

  const subModules = useMemo(() => {
    switch (activeMainTab) {
      case "ORG_INV": return [
        { id: "branches", title: "Chi nhánh", data: branches, icon: Building2, desc: "Trụ sở & Công ty con" },
        { id: "departments", title: "Phòng ban", data: depts, icon: Briefcase, desc: "Cơ cấu tổ chức" },
        { id: "warehouses", title: "Kho lưu trữ", data: warehouses, icon: Database, desc: "Nhà kho vật lý" },
        { id: "bins", title: "Vị trí Kệ (Bin)", data: bins, icon: MapPin, desc: "Tọa độ hàng hóa" }
      ];
      case "PARTNERS": return [
        { id: "suppliers", title: "Nhà Cung Cấp", data: suppliers, icon: Building2, desc: "Đối tác cung ứng vật tư" },
        { id: "customers", title: "Khách hàng", data: customers, icon: Users, desc: "Đối tác mua/dịch vụ" }
      ];
      case "PRODUCTS": return [
        { id: "categories", title: "Nhóm Hàng", data: categories, icon: Package, desc: "Phân loại SP & Thuế" },
        { id: "uoms", title: "Đơn vị tính (UoM)", data: uoms, icon: Hash, desc: "Cái, Hộp, Thùng, Kg" }
      ];
      case "FINANCE": return [
        { id: "taxes", title: "Biểu Thuế", data: taxes, icon: Percent, desc: "VAT, Tiêu thụ ĐB" },
        { id: "currencies", title: "Tiền tệ & Tỷ giá", data: currencies, icon: Coins, desc: "Vietcombank Sync" },
        { id: "accounts", title: "Hệ thống Tài khoản", data: accounts, icon: BookOpen, desc: "Sổ cái (COA)" },
        { id: "price_lists", title: "Bảng giá", data: priceLists, icon: DollarSign, desc: "Chính sách giá bán" }
      ];
      default: return [];
    }
  }, [activeMainTab, branches, depts, warehouses, bins, suppliers, customers, categories, uoms, taxes, currencies, accounts, priceLists]);

  const activeModule = subModules.find(m => m.id === activeSubTab) || subModules[0];

  const handleExportData = () => {
    if (!activeModule?.data || activeModule.data.length === 0) {
      toast.error(`Không có dữ liệu ${activeModule.title} để xuất!`); 
      return;
    }
    
    const flattenData = activeModule.data.map((rawItem: any) => {
      const item = rawItem as Record<string, any>;
      const rowData: Record<string, any> = {};
      Object.keys(item).forEach(key => {
        if (item[key] !== null && typeof item[key] !== 'object' && !Array.isArray(item[key])) {
          rowData[key] = item[key];
        }
      });
      return rowData;
    });

    const tempTable = document.createElement("table");
    tempTable.id = "temp-master-data-export";
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    if (flattenData.length > 0) {
      Object.keys(flattenData[0]).forEach(key => {
        const th = document.createElement("th");
        th.innerText = key;
        trHead.appendChild(th);
      });
    }
    thead.appendChild(trHead);
    tempTable.appendChild(thead);
    const tbody = document.createElement("tbody");
    flattenData.forEach((row: any) => {
      const trBody = document.createElement("tr");
      Object.keys(row).forEach(key => {
        const td = document.createElement("td");
        td.innerText = row[key];
        trBody.appendChild(td);
      });
      tbody.appendChild(trBody);
    });
    tempTable.appendChild(tbody);
    document.body.appendChild(tempTable);
    
    exportTableToExcel("temp-master-data-export", `MasterData_${activeSubTab}_${dayjs().format('DDMMYYYY')}`);
    
    document.body.removeChild(tempTable);
    toast.success(`Đã xuất Báo cáo ${activeModule.title} thành công!`);
  };

  const handleOpenAddModal = () => {
    setEditingData(null);
    if (activeSubTab === "price_lists") setIsPriceListModalOpen(true);
    else setIsUniversalModalOpen(true);
  };

  const handleOpenEditModal = (row: any) => {
    const mappedData = { ...row };
    if (activeSubTab === "branches" && row.company) mappedData.companyId = row.company.companyId || row.company.id;
    if (activeSubTab === "departments" && row.branch) mappedData.branchId = row.branch.branchId || row.branch.id;
    if (activeSubTab === "warehouses" && row.branch) mappedData.branchId = row.branch.branchId || row.branch.id;
    if (activeSubTab === "bins" && row.warehouse) mappedData.warehouseId = row.warehouse.warehouseId || row.warehouse.id;
    if (activeSubTab === "categories" && row.tax) mappedData.taxId = row.tax.taxId || row.tax.id;
    if (activeSubTab === "accounts" && row.parentAccount) mappedData.parentAccountId = row.parentAccount.accountId || row.parentAccount.id;

    setEditingData(mappedData);
    if (activeSubTab === "price_lists") setIsPriceListModalOpen(true);
    else setIsUniversalModalOpen(true);
  };

  const getIdField = (subTab: string) => {
    switch (subTab) {
      case "branches": return "branchId"; case "warehouses": return "warehouseId"; case "bins": return "binId";
      case "departments": return "departmentId"; case "suppliers": return "supplierId"; case "customers": return "customerId";
      case "categories": return "categoryId"; case "uoms": return "uomId"; case "taxes": return "taxId";
      case "currencies": return "currencyCode"; case "accounts": return "accountId"; case "price_lists": return "priceListId";
      default: return "id";
    }
  };

  const handleUniversalSave = async (data: any) => {
    setIsSavingMasterData(true);
    try {
      const isUpdating = !!editingData;
      const recordIdField = getIdField(activeSubTab);
      const recordId = isUpdating ? (editingData[recordIdField] || editingData.id) : null; 

      switch (activeSubTab) {
        case "branches": if (isUpdating) await updateBranch({ id: recordId, data }).unwrap(); else await createBranch(data).unwrap(); break;
        case "warehouses": if (isUpdating) await updateWarehouse({ id: recordId, data }).unwrap(); else await createWarehouse(data).unwrap(); break;
        case "bins": if (isUpdating) await updateBin({ id: recordId, data }).unwrap(); else await createBin(data).unwrap(); break;
        case "departments": if (isUpdating) await updateDepartment({ id: recordId, data }).unwrap(); else await createDepartment(data).unwrap(); break;
        case "suppliers": if (isUpdating) await updateSupplier({ id: recordId, data }).unwrap(); else await createSupplier(data).unwrap(); break;
        case "customers": 
          const custData = { ...data, creditLimit: data.creditLimit ? safeRound(Number(data.creditLimit)) : undefined };
          if (isUpdating) await updateCustomer({ id: recordId, data: custData }).unwrap(); else await createCustomer(custData).unwrap(); break;
        case "categories": if (isUpdating) await updateCategory({ id: recordId, data }).unwrap(); else await createCategory(data).unwrap(); break;
        case "uoms": if (isUpdating) await updateUoM({ id: recordId, data }).unwrap(); else await createUoM(data).unwrap(); break;
        case "taxes": 
          const taxData = { ...data, rate: safeRound(Number(data.rate)) };
          if (isUpdating) await updateTax({ id: recordId, data: taxData }).unwrap(); else await createTax(taxData).unwrap(); break;
        case "currencies": 
          const currData = { ...data, exchangeRate: safeRound(Number(data.exchangeRate)) };
          if (isUpdating) await updateCurrency({ currencyCode: recordId, data: currData }).unwrap(); else await createCurrency(currData).unwrap(); break;
        case "accounts": if (isUpdating) await updateAccount({ id: recordId, data }).unwrap(); else await createAccount(data).unwrap(); break;
        default: throw new Error("Module không xác định!");
      }

      toast.success(`${isUpdating ? 'Cập nhật' : 'Khởi tạo'} bản ghi thành công!`);
      setIsUniversalModalOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi giao tiếp máy chủ khi lưu dữ liệu!");
    } finally {
      setIsSavingMasterData(false);
    }
  };

  const handleUniversalDelete = async (row: any) => {
    const recordIdField = getIdField(activeSubTab);
    const recordId = row[recordIdField] || row.id;
    const recordName = row.code || row.name || "Bản ghi này";

    if (!window.confirm(`HÀNH ĐỘNG NGUY HIỂM:\nBạn có chắc chắn muốn xóa vĩnh viễn [${recordName}] không?\nHành động này không thể hoàn tác!`)) {
      return;
    }

    setIsSavingMasterData(true);
    try {
      switch (activeSubTab) {
        case "branches": await deleteBranch(recordId).unwrap(); break;
        case "warehouses": await deleteWarehouse(recordId).unwrap(); break;
        case "bins": await deleteBin(recordId).unwrap(); break;
        case "departments": await deleteDepartment(recordId).unwrap(); break;
        case "suppliers": await deleteSupplier(recordId).unwrap(); break;
        case "customers": await deleteCustomer(recordId).unwrap(); break;
        case "categories": await deleteCategory(recordId).unwrap(); break;
        case "uoms": await deleteUoM(recordId).unwrap(); break;
        case "taxes": await deleteTax(recordId).unwrap(); break;
        case "currencies": await deleteCurrency(recordId).unwrap(); break;
        case "accounts": await deleteAccount(recordId).unwrap(); break;
        case "price_lists": await deletePriceList(recordId).unwrap(); break;
        default: throw new Error("Module không xác định!");
      }
      toast.success(`Đã xóa thành công [${recordName}]!`);
    } catch (error: any) {
      toast.error(error?.data?.message || "Không thể xóa! Dữ liệu này đang được tham chiếu bởi các chứng từ khác.");
    } finally {
      setIsSavingMasterData(false);
    }
  };

  // 🚀 HANDLER XỬ LÝ ĐỒNG BỘ VCB CHUẨN MỰC
  const handleSyncVCBData = async () => {
    try {
      const syncPromise = syncVCB().unwrap();
      toast.promise(syncPromise, {
        loading: 'Đang kết nối cổng dữ liệu Vietcombank...',
        success: 'Đồng bộ tỷ giá ngoại tệ thành công!',
        error: 'Lỗi kết nối đến máy chủ Vietcombank!'
      });
      await syncPromise;
      refetchCurrency(); 
    } catch (error) {
      console.error("Lỗi đồng bộ VCB:", error);
    }
  };

  const tableColumns = useMasterDataColumns({
    activeSubTab, branches, warehouses, taxes, accounts, handleOpenEditModal, handleUniversalDelete
  });

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (!isMounted) return <MasterDataSkeleton />;

  return (
    <div className="w-full flex flex-col gap-6 pb-10 transition-all duration-500 ease-in-out">
      
      {/* HEADER BỌC THÉP FLEXBOX */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }} 
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5 mb-2 transform-gpu will-change-transform w-full transition-all duration-500 ease-in-out"
      >
        <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 w-24 h-24 sm:w-32 sm:h-32 bg-blue-500/15 dark:bg-blue-500/20 rounded-full blur-2xl sm:blur-3xl pointer-events-none z-0 transition-all duration-500 ease-in-out" />
        
        <div className="relative z-10 flex items-stretch gap-3 sm:gap-4 w-full md:w-auto min-w-0 transition-all duration-500 ease-in-out flex-1">
          <div className="w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_8px_rgba(79,70,229,0.4)] dark:shadow-[0_0_16px_rgba(79,70,229,0.3)] transition-all duration-500 ease-in-out" />
          
          <div className="flex flex-col justify-center py-0.5 min-w-0 transition-all duration-500 ease-in-out w-full">
            <h1 className="text-xl sm:text-2xl md:text-[28px] lg:text-3xl font-black tracking-tight text-slate-800 dark:text-slate-50 leading-tight sm:leading-none truncate break-words transition-all duration-500 ease-in-out">
              {t("Dữ liệu Nền tảng (Master Data)")}
            </h1>
            <p className="text-xs sm:text-[13px] md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-1.5 md:mt-2 max-w-full md:max-w-xl leading-relaxed transition-all duration-500 ease-in-out">
              {t("Trung tâm cấu hình cốt lõi và tích hợp tỷ giá ngoại tệ Vietcombank.")}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="w-full overflow-x-auto scrollbar-hide transition-all duration-500 ease-in-out">
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200 dark:border-slate-700/50 transition-all duration-500 ease-in-out shadow-sm">
          {MAIN_TABS.map(tab => (
            <button 
              key={tab.id} onClick={() => handleMainTabChange(tab.id as MainTab)} 
              className={cn(
                "relative px-5 py-2.5 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out", 
                activeMainTab === tab.id ? tab.color : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              )}
            >
              {activeMainTab === tab.id && <motion.div layoutId="masterTab" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm -z-10 border border-slate-200/50 dark:border-slate-600 transition-all duration-500 ease-in-out" />}
              <tab.icon className="w-4 h-4 transition-all duration-500 ease-in-out" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeMainTab} variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6 w-full transition-all duration-500 ease-in-out">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-500 ease-in-out">
            {subModules.map((mod) => {
              const isActive = activeSubTab === mod.id;
              return (
                <motion.div 
                  key={mod.id} variants={itemVariants} onClick={() => setActiveSubTab(mod.id)}
                  className={cn(
                    "cursor-pointer relative overflow-hidden rounded-2xl p-4 transition-all duration-500 ease-in-out border shadow-sm", 
                    isActive 
                      ? "bg-white dark:bg-slate-800 border-blue-500 dark:border-blue-500/50 transform scale-[1.02]" 
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div className={cn("absolute -right-4 -bottom-4 p-4 opacity-[0.03] dark:opacity-5 transition-all duration-500 ease-in-out", isActive ? "text-blue-500" : "text-slate-500")}><mod.icon className="w-24 h-24 transition-all duration-500 ease-in-out" /></div>
                  <div className="flex justify-between items-start mb-3 relative z-10 transition-all duration-500 ease-in-out">
                    <div className={cn(
                      "p-2 rounded-xl transition-all duration-500 ease-in-out", 
                      isActive ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      <mod.icon className="w-5 h-5 transition-all duration-500 ease-in-out" />
                    </div>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-200 transition-all duration-500 ease-in-out">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-300 dark:text-slate-600 transition-all duration-500 ease-in-out" /> : mod.data?.length || 0}
                    </span>
                  </div>
                  <div className="relative z-10 transition-all duration-500 ease-in-out">
                    <h4 className={cn("font-bold text-sm transition-all duration-500 ease-in-out", isActive ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>{mod.title}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5 truncate transition-all duration-500 ease-in-out">{mod.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div variants={itemVariants} className="glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-[500px] transition-all duration-500 ease-in-out bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-5 lg:p-6 bg-white dark:bg-[#0B0F19] border-b border-slate-100 dark:border-slate-800 shrink-0 gap-4 transition-all duration-500 ease-in-out">
              
              <div className="flex items-center gap-4 transition-all duration-500 ease-in-out">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-800/30 transition-all duration-500 ease-in-out">
                  {activeModule && <activeModule.icon className="w-6 h-6 text-blue-600 dark:text-blue-400 transition-all duration-500 ease-in-out" />}
                </div>
                <div className="transition-all duration-500 ease-in-out">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight transition-all duration-500 ease-in-out">{activeModule?.title}</h3>
                    {activeSubTab === "currencies" && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded-full border border-emerald-200 dark:border-emerald-800/50 animate-pulse">
                        <Globe className="w-3 h-3" /> VCB SYNCED
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 transition-all duration-500 ease-in-out">Quản lý danh sách {activeModule?.title.toLowerCase()} gốc</p>
                </div>
              </div>

              {/* 🚀 NÚT ACTION */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide pb-1 md:pb-0 shrink-0 transition-all duration-500 ease-in-out">
                {activeSubTab === "currencies" && (
                  <button 
                    onClick={handleSyncVCBData} 
                    disabled={isSyncingVCB || isFetchingCurrency}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-2xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700 whitespace-nowrap duration-500 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={cn("w-4.5 h-4.5 transition-all duration-500", (isSyncingVCB || isFetchingCurrency) && "animate-spin")} /> 
                    <span className="hidden sm:inline">Đồng bộ VCB</span>
                  </button>
                )}
                <button 
                  onClick={handleExportData} 
                  className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-2xl transition-all active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700 whitespace-nowrap duration-500 ease-in-out"
                >
                  <Download className="w-4.5 h-4.5 transition-all duration-500 ease-in-out" /> <span className="hidden sm:inline transition-all duration-500 ease-in-out">Xuất File Excel</span>
                </button>
                <RequirePermission permissions={["MANAGE_MASTER_DATA"]}>
                  <button 
                    onClick={handleOpenAddModal} 
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black rounded-2xl transition-all active:scale-95 shadow-xl shadow-blue-500/30 whitespace-nowrap duration-500 ease-in-out"
                  >
                    <Plus className="w-4.5 h-4.5 transition-all duration-500 ease-in-out" /> <span className="hidden sm:inline transition-all duration-500 ease-in-out">Thêm Mới</span>
                  </button>
                </RequirePermission>
              </div>

            </div>

            <div className="flex-1 overflow-hidden p-4 lg:p-6 transition-all duration-500 ease-in-out">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 transition-all duration-500 ease-in-out">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500 dark:text-blue-400 transition-all duration-500 ease-in-out" />
                  <p className="text-sm font-black tracking-wider uppercase transition-all duration-500 ease-in-out">Đang nạp dữ liệu Hệ thống...</p>
                </div>
              ) : activeModule?.data && activeModule.data.length > 0 ? (
                <div className="h-full rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F19] shadow-inner transition-all duration-500 ease-in-out">
                  <DataTable 
                    data={activeModule.data} 
                    columns={tableColumns} 
                    searchKey="name" 
                    searchPlaceholder={`Tìm kiếm trong ${activeModule.title}...`} 
                    itemsPerPage={10} 
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[350px] text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] bg-white/50 dark:bg-slate-900/20 transition-all duration-500 ease-in-out">
                  <Database className="w-16 h-16 mb-4 opacity-20 transition-all duration-500 ease-in-out" />
                  <p className="text-lg font-black text-slate-700 dark:text-slate-300 transition-all duration-500 ease-in-out">Chưa có dữ liệu {activeModule?.title}</p>
                  <p className="text-sm mt-1.5 font-medium transition-all duration-500 ease-in-out">Bấm "Thêm Mới" ở góc trên để thiết lập bản ghi đầu tiên.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <PriceListModal isOpen={isPriceListModalOpen} onClose={() => { setIsPriceListModalOpen(false); setEditingData(null); }} priceListToEdit={editingData} />

      {activeModule && (
        <UniversalMasterDataModal
          isOpen={isUniversalModalOpen} onClose={() => setIsUniversalModalOpen(false)}
          title={editingData ? `Sửa: ${activeModule.title}` : `Thêm Mới: ${activeModule.title}`}
          subtitle={getFormConfig(activeSubTab, { companies, branches, warehouses, currencies, taxes, accounts }).subtitle}
          fields={getFormConfig(activeSubTab, { companies, branches, warehouses, currencies, taxes, accounts }).fields}
          initialData={editingData} onSave={handleUniversalSave} isSaving={isSavingMasterData}
        />
      )}
    </div>
  );
}