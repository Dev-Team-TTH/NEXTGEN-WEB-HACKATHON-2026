"use client";

import React, { useState } from "react";
import { motion, Variants } from "framer-motion";
import { 
  ShieldAlert, Activity, Filter, Clock, 
  User, Database, Code, Eye, Braces
} from "lucide-react";
import dayjs from "dayjs";
import 'dayjs/locale/vi';

// --- REDUX & API ---
import { useGetSystemAuditLogsQuery, SystemAuditLog } from "@/state/api";

// --- COMPONENTS ---
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import Modal from "@/app/(components)/Modal";
import Header from "@/app/(components)/Header";

// --- ENTERPRISE UTILS (SIÊU VŨ KHÍ) ---
import { safeJsonParse, getInitials } from "@/utils/formatters";
import { cn, generateAvatarColor } from "@/utils/helpers";

dayjs.locale('vi');

// ==========================================
// COMPONENT: NHẬT KÝ KIỂM TOÁN HỆ THỐNG
// ==========================================
export default function SystemAuditLogPage() {
  // --- STATE PHÂN TRANG & LỌC (SERVER-SIDE) ---
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterModule, setFilterModule] = useState("ALL");
  const itemsPerPage = 15;

  const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);

  // 👉 FETCH DATA (CHẾ ĐỘ SERVER-SIDE PAGINATION)
  const { data: response, isLoading, isError } = useGetSystemAuditLogsQuery({
    page,
    limit: itemsPerPage,
    search: searchQuery,
    action: filterAction === "ALL" ? undefined : filterAction,
    tableName: filterModule === "ALL" ? undefined : filterModule
  });

  const logs = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, limit: itemsPerPage, totalPages: 1 };

  // --- HELPERS (UI/UX) ---
  const getActionUI = (action: string) => {
    switch (action) {
      case "CREATE": return { color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30", label: "TẠO MỚI" };
      case "UPDATE": return { color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30", label: "CẬP NHẬT" };
      case "DELETE": return { color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30", label: "XÓA" };
      case "LOGIN": 
      case "LOGOUT": return { color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30", label: "TRUY CẬP" };
      default: return { color: "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30", label: action };
    }
  };

  // Trình phân tích chuỗi JSON an toàn sử dụng utils
  const displayJson = (data: any) => {
    if (!data) return "// Không có dữ liệu";
    // Dùng safeJsonParse từ utils để đảm bảo không bao giờ bị Exception
    const parsed = safeJsonParse(data, data);
    return typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : String(parsed);
  };

  // --- BẢNG COLUMNS ---
  const columns: ColumnDef<SystemAuditLog>[] = [
    {
      header: "Thời gian",
      accessorKey: "timestamp",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 dark:text-slate-200">{dayjs(row.timestamp).format('HH:mm:ss')}</span>
          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> {dayjs(row.timestamp).format('DD/MM/YYYY')}
          </span>
        </div>
      )
    },
    {
      header: "Người thực hiện",
      accessorKey: "user",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          {/* SỬ DỤNG UTILS ĐỂ RENDER AVATAR MÀU SẮC ĐỘNG VÀ CHỮ CÁI ĐẦU */}
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 text-xs shadow-sm",
            generateAvatarColor(row.user?.fullName)
          )}>
            {getInitials(row.user?.fullName)}
          </div>
          <div className="flex flex-col max-w-[150px]">
            <span className="font-bold text-slate-800 dark:text-white truncate">{row.user?.fullName || "System / Bot"}</span>
            <span className="text-[10px] text-slate-500 truncate">{row.user?.email || "N/A"}</span>
          </div>
        </div>
      )
    },
    {
      header: "Hành động",
      accessorKey: "action",
      cell: (row) => {
        const ui = getActionUI(row.action);
        return (
          <span className={cn("px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border shadow-sm", ui.color)}>
            {ui.label}
          </span>
        );
      }
    },
    {
      header: "Phân hệ (Module)",
      accessorKey: "tableName",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" /> {row.tableName}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5" title="ID Bản ghi">ID: {row.recordId}</span>
        </div>
      )
    },
    {
      header: "Thao tác",
      accessorKey: "logId",
      align: "right",
      cell: (row) => (
        <button 
          onClick={() => setSelectedLog(row)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-500/20 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 text-xs font-bold rounded-xl transition-colors shadow-sm"
        >
          <Eye className="w-3.5 h-3.5" /> Chi tiết
        </button>
      )
    }
  ];

  // --- ANIMATION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center w-full h-[70vh]">
        <ShieldAlert className="w-20 h-20 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Lỗi nạp Nhật ký Audit</h2>
        <p className="text-slate-500 mt-2">Không thể truy xuất dữ liệu từ máy chủ. Vui lòng kiểm tra lại kết nối.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      {/* 1. HEADER CHUẨN ENTERPRISE */}
      <Header 
        title="Nhật ký Hệ thống (Audit Logs)" 
        subtitle="Theo dõi và truy vết toàn bộ thao tác thay đổi dữ liệu trên hệ thống theo thời gian thực."
      />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
        
        {/* 2. THANH CÔNG CỤ BỘ LỌC */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">Bộ lọc dữ liệu</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Tùy chỉnh tiêu chí tìm kiếm</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <select 
                value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                className="w-full sm:w-auto pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
              >
                <option value="ALL">- Tất cả Hành động -</option>
                <option value="CREATE">Tạo mới (CREATE)</option>
                <option value="UPDATE">Cập nhật (UPDATE)</option>
                <option value="DELETE">Xóa (DELETE)</option>
                <option value="LOGIN">Đăng nhập (LOGIN)</option>
              </select>
            </div>
            
            <div className="relative group">
              <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <select 
                value={filterModule} onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
                className="w-full sm:w-auto pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
              >
                <option value="ALL">- Tất cả Phân hệ -</option>
                <option value="Document">Giao dịch (Document)</option>
                <option value="Products">Sản phẩm (Products)</option>
                <option value="InventoryBalance">Tồn kho (Inventory)</option>
                <option value="Users">Người dùng (Users)</option>
                <option value="JournalEntry">Sổ Nhật Ký (Accounting)</option>
                <option value="Asset">Tài sản (Assets)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* 3. BẢNG DỮ LIỆU ĐỘNG SERVER-SIDE */}
        <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-sm">
          <DataTable 
            data={logs} 
            columns={columns} 
            searchKey="recordId" 
            searchPlaceholder="Tìm theo ID bản ghi hoặc tên Nhân viên..." 
            isLoading={isLoading}
            
            isServerSide={true}
            serverPage={meta.page}
            serverTotalPages={meta.totalPages}
            serverTotalItems={meta.total}
            itemsPerPage={itemsPerPage}
            onPageChange={(newPage) => setPage(newPage)}
            onSearchChange={(text) => { setSearchQuery(text); setPage(1); }}
          />
        </motion.div>

      </motion.div>

      {/* 4. MODAL XEM CHI TIẾT JSON DIFF */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Truy vết Dữ liệu (Data Trace)"
        subtitle={`ID Hành động: ${selectedLog?.logId}`}
        icon={<Code className="w-5 h-5 text-indigo-500" />}
        maxWidth="max-w-5xl"
      >
        {selectedLog && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50 dark:bg-[#0B0F19]">
            
            {/* Meta Info */}
            <div className="lg:col-span-2 flex flex-wrap gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex-1 min-w-[200px]">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nhân sự thực hiện</p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-black text-slate-800 dark:text-white">{selectedLog.user?.fullName || "System/Bot"}</span>
                </div>
              </div>
              <div className="w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
              <div className="flex-1 min-w-[150px]">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thời gian</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{dayjs(selectedLog.timestamp).format('HH:mm:ss - DD/MM/YYYY')}</span>
                </div>
              </div>
              <div className="w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
              <div className="flex-1 min-w-[150px]">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phân hệ & ID Bản ghi</p>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{selectedLog.tableName} (ID: {selectedLog.recordId})</span>
                </div>
              </div>
            </div>

            {/* Dữ liệu Cũ (Old Values) */}
            <div className="flex flex-col h-[400px]">
              <h3 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Braces className="w-4 h-4" /> Dữ liệu trước khi đổi
              </h3>
              <div className="flex-1 bg-[#1e1e1e] rounded-2xl p-4 overflow-auto border border-rose-500/30 shadow-inner custom-scrollbar relative">
                <pre className="text-[13px] font-mono text-rose-300 leading-relaxed absolute inset-0 p-4">
                  {displayJson(selectedLog.oldValues)}
                </pre>
              </div>
            </div>

            {/* Dữ liệu Mới (New Values) */}
            <div className="flex flex-col h-[400px]">
              <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Braces className="w-4 h-4" /> Dữ liệu cập nhật mới
              </h3>
              <div className="flex-1 bg-[#1e1e1e] rounded-2xl p-4 overflow-auto border border-emerald-500/30 shadow-inner custom-scrollbar relative">
                <pre className="text-[13px] font-mono text-emerald-300 leading-relaxed absolute inset-0 p-4">
                  {displayJson(selectedLog.newValues)}
                </pre>
              </div>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
}