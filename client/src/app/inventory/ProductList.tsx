"use client";

import React, { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  Package, Search, Plus, Edit, Trash2, 
  AlertTriangle, TrendingUp, Box, Settings, 
  Tag, ShieldAlert, CheckCircle2, Loader2, Download, UploadCloud, FileText, X, QrCode, Filter, AlertOctagon
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppDispatch, useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG CONTEXT CHI NHÁNH
import { api } from "@/state/api";
import { 
  useGetProductsQuery,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useGetUoMsQuery,
  Product
} from "@/state/api";

// --- COMPONENTS ---
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import CreateProductModal from "./CreateProductModal";
import UpdateProductModal from "./UpdateProductModal";
import AdvancedProductOpsModal from "./AdvancedProductOpsModal";
import BarcodePrintModal from "./BarcodePrintModal"; 
import RequirePermission from "@/app/(components)/RequirePermission"; 
import Header from "@/app/(components)/Header";

// --- UTILS ---
import { formatVND } from "@/utils/formatters";
import { exportToCSV } from "@/utils/exportUtils";
import { cn } from "@/utils/helpers";

// ==========================================
// 1. SKELETON LOADING
// ==========================================
const ProductListSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-4 transition-colors duration-500">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-3xl bg-slate-200 dark:bg-slate-800/50 transition-colors duration-500"></div>)}
    </div>
    <div className="h-[400px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl transition-colors duration-500"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: DANH MỤC HÀNG HÓA
// ==========================================
export default function ProductList() {
  const dispatch = useAppDispatch();
  
  // 🚀 BỐI CẢNH REDUX (CONTEXT ISOLATION)
  const { activeBranchId } = useAppSelector((state: any) => state.global);
  
  // --- STATE LỌC & SERVER-SIDE PAGINATION ---
  const [searchQuery, setSearchQuery] = useState("");
  
  // 🚀 BỘ LỌC NÂNG CAO
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // --- STATE MODALS ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); 
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedProductForAdvOps, setSelectedProductForAdvOps] = useState<Product | null>(null);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<string | null>(null);

  // --- STATE DÀNH RIÊNG CHO IMPORT ---
  const [importData, setImportData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 👉 FETCH DATA TỪ API (Server-Side Mode) - 🚀 BẢO VỆ ĐA CHI NHÁNH
  const { data: response, isLoading: loadingProducts, isError } = useGetProductsQuery({
    branchId: activeBranchId, // 🚀 BƠM NGỮ CẢNH VÀO QUERY
    search: searchQuery,
    categoryId: filterCategory,
    status: filterStatus === "ALL" ? undefined : filterStatus,
    page: page,
    limit: itemsPerPage
  } as any, { skip: !activeBranchId }); // 🚀 BỎ QUA NẾU CHƯA CÓ CHI NHÁNH
  
  const { data: categories = [], isLoading: loadingCats } = useGetCategoriesQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );
  
  const { data: uoms = [], isLoading: loadingUoms } = useGetUoMsQuery();
  
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const isLoading = loadingProducts || loadingCats || loadingUoms;

  // Bóc tách Data và Meta (KPIs)
  const products = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, limit: 10, totalPages: 1, kpis: { totalItems: 0, totalValue: 0, lowStockCount: 0, outOfStockCount: 0 } };
  const kpis = meta.kpis || { totalItems: 0, totalValue: 0, lowStockCount: 0, outOfStockCount: 0 };

  const isFiltering = filterCategory !== "" || filterStatus !== "ALL";

  // --- HANDLERS CƠ BẢN ---
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn chắc chắn muốn xóa sản phẩm "${name}"?\nSản phẩm đã phát sinh giao dịch sẽ không thể xóa cứng.`)) {
      try {
        await deleteProduct(id).unwrap();
        toast.success(`Đã xóa sản phẩm ${name}!`);
        if (products.length === 1 && page > 1) setPage(page - 1);
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể xóa do sản phẩm đang tồn tại trong kho hoặc có chứng từ liên kết!");
      }
    }
  };

  const handleExportData = () => {
    if (products.length === 0) {
      toast.error("Không có dữ liệu sản phẩm để xuất!");
      return;
    }
    const exportData = products.map((p: any) => ({
      "Mã SKU": p.productCode,
      "Tên sản phẩm": p.name,
      "Danh mục": categories.find((c: any) => c.categoryId === p.categoryId)?.name || "N/A",
      "Đơn vị tính": uoms.find((u: any) => u.uomId === p.uomId)?.name || "N/A",
      "Giá nhập (VND)": p.purchasePrice,
      "Giá bán (VND)": p.price,
      "Tồn kho tổng": p.totalStock || 0,
      "Trạng thái": p.status === "ACTIVE" ? "Đang kinh doanh" : "Ngừng bán",
      "Quản lý Lô": p.hasBatches ? "Có" : "Không"
    }));
    exportToCSV(exportData, `Danh_Muc_Trang_${page}`);
    toast.success("Xuất Danh mục Sản phẩm thành công!");
  };

  // --- LOGIC: IMPORT HÀNG LOẠT (BULK UPLOAD) ---
  const handleDownloadTemplate = () => {
    const templateData = [{
      productCode: "SKU001",
      name: "Sản phẩm mẫu 1",
      price: 150000,
      purchasePrice: 100000,
      categoryId: categories[0]?.categoryId || "ID_Danh_Muc",
      uomId: uoms[0]?.uomId || "ID_Don_Vi_Tinh"
    }];
    exportToCSV(templateData, "Template_Import_SanPham");
    toast.success("Đã tải xuống file mẫu (Vui lòng lưu lại dưới dạng .CSV để upload)");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        if (lines.length < 2) throw new Error("File trống hoặc sai định dạng");
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/['"]+/g, ''));
        const parsedData = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim().replace(/['"]+/g, ''));
          const obj: any = {};
          headers.forEach((h, index) => { obj[h] = values[index]; });
          parsedData.push(obj);
        }
        
        setImportData(parsedData);
        toast.success(`Đọc thành công ${parsedData.length} dòng dữ liệu`);
      } catch (err) {
        toast.error("Lỗi đọc file. Vui lòng đảm bảo file định dạng CSV.");
      }
    };
    reader.readAsText(file);
  };

  const submitImport = async () => {
    if (importData.length === 0) return toast.error("Chưa có dữ liệu để import");
    setIsImporting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/products/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        // 🚀 Bơm branchId vào Payload Import
        body: JSON.stringify(importData.map(item => ({ ...item, branchId: activeBranchId })))
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      
      toast.success(result.message);
      setIsImportModalOpen(false);
      setImportData([]);
      dispatch(api.util.invalidateTags(["Products", "Dashboard"])); 
    } catch (error: any) {
      toast.error(error.message || "Lỗi import dữ liệu");
    } finally {
      setIsImporting(false);
    }
  };

  // 🚀 TỐI ƯU HIỆU NĂNG: GÓI COLUMNS VÀO useMemo
  const columns: ColumnDef<Product>[] = useMemo(() => [
    {
      header: "Mã / Tên Sản phẩm",
      accessorKey: "name",
      sortable: false, 
      cell: (row) => (
        <div className="flex items-center gap-3 transition-colors duration-500">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm transition-colors duration-500">
            {row.imageUrl ? (
              <img src={row.imageUrl} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="flex flex-col max-w-[200px] sm:max-w-[250px] transition-colors duration-500">
            <span className="font-bold text-slate-900 dark:text-white truncate transition-colors duration-500" title={row.name}>{row.name}</span>
            <div className="flex items-center gap-2 mt-0.5 transition-colors duration-500">
              <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-500/20 transition-colors duration-500">
                {row.productCode}
              </span>
              {row.hasBatches && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-1 rounded transition-colors duration-500">LÔ/DATE</span>}
              {row.hasVariants && <span className="text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 px-1 rounded transition-colors duration-500">BIẾN THỂ</span>}
            </div>
          </div>
        </div>
      )
    },
    {
      header: "Phân loại",
      accessorKey: "categoryId",
      cell: (row) => {
        const catName = categories.find((c: any) => c.categoryId === row.categoryId)?.name || "N/A";
        const uomName = uoms.find((u: any) => u.uomId === row.uomId)?.name || "ĐV"; 
        return (
          <div className="flex flex-col gap-1 text-xs transition-colors duration-500">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors duration-500">
              <Tag className="w-3.5 h-3.5 text-slate-400"/> {catName}
            </span>
            <span className="text-[10px] text-slate-500 font-medium transition-colors duration-500">Đơn vị gốc: <b className="uppercase">{uomName}</b></span>
          </div>
        );
      }
    },
    {
      header: "Chính sách Giá",
      accessorKey: "price",
      cell: (row) => (
        <div className="flex flex-col text-xs transition-colors duration-500">
          <div className="flex justify-between items-center w-32 transition-colors duration-500">
            <span className="text-slate-500">Giá Nhập:</span>
            <span className="font-medium text-orange-600 dark:text-orange-400 transition-colors duration-500">{formatVND(row.purchasePrice)}</span>
          </div>
          <div className="flex justify-between items-center w-32 mt-0.5 transition-colors duration-500">
            <span className="text-slate-500">Giá Bán:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 transition-colors duration-500">{formatVND(row.price)}</span>
          </div>
        </div>
      )
    },
    {
      header: "Tồn kho thực tế",
      accessorKey: "totalStock",
      cell: (row) => {
        const stock = row.totalStock || 0;
        const reorder = row.reorderPoint || 0;
        const uomName = uoms.find((u: any) => u.uomId === row.uomId)?.name || "ĐV"; 
        
        let statusColor = "bg-emerald-500";
        let textColor = "text-emerald-600 dark:text-emerald-400";
        let bgLight = "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20";
        let isLowStock = false;
        
        if (stock <= 0) {
          statusColor = "bg-rose-500"; textColor = "text-rose-600 dark:text-rose-400"; bgLight = "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20";
        } else if (reorder > 0 && stock <= reorder) {
          statusColor = "bg-amber-500"; textColor = "text-amber-600 dark:text-amber-400"; bgLight = "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20";
          isLowStock = true;
        }

        const maxBar = (reorder > 0 ? reorder * 3 : 100);
        const percent = Math.min((stock / maxBar) * 100, 100);

        return (
          <div className="flex flex-col w-32 sm:w-40 transition-colors duration-500">
            <div className="flex justify-between items-end mb-1 transition-colors duration-500">
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-black border transition-colors duration-500", bgLight, textColor)}>
                {stock} <span className="font-normal opacity-80 uppercase">{uomName}</span> 
              </span>
              <span className="text-[10px] font-bold text-slate-400 transition-colors duration-500" title="Điểm tái đặt hàng (Reorder Point)">Min: {reorder}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner transition-colors duration-500">
              <motion.div 
                initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1 }}
                className={cn("h-full rounded-full transition-colors duration-500", statusColor, isLowStock && 'animate-pulse')}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: "Thao tác",
      accessorKey: "productId",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5 transition-colors duration-500">
          <button 
            onClick={() => setSelectedProductForBarcode(row.productId)} 
            title="In Tem Nhãn Mã vạch" 
            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/30 rounded-xl transition-all duration-500 shadow-sm group"
          >
            <QrCode className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>

          <RequirePermission permissions={["MANAGE_PRODUCTS"]}>
            <button 
              onClick={() => setSelectedProductForAdvOps(row)} 
              title="Cấu hình Lô & Quy đổi UoM" 
              className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/30 rounded-xl transition-all duration-500 shadow-sm group"
            >
              <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </RequirePermission>
          
          <RequirePermission permissions={["MANAGE_PRODUCTS"]}>
            <button 
              onClick={() => setEditingProduct(row)} 
              title="Chỉnh sửa Thông tin" 
              className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/30 rounded-xl transition-colors duration-500"
            >
              <Edit className="w-4 h-4" />
            </button>
          </RequirePermission>
          
          <RequirePermission permissions={["MANAGE_PRODUCTS"]}>
            <button 
              onClick={() => handleDelete(row.productId, row.name)} disabled={isDeleting}
              title="Xóa sản phẩm" 
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-colors duration-500 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </RequirePermission>
        </div>
      )
    }
  ], [categories, uoms, isDeleting]);

  // 🚀 TẠO BỘ LỌC NÂNG CAO ĐỂ BƠM VÀO DATA TABLE (ĐƯỢC GÓI BẰNG useMemo ĐỂ TRÁNH RE-RENDER RÁC)
  const productFiltersNode = useMemo(() => (
    <div className="flex flex-wrap items-center gap-4 w-full transition-colors duration-500">
      <div className="w-full sm:w-64">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block transition-colors duration-500">Lọc theo Danh mục</label>
        <div className="relative group">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <select 
            value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-500 shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white"
          >
            <option value="">Tất cả Danh mục</option>
            {categories.map((c: any) => <option key={c.categoryId || c.id} value={c.categoryId || c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      
      <div className="w-full sm:w-64">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block transition-colors duration-500">Trạng thái Kinh doanh</label>
        <div className="relative group">
          <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <select 
            value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-500 shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white"
          >
            <option value="ALL">Tất cả Trạng thái</option>
            <option value="ACTIVE">Đang kinh doanh</option>
            <option value="INACTIVE">Ngừng bán</option>
          </select>
        </div>
      </div>
    </div>
  ), [filterCategory, filterStatus, categories]);

  // --- ANIMATION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // 🚀 LÁ CHẮN UI: KHÔNG CÓ CHI NHÁNH
  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-colors duration-500">
        <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Chưa chọn Chi nhánh</h2>
        <p className="text-slate-500 transition-colors duration-500">Vui lòng chọn Chi nhánh hoạt động ở góc trên màn hình để tải Danh mục Sản phẩm.</p>
      </div>
    );
  }

  // 🚀 LÁ CHẮN UI: LỖI SERVER
  if (isError) return (
    <div className="w-full py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-rose-200 dark:border-rose-900/50 transition-colors duration-500">
      <ShieldAlert className="w-12 h-12 text-rose-500 mb-3 animate-pulse" />
      <h3 className="text-lg font-bold text-slate-800 dark:text-white transition-colors duration-500">Lỗi nạp dữ liệu hàng hóa</h3>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6 relative transition-colors duration-500">
      
      {/* KHU VỰC ĐIỀU KHIỂN TRÊN CÙNG */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors duration-500">
        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 transition-colors duration-500">
          <Box className="w-6 h-6 text-indigo-500" /> Danh mục Sản phẩm (Master)
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 scrollbar-hide transition-colors duration-500">
           <button 
            onClick={handleExportData}
            className="flex-1 sm:flex-none px-4 py-2.5 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all duration-500 active:scale-95 whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Xuất File
          </button>
          
          <RequirePermission permissions={["MANAGE_PRODUCTS"]}>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-sm font-bold rounded-xl border border-emerald-200 dark:border-emerald-500/30 transition-all duration-500 active:scale-95 whitespace-nowrap shadow-sm"
            >
              <UploadCloud className="w-4 h-4" /> Import Excel
            </button>
          </RequirePermission>

          <RequirePermission permissions={["MANAGE_PRODUCTS"]}>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-500 active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Thêm SKU Mới</span>
            </button>
          </RequirePermission>
        </div>
      </div>

      {isLoading && products.length === 0 ? <ProductListSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-5 w-full">
          
          {/* KPI CARDS (BỨC TRANH TOÀN CẢNH) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group transition-colors duration-500">
              <div className="absolute right-0 top-0 p-3 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><Package className="w-16 h-16 text-indigo-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10 flex items-center transition-colors duration-500">
                Tổng Danh Mục (SKUs)
                {isFiltering && <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors duration-500">LỌC</span>}
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white relative z-10 transition-colors duration-500">{kpis.totalItems}</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-colors duration-500">
              <div className="absolute right-0 top-0 p-3 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><TrendingUp className="w-16 h-16 text-emerald-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10 flex items-center transition-colors duration-500">
                Tổng Giá trị Tồn
                {isFiltering && <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors duration-500">LỌC</span>}
              </p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate relative z-10 transition-colors duration-500">{formatVND(kpis.totalValue)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className={cn("glass p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-colors duration-500", kpis.lowStockCount > 0 ? "border-amber-300 dark:border-amber-500/50" : "border-slate-200 dark:border-white/10")}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10 transition-colors duration-500">Sắp cạn kho (Low Stock)</p>
              <div className="flex items-center gap-3 relative z-10 transition-colors duration-500">
                <h3 className={cn("text-2xl font-black transition-colors duration-500", kpis.lowStockCount > 0 ? "text-amber-500" : "text-slate-400")}>{kpis.lowStockCount}</h3>
                {kpis.lowStockCount > 0 && <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className={cn("glass p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-colors duration-500", kpis.outOfStockCount > 0 ? "border-rose-300 dark:border-rose-500/50" : "border-slate-200 dark:border-white/10")}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10 transition-colors duration-500">Cháy Hàng (Out of Stock)</p>
              <div className="flex items-center gap-3 relative z-10 transition-colors duration-500">
                <h3 className={cn("text-2xl font-black transition-colors duration-500", kpis.outOfStockCount > 0 ? "text-rose-500" : "text-slate-400")}>{kpis.outOfStockCount}</h3>
                {kpis.outOfStockCount > 0 && <ShieldAlert className="w-5 h-5 text-rose-500" />}
              </div>
            </motion.div>
          </div>

          {/* BẢNG DỮ LIỆU ĐỘNG - SERVER SIDE PAGINATION (BƠM BỘ LỌC VÀO) */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10 transition-colors duration-500">
            <DataTable 
              data={products} 
              columns={columns} 
              searchKey="name" 
              searchPlaceholder="Tìm tên, mã vạch SKU..." 
              isLoading={isLoading}
              
              // 🚀 BƠM BỘ LỌC NÂNG CAO VÀO DATA TABLE
              advancedFilterNode={productFiltersNode}

              // TRUYỀN PROPS SERVER SIDE
              isServerSide={true}
              serverPage={meta.page}
              serverTotalPages={meta.totalPages}
              serverTotalItems={meta.total}
              itemsPerPage={itemsPerPage}
              onPageChange={(newPage) => setPage(newPage)}
              onSearchChange={(text) => setSearchQuery(text)}
            />
          </motion.div>

        </motion.div>
      )}

      {/* KHU VỰC TÍCH HỢP MODALS */}
      <CreateProductModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <UpdateProductModal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} product={editingProduct} /> 
      <AdvancedProductOpsModal isOpen={!!selectedProductForAdvOps} onClose={() => setSelectedProductForAdvOps(null)} product={selectedProductForAdvOps} />
      <BarcodePrintModal isOpen={!!selectedProductForBarcode} onClose={() => setSelectedProductForBarcode(null)} defaultProductId={selectedProductForBarcode || ""} />

      {/* MODAL IMPORT HÀNG LOẠT */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-colors duration-500"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative glass-panel w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col transition-colors duration-500"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 transition-colors duration-500">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 transition-colors duration-500"><UploadCloud className="w-5 h-5 text-indigo-500"/> Import Hàng Loạt</h3>
                  <p className="text-xs text-slate-500 mt-1 transition-colors duration-500">Nhập hàng nghìn mã sản phẩm chỉ bằng 1 file dữ liệu</p>
                </div>
                <button onClick={() => setIsImportModalOpen(false)} className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors duration-500 shadow-sm"><X className="w-4 h-4"/></button>
              </div>
              
              <div className="p-6 flex flex-col gap-6 transition-colors duration-500">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/30 transition-colors duration-500">
                  <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-2 transition-colors duration-500">Bước 1: Tải File Mẫu</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 transition-colors duration-500">Vui lòng sử dụng cấu trúc file được cung cấp để đảm bảo tính toàn vẹn của Dữ liệu gốc (Master Data).</p>
                  <button onClick={handleDownloadTemplate} className="text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg transition-colors duration-500 flex items-center gap-2 shadow-sm"><FileText className="w-4 h-4"/> Tải xuống Template (CSV)</button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-500">Bước 2: Tải lên dữ liệu (.csv)</h4>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-500 group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors duration-500 mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors duration-500"><span className="font-semibold text-indigo-500">Click để chọn file</span> hoặc kéo thả vào đây</p>
                    </div>
                    <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  </label>
                  
                  {importData.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl transition-colors duration-500 border border-emerald-200 dark:border-emerald-500/30">
                      <CheckCircle2 className="w-5 h-5"/> Đã tải {importData.length} dòng dữ liệu sẵn sàng nạp vào DB!
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 transition-colors duration-500">
                <button onClick={() => setIsImportModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-500">Hủy bỏ</button>
                <button 
                  onClick={submitImport} disabled={importData.length === 0 || isImporting}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-500 border border-emerald-600 rounded-xl hover:bg-emerald-600 transition-all duration-500 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4"/>}
                  Bắt đầu Import
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}