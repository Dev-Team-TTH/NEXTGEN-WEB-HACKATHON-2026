"use client";

import React, { useState } from "react";
import { 
  FileText, Clock, CheckCircle2, XCircle, 
  User, Loader2, DollarSign, AlignLeft, 
  Package, MessageSquare, ArrowRight, ShieldCheck,
  AlertOctagon, X 
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetApprovalByIdQuery, 
  useGetApprovalLogsQuery,
  useProcessApprovalMutation 
} from "@/state/api";

// --- IMPORT CORE MODAL & UTILS ---
import Modal from "@/app/(components)/Modal";
import { formatVND, formatDateTime } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const getStatusUI = (status?: string) => {
  switch (status) {
    case "APPROVED": return { label: "Đã Phê duyệt", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" };
    case "REJECTED": return { label: "Đã Từ chối", color: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30" };
    case "PENDING": return { label: "Đang Chờ", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30" };
    default: return { label: "Không xác định", color: "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30" };
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

  // --- LOCAL STATE ---
  const [actionComment, setActionComment] = useState("");
  const [activeAction, setActiveAction] = useState<"APPROVE" | "REJECT" | null>(null);

  // --- HANDLERS ---
  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !actionComment.trim()) {
      toast.error("Vui lòng nhập lý do từ chối để nhân sự điều chỉnh!");
      return;
    }
    
    // 🚀 FIX: Loại bỏ popup alert xấu xí của Chrome. Giao diện mượt mà và liền mạch hơn.
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
  };

  // --- COMPONENT CON: RENDER THÔNG TIN TỜ TRÌNH ---
  const renderDocumentDetails = (doc: any) => {
    if (!doc) return <div className="text-slate-500 text-sm">Không có dữ liệu đính kèm.</div>;
    
    const amount = doc.totalAmount || doc.amount || 0;
    const items = doc.transactions || doc.lines || [];

    return (
      <div className="flex flex-col gap-4">
        {/* Row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
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

        {/* Row 2 */}
        {(doc.notes || doc.description) && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <p className="text-[10px] uppercase font-bold text-blue-500 mb-1 flex items-center gap-1"><AlignLeft className="w-3 h-3"/> Nội dung / Diễn giải</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{doc.notes || doc.description}</p>
          </div>
        )}

        {/* Row 3: Bảng chi tiết hạng mục */}
        {items.length > 0 && (
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
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
                      SL: {item.quantity || 1} x {formatVND(item.unitPrice || item.unitCost || item.debit || item.credit || 0)}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatVND(item.totalPrice || item.totalCost || item.debit || item.credit || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- FOOTER ĐỘNG ---
  const modalFooter = request?.status === "PENDING" ? (
    <div className="flex flex-col w-full gap-4">
      <div className="relative w-full">
        <MessageSquare className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        <textarea 
          value={actionComment}
          onChange={(e) => setActionComment(e.target.value)}
          placeholder="Ghi chú hoặc ý kiến chỉ đạo (Bắt buộc nếu Từ chối)..."
          rows={2}
          disabled={isProcessing}
          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white resize-none shadow-sm"
        />
      </div>
      <div className="flex gap-3 justify-end">
        <button 
          onClick={() => { setActiveAction("REJECT"); handleAction("REJECT"); }}
          disabled={isProcessing} 
          className={cn(
            "flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeAction === "REJECT" && isProcessing ? "bg-rose-100 text-rose-500 dark:bg-rose-900/30" : "bg-white dark:bg-slate-800 text-rose-600 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          )}
        >
          {activeAction === "REJECT" && isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <XCircle className="w-4 h-4" />} Từ chối Tờ trình
        </button>
        <button 
          onClick={() => { setActiveAction("APPROVE"); handleAction("APPROVE"); }}
          disabled={isProcessing} 
          className="flex items-center justify-center gap-2 px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-70"
        >
          {activeAction === "APPROVE" && isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />} Phê duyệt ngay
        </button>
      </div>
    </div>
  ) : (
    <button onClick={onClose} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors">
      Đóng
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={request?.workflow?.name || "Chi tiết Tờ trình"}
      subtitle={request ? `Ngày tạo: ${formatDateTime(request.createdAt)}` : ""}
      icon={<FileText className="w-6 h-6 text-blue-500" />}
      maxWidth="max-w-4xl"
      disableOutsideClick={isProcessing}
      footer={modalFooter}
    >
      {loadingReq || loadingLogs ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
          <p className="font-medium text-slate-500">Đang tải hồ sơ Tờ trình...</p>
        </div>
      ) : !request ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <AlertOctagon className="w-12 h-12 mb-4 text-rose-500 opacity-50" />
          <p>Không tìm thấy dữ liệu yêu cầu này.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 p-6 sm:p-8">
          
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border", getStatusUI(request.status).color)}>
              Trạng thái: {getStatusUI(request.status).label}
            </span>
          </div>

          {/* Người trình */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-indigo-800 flex items-center justify-center shadow-sm">
              <User className="w-6 h-6 text-indigo-500 dark:text-indigo-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Người đệ trình</p>
              <p className="text-base font-bold text-indigo-900 dark:text-indigo-200">{request.requester?.fullName || "Hệ thống"}</p>
              <p className="text-sm text-indigo-600/70 dark:text-indigo-400">{request.requester?.email}</p>
            </div>
          </div>

          {/* Nội dung */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> Hồ sơ / Chứng từ gốc
            </h3>
            {renderDocumentDetails(request.document)}
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" /> Dấu vết Phê duyệt (Audit Trail)
            </h3>
            
            <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-[27px] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
              {logs.map((log: any) => {
                const ui = getActionUI(log.action);
                const LogIcon = ui.icon;
                
                return (
                  <div key={log.logId} className="relative flex gap-4 items-start">
                    <div className={cn("relative z-10 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-[#0B0F19] mt-0.5", ui.color)}>
                      <LogIcon className="w-3.5 h-3.5" />
                    </div>
                    
                    <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Bước {log.stepOrder || 1}: {log.actioner?.fullName || "Hệ thống"}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2", ui.color.replace('bg-', 'bg-opacity-20 text-'))}>
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
      )}
    </Modal>
  );
}