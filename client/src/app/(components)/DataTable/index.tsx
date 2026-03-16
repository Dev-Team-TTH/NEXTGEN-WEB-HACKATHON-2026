"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Search, ChevronDown, ChevronUp, SlidersHorizontal, Inbox } from "lucide-react";

// ==========================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (GENERIC TYPES)
// ==========================================
export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchKey?: keyof T; 
  onRowClick?: (row: T) => void;
  
  // 🚀 KIẾN TRÚC MỚI: Truyền Node Bộ lọc từ bên ngoài vào
  advancedFilterNode?: React.ReactNode;
  
  // Tính năng Server-side Pagination & Filtering
  isServerSide?: boolean;
  serverPage?: number;
  serverTotalPages?: number;
  serverTotalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (newPage: number) => void;
  onSearchChange?: (searchTerm: string) => void;
  onSortChange?: (sortKey: string, direction: "asc" | "desc") => void;
}

// ==========================================
// 2. COMPONENT LÕI: DATA TABLE SIÊU CẤP
// ==========================================
export default function DataTable<T>({
  data,
  columns,
  isLoading = false,
  searchPlaceholder = "Tìm kiếm...",
  searchKey,
  onRowClick,
  itemsPerPage = 10,
  advancedFilterNode, // Nhận node bộ lọc
  isServerSide = false,
  serverPage = 1,
  serverTotalPages = 1,
  serverTotalItems = 0,
  onPageChange,
  onSearchChange,
  onSortChange
}: DataTableProps<T>) {
  
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof T | string; direction: "asc" | "desc" } | null>(null);
  const [clientPage, setClientPage] = useState(1);
  
  // STATE MỚI: Quản lý ẩn hiện khung lọc nâng cao
  const [showFilters, setShowFilters] = useState(false);

  // --- KỸ THUẬT DEBOUNCE TÌM KIẾM ---
  useEffect(() => {
    const handler = setTimeout(() => {
      if (isServerSide && onSearchChange) {
        onSearchChange(localSearchTerm);
        if (onPageChange) onPageChange(1); 
      }
    }, 500); 
    return () => clearTimeout(handler);
  }, [localSearchTerm, isServerSide, onSearchChange, onPageChange]);

  // --- LOGIC CLIENT-SIDE ---
  const processedData = useMemo(() => {
    if (isServerSide) return data; 

    let result = [...data];

    if (localSearchTerm && searchKey) {
      result = result.filter((item) => {
        const val = item[searchKey as keyof T];
        return String(val).toLowerCase().includes(localSearchTerm.toLowerCase());
      });
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof T];
        const bValue = b[sortConfig.key as keyof T];
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, localSearchTerm, searchKey, sortConfig, isServerSide]);

  const displayData = isServerSide 
    ? data 
    : processedData.slice((clientPage - 1) * itemsPerPage, clientPage * itemsPerPage);

  const currentPage = isServerSide ? serverPage : clientPage;
  const totalPages = isServerSide ? serverTotalPages : Math.ceil(processedData.length / itemsPerPage);
  const totalItems = isServerSide ? serverTotalItems : processedData.length;

  const handleSort = (key: keyof T | string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    if (isServerSide && onSortChange) {
      onSortChange(String(key), direction);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isServerSide && onPageChange) {
      onPageChange(newPage);
    } else {
      setClientPage(newPage);
    }
  };

  // --- ANIMATION CONFIG ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const rowVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } } };

  return (
    <div className="w-full bg-white dark:bg-gray-900/50 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col">
      
      {/* HEADER BẢNG: THANH CÔNG CỤ TÌM KIẾM & NÚT FILTER */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-transparent relative z-20">
        {searchKey && (
          <div className="relative w-full sm:max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={localSearchTerm}
              onChange={(e) => {
                setLocalSearchTerm(e.target.value);
                if (!isServerSide) setClientPage(1); 
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-sm"
            />
          </div>
        )}
        
        {/* NÚT BẬT TẮT BỘ LỌC ĐỘNG TỪ BÊN NGOÀI */}
        {advancedFilterNode && (
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm whitespace-nowrap
              ${showFilters 
                ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30" 
                : "text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Bộ lọc mở rộng
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* KHUNG XỔ XUỐNG CHỨA BỘ LỌC BÊN NGOÀI BƠM VÀO */}
      <AnimatePresence>
        {advancedFilterNode && showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-gray-800/30 overflow-hidden"
          >
            <div className="p-4 sm:px-5 sm:py-4">
              {advancedFilterNode}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VÙNG CHỨA BẢNG */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 relative min-h-[200px] z-10">
        {isServerSide && isLoading && (
           <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
             <div className="px-5 py-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-3">
               <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span> Đang tải dữ liệu...
             </div>
           </div>
        )}

        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider font-bold">
              {columns.map((col, index) => (
                <th
                  key={index}
                  onClick={() => col.sortable && handleSort(col.accessorKey)}
                  className={`p-4 first:pl-6 last:pr-6 border-b border-gray-100 dark:border-white/5 ${col.sortable ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors select-none" : ""} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={{ width: col.width }}
                >
                  <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    {col.header}
                    {col.sortable && sortConfig?.key === col.accessorKey && (
                      <span className="text-blue-500">
                        {sortConfig.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <AnimatePresence mode="wait">
            {!isServerSide && isLoading ? (
              <motion.tbody key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-50 dark:border-white/5">
                    {columns.map((_, colIndex) => (
                      <td key={colIndex} className="p-4 first:pl-6 last:pr-6"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-3/4"></div></td>
                    ))}
                  </tr>
                ))}
              </motion.tbody>
            ) : displayData.length === 0 ? (
              <motion.tbody key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <tr>
                  <td colSpan={columns.length} className="p-16 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700"><Inbox className="w-8 h-8 text-gray-400" /></div>
                      <p className="text-sm font-semibold">Không tìm thấy dữ liệu phù hợp</p>
                    </div>
                  </td>
                </tr>
              </motion.tbody>
            ) : (
              <motion.tbody key="data" variants={containerVariants} initial="hidden" animate="show">
                {displayData.map((row, rowIndex) => (
                  <motion.tr
                    key={rowIndex}
                    variants={rowVariants}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`border-b border-gray-50 dark:border-white/5 group transition-colors ${onRowClick ? "cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10" : ""}`}
                  >
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className={`p-4 text-sm text-gray-700 dark:text-gray-300 first:pl-6 last:pr-6 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                        {col.cell ? col.cell(row) : (row[col.accessorKey as keyof T] as React.ReactNode)}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </motion.tbody>
            )}
          </AnimatePresence>
        </table>
      </div>

      {/* FOOTER: PHÂN TRANG */}
      {totalPages > 0 && (
        <div className="p-4 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50/30 dark:bg-transparent">
          <span>
            Hiển thị <span className="font-bold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, totalItems)}</span> trong tổng số <span className="font-bold text-gray-900 dark:text-white">{totalItems}</span>
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1 || (isServerSide && isLoading)}
              className="px-3 py-1.5 font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Trang trước
            </button>
            <span className="px-4 py-1.5 font-bold text-gray-700 dark:text-gray-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages || (isServerSide && isLoading)}
              className="px-3 py-1.5 font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}