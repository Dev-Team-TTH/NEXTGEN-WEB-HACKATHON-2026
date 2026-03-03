"use client";

import React, { useState, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { 
  Plus, PackageSearch, AlertOctagon, RefreshCcw, 
  MoreVertical, Edit, Trash2, Printer, CheckCircle2, XCircle, Image as ImageIcon
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useGetProductsQuery, useDeleteProductMutation, Product } from "@/state/api";

// --- COMPONENTS ---
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

// ==========================================
// 1. HELPER: FORMATTERS
// ==========================================
const formatVND = (val: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
const formatQty = (val: number) => 
  new Intl.NumberFormat('vi-VN').format(val);

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const ProductListSkeleton = () => (
  <div className="w-full animate-pulse flex flex-col gap-6 mt-4">
    <div className="flex justify-between items-center">
      <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
    </div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: DANH MỤC SẢN PHẨM
// ==========================================
export default function ProductList() {
  // 👉 FETCH DATA THẬT TỪ API
  const { data: products = [], isLoading, isError, refetch, isFetching } = useGetProductsQuery({});
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  // Xử lý Xóa sản phẩm
  const handleDelete = async (productId: string, productName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}" không? Dữ liệu không thể khôi phục.`)) {
      try {
        await deleteProduct(productId).unwrap();
        toast.success(`Đã xóa sản phẩm ${productName} thành công!`);
      } catch (error: any) {
        toast.error(error?.data?.message || "Lỗi! Không thể xóa sản phẩm đã có giao dịch.");
      }
    }
  };

  // --- ĐỊNH NGHĨA CỘT CHO DATATABLE ---
  const columns: ColumnDef<Product>[] = [
    {
      header: "Sản phẩm",
      accessorKey: "name",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          {/* Avatar / Image Placeholder */}
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
            {row.imageUrl ? (
              <img src={row.imageUrl} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="flex flex-col max-w-[250px]">
            <span className="font-bold text-slate-900 dark:text-white truncate" title={row.name}>
              {row.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-mono">
                {row.productCode}
              </span>
              {(row.hasVariants || row.hasBatches) && (
                <span className="text-[10px] text-indigo-500 font-medium truncate">
                  {row.hasVariants && "• Có biến thể"} {row.hasBatches && "• Quản lý theo lô"}
                </span>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      header: "Tồn kho",
      accessorKey: "availableStock",
      sortable: true,
      align: "right",
      cell: (row) => {
        const isLowStock = row.availableStock !== undefined && row.reorderPoint !== undefined && row.availableStock <= row.reorderPoint;
        
        return (
          <div className="flex flex-col items-end">
            <span className={`font-bold text-base ${isLowStock ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatQty(row.availableStock || 0)} <span className="text-xs font-normal text-slate-500">/{formatQty(row.totalStock || 0)}</span>
            </span>
            {/* Cảnh báo Reorder Point */}
            {isLowStock && (
              <span className="text-[10px] font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1.5 rounded mt-0.5">
                Sắp hết hàng (Min: {row.reorderPoint})
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Giá bán / Giá vốn",
      accessorKey: "price",
      sortable: true,
      align: "right",
      cell: (row) => (
        <div className="flex flex-col items-end">
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {formatVND(row.price)}
          </span>
          <span className="text-xs text-slate-500">
            Vốn: {formatVND(row.purchasePrice)}
          </span>
        </div>
      )
    },
    {
      header: "Trạng thái",
      accessorKey: "status",
      cell: (row) => {
        const isActive = row.status === "ACTIVE";
        return (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            isActive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {isActive ? "Đang bán" : "Ngừng kinh doanh"}
          </div>
        );
      }
    },
    {
      header: "Thao tác",
      accessorKey: "productId",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button 
            title="In mã vạch"
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button 
            title="Chỉnh sửa"
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            title="Xóa"
            onClick={() => handleDelete(row.productId, row.name)}
            disabled={isDeleting}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // --- CẤU HÌNH MOTION ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  // --- RENDER LỖI MẠNG ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 w-full text-center glass rounded-3xl mt-6">
        <AlertOctagon className="w-12 h-12 text-rose-500 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Lỗi tải dữ liệu Danh mục</h3>
        <button onClick={() => refetch()} className="px-5 py-2 mt-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all active:scale-95 flex items-center gap-2">
          <RefreshCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full flex flex-col gap-4 mt-6">
      
      {/* HEADER DANH MỤC & NÚT TẠO MỚI */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <PackageSearch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Danh mục Sản phẩm</h2>
            <p className="text-sm text-slate-500">Quản lý toàn bộ vật tư, hàng hóa trong hệ thống</p>
          </div>
        </div>
        
        <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" />
          Thêm Sản phẩm Mới
        </button>
      </motion.div>

      {/* KHU VỰC HIỂN THỊ DỮ LIỆU */}
      <motion.div variants={itemVariants} className="w-full">
        {isLoading ? (
          <ProductListSkeleton />
        ) : (
          <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5">
            <DataTable 
              data={products} 
              columns={columns} 
              searchKey="name"
              searchPlaceholder="Tìm tên sản phẩm hoặc mã vạch..."
              itemsPerPage={10}
            />
          </div>
        )}
      </motion.div>

    </motion.div>
  );
}