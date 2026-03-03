"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, FileText, Clock, CheckCircle2, XCircle, 
  User, Loader2, AlertOctagon, DollarSign, 
  AlignLeft, Package, MessageSquare, ArrowRight, ShieldCheck
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";
import 'dayjs/locale/vi';

// --- REDUX & API ---
import { 
  useGetApprovalByIdQuery, 
  useGetApprovalLogsQuery,
  useProcessApprovalMutation 
} from "@/state/api";

dayjs.locale('vi');

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const getStatusUI = (status?: string) => {
  switch (status) {
    case "APPROVED": return { label: "Đã Phê duyệt", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20" };
    case "REJECTED": return { label: "Đã Từ chối", icon: XCircle, color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20" };
    case "PENDING": return { label: "Đang Chờ", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20" };
    default: return { label: "Không xác định", icon: FileText, color: "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-500/10 dark:border-slate-500/20" };
  }
};

const getActionUI = (action: string) => {
  switch (action) {
    case "APPROVE": return { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-500/20" };
    case "REJECT": return { icon: XCircle, color: "text-rose-500 bg-rose-100 dark:bg-rose-500/20" };
    case "SUBMIT": return { icon: ArrowRight, color: "text-blue-500 bg-blue-100 dark:bg-blue-500/20" };
    default: return { icon: ShieldCheck, color: "text-slate-500 bg-slate-100 dark:bg-slate-500/20" };
  }
};

// ==========================================
// COMPONENT: CHI TIẾT TỜ TRÌNH PHÊ DUYỆT
// ==========================================
interface ApprovalDetailProps {
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ApprovalDetail({ requestId, isOpen, onClose }: ApprovalDetailProps) {
  // --- API HOOKS ---
  const { data: request, isLoading: loadingReq } = useGetApprovalByIdQuery(requestId || "", { skip: !requestId || !isOpen });
  const { data: logs = [], isLoading: loadingLogs } = useGetApprovalLogsQuery(requestId || "", { skip: !requestId || !isOpen });
  const [processApproval, { isLoading: isProcessing }] = useProcessApprovalMutation();

  // --- LOCAL STATE CỦA INLINE ACTION ---
  const [actionComment, setActionComment] = useState("");
  const [activeAction, setActiveAction] = useState<"APPROVE" | "REJECT" | null>(null);

  // --- HANDLERS ---
  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !actionComment.trim()) {
      toast.error("Vui lòng nhập lý do từ chối để nhân sự điều chỉnh!");
      return;
    }
    
    if (window.confirm(`Bạn chắc chắn muốn ${action === "APPROVE" ? "PHÊ DUYỆT" : "TỪ CHỐI"} tờ trình này?`)) {
      try {
        await processApproval({
          id: requestId!,
          action,
          comment: actionComment
        }).unwrap();
        
        toast.success(action === "APPROVE" ? "Đã phê duyệt tờ trình!" : "Đã từ chối tờ trình!");
        onClose();
      } catch (error: any) {
        toast.error(error?.data?.message || "Lỗi xử lý hệ thống!");
      }
    }
  };

  // --- COMPONENT CON: RENDER THÔNG TIN TỜ TRÌNH ---
  // Tự động quét các trường có trong document để hiển thị một cách gọn gàng
  const renderDocumentDetails = (doc: any) => {
    if (!doc) return <div className="text-slate-500 text-sm">Không có dữ liệu đính kèm.</div>;
    
    const amount = doc.totalAmount || doc.amount || 0;
    const items = doc.transactions || doc.lines || [];

    return (
      <div className="flex flex-col gap-4">
        {/* Row 1: Thông tin lõi */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Mã tham chiếu</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white font-mono">{doc.documentNumber || doc.reference || "N/A"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Loại chứng từ</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{doc.type || "Tờ trình nội bộ"}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tổng Giá Trị</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatVND(amount)}</p>
          </div>
        </div>

        {/* Row 2: Ghi chú / Diễn giải */}
        {(doc.notes || doc.description) && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <p className="text-[10px] uppercase font-bold text-blue-500 mb-1 flex items-center gap-1"><AlignLeft className="w-3 h-3"/> Nội dung / Diễn giải</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{doc.notes || doc.description}</p>
          </div>
        )}

        {/* Row 3: Chi tiết các dòng hàng (Items/Lines) */}
        {items.length > 0 && (
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Chi tiết Hạng mục</h4>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="p-3 sm:px-4 flex justify-between items-center bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex flex-col max-w-[60%]">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.product?.name || item.account?.name || item.description || `Hạng mục ${idx + 1}`}
                    </span>
                    <span className="text-xs text-slate-500">
                      SL: {item.quantity || 1} x {formatVND(item.unitPrice || item.debit || item.credit || 0)}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatVND(item.totalPrice || item.debit || item.credit || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, x: "100%" },
    visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
    exit: { opacity: 0, x: "100%", transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
          className="fixed inset-0 z-[100] flex justify-end bg-slate-900/60 backdrop-blur-sm"
        >
          {/* Vùng click ra ngoài để đóng */}
          <div className="absolute inset-0" onClick={!isProcessing ? onClose : undefined} />

          <motion.div
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full sm:w-[600px] md:w-[800px] h-full bg-white dark:bg-[#0B0F19] shadow-[-10px_0_30px_rgba(0,0,0,0.2)] border-l border-white/10 flex flex-col z-10"
          >
            {loadingReq || loadingLogs ? (
              <div className="flex flex-col items-center justify-center h-full opacity-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="font-medium text-slate-500">Đang tải hồ sơ Tờ trình...</p>
              </div>
            ) : !request ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <AlertOctagon className="w-12 h-12 mb-4 text-rose-500 opacity-50" />
                <p>Không tìm thấy dữ liệu yêu cầu này.</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg">Đóng</button>
              </div>
            ) : (
              <>
                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                        {request.workflow?.name || "Chi tiết Tờ trình"}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3"/> {dayjs(request.createdAt).format('HH:mm - DD/MM/YYYY')}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${getStatusUI(request.status).color}`}>
                          {getStatusUI(request.status).label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={onClose} disabled={isProcessing} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-colors disabled:opacity-50">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* BODY CÓ THANH CUỘN */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 p-6 flex flex-col gap-8">
                  
                  {/* Khu vực 1: Người trình & Tóm tắt */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-indigo-800 flex items-center justify-center shadow-sm">
                      <User className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Người đệ trình</p>
                      <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">{request.requester?.fullName || "Hệ thống"}</p>
                      <p className="text-xs text-indigo-600/70 dark:text-indigo-400">{request.requester?.email}</p>
                    </div>
                  </div>

                  {/* Khu vực 2: Nội dung Đính kèm (Document) */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" /> Nội dung Chứng từ Đính kèm
                    </h3>
                    {renderDocumentDetails(request.document)}
                  </div>

                  {/* Khu vực 3: Dòng thời gian Luân chuyển (Timeline) */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-500" /> Lịch sử Phê duyệt
                    </h3>
                    
                    <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-[27px] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                      {logs.map((log, index) => {
                        const ui = getActionUI(log.action);
                        const LogIcon = ui.icon;
                        
                        return (
                          <div key={log.logId} className="relative flex gap-4 items-start">
                            {/* Chấm tròn Icon trên Timeline */}
                            <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-[#0B0F19] mt-0.5 ${ui.color}`}>
                              <LogIcon className="w-3.5 h-3.5" />
                            </div>
                            
                            {/* Nội dung Log */}
                            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                  Bước {log.step}: {log.processor?.fullName || "Hệ thống"}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400">
                                  {dayjs(log.createdAt).format('HH:mm DD/MM/YYYY')}
                                </span>
                              </div>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${ui.color.replace('bg-', 'bg-opacity-20 text-')}`}>
                                {log.action}
                              </span>
                              
                              {log.comment && (
                                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm text-slate-700 dark:text-slate-300 italic border-l-2 border-slate-300 dark:border-slate-600">
                                  "{log.comment}"
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* FOOTER & ACTIONS (Chỉ hiện nếu trạng thái PENDING) */}
                {request.status === "PENDING" && (
                  <div className="p-6 bg-slate-50 dark:bg-[#0B0F19] border-t border-slate-200 dark:border-white/10 shrink-0 flex flex-col gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                    
                    {/* Ô nhập ghi chú nhanh */}
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <textarea 
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        placeholder="Ghi chú hoặc ý kiến chỉ đạo (Bắt buộc nếu Từ chối)..."
                        rows={2}
                        disabled={isProcessing}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => { setActiveAction("REJECT"); handleAction("REJECT"); }}
                        disabled={isProcessing} 
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeAction === "REJECT" && isProcessing ? 'bg-rose-100 text-rose-500 dark:bg-rose-900/30' : 'bg-white dark:bg-slate-800 text-rose-600 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20'}`}
                      >
                        {activeAction === "REJECT" && isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <XCircle className="w-4 h-4" />} Từ chối Tờ trình
                      </button>
                      
                      <button 
                        onClick={() => { setActiveAction("APPROVE"); handleAction("APPROVE"); }}
                        disabled={isProcessing} 
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-70"
                      >
                        {activeAction === "APPROVE" && isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />} Phê duyệt ngay
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}