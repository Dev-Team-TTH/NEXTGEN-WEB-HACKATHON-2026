"use client";

import React, { useState, useMemo } from "react";
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
  searchKey?: keyof T; // Cột nào dùng để search text
  onRowClick?: (row: T) => void;
  // Phân trang nội bộ
  itemsPerPage?: number;
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
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof T | string; direction: "asc" | "desc" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // --- LOGIC: TÌM KIẾM & SẮP XẾP ---
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Lọc (Search)
    if (searchTerm && searchKey) {
      result = result.filter((item) => {
        const val = item[searchKey as keyof T];
        return String(val).toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // 2. Sắp xếp (Sort)
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
  }, [data, searchTerm, searchKey, sortConfig]);

  // --- LOGIC: PHÂN TRANG ---
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (key: keyof T | string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // --- ANIMATION CONFIG (FRAMER MOTION) ---
  // Đã fix lỗi TypeScript bằng 'Variants' và 'as const'
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }, // Hiệu ứng xuất hiện lần lượt từng dòng
    },
  };

  const rowVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring" as const, stiffness: 300, damping: 24 } 
    },
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
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset trang khi search
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

      {/* VÙNG CHỨA BẢNG (Hỗ trợ cuộn ngang trên Mobile) */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
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

          {/* SKELETON LOADING HOẶC DỮ LIỆU */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.tbody
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-50 dark:border-white/5">
                    {columns.map((_, colIndex) => (
                      <td key={colIndex} className="p-4 first:pl-6 last:pr-6">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-3/4"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </motion.tbody>
            ) : paginatedData.length === 0 ? (
              <motion.tbody
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <tr>
                  <td colSpan={columns.length} className="p-10 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full">
                        <Inbox className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium">Không tìm thấy dữ liệu</p>
                    </div>
                  </td>
                </tr>
              </motion.tbody>
            ) : (
              <motion.tbody
                key="data"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {paginatedData.map((row, rowIndex) => (
                  <motion.tr
                    key={rowIndex}
                    variants={rowVariants}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`border-b border-gray-50 dark:border-white/5 group transition-colors ${onRowClick ? "cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10" : ""}`}
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={colIndex}
                        className={`p-4 text-sm text-gray-700 dark:text-gray-300 first:pl-6 last:pr-6 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
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
      {!isLoading && totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 bg-gray-50/30 dark:bg-transparent">
          <span>
            Hiển thị <span className="font-semibold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, processedData.length)}</span> trong tổng số <span className="font-semibold text-gray-900 dark:text-white">{processedData.length}</span>
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Trước
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
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