"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  Package, Search, Filter, Plus, Edit, Trash2, 
  AlertTriangle, TrendingUp, Box, Settings, 
  Tag, ShieldAlert, CheckCircle2, Loader2, Download
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
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
import AdvancedProductOpsModal from "./AdvancedProductOpsModal";

// --- UTILS ---
import { formatVND } from "@/utils/formatters";
import { exportToCSV } from "@/utils/exportUtils";

// ==========================================
// 1. SKELETON LOADING
// ==========================================
const ProductListSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-4">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-3xl bg-slate-200 dark:bg-slate-800/50"></div>)}
    </div>
    <div className="h-14 w-full rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>
    <div className="h-[400px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: DANH MỤC HÀNG HÓA
// ==========================================
export default function ProductList() {
  
  // --- STATE LỌC & ĐIỀU HƯỚNG ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // --- STATE MODALS ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProductForAdvOps, setSelectedProductForAdvOps] = useState<Product | null>(null);

  // 👉 FETCH DATA TỪ API
  const { data: rawProducts = [], isLoading: loadingProducts, isError } = useGetProductsQuery({});
  const { data: categories = [], isLoading: loadingCats } = useGetCategoriesQuery();
  const { data: uoms = [], isLoading: loadingUoms } = useGetUoMsQuery();
  
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const isLoading = loadingProducts || loadingCats || loadingUoms;

  // --- XỬ LÝ LỌC & TÍNH TOÁN KPI ---
  const products = useMemo(() => {
    return rawProducts.filter(prod => {
      const matchSearch = 
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        prod.productCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = filterCategory === "" || prod.categoryId === filterCategory;
      const matchStatus = filterStatus === "ALL" || prod.status === filterStatus;
      
      return matchSearch && matchCat && matchStatus;
    });
  }, [rawProducts, searchQuery, filterCategory, filterStatus]);

  const kpis = useMemo(() => {
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    rawProducts.forEach(p => {
      if (p.status === "ACTIVE") {
        const stock = p.totalStock || 0;
        const reorder = p.reorderPoint || 10;
        
        totalValue += stock * (p.purchasePrice || 0);
        
        if (stock === 0) outOfStockCount++;
        else if (stock <= reorder) lowStockCount++;
      }
    });

    return { totalItems: rawProducts.length, totalValue, lowStockCount, outOfStockCount };
  }, [rawProducts]);

  // --- HANDLERS ---
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn chắc chắn muốn xóa sản phẩm "${name}"?\nSản phẩm đã phát sinh giao dịch sẽ không thể xóa cứng.`)) {
      try {
        await deleteProduct(id).unwrap();
        toast.success(`Đã xóa sản phẩm ${name}!`);
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
    const exportData = products.map(p => ({
      "Mã SKU": p.productCode,
      "Tên sản phẩm": p.name,
      "Danh mục": categories.find(c => c.categoryId === p.categoryId)?.name || "N/A",
      "Đơn vị tính": uoms.find(u => u.uomId === p.uomId)?.name || "N/A",
      "Giá nhập (VND)": p.purchasePrice,
      "Giá bán (VND)": p.price,
      "Tồn kho tổng": p.totalStock || 0,
      "Trạng thái": p.status === "ACTIVE" ? "Đang kinh doanh" : "Ngừng bán",
      "Quản lý Lô": p.hasBatches ? "Có" : "Không"
    }));
    exportToCSV(exportData, "Danh_Muc_San_Pham");
    toast.success("Xuất Danh mục Sản phẩm thành công!");
  };

  // --- CỘT DATATABLE ---
  const columns: ColumnDef<Product>[] = [
    {
      header: "Mã / Tên Sản phẩm",
      accessorKey: "name",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
            {row.imageUrl ? (
              <img src={row.imageUrl} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="flex flex-col max-w-[200px] sm:max-w-[250px]">
            <span className="font-bold text-slate-900 dark:text-white truncate" title={row.name}>{row.name}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-500/20">
                {row.productCode}
              </span>
              {row.hasBatches && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1 rounded">LÔ/DATE</span>}
              {row.hasVariants && <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1 rounded">BIẾN THỂ</span>}
            </div>
          </div>
        </div>
      )
    },
    {
      header: "Phân loại",
      accessorKey: "categoryId",
      cell: (row) => {
        const catName = categories.find(c => c.categoryId === row.categoryId)?.name || "N/A";
        const uomName = uoms.find(u => u.uomId === row.uomId)?.name || "N/A";
        return (
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400"/> {catName}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Đơn vị gốc: <b>{uomName}</b></span>
          </div>
        );
      }
    },
    {
      header: "Chính sách Giá",
      accessorKey: "price",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col text-xs">
          <div className="flex justify-between items-center w-32">
            <span className="text-slate-500">Giá Nhập:</span>
            <span className="font-medium text-orange-600 dark:text-orange-400">{formatVND(row.purchasePrice)}</span>
          </div>
          <div className="flex justify-between items-center w-32 mt-0.5">
            <span className="text-slate-500">Giá Bán:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatVND(row.price)}</span>
          </div>
        </div>
      )
    },
    {
      header: "Tồn kho thực tế",
      accessorKey: "totalStock",
      sortable: true,
      cell: (row) => {
        const stock = row.totalStock || 0;
        const reorder = row.reorderPoint || 10;
        
        let statusColor = "bg-emerald-500";
        let textColor = "text-emerald-600 dark:text-emerald-400";
        let bgLight = "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20";
        
        if (stock === 0) {
          statusColor = "bg-rose-500"; textColor = "text-rose-600 dark:text-rose-400"; bgLight = "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20";
        } else if (stock <= reorder) {
          statusColor = "bg-amber-500"; textColor = "text-amber-600 dark:text-amber-400"; bgLight = "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20";
        }

        const percent = Math.min((stock / (reorder * 3 || 100)) * 100, 100);

        return (
          <div className="flex flex-col w-32 sm:w-40">
            <div className="flex justify-between items-end mb-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${bgLight} ${textColor}`}>
                {stock} <span className="font-normal opacity-80">hộp</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400" title="Điểm tái đặt hàng (Reorder Point)">Min: {reorder}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1 }}
                className={`h-full rounded-full ${statusColor} ${stock <= reorder && stock > 0 ? 'animate-pulse' : ''}`}
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
        <div className="flex items-center justify-end gap-1.5">
          <button 
            onClick={() => setSelectedProductForAdvOps(row)} 
            title="Cấu hình Lô & Quy đổi UoM" 
            className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 rounded-xl transition-colors shadow-sm group"
          >
            <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          </button>
          
          <button 
            title="Chỉnh sửa cơ bản" 
            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-xl transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => handleDelete(row.productId, row.name)} disabled={isDeleting}
            title="Xóa sản phẩm" 
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // --- ANIMATION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (isError) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-rose-200">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Lỗi nạp dữ liệu hàng hóa</h3>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* KHU VỰC ĐIỀU KHIỂN TRÊN CÙNG */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Box className="w-6 h-6 text-indigo-500" /> Danh mục Sản phẩm (Master)
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
           <button 
            onClick={handleExportData}
            className="flex-1 sm:flex-none px-4 py-2.5 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" /> Xuất File
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Thêm SKU Mới</span>
          </button>
        </div>
      </div>

      {isLoading ? <ProductListSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-5 w-full">
          
          {/* KPI CARDS (BỨC TRANH TOÀN CẢNH) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-3 opacity-[0.03] group-hover:scale-110 transition-transform"><Package className="w-16 h-16 text-indigo-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Tổng Danh Mục (SKUs)</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white relative z-10">{kpis.totalItems}</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-colors">
              <div className="absolute right-0 top-0 p-3 opacity-[0.03] group-hover:scale-110 transition-transform"><TrendingUp className="w-16 h-16 text-emerald-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Tổng Giá trị Tồn (Value)</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate relative z-10">{formatVND(kpis.totalValue)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-colors ${kpis.lowStockCount > 0 ? 'border-amber-300 dark:border-amber-500/50' : 'border-slate-200 dark:border-white/5'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Sắp cạn kho (Low Stock)</p>
              <div className="flex items-center gap-3 relative z-10">
                <h3 className={`text-2xl font-black ${kpis.lowStockCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{kpis.lowStockCount}</h3>
                {kpis.lowStockCount > 0 && <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-colors ${kpis.outOfStockCount > 0 ? 'border-rose-300 dark:border-rose-500/50' : 'border-slate-200 dark:border-white/5'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Cháy Hàng (Out of Stock)</p>
              <div className="flex items-center gap-3 relative z-10">
                <h3 className={`text-2xl font-black ${kpis.outOfStockCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{kpis.outOfStockCount}</h3>
                {kpis.outOfStockCount > 0 && <ShieldAlert className="w-5 h-5 text-rose-500" />}
              </div>
            </motion.div>
          </div>

          {/* THANH TÌM KIẾM & LỌC */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm z-10">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" placeholder="Tìm tên, mã vạch SKU..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-sm"
              />
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <select 
                value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 sm:w-auto px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 outline-none"
              >
                <option value="">Tất cả Danh mục</option>
                {categories.map((c: any) => <option key={c.categoryId || c.id} value={c.categoryId || c.id}>{c.name}</option>)}
              </select>
              <select 
                value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 sm:w-auto px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 outline-none"
              >
                <option value="ALL">Tất cả Trạng thái</option>
                <option value="ACTIVE">Đang kinh doanh</option>
                <option value="INACTIVE">Ngừng bán</option>
              </select>
            </div>
          </motion.div>

          {/* BẢNG DỮ LIỆU ĐỘNG */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Box className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-bold text-slate-600 dark:text-slate-300">Kho hàng trống</p>
                <p className="text-sm mt-1">Hãy thêm sản phẩm đầu tiên của bạn.</p>
              </div>
            ) : (
              <DataTable 
                data={products} 
                columns={columns} 
                searchKey="name" 
                searchPlaceholder="Lọc nhanh trong bảng..." 
                itemsPerPage={10} 
              />
            )}
          </motion.div>

        </motion.div>
      )}

      {/* KHU VỰC TÍCH HỢP MODALS */}
      <CreateProductModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <AdvancedProductOpsModal isOpen={!!selectedProductForAdvOps} onClose={() => setSelectedProductForAdvOps(null)} product={selectedProductForAdvOps} />

    </div>
  );
}