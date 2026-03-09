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
  
  // NÂNG CẤP: Tính năng Server-side Pagination & Filtering
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
  // Props cho Server-side
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

  // --- KỸ THUẬT DEBOUNCE TÌM KIẾM ---
  // Chống Spam API khi người dùng gõ phím quá nhanh
  useEffect(() => {
    const handler = setTimeout(() => {
      if (isServerSide && onSearchChange) {
        onSearchChange(localSearchTerm);
        if (onPageChange) onPageChange(1); // Reset về trang 1 khi search
      }
    }, 500); // Đợi 500ms sau khi ngừng gõ mới báo cho Server

    return () => clearTimeout(handler);
  }, [localSearchTerm, isServerSide, onSearchChange, onPageChange]);

  // --- LOGIC CLIENT-SIDE (Chạy nếu isServerSide = false) ---
  const processedData = useMemo(() => {
    if (isServerSide) return data; // Nếu là Server-side, trả data nguyên bản do Backend gửi

    let result = [...data];

    // Lọc (Search Client)
    if (localSearchTerm && searchKey) {
      result = result.filter((item) => {
        const val = item[searchKey as keyof T];
        return String(val).toLowerCase().includes(localSearchTerm.toLowerCase());
      });
    }

    // Sắp xếp (Sort Client)
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

  // Khớp biến phân trang giữa Server và Client
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

  // --- ANIMATION CONFIG (FRAMER MOTION) ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }, 
  };

  const rowVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900/50 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col">
      
      {/* HEADER BẢNG: THANH CÔNG CỤ TÌM KIẾM */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-transparent">
        {searchKey && (
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={localSearchTerm}
              onChange={(e) => {
                setLocalSearchTerm(e.target.value);
                if (!isServerSide) setClientPage(1); 
              }}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
        )}
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95">
          <SlidersHorizontal className="w-4 h-4" />
          Bộ lọc nâng cao
        </button>
      </div>

      {/* VÙNG CHỨA BẢNG */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 relative min-h-[200px]">
        
        {/* NỀN MỜ KHI ĐANG LOADING TRÊN SERVER */}
        {isServerSide && isLoading && (
           <div className="absolute inset-0 bg-white/50 dark:bg-black/20 backdrop-blur-[1px] z-10 flex items-center justify-center">
             <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-sm font-semibold flex items-center gap-2">
               <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span> Đang tải...
             </div>
           </div>
        )}

        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">
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
                        {sortConfig.direction === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* SKELETON LOADING (Chỉ hiện lúc tải trang đầu tiên) */}
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
                  <td colSpan={columns.length} className="p-10 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full"><Inbox className="w-8 h-8 text-gray-400" /></div>
                      <p className="text-sm font-medium">Không tìm thấy dữ liệu</p>
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
                    className={`border-b border-gray-50 dark:border-white/5 group transition-colors ${onRowClick ? "cursor-pointer hover:blue-50/50 dark:hover:bg-blue-900/10" : ""}`}
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
            Hiển thị <span className="font-semibold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, totalItems)}</span> trong tổng số <span className="font-semibold text-gray-900 dark:text-white">{totalItems}</span>
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1 || (isServerSide && isLoading)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Trước
            </button>
            <span className="px-3 py-1.5 font-semibold text-gray-700 dark:text-gray-300">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages || (isServerSide && isLoading)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}