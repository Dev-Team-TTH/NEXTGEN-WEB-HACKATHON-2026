"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Database, Building2, Users, Package, DollarSign, 
  MapPin, Hash, Briefcase, Landmark, Percent, Coins, 
  BookOpen, Plus, Loader2, Download
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API THẬT (FULL CRUD) ---
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

import Header from "@/app/(components)/Header";
import DataTable from "@/app/(components)/DataTable";
import PriceListModal from "./PriceListModal";
import UniversalMasterDataModal from "./UniversalMasterDataModal";
// 🚀 TÁI SỬ DỤNG COMPONENTS VÀ UTILS CÓ SẴN
import RequirePermission from "@/app/(components)/RequirePermission";
import { exportToCSV } from "@/utils/exportUtils";
import { formatVND, safeRound } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

// --- SEPARATED CONFIGS ---
import { getFormConfig } from "./formConfig";
import { useMasterDataColumns } from "./useMasterDataColumns";

type MainTab = "ORG_INV" | "PARTNERS" | "PRODUCTS" | "FINANCE";

const MAIN_TABS = [
  { id: "ORG_INV", label: "Tổ chức & Kho bãi", icon: Building2, color: "text-blue-500", bg: "bg-blue-500" },
  { id: "PARTNERS", label: "Danh bạ Đối tác", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500" },
  { id: "PRODUCTS", label: "Thuộc tính Hàng hóa", icon: Package, color: "text-amber-500", bg: "bg-amber-500" },
  { id: "FINANCE", label: "Kế toán & Tài chính", icon: Landmark, color: "text-purple-500", bg: "bg-purple-500" }
];

export default function MasterDataPage() {
  const { t } = useTranslation();

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

  const { data: r10, isLoading: l10 } = useGetCurrenciesQuery({ limit: 1000 } as any);
  const currencies = Array.isArray(r10) ? r10 : ((r10 as any)?.data || []);

  const { data: r11, isLoading: l11 } = useGetAccountsQuery({ limit: 1000 } as any); 
  const accounts = Array.isArray(r11) ? r11 : ((r11 as any)?.data || []);

  const { data: r12, isLoading: l12 } = useGetPriceListsQuery({ limit: 1000 } as any, { skip: activeMainTab !== "FINANCE" });
  const priceLists = Array.isArray(r12) ? r12 : ((r12 as any)?.data || []);

  const isLoading = l0 || l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9 || l10 || l11 || l12;

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
        { id: "currencies", title: "Tiền tệ & Tỷ giá", data: currencies, icon: Coins, desc: "VND, USD, EUR" },
        { id: "accounts", title: "Hệ thống Tài khoản", data: accounts, icon: BookOpen, desc: "Sổ cái (COA)" },
        { id: "price_lists", title: "Bảng giá", data: priceLists, icon: DollarSign, desc: "Chính sách giá bán" }
      ];
      default: return [];
    }
  }, [activeMainTab, branches, depts, warehouses, bins, suppliers, customers, categories, uoms, taxes, currencies, accounts, priceLists]);

  const activeModule = subModules.find(m => m.id === activeSubTab) || subModules[0];

  const handleExportData = () => {
    if (!activeModule?.data || activeModule.data.length === 0) {
      toast.error(`Không có dữ liệu ${activeModule.title} để xuất!`); return;
    }
    const flattenData = activeModule.data.map((rawItem: any) => {
      const item = rawItem as Record<string, any>;
      const rowData: Record<string, any> = {};
      Object.keys(item).forEach(key => {
        if (item[key] !== null && typeof item[key] !== 'object') {
          rowData[key] = item[key];
        }
      });
      return rowData;
    });
    exportToCSV(flattenData, `Danh_Sach_${activeSubTab}`);
    toast.success(`Đã xuất file ${activeModule.title} thành công!`);
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
          // 🚀 ÁP DỤNG safeRound CHO CÁC CHỈ SỐ TÀI CHÍNH
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

  const tableColumns = useMasterDataColumns({
    activeSubTab, branches, warehouses, taxes, accounts, handleOpenEditModal, handleUniversalDelete
  });

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      <Header title={t("Dữ liệu Nền tảng")} subtitle={t("Trung tâm cấu hình cốt lõi của hệ thống ERP.")} />

      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200 dark:border-white/5">
          {MAIN_TABS.map(tab => (
            <button 
              key={tab.id} onClick={() => handleMainTabChange(tab.id as MainTab)} 
              className={cn("relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap", activeMainTab === tab.id ? tab.color : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
            >
              {activeMainTab === tab.id && <motion.div layoutId="masterTab" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm -z-10" />}
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeMainTab} variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6 w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {subModules.map((mod) => {
              const isActive = activeSubTab === mod.id;
              return (
                <motion.div 
                  key={mod.id} variants={itemVariants} onClick={() => setActiveSubTab(mod.id)}
                  className={cn("cursor-pointer relative overflow-hidden rounded-2xl p-4 transition-all duration-200 border", isActive ? "bg-white dark:bg-slate-800 border-blue-500 shadow-md transform scale-[1.02]" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10")}
                >
                  <div className={cn("absolute -right-4 -bottom-4 p-4 opacity-[0.03] dark:opacity-5", isActive ? "text-blue-500" : "text-slate-500")}><mod.icon className="w-24 h-24" /></div>
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className={cn("p-2 rounded-xl", isActive ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}><mod.icon className="w-5 h-5" /></div>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-200">{isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-300" /> : mod.data?.length || 0}</span>
                  </div>
                  <div className="relative z-10">
                    <h4 className={cn("font-bold text-sm", isActive ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>{mod.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{mod.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div variants={itemVariants} className="glass-panel rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col h-[500px]">
            <div className="flex flex-wrap items-center justify-between p-5 bg-white dark:bg-[#0B0F19] border-b border-slate-100 dark:border-white/5 shrink-0 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-800/30">{activeModule && <activeModule.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeModule?.title}</h3>
                  <p className="text-xs text-slate-500">Quản lý danh sách {activeModule?.title.toLowerCase()} gốc</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExportData} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700"><Download className="w-4 h-4" /> Xuất File</button>
                {/* 🚀 BẢO MẬT NÚT TẠO MỚI */}
                <RequirePermission permissions={["MANAGE_MASTER_DATA"]}>
                  <button onClick={handleOpenAddModal} className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md"><Plus className="w-4 h-4" /> Thêm Mới</button>
                </RequirePermission>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900/50 p-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400"><Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" /><p className="text-sm font-medium">Đang tải cấu hình hệ thống...</p></div>
              ) : activeModule?.data && activeModule.data.length > 0 ? (
                <div className="h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 shadow-sm"><DataTable data={activeModule.data} columns={tableColumns} searchKey="name" searchPlaceholder={`Tìm kiếm trong ${activeModule.title}...`} itemsPerPage={10} /></div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/20"><Database className="w-12 h-12 mb-3 opacity-20" /><p className="text-sm font-bold text-slate-700 dark:text-slate-300">Chưa có dữ liệu {activeModule?.title}</p><p className="text-xs mt-1">Bấm "Thêm Mới" để thiết lập bản ghi đầu tiên.</p></div>
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