"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  CheckCircle2, XCircle, Clock, FileText, 
  Search, AlertOctagon, RefreshCcw, DollarSign,
  ShieldCheck, User, Eye, RotateCcw, Download,
  SlidersHorizontal, ChevronDown, Filter
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetPendingApprovalsQuery,
  useGetMyRequestsQuery,
  ApprovalRequest
} from "@/state/api";

// --- UTILS (SIÊU VŨ KHÍ) ---
import { formatVND, timeAgo, formatDateTime } from "@/utils/formatters";
import { exportToCSV } from "@/utils/exportUtils";
import { cn } from "@/utils/helpers";

// --- COMPONENTS ---
import Header from "@/app/(components)/Header";
import ApprovalDetail from "./ApprovalDetail";
import ActionModal, { ActionConfig } from "./ActionModal";

// ==========================================
// 1. HELPERS & FORMATTERS (DATA VIZ)
// ==========================================
const getDocumentTypeUI = (type?: string) => {
  switch (type) {
    case "PO": return { label: "Đơn Mua Hàng", color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/30" };
    case "SO": return { label: "Đơn Bán Hàng", color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30" };
    case "EXPENSE": return { label: "Phiếu Chi", color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30" };
    case "INVENTORY": return { label: "Phiếu Kho", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30" };
    default: return { label: "Tờ trình Khác", color: "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-500/10 dark:border-slate-500/30" };
  }
};

type BoardType = "PENDING_APPROVALS" | "MY_REQUESTS";

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const ApprovalsSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-3xl h-[600px]">
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
          <div className="h-40 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm"></div>
          <div className="h-40 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm"></div>
        </div>
      ))}
    </div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: TRUNG TÂM PHÊ DUYỆT (KANBAN)
// ==========================================
export default function ApprovalsPage() {
  const { t } = useTranslation();

  // --- STATE ---
  const [activeBoard, setActiveBoard] = useState<BoardType>("PENDING_APPROVALS");
  const [searchQuery, setSearchQuery] = useState("");
  
  // 🚀 STATE BỘ LỌC NÂNG CAO 
  const [showFilters, setShowFilters] = useState(false);
  const [filterDocType, setFilterDocType] = useState("ALL");
  
  // State quản lý Modals
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [actionConfig, setActionConfig] = useState<ActionConfig | null>(null);

  // 👉 FETCH DATA TỪ API
  const { data: pendingApprovals = [], isLoading: loadingPending, isError, refetch } = useGetPendingApprovalsQuery(undefined, { skip: activeBoard !== "PENDING_APPROVALS" });
  const { data: myRequests = [], isLoading: loadingMyReqs } = useGetMyRequestsQuery(undefined, { skip: activeBoard !== "MY_REQUESTS" });
  
  const isLoading = activeBoard === "PENDING_APPROVALS" ? loadingPending : loadingMyReqs;

  // --- 🚀 XỬ LÝ LỌC KANBAN BOARD (Bao gồm Advanced Filters) ---
  const boardData = activeBoard === "PENDING_APPROVALS" ? pendingApprovals : myRequests;
  
  const filteredData = useMemo(() => {
    return boardData.filter(req => {
      // 1. Lọc theo Text (Tên, Người gửi, Mã số)
      const matchSearch = 
        req.workflow?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requester?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.document?.documentNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Lọc theo Loại chứng từ
      const matchDocType = filterDocType === "ALL" || req.document?.type === filterDocType;

      return matchSearch && matchDocType;
    });
  }, [boardData, searchQuery, filterDocType]);

  const columns = useMemo(() => ({
    PENDING: filteredData.filter(req => req.status === "PENDING"),
    APPROVED: filteredData.filter(req => req.status === "APPROVED"),
    REJECTED: filteredData.filter(req => req.status === "REJECTED"),
  }), [filteredData]);

  const summary = {
    pending: columns.PENDING.length,
    approved: columns.APPROVED.length,
    rejected: columns.REJECTED.length,
  };

  // --- EXPORT DATA LOGIC ---
  const handleExportData = () => {
    if (filteredData.length === 0) {
      toast.error("Không có dữ liệu để xuất!");
      return;
    }

    const exportData = filteredData.map(req => ({
      "Mã Chứng từ/Ref": req.document?.documentNumber || "N/A",
      "Loại": getDocumentTypeUI(req.document?.type).label,
      "Tên Quy trình": req.workflow?.name,
      "Người đệ trình": req.requester?.fullName || "Hệ thống",
      "Giá trị (VND)": req.document?.totalAmount || req.document?.amount || 0,
      "Trạng thái": req.status === "PENDING" ? "Đang chờ" : req.status === "APPROVED" ? "Đã duyệt" : "Bị từ chối",
      "Ngày tạo": formatDateTime(req.createdAt)
    }));

    exportToCSV(exportData, `Bang_Ke_Phe_Duyet_${activeBoard}`);
    toast.success("Đã xuất file thành công!");
  };

  // --- ANIMATION CONFIG ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const cardVariants: Variants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } } };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Lỗi truy xuất hệ thống Phê duyệt</h2>
        <button onClick={() => refetch()} className="px-6 py-3 mt-4 bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 flex items-center gap-2"><RefreshCcw className="w-5 h-5" /> Tải lại dữ liệu</button>
      </div>
    );
  }

  // --- COMPONENT THẺ TỜ TRÌNH (KANBAN CARD) ---
  const ApprovalCard = ({ req }: { req: ApprovalRequest }) => {
    const docType = req.document?.type;
    const docNumber = req.document?.documentNumber || "N/A";
    const amount = req.document?.totalAmount || req.document?.amount || 0;
    const docTypeUI = getDocumentTypeUI(docType);

    return (
      <motion.div 
        layoutId={`card-${req.requestId}`} 
        variants={cardVariants}
        initial="hidden" animate="show" exit={{ opacity: 0, scale: 0.9 }}
        className="flex flex-col p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
      >
        <div className="flex justify-between items-start mb-3">
          <span className={cn("text-[10px] font-bold px-2 py-1 rounded-md border uppercase tracking-wider", docTypeUI.color)}>
            {docTypeUI.label}
          </span>
          <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeAgo(req.createdAt)}
          </span>
        </div>

        <div 
          className="cursor-pointer group-hover:text-blue-600 transition-colors"
          onClick={() => setSelectedRequestId(req.requestId)}
        >
          <h4 className="font-bold text-slate-900 dark:text-white mb-1 leading-tight text-sm">
            {req.workflow?.name || "Yêu cầu Phê duyệt Hệ thống"}
          </h4>
          <p className="text-[11px] text-slate-500 mb-3 font-mono">
            Ref: {docNumber}
          </p>
        </div>

        {amount > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-lg font-black text-slate-800 dark:text-slate-200">
              {formatVND(amount)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-4 pt-3 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
              <User className="w-3 h-3 text-slate-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                {req.requester?.fullName || "Hệ thống ERP"}
              </span>
              <span className="text-[9px] text-slate-400">Step {req.currentStep}</span>
            </div>
          </div>
          
          <button 
            onClick={() => setSelectedRequestId(req.requestId)}
            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
            title="Xem chi tiết Tờ trình"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* CÁC NÚT HÀNH ĐỘNG DỰA TRÊN NGỮ CẢNH */}
        {req.status === "PENDING" && (
          <div className="mt-auto">
            {activeBoard === "PENDING_APPROVALS" ? (
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setActionConfig({ type: "REJECT", targetId: req.requestId, referenceCode: docNumber })}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 rounded-xl transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Từ chối
                </button>
                <button 
                  onClick={() => setActionConfig({ type: "APPROVE", targetId: req.requestId, referenceCode: docNumber })}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 rounded-xl transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setActionConfig({ type: "CANCEL", targetId: req.requestId, referenceCode: docNumber })}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Thu hồi Tờ trình
              </button>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-10 h-full">
      
      {/* 1. HEADER & ĐIỀU HƯỚNG TABS */}
      <Header 
        title={t("Trung tâm Phê duyệt (Approvals)")} 
        subtitle={t("Bảng điều khiển quyết định phê duyệt chứng từ và quy trình nghiệp vụ.")}
        rightNode={
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportData}
              className="px-4 py-2.5 flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất Dữ liệu</span>
            </button>
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-white/5 overflow-x-auto">
              <button 
                onClick={() => setActiveBoard("PENDING_APPROVALS")} 
                className={cn(
                  "relative px-4 py-2 text-sm font-bold rounded-lg transition-colors z-10 flex items-center gap-2 whitespace-nowrap",
                  activeBoard === "PENDING_APPROVALS" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {activeBoard === "PENDING_APPROVALS" && <motion.div layoutId="appTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-lg -z-10" />}
                <ShieldCheck className="w-4 h-4" /> Cần Tôi Duyệt
              </button>
              <button 
                onClick={() => setActiveBoard("MY_REQUESTS")} 
                className={cn(
                  "relative px-4 py-2 text-sm font-bold rounded-lg transition-colors z-10 flex items-center gap-2 whitespace-nowrap",
                  activeBoard === "MY_REQUESTS" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {activeBoard === "MY_REQUESTS" && <motion.div layoutId="appTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-lg -z-10" />}
                <FileText className="w-4 h-4" /> Tờ trình của Tôi
              </button>
            </div>
          </div>
        }
      />

      {/* 2. THANH TÌM KIẾM, LỌC NÂNG CAO & THỐNG KÊ */}
      <div className="flex flex-col gap-3 w-full">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm mã tờ trình, người gửi..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-slate-900 dark:text-white"
              />
            </div>
            
            {/* 🚀 NÚT TOGGLE BỘ LỌC NÂNG CAO */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm whitespace-nowrap border",
                showFilters 
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30" 
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc nâng cao
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showFilters && "rotate-180")} />
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm font-bold">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg"><Clock className="w-4 h-4"/> {summary.pending} Chờ</span>
            <span className="hidden sm:flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4"/> {summary.approved} Đã duyệt</span>
          </div>
        </div>

        {/* 🚀 KHU VỰC BỘ LỌC (ANIMATED) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-white/5 rounded-2xl flex flex-wrap gap-4">
                <div className="w-full sm:w-64">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Loại Chứng từ</label>
                  <div className="relative group">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <select 
                      value={filterDocType} onChange={(e) => setFilterDocType(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="ALL">Tất cả loại tờ trình</option>
                      <option value="PO">Đơn Mua Hàng (PO)</option>
                      <option value="SO">Đơn Bán Hàng (SO)</option>
                      <option value="EXPENSE">Phiếu Chi (Expense)</option>
                      <option value="INVENTORY">Phiếu Kho (Inventory)</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. KANBAN BOARD */}
      {isLoading ? <ApprovalsSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex-1 min-h-0">
          <div className="flex flex-col lg:flex-row gap-6 h-full items-start overflow-x-auto pb-4 scrollbar-hide">
            
            {/* CỘT 1: PENDING */}
            <div className="flex-1 min-w-[300px] flex flex-col gap-4 bg-slate-50/50 dark:bg-[#0B0F19]/50 rounded-3xl p-4 border border-slate-100 dark:border-white/5 h-full max-h-[75vh]">
              <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2 uppercase tracking-wider text-sm">
                  <Clock className="w-4 h-4" /> Đang chờ duyệt
                </h3>
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 text-xs font-bold">{summary.pending}</span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 pb-10 px-1">
                <AnimatePresence>
                  {columns.PENDING.map(req => <ApprovalCard key={req.requestId} req={req} />)}
                  {columns.PENDING.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl text-slate-400 text-sm font-medium">Danh sách trống</div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* CỘT 2: APPROVED */}
            <div className="flex-1 min-w-[300px] flex flex-col gap-4 bg-slate-50/50 dark:bg-[#0B0F19]/50 rounded-3xl p-4 border border-slate-100 dark:border-white/5 h-full max-h-[75vh]">
              <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-2 uppercase tracking-wider text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Đã Phê duyệt
                </h3>
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-200 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-bold">{summary.approved}</span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 pb-10 px-1">
                <AnimatePresence>
                  {columns.APPROVED.map(req => <ApprovalCard key={req.requestId} req={req} />)}
                  {columns.APPROVED.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl text-slate-400 text-sm font-medium">Trống</div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* CỘT 3: REJECTED */}
            <div className="flex-1 min-w-[300px] flex flex-col gap-4 bg-slate-50/50 dark:bg-[#0B0F19]/50 rounded-3xl p-4 border border-slate-100 dark:border-white/5 h-full max-h-[75vh]">
              <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="font-bold text-rose-600 dark:text-rose-500 flex items-center gap-2 uppercase tracking-wider text-sm">
                  <XCircle className="w-4 h-4" /> Đã Từ chối
                </h3>
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-rose-200 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 text-xs font-bold">{summary.rejected}</span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 pb-10 px-1">
                <AnimatePresence>
                  {columns.REJECTED.map(req => <ApprovalCard key={req.requestId} req={req} />)}
                  {columns.REJECTED.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl text-slate-400 text-sm font-medium">Trống</div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* ==========================================
          4. NHÚNG CÁC MODALS ĐA NĂNG
          ========================================== */}
      
      {/* 4.1. Modal Xử lý Hành động (Duyệt/Từ chối/Rút đơn) */}
      <ActionModal 
        config={actionConfig} 
        isOpen={!!actionConfig} 
        onClose={() => setActionConfig(null)} 
      />

      {/* 4.2. Modal Xem chi tiết Tờ trình & Lịch sử */}
      <ApprovalDetail 
        requestId={selectedRequestId} 
        isOpen={!!selectedRequestId} 
        onClose={() => setSelectedRequestId(null)} 
      />

    </div>
  );
}