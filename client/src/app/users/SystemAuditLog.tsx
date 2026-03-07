"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  History, Search, Filter, AlertOctagon, RefreshCcw, 
  Database, User, Clock, Code, ShieldAlert,
  PlusCircle, Edit3, Trash2, LogIn, Download, Calendar, Activity // ĐÃ BỔ SUNG IMPORT ACTIVITY
} from "lucide-react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import 'dayjs/locale/vi';

// --- REDUX, API & COMPONENTS ---
import { useGetSystemAuditLogsQuery } from "@/state/api";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import Modal from "@/app/(components)/Modal";

// --- UTILS (TẬN DỤNG TỐI ĐA KHO TÀNG TIỆN ÍCH) ---
import { exportToCSV } from "@/utils/exportUtils";
import { formatDateTime, formatDate } from "@/utils/formatters";
import { safeJSONParse } from "@/utils/helpers";

dayjs.extend(isBetween);
dayjs.locale('vi');

// ==========================================
// HELPERS: DATA VIZ HÀNH ĐỘNG
// ==========================================
const getActionUI = (action: string) => {
  const act = action ? action.toUpperCase() : "UNKNOWN";
  if (act.includes("CREATE") || act.includes("ADD") || act.includes("POST")) 
    return { icon: PlusCircle, color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-200", label: "TẠO MỚI" };
  if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("PUT") || act.includes("RESET")) 
    return { icon: Edit3, color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 border-blue-200", label: "CẬP NHẬT" };
  if (act.includes("DELETE") || act.includes("REMOVE")) 
    return { icon: Trash2, color: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10 border-rose-200", label: "XÓA DỮ LIỆU" };
  if (act.includes("LOGIN") || act.includes("LOGOUT") || act.includes("AUTH") || act.includes("SECURITY")) 
    return { icon: LogIn, color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10 border-purple-200", label: "HỆ THỐNG / BẢO MẬT" };
  
  return { icon: Database, color: "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-500/10 border-slate-200", label: act };
};

// ==========================================
// COMPONENT CHÍNH: NHẬT KÝ HỆ THỐNG (AUDIT LOGS)
// ==========================================
export default function SystemAuditLog() {
  // --- STATE LỌC & TÌM KIẾM ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  // --- STATE MODAL ---
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // --- FETCH API ---
  const { data: rawLogs = [], isLoading, isError, refetch, isFetching } = useGetSystemAuditLogsQuery({ limit: 500 });

  // --- SMART FILTER ENGINE ---
  const logs = useMemo(() => {
    return rawLogs.filter((log: any) => {
      const searchLower = searchQuery.toLowerCase();
      const userName = (log.user?.fullName || log.userId || "").toLowerCase();
      const tableName = (log.tableName || "").toLowerCase();
      const actionName = (log.action || "").toLowerCase();
      
      const matchSearch = userName.includes(searchLower) || tableName.includes(searchLower) || actionName.includes(searchLower);
      const matchFilter = filterAction === "ALL" || actionName.toUpperCase().includes(filterAction);
      
      const logDate = dayjs(log.timestamp || log.createdAt);
      const matchDate = logDate.isAfter(dayjs(startDate).subtract(1, 'day')) && logDate.isBefore(dayjs(endDate).add(1, 'day'));

      return matchSearch && matchFilter && matchDate;
    });
  }, [rawLogs, searchQuery, filterAction, startDate, endDate]);

  // --- ỨNG DỤNG ENTERPRISE EXPORT UTILS ---
  const handleExportCSV = () => {
    // ĐÃ FIX LỖI TYPE BẰNG CÁCH ÉP KIỂU (l: any)
    const exportData = logs.map((l: any) => ({
      "Thời gian": formatDateTime(l.timestamp || l.createdAt),
      "ID Nhân viên": l.userId,
      "Tên Nhân viên": l.user?.fullName || "Hệ thống / Guest",
      "Hành động": l.action,
      "Bảng Dữ liệu (Module)": l.tableName,
      "Record ID": l.recordId || "N/A"
    }));

    exportToCSV(exportData, "System_Audit_Logs");
  };

  // --- CỘT DATATABLE ---
  const columns: ColumnDef<any>[] = [
    {
      header: "Thời gian",
      accessorKey: "timestamp",
      sortable: true,
      cell: (row) => {
        const timeVal = row.timestamp || row.createdAt;
        if (!timeVal) return <span>-</span>;
        return (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              {dayjs(timeVal).format('HH:mm:ss')}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {formatDate(timeVal)}
            </span>
          </div>
        );
      }
    },
    {
      header: "Nhân viên (Actioner)",
      accessorKey: "userId",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {row.user?.fullName || "Hệ thống"}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5">
              {row.userId ? row.userId.substring(0, 8) : "SYSTEM"}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Hành động (Action)",
      accessorKey: "action",
      cell: (row) => {
        const { label, icon: Icon, color } = getActionUI(row.action);
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border shadow-sm ${color}`}>
            <Icon className="w-3 h-3" /> {label}
          </span>
        );
      }
    },
    {
      header: "Bảng (Table) & Record",
      accessorKey: "tableName",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
            {row.tableName || "UNKNOWN"}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5" title={row.recordId}>
            ID: {row.recordId ? `${row.recordId.substring(0, 8)}...` : "N/A"}
          </span>
        </div>
      )
    },
    {
      header: "Chi tiết (Diff)",
      accessorKey: "logId",
      align: "right",
      cell: (row) => (
        <button 
          onClick={() => setSelectedLog(row)} 
          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-slate-700 dark:text-blue-400 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
        >
          <Code className="w-3.5 h-3.5" /> Xem Diff
        </button>
      )
    }
  ];

  // --- ANIMATION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

  if (isError) return (
    <div className="flex flex-col items-center justify-center py-20 text-center w-full glass-panel rounded-3xl border border-dashed border-rose-200 dark:border-rose-900/50">
      <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Lỗi truy xuất Audit Log</h2>
      <p className="text-sm text-slate-500 mb-6">Mất kết nối đến module giám sát. Vui lòng kiểm tra lại đường truyền.</p>
      <button onClick={() => refetch()} className="px-6 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg">
        <RefreshCcw className="w-4 h-4" /> Thử lại kết nối
      </button>
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
      
      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" placeholder="Tìm người dùng, table, action..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner text-slate-900 dark:text-white" 
            />
          </div>
          
          <select 
            value={filterAction} onChange={(e) => setFilterAction(e.target.value)} 
            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-indigo-500 shadow-inner"
          >
            <option value="ALL">Mọi Hành động (All)</option>
            <option value="CREATE">Chỉ Tạo mới (Create)</option>
            <option value="UPDATE">Chỉ Cập nhật (Update)</option>
            <option value="DELETE">Chỉ Xóa dữ liệu (Delete)</option>
            <option value="SECURITY">Cảnh báo Bảo mật (Security)</option>
          </select>
          
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl text-sm shadow-inner focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent outline-none text-slate-700 dark:text-slate-300 font-bold" />
            <span className="text-slate-300 dark:text-slate-600 font-black">-</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent outline-none text-slate-700 dark:text-slate-300 font-bold" />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
            {logs.length} bản ghi
          </span>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-500/30 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95" title="Xuất file CSV báo cáo">
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
          <button onClick={() => refetch()} disabled={isFetching} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-500/20 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-white/5 disabled:opacity-50">
            <RefreshCcw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* DATATABLE */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-white/10">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-14 bg-slate-200 dark:bg-slate-800/50 rounded-2xl w-full"></div>)}
          </div>
        ) : (
          <DataTable 
            data={logs} 
            columns={columns} 
            searchKey="tableName"
            searchPlaceholder="Gõ để Lọc nhanh theo Bảng dữ liệu..." 
            itemsPerPage={15} 
          />
        )}
      </div>

      {/* PORTAL MODAL VIEW DIFF: SỬ DỤNG COMPONENT <Modal> ĐỂ CHỐNG VỠ GIAO DIỆN */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Chi tiết Dấu vết Hệ thống (Audit Trail)"
        subtitle={`Log ID: ${selectedLog?.logId}`}
        icon={<Code className="w-6 h-6" />}
        maxWidth="max-w-6xl" // Layout siêu rộng để xem 2 cột JSON song song
      >
        {selectedLog && (
          <div className="p-6 md:p-8 flex flex-col gap-8 bg-slate-50/50 dark:bg-[#0a0f18]/50">
            
            {/* Meta Info Khối trên */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-white/5">
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-indigo-500"/> Người thao tác</p>
                <p className="text-base font-black text-slate-900 dark:text-white">{selectedLog.user?.fullName || selectedLog.userId}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-500"/> Thời điểm (Timestamp)</p>
                <p className="text-base font-black text-slate-900 dark:text-white">{formatDateTime(selectedLog.timestamp || selectedLog.createdAt)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-emerald-500"/> Target Database Table</p>
                <p className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wide">{selectedLog.tableName}</p>
              </div>
              <div className="flex flex-col gap-1.5 items-start">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Phân loại Operation</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm ${getActionUI(selectedLog.action).color}`}>
                  <Activity className="w-4 h-4" /> {selectedLog.action}
                </span>
              </div>
            </div>

            {/* JSON Diff Viewer (Side-by-side) - ỨNG DỤNG safeJSONParse TỪ UTILS */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-500" /> Đối chiếu Dữ liệu Thay đổi (JSON Payload Diff)
              </h3>
              
              {(!selectedLog.oldValues && !selectedLog.newValues) ? (
                <div className="p-12 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-slate-500 shadow-sm">
                  <Database className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
                  <span className="text-base font-bold text-slate-600 dark:text-slate-400">Không có cấu trúc Payload nào được đính kèm trong Log này.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Dữ liệu cũ (Before) */}
                  <div className="flex flex-col rounded-3xl overflow-hidden border border-rose-200 dark:border-rose-900/50 shadow-md">
                    <div className="bg-rose-50 dark:bg-rose-900/30 px-6 py-4 flex items-center justify-between border-b border-rose-200 dark:border-rose-900/50">
                      <span className="text-sm font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">Dữ liệu Nguyên bản (Before)</span>
                      <span className="font-mono text-xs font-bold text-rose-600 bg-white/50 dark:bg-black/20 px-2.5 py-1 rounded-md shadow-sm border border-rose-200/50">- Removed</span>
                    </div>
                    <pre className="flex-1 p-6 text-[13px] font-mono leading-relaxed text-slate-800 dark:text-slate-300 bg-white dark:bg-[#0B0F19] overflow-x-auto custom-scrollbar">
                      {safeJSONParse(selectedLog.oldValues, "null") === "null" ? "null" : JSON.stringify(safeJSONParse(selectedLog.oldValues, {}), null, 2)}
                    </pre>
                  </div>

                  {/* Dữ liệu mới (After) */}
                  <div className="flex flex-col rounded-3xl overflow-hidden border border-emerald-200 dark:border-emerald-900/50 shadow-md">
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 px-6 py-4 flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/50">
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Dữ liệu Sau cập nhật (After)</span>
                      <span className="font-mono text-xs font-bold text-emerald-600 bg-white/50 dark:bg-black/20 px-2.5 py-1 rounded-md shadow-sm border border-emerald-200/50">+ Added</span>
                    </div>
                    <pre className="flex-1 p-6 text-[13px] font-mono leading-relaxed text-slate-800 dark:text-slate-300 bg-white dark:bg-[#0B0F19] overflow-x-auto custom-scrollbar">
                      {safeJSONParse(selectedLog.newValues, "null") === "null" ? "null" : JSON.stringify(safeJSONParse(selectedLog.newValues, {}), null, 2)}
                    </pre>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

    </motion.div>
  );
}