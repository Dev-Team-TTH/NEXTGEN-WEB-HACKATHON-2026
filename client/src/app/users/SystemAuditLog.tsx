"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  History, Search, Filter, AlertOctagon, RefreshCcw, 
  Database, User, Clock, Code, X, ArrowRight, ShieldAlert,
  PlusCircle, Edit3, Trash2, LogIn
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import 'dayjs/locale/vi';

// --- REDUX & API ---
// Ghi chú: AuditLogType ở api.ts cần chứa các trường: tableName, recordId, action, oldValues, newValues, timestamp
import { useGetSystemAuditLogsQuery, SystemAuditLog as AuditLogType } from "@/state/api";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

dayjs.extend(relativeTime);
dayjs.locale('vi');

// ==========================================
// HELPERS: DATA VIZ HÀNH ĐỘNG
// ==========================================
const getActionUI = (action: string) => {
  const act = action ? action.toUpperCase() : "UNKNOWN";
  if (act.includes("CREATE") || act.includes("ADD") || act.includes("POST") || act.includes("SUBMIT")) 
    return { icon: PlusCircle, color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-200", label: "TẠO MỚI" };
  if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("PUT") || act.includes("APPROVE")) 
    return { icon: Edit3, color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 border-blue-200", label: "CẬP NHẬT" };
  if (act.includes("DELETE") || act.includes("REMOVE") || act.includes("CANCEL") || act.includes("REJECT")) 
    return { icon: Trash2, color: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10 border-rose-200", label: "XÓA/HỦY" };
  if (act.includes("LOGIN") || act.includes("LOGOUT")) 
    return { icon: LogIn, color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10 border-purple-200", label: "HỆ THỐNG" };
  
  return { icon: Database, color: "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-500/10 border-slate-200", label: act };
};

// Hàm Parse JSON thông minh (Xử lý cả Object từ Prisma lẫn String)
const safeParseJSON = (data?: any) => {
  if (!data) return null;
  if (typeof data === 'object') return JSON.stringify(data, null, 2);
  try {
    return JSON.stringify(JSON.parse(data), null, 2);
  } catch (e) {
    return String(data); 
  }
};

// ==========================================
// COMPONENT CHÍNH: NHẬT KÝ HỆ THỐNG
// ==========================================
export default function SystemAuditLog() {
  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  // Sử dụng 'any' tạm thời trong modal để linh hoạt chứa các trường chuẩn từ Backend
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // --- LẤY DỮ LIỆU ---
  const { data: rawLogs = [], isLoading, isError, refetch, isFetching } = useGetSystemAuditLogsQuery({ limit: 100 });

  // --- XỬ LÝ LỌC TRÊN CLIENT (SMART FILTER ENGINE) ---
  const logs = useMemo(() => {
    return rawLogs.filter((log: any) => {
      const searchLower = searchQuery.toLowerCase();
      
      // Đồng bộ trường dữ liệu với schema.prisma (dùng tableName thay vì entityName)
      const userName = (log.user?.fullName || log.userId || "").toLowerCase();
      const tableName = (log.tableName || "").toLowerCase();
      const actionName = (log.action || "").toLowerCase();
      
      const matchSearch = 
        userName.includes(searchLower) ||
        tableName.includes(searchLower) ||
        actionName.includes(searchLower);
      
      const matchFilter = filterAction === "ALL" || actionName.toUpperCase().includes(filterAction);
      
      return matchSearch && matchFilter;
    });
  }, [rawLogs, searchQuery, filterAction]);

  // --- CỘT DATATABLE ---
  const columns: ColumnDef<any>[] = [
    {
      header: "Thời gian",
      accessorKey: "timestamp",
      sortable: true,
      cell: (row) => {
        // Fallback thời gian phòng trường hợp backend trả về createdAt
        const timeVal = row.timestamp || row.createdAt;
        if (!timeVal) return <span>-</span>;
        return (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              {dayjs(timeVal).format('HH:mm:ss')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {dayjs(timeVal).format('DD/MM/YYYY')}
            </span>
          </div>
        );
      }
    },
    {
      header: "Nhân viên (User)",
      accessorKey: "userId",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
            <User className="w-3 h-3 text-slate-500" />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {row.user?.fullName || row.userId || "Hệ thống"}
          </span>
        </div>
      )
    },
    {
      header: "Hành động",
      accessorKey: "action",
      cell: (row) => {
        const { label, icon: Icon, color } = getActionUI(row.action);
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border ${color}`}>
            <Icon className="w-3 h-3" /> {label}
          </span>
        );
      }
    },
    {
      header: "Bảng (Table) & Record ID",
      accessorKey: "tableName",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            {row.tableName || "UNKNOWN"}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5" title={row.recordId}>
            ID: {row.recordId ? `${row.recordId.substring(0, 8)}...` : "N/A"}
          </span>
        </div>
      )
    },
    {
      header: "Chi tiết",
      accessorKey: "logId",
      align: "right",
      cell: (row) => (
        <button 
          onClick={() => setSelectedLog(row)}
          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
        >
          <Code className="w-3.5 h-3.5" /> Xem Diff
        </button>
      )
    }
  ];

  // --- ANIMATION CONFIG ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, x: "100%" },
    visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
    exit: { opacity: 0, x: "100%", transition: { duration: 0.2 } }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center w-full">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Lỗi truy xuất Audit Log</h2>
        <button onClick={() => refetch()} className="px-4 py-2 mt-2 bg-slate-200 dark:bg-slate-800 rounded-xl text-sm font-bold flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-4 w-full">
      
      {/* 1. THANH CÔNG CỤ (TOOLBAR) */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" placeholder="Tìm tên nhân viên, bảng dữ liệu..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select 
            value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="ALL">Tất cả Hành động</option>
            <option value="CREATE">Chỉ Tạo mới (Create)</option>
            <option value="UPDATE">Chỉ Cập nhật (Update)</option>
            <option value="DELETE">Chỉ Xóa/Hủy (Delete)</option>
          </select>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Hiển thị {logs.length} bản ghi
          </span>
          <button onClick={() => refetch()} disabled={isFetching} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-500/20 rounded-lg transition-colors">
            <RefreshCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. BẢNG DỮ LIỆU */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-slate-200 dark:bg-slate-800/50 rounded-xl w-full"></div>)}
          </div>
        ) : (
          <DataTable 
            data={logs} 
            columns={columns} 
            searchKey="tableName" // Thay đổi search key thành tableName
            searchPlaceholder="Tìm nhanh đối tượng..." 
            itemsPerPage={15} 
          />
        )}
      </div>

      {/* 3. MODAL XEM CHI TIẾT DIFF (TRƯỢT TỪ PHẢI SANG) */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex justify-end bg-slate-900/60 backdrop-blur-sm"
          >
            <div className="absolute inset-0" onClick={() => setSelectedLog(null)} />

            <motion.div
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              className="relative w-full sm:w-[600px] h-full bg-white dark:bg-[#0B0F19] shadow-2xl border-l border-slate-200 dark:border-white/10 flex flex-col z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                    <Code className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Chi tiết Dấu vết</h2>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedLog.logId}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-2 text-slate-400 hover:text-rose-500 rounded-full transition-colors bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-500/20">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                
                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><User className="w-3 h-3"/> Người thực hiện</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{selectedLog.user?.fullName || selectedLog.userId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Thời gian</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{dayjs(selectedLog.timestamp || selectedLog.createdAt).format('HH:mm:ss - DD/MM/YYYY')}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${getActionUI(selectedLog.action).color}`}>
                      {selectedLog.action || "UNKNOWN"}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedLog.tableName}</span>
                  </div>
                </div>

                {/* Diff Viewer (Data Viz) - Đồng bộ với schema.prisma (oldValues, newValues) */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500" /> Thay đổi Dữ liệu (Payload)
                  </h3>

                  {(!selectedLog.oldValues && !selectedLog.newValues) ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 text-sm">
                      Không có chi tiết thay đổi dữ liệu (Payload trống)
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Old Values (Màu đỏ nhạt) */}
                      {selectedLog.oldValues && (
                        <div className="flex flex-col rounded-xl overflow-hidden border border-rose-200 dark:border-rose-900/50">
                          <div className="bg-rose-50 dark:bg-rose-900/20 px-4 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 border-b border-rose-200 dark:border-rose-900/50">
                            Dữ liệu Cũ (Before)
                          </div>
                          <pre className="p-4 text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0d1321] overflow-x-auto scrollbar-thin">
                            {safeParseJSON(selectedLog.oldValues)}
                          </pre>
                        </div>
                      )}

                      {/* New Values (Màu xanh lá nhạt) */}
                      {selectedLog.newValues && (
                        <div className="flex flex-col rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-900/50 mt-2">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-900/50">
                            Dữ liệu Mới (After)
                          </div>
                          <pre className="p-4 text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0d1321] overflow-x-auto scrollbar-thin">
                            {safeParseJSON(selectedLog.newValues)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}