"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Search, ChevronDown, ChevronUp, SlidersHorizontal, Inbox, Loader2 } from "lucide-react";

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
  
  advancedFilterNode?: React.ReactNode;
  
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
// Đã đồng bộ Theme Siêu mượt (Deep Theme Sync) 100%
// ==========================================
export default function DataTable<T>({
  data,
  columns,
  isLoading = false,
  searchPlaceholder = "Tìm kiếm...",
  searchKey,
  onRowClick,
  itemsPerPage = 10,
  advancedFilterNode, 
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
  const [showFilters, setShowFilters] = useState(false);

  // --- DEBOUNCE TÌM KIẾM ---
  useEffect(() => {
    const handler = setTimeout(() => {
      if (isServerSide && onSearchChange) {
        onSearchChange(localSearchTerm);
        if (onPageChange) onPageChange(1); 
      }
    }, 500); 
    return () => clearTimeout(handler);
  }, [localSearchTerm, isServerSide, onSearchChange, onPageChange]);

  // --- LOGIC CLIENT-SIDE VỚI BẢO VỆ LỖI NULL/UNDEFINED ---
  const processedData = useMemo(() => {
    if (isServerSide) return data; 

    let result = [...data];

    // 🚀 LÁ CHẮN BẢO MẬT: XỬ LÝ CHUỖI NULL ĐỂ KHÔNG BỊ TÌM KIẾM RÁC
    if (localSearchTerm && searchKey) {
      result = result.filter((item) => {
        const rawVal = item[searchKey as keyof T];
        const val = rawVal === null || rawVal === undefined ? "" : String(rawVal);
        return val.toLowerCase().includes(localSearchTerm.toLowerCase());
      });
    }

    // 🚀 THUẬT TOÁN SORT THÔNG MINH: CHUẨN HÓA CHỮ HOA/THƯỜNG
    if (sortConfig) {
      result.sort((a, b) => {
        const aRaw = a[sortConfig.key as keyof T];
        const bRaw = b[sortConfig.key as keyof T];

        const aValue = typeof aRaw === 'string' ? aRaw.toLowerCase() : (aRaw ?? "");
        const bValue = typeof bRaw === 'string' ? bRaw.toLowerCase() : (bRaw ?? "");

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

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const rowVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } } };

  return (
    // 🚀 ĐẠI TU THEME: Thay thế toàn bộ transition-colors thành transition-all duration-500 ease-in-out
    <div className="w-full glass-panel rounded-2xl overflow-hidden flex flex-col relative z-0 transition-all duration-500 ease-in-out">
      
      {/* HEADER BẢNG */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-transparent relative z-20 transition-all duration-500 ease-in-out">
        {searchKey && (
          <div className="relative w-full sm:max-w-md group transition-all duration-500 ease-in-out">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-all duration-500 ease-in-out" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={localSearchTerm}
              onChange={(e) => {
                setLocalSearchTerm(e.target.value);
                if (!isServerSide) setClientPage(1); 
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm duration-500 ease-in-out"
            />
          </div>
        )}
        
        {advancedFilterNode && (
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm whitespace-nowrap w-full sm:w-auto justify-center duration-500 ease-in-out
              ${showFilters 
                ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30" 
                : "text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
          >
            <SlidersHorizontal className="w-4 h-4 transition-all duration-500 ease-in-out" />
            Bộ lọc mở rộng
            <ChevronDown className={`w-4 h-4 transition-transform duration-500 ease-in-out ${showFilters ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* BỘ LỌC MỞ RỘNG */}
      <AnimatePresence>
        {advancedFilterNode && showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/30 overflow-hidden transition-all duration-500 ease-in-out"
          >
            <div className="p-4 sm:px-5 sm:py-4 transition-all duration-500 ease-in-out">
              {advancedFilterNode}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VÙNG BẢNG DỮ LIỆU */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 relative min-h-[250px] z-10 transition-all duration-500 ease-in-out">
        
        <AnimatePresence>
          {isServerSide && isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[2px] z-20 flex items-center justify-center transition-all duration-500 ease-in-out">
              <div className="px-5 py-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-all duration-500 ease-in-out">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin transition-all duration-500 ease-in-out" /> Đang đồng bộ dữ liệu...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <table className="w-full text-left border-collapse min-w-[700px] transition-all duration-500 ease-in-out">
          <thead className="transition-all duration-500 ease-in-out">
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold transition-all duration-500 ease-in-out">
              {columns.map((col, index) => (
                <th
                  key={index}
                  onClick={() => col.sortable && handleSort(col.accessorKey)}
                  className={`p-4 first:pl-6 last:pr-6 border-b border-slate-200 dark:border-slate-700/50 transition-all duration-500 ease-in-out ${col.sortable ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none" : ""} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={{ width: col.width }}
                >
                  <div className={`flex items-center gap-1.5 transition-all duration-500 ease-in-out ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    {col.header}
                    {col.sortable && sortConfig?.key === col.accessorKey && (
                      <span className="text-blue-500 transition-all duration-500 ease-in-out">
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
              <motion.tbody key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="transition-all duration-500 ease-in-out">
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-slate-100 dark:border-slate-800/50 transition-all duration-500 ease-in-out">
                    {columns.map((_, colIndex) => (
                      <td key={colIndex} className="p-4 first:pl-6 last:pr-6 transition-all duration-500 ease-in-out"><div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse w-3/4 transition-all duration-500 ease-in-out"></div></td>
                    ))}
                  </tr>
                ))}
              </motion.tbody>
            ) : displayData.length === 0 ? (
              <motion.tbody key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="transition-all duration-500 ease-in-out">
                <tr className="transition-all duration-500 ease-in-out">
                  <td colSpan={columns.length} className="p-16 text-center text-slate-500 dark:text-slate-400 transition-all duration-500 ease-in-out">
                    <div className="flex flex-col items-center justify-center gap-3 transition-all duration-500 ease-in-out">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 transition-all duration-500 ease-in-out"><Inbox className="w-8 h-8 text-slate-400 transition-all duration-500 ease-in-out" /></div>
                      <p className="text-sm font-semibold transition-all duration-500 ease-in-out">Không tìm thấy dữ liệu phù hợp</p>
                    </div>
                  </td>
                </tr>
              </motion.tbody>
            ) : (
              <motion.tbody key="data" variants={containerVariants} initial="hidden" animate="show" className="transition-all duration-500 ease-in-out">
                {displayData.map((row, rowIndex) => (
                  <motion.tr
                    key={rowIndex}
                    variants={rowVariants}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`border-b border-slate-100 dark:border-slate-800/50 group transition-all duration-500 ease-in-out ${onRowClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80" : ""}`}
                  >
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className={`p-4 text-sm text-slate-700 dark:text-slate-300 first:pl-6 last:pr-6 transition-all duration-500 ease-in-out ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-transparent transition-all duration-500 ease-in-out">
          <span className="transition-all duration-500 ease-in-out">
            Hiển thị <span className="font-bold text-slate-900 dark:text-white transition-all duration-500 ease-in-out">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-slate-900 dark:text-white transition-all duration-500 ease-in-out">{Math.min(currentPage * itemsPerPage, totalItems)}</span> / <span className="font-bold text-slate-900 dark:text-white transition-all duration-500 ease-in-out">{totalItems}</span>
          </span>
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end transition-all duration-500 ease-in-out">
            <button
              onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1 || (isServerSide && isLoading)}
              className="px-3 py-2 sm:py-1.5 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto text-center duration-500 ease-in-out"
            >
              Trang trước
            </button>
            <span className="px-3 sm:px-4 py-1.5 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap transition-all duration-500 ease-in-out">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages || (isServerSide && isLoading)}
              className="px-3 py-2 sm:py-1.5 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto text-center duration-500 ease-in-out"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}