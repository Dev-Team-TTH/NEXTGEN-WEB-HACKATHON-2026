"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  CheckCircle2, XCircle, Clock, FileText, 
  Search, AlertOctagon, RefreshCcw, DollarSign,
  ShieldCheck, User, Eye, RotateCcw, Download,
  SlidersHorizontal, ChevronDown, Filter
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; 
import { 
  useGetPendingApprovalsQuery,
  useGetMyRequestsQuery,
  ApprovalRequest
} from "@/state/api";

// --- UTILS (SIÊU VŨ KHÍ) ---
import { formatVND, timeAgo, formatDateTime } from "@/utils/formatters";
import { exportTableToExcel } from "@/utils/exportUtils"; // 🚀 NÂNG CẤP LÊN ENGINE XUẤT EXCEL THÔNG MINH
import { cn } from "@/utils/helpers";

// --- COMPONENTS ---
import ApprovalDetail from "./ApprovalDetail";
import ActionModal, { ActionConfig } from "./ActionModal";

// ==========================================
// 1. HELPERS & FORMATTERS (DATA VIZ)
// ==========================================
const getDocumentTypeUI = (type?: string) => {
  switch (type) {
    case "PO": return { label: "Đơn Mua Hàng", color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30" };
    case "SO": return { label: "Đơn Bán Hàng", color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30" };
    case "EXPENSE": return { label: "Phiếu Chi", color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30" };
    case "INVENTORY": return { label: "Phiếu Kho", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" };
    default: return { label: "Tờ trình Khác", color: "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30" };
  }
};

type BoardType = "PENDING_APPROVALS" | "MY_REQUESTS";

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const ApprovalsSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6 transition-all duration-500 ease-in-out">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-3xl h-[600px] transition-all duration-500 ease-in-out">
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4 transition-all duration-500 ease-in-out"></div>
          <div className="h-40 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm transition-all duration-500 ease-in-out"></div>
          <div className="h-40 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm transition-all duration-500 ease-in-out"></div>
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

  // 🚀 LÁ CHẮN HYDRATION: Bảo vệ tiến trình vẽ UI
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🚀 BỐI CẢNH REDUX (CONTEXT ISOLATION)
  const { activeBranchId } = useAppSelector((state: any) => state.global);

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
  const { data: pendingApprovals = [], isLoading: loadingPending, isError, refetch, isFetching: fetchingPending } = useGetPendingApprovalsQuery(
    { branchId: activeBranchId } as any, 
    { skip: activeBoard !== "PENDING_APPROVALS" || !activeBranchId }
  );
  
  const { data: myRequests = [], isLoading: loadingMyReqs, isFetching: fetchingMy } = useGetMyRequestsQuery(
    { branchId: activeBranchId } as any, 
    { skip: activeBoard !== "MY_REQUESTS" || !activeBranchId }
  );
  
  const isLoading = activeBoard === "PENDING_APPROVALS" ? loadingPending : loadingMyReqs;
  const isFetching = fetchingPending || fetchingMy;

  // --- 🚀 XỬ LÝ LỌC KANBAN BOARD ---
  const boardData = activeBoard === "PENDING_APPROVALS" ? pendingApprovals : myRequests;
  
  const filteredData = useMemo(() => {
    return boardData.filter(req => {
      const matchSearch = 
        req.workflow?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requester?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.document?.documentNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      
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

  // --- 🚀 ĐỘNG CƠ EXPORT SMART EXCEL ---
  const handleExportData = () => {
    if (filteredData.length === 0) {
      toast.error("Không có dữ liệu để xuất!");
      return;
    }
    exportTableToExcel("smart-approvals-report", `Bao_Cao_Phe_Duyet_${activeBoard}_${dayjs().format('DDMMYYYY')}`);
    toast.success("Đã xuất Báo cáo Phê duyệt thành công!");
  };

  // --- ANIMATION CONFIG ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const cardVariants: Variants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } } };

  // 🚀 LÁ CHẮN HYDRATION UI
  if (!isMounted) return <ApprovalsSkeleton />;

  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
        <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse transition-all duration-500 ease-in-out" />
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-50 mb-2 transition-all duration-500 ease-in-out">Chưa chọn Chi nhánh</h2>
        <p className="text-slate-500 dark:text-slate-400 transition-all duration-500 ease-in-out">Vui lòng chọn Chi nhánh hoạt động ở góc trên màn hình để tải Trung tâm Phê duyệt.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse transition-all duration-500 ease-in-out" />
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-50 mb-2 transition-all duration-500 ease-in-out">Lỗi truy xuất hệ thống Phê duyệt</h2>
        <button onClick={() => refetch()} className="px-6 py-3 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 transition-all duration-500 ease-in-out">
          <RefreshCcw className={cn("w-5 h-5 transition-all duration-500 ease-in-out", isFetching && "animate-spin")} /> Tải lại dữ liệu
        </button>
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
        className="flex flex-col p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden duration-500 ease-in-out"
      >
        <div className="flex justify-between items-start mb-3 transition-all duration-500 ease-in-out">
          <span className={cn("text-[10px] font-bold px-2 py-1 rounded-md border uppercase tracking-wider transition-all duration-500 ease-in-out", docTypeUI.color)}>
            {docTypeUI.label}
          </span>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1 transition-all duration-500 ease-in-out">
            <Clock className="w-3 h-3 transition-all duration-500 ease-in-out" /> {timeAgo(req.createdAt)}
          </span>
        </div>

        <div 
          className="cursor-pointer group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-500 ease-in-out"
          onClick={() => setSelectedRequestId(req.requestId)}
        >
          <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1 leading-tight text-sm transition-all duration-500 ease-in-out">
            {req.workflow?.name || "Yêu cầu Phê duyệt Hệ thống"}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 font-mono transition-all duration-500 ease-in-out">
            Ref: {docNumber}
          </p>
        </div>

        {amount > 0 && (
          <div className="mb-4 flex items-center gap-2 transition-all duration-500 ease-in-out">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg transition-all duration-500 ease-in-out">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 transition-all duration-500 ease-in-out" />
            </div>
            <span className="text-lg font-black text-slate-800 dark:text-slate-200 transition-all duration-500 ease-in-out">
              {formatVND(amount)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 transition-all duration-500 ease-in-out">
          <div className="flex items-center gap-2 transition-all duration-500 ease-in-out">
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 transition-all duration-500 ease-in-out">
              <User className="w-3 h-3 text-slate-500 dark:text-slate-400 transition-all duration-500 ease-in-out" />
            </div>
            <div className="flex flex-col transition-all duration-500 ease-in-out">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px] transition-all duration-500 ease-in-out">
                {req.requester?.fullName || "Hệ thống ERP"}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 transition-all duration-500 ease-in-out">Step {req.currentStep}</span>
            </div>
          </div>
          
          <button 
            onClick={() => setSelectedRequestId(req.requestId)}
            className="p-1.5 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-all duration-500 ease-in-out"
            title="Xem chi tiết Tờ trình"
          >
            <Eye className="w-4 h-4 transition-all duration-500 ease-in-out" />
          </button>
        </div>

        {req.status === "PENDING" && (
          <div className="mt-auto transition-all duration-500 ease-in-out">
            {activeBoard === "PENDING_APPROVALS" ? (
              <div className="grid grid-cols-2 gap-2 transition-all duration-500 ease-in-out">
                <button 
                  onClick={() => setActionConfig({ type: "REJECT", targetId: req.requestId, referenceCode: docNumber })}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 rounded-xl transition-all duration-500 ease-in-out"
                >
                  <XCircle className="w-3.5 h-3.5 transition-all duration-500 ease-in-out" /> Từ chối
                </button>
                <button 
                  onClick={() => setActionConfig({ type: "APPROVE", targetId: req.requestId, referenceCode: docNumber })}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 rounded-xl transition-all duration-500 ease-in-out active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 transition-all duration-500 ease-in-out" /> Duyệt
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setActionConfig({ type: "CANCEL", targetId: req.requestId, referenceCode: docNumber })}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 rounded-xl transition-all duration-500 ease-in-out"
              >
                <RotateCcw className="w-3.5 h-3.5 transition-all duration-500 ease-in-out" /> Thu hồi Tờ trình
              </button>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-10 h-full transition-all duration-500 ease-in-out">
      
      {/* 🚀 1. ĐẠI TU HEADER & BỌC THÉP FLEXBOX */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }} 
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5 mb-6 sm:mb-8 md:mb-10 transform-gpu will-change-transform w-full transition-all duration-500 ease-in-out"
      >
        <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 w-24 h-24 sm:w-32 sm:h-32 bg-blue-500/15 dark:bg-blue-500/20 rounded-full blur-2xl sm:blur-3xl pointer-events-none z-0 transition-all duration-500 ease-in-out" />
        
        <div className="relative z-10 flex items-stretch gap-3 sm:gap-4 w-full md:w-auto min-w-0 transition-all duration-500 ease-in-out flex-1">
          <div className="w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_8px_rgba(79,70,229,0.4)] dark:shadow-[0_0_16px_rgba(79,70,229,0.3)] transition-all duration-500 ease-in-out" />
          
          <div className="flex flex-col justify-center py-0.5 min-w-0 transition-all duration-500 ease-in-out w-full">
            <h1 className="text-xl sm:text-2xl md:text-[28px] lg:text-3xl font-black tracking-tight text-slate-800 dark:text-slate-50 leading-tight sm:leading-none truncate break-words transition-all duration-500 ease-in-out">
              {t("Trung tâm Phê duyệt (Approvals)")}
            </h1>
            <p className="text-xs sm:text-[13px] md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-1.5 md:mt-2 flex items-center gap-2 max-w-full md:max-w-xl leading-relaxed transition-all duration-500 ease-in-out">
              {t("Bảng điều khiển quyết định phê duyệt chứng từ và quy trình nghiệp vụ.")}
            </p>
          </div>
        </div>

        <div className="relative z-10 w-full md:w-auto shrink-0 flex flex-row items-center justify-start md:justify-end gap-2.5 sm:gap-3 mt-2 md:mt-0 overflow-x-auto scrollbar-hide pb-1 md:pb-0 transition-all duration-500 ease-in-out">
          <button 
            onClick={handleExportData}
            className="px-4 py-2.5 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all active:scale-95 whitespace-nowrap border border-slate-200 dark:border-slate-700 shadow-sm text-sm font-bold duration-500 ease-in-out"
          >
            <Download className="w-4 h-4 transition-all duration-500 ease-in-out" />
            <span className="hidden sm:inline transition-all duration-500 ease-in-out">Xuất Dữ liệu</span>
          </button>
          
          <div className="flex items-center gap-1 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-500 ease-in-out">
            <button 
              onClick={() => setActiveBoard("PENDING_APPROVALS")} 
              className={cn(
                "relative px-4 py-2 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out",
                activeBoard === "PENDING_APPROVALS" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              )}
            >
              {activeBoard === "PENDING_APPROVALS" && <motion.div layoutId="appTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-xl -z-10 border border-slate-200/50 dark:border-slate-600 transition-all duration-500 ease-in-out" />}
              <ShieldCheck className="w-4 h-4 transition-all duration-500 ease-in-out" /> Cần Tôi Duyệt
            </button>
            <button 
              onClick={() => setActiveBoard("MY_REQUESTS")} 
              className={cn(
                "relative px-4 py-2 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out",
                activeBoard === "MY_REQUESTS" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              )}
            >
              {activeBoard === "MY_REQUESTS" && <motion.div layoutId="appTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-xl -z-10 border border-slate-200/50 dark:border-slate-600 transition-all duration-500 ease-in-out" />}
              <FileText className="w-4 h-4 transition-all duration-500 ease-in-out" /> Tờ trình của Tôi
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. THANH TÌM KIẾM, LỌC NÂNG CAO & THỐNG KÊ */}
      <div className="flex flex-col gap-3 w-full transition-all duration-500 ease-in-out">
        <div className="flex flex-wrap gap-4 items-center justify-between transition-all duration-500 ease-in-out">
          
          <div className="flex flex-wrap items-center gap-3 flex-1 transition-all duration-500 ease-in-out">
            <div className="relative w-full md:w-96 transition-all duration-500 ease-in-out">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-all duration-500 ease-in-out" />
              <input 
                type="text" 
                placeholder="Tìm kiếm mã tờ trình, người gửi..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-slate-900 dark:text-white transition-all duration-500 ease-in-out"
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm whitespace-nowrap border duration-500 ease-in-out",
                showFilters 
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30" 
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              <SlidersHorizontal className="w-4 h-4 transition-all duration-500 ease-in-out" />
              Bộ lọc nâng cao
              <ChevronDown className={cn("w-4 h-4 transition-all duration-500 ease-in-out", showFilters && "rotate-180")} />
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm font-bold transition-all duration-500 ease-in-out">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 rounded-lg transition-all duration-500 ease-in-out"><Clock className="w-4 h-4 transition-all duration-500 ease-in-out"/> {summary.pending} Chờ</span>
            <span className="hidden sm:flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-lg transition-all duration-500 ease-in-out"><CheckCircle2 className="w-4 h-4 transition-all duration-500 ease-in-out"/> {summary.approved} Đã duyệt</span>
          </div>
        </div>

        {/* KHU VỰC BỘ LỌC (ANIMATED) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden transition-all duration-500 ease-in-out"
            >
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl flex flex-wrap gap-4 transition-all duration-500 ease-in-out">
                <div className="w-full sm:w-64 transition-all duration-500 ease-in-out">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block transition-all duration-500 ease-in-out">Loại Chứng từ</label>
                  <div className="relative group transition-all duration-500 ease-in-out">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-all duration-500 ease-in-out" />
                    <select 
                      value={filterDocType} onChange={(e) => setFilterDocType(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white duration-500 ease-in-out"
                    >
                      <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="ALL">Tất cả loại tờ trình</option>
                      <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="PO">Đơn Mua Hàng (PO)</option>
                      <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="SO">Đơn Bán Hàng (SO)</option>
                      <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="EXPENSE">Phiếu Chi (Expense)</option>
                      <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="INVENTORY">Phiếu Kho (Inventory)</option>
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
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex-1 min-h-0 transition-all duration-500 ease-in-out">
          <div className="flex flex-col lg:flex-row gap-6 h-full items-start overflow-x-auto pb-4 scrollbar-hide transition-all duration-500 ease-in-out">
            
            {/* CỘT 1: PENDING */}
            <div className="flex-1 min-w-[300px] flex flex-col gap-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 h-full max-h-[75vh] transition-all duration-500 ease-in-out shadow-sm">
              <div className="flex items-center justify-between mb-2 px-2 transition-all duration-500 ease-in-out">
                <h3 className="font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2 uppercase tracking-wider text-sm transition-all duration-500 ease-in-out">
                  <Clock className="w-4 h-4 transition-all duration-500 ease-in-out" /> Đang chờ duyệt
                </h3>
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-xs font-bold transition-all duration-500 ease-in-out">{summary.pending}</span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 pb-10 px-1 transition-all duration-500 ease-in-out">
                <AnimatePresence>
                  {columns.PENDING.map(req => <ApprovalCard key={req.requestId} req={req} />)}
                  {columns.PENDING.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 dark:text-slate-500 text-sm font-medium transition-all duration-500 ease-in-out">Danh sách trống</div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* CỘT 2: APPROVED */}
            <div className="flex-1 min-w-[300px] flex flex-col gap-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 h-full max-h-[75vh] transition-all duration-500 ease-in-out shadow-sm">
              <div className="flex items-center justify-between mb-2 px-2 transition-all duration-500 ease-in-out">
                <h3 className="font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-2 uppercase tracking-wider text-sm transition-all duration-500 ease-in-out">
                  <CheckCircle2 className="w-4 h-4 transition-all duration-500 ease-in-out" /> Đã Phê duyệt
                </h3>
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold transition-all duration-500 ease-in-out">{summary.approved}</span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 pb-10 px-1 transition-all duration-500 ease-in-out">
                <AnimatePresence>
                  {columns.APPROVED.map(req => <ApprovalCard key={req.requestId} req={req} />)}
                  {columns.APPROVED.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 dark:text-slate-500 text-sm font-medium transition-all duration-500 ease-in-out">Trống</div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* CỘT 3: REJECTED */}
            <div className="flex-1 min-w-[300px] flex flex-col gap-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 h-full max-h-[75vh] transition-all duration-500 ease-in-out shadow-sm">
              <div className="flex items-center justify-between mb-2 px-2 transition-all duration-500 ease-in-out">
                <h3 className="font-bold text-rose-600 dark:text-rose-500 flex items-center gap-2 uppercase tracking-wider text-sm transition-all duration-500 ease-in-out">
                  <XCircle className="w-4 h-4 transition-all duration-500 ease-in-out" /> Đã Từ chối
                </h3>
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-xs font-bold transition-all duration-500 ease-in-out">{summary.rejected}</span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 pb-10 px-1 transition-all duration-500 ease-in-out">
                <AnimatePresence>
                  {columns.REJECTED.map(req => <ApprovalCard key={req.requestId} req={req} />)}
                  {columns.REJECTED.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 dark:text-slate-500 text-sm font-medium transition-all duration-500 ease-in-out">Trống</div>
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
      
      <ActionModal 
        config={actionConfig} 
        isOpen={!!actionConfig} 
        onClose={() => setActionConfig(null)} 
      />

      <ApprovalDetail 
        requestId={selectedRequestId} 
        isOpen={!!selectedRequestId} 
        onClose={() => setSelectedRequestId(null)} 
      />

      {/* ==========================================
          BẢNG ẨN DÙNG ĐỂ XUẤT BÁO CÁO KANBAN (SMART EXCEL)
          ========================================== */}
      <div className="hidden transition-all duration-500 ease-in-out">
        <table id="smart-approvals-report">
          <thead>
            <tr>
              <th colSpan={7} style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#1e293b', color: '#ffffff', padding: '15px' }}>
                BẢNG KÊ QUY TRÌNH PHÊ DUYỆT (KANBAN)
              </th>
            </tr>
            <tr>
              <th colSpan={7} style={{ textAlign: 'center', fontStyle: 'italic', padding: '10px' }}>
                Phân hệ: {activeBoard === "PENDING_APPROVALS" ? "Cần Tôi Duyệt" : "Tờ Trình Của Tôi"} | Ngày xuất: {dayjs().format('DD/MM/YYYY HH:mm')}
              </th>
            </tr>
            <tr>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Mã Chứng từ/Ref</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Loại</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Tên Quy trình</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Người đệ trình</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Giá trị (VND)</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Trạng thái</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((req: any, idx: number) => (
              <tr key={`app-${idx}`}>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1', msoNumberFormat: '\@' } as any}>{req.document?.documentNumber || "N/A"}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{getDocumentTypeUI(req.document?.type).label}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{req.workflow?.name}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{req.requester?.fullName || "Hệ thống"}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#3b82f6' }}>{req.document?.totalAmount || req.document?.amount || 0}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: req.status === "PENDING" ? '#f59e0b' : req.status === "APPROVED" ? '#10b981' : '#f43f5e' }}>
                  {req.status === "PENDING" ? "Đang chờ" : req.status === "APPROVED" ? "Đã duyệt" : "Bị từ chối"}
                </td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{formatDateTime(req.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}