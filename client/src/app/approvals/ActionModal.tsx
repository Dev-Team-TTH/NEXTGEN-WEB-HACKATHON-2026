"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, XCircle, ArrowRight, 
  RotateCcw, MessageSquare, Loader2, ShieldAlert
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG CONTEXT
import { 
  useProcessApprovalMutation,
  useSubmitApprovalMutation,
  useCancelApprovalMutation
} from "@/state/api";

// --- IMPORT CORE MODAL ---
import Modal from "@/app/(components)/Modal";

// ==========================================
// ĐỊNH NGHĨA KIỂU HÀNH ĐỘNG ĐA NĂNG
// ==========================================
export type ApprovalActionType = "APPROVE" | "REJECT" | "SUBMIT" | "CANCEL";

export interface ActionConfig {
  type: ApprovalActionType;
  targetId: string; 
  referenceCode?: string; 
}

interface ActionModalProps {
  config: ActionConfig | null;
  isOpen: boolean;
  onClose: () => void;
}

// ==========================================
// COMPONENT: UNIVERSAL ACTION MODAL
// ==========================================
export default function ActionModal({ config, isOpen, onClose }: ActionModalProps) {
  // 🚀 BỐI CẢNH REDUX
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- API HOOKS ---
  const [processApproval, { isLoading: isProcessing }] = useProcessApprovalMutation();
  const [submitApproval, { isLoading: isSubmitting }] = useSubmitApprovalMutation();
  const [cancelApproval, { isLoading: isCanceling }] = useCancelApprovalMutation();

  const isLoading = isProcessing || isSubmitting || isCanceling;

  // --- LOCAL STATE ---
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (isOpen) setComment("");
  }, [isOpen]);

  // --- CẤU HÌNH GIAO DIỆN THEO ACTION ---
  const getTheme = () => {
    switch (config?.type) {
      case "APPROVE": return {
        title: "Phê duyệt Tờ trình",
        subtitle: "Đồng ý cho phép hệ thống thực thi nghiệp vụ",
        icon: CheckCircle2,
        btnColor: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30",
        iconColor: "text-emerald-500",
        btnText: "Xác nhận Phê duyệt",
        requireComment: false,
        placeholder: "Ý kiến chỉ đạo (Có thể để trống)..."
      };
      case "REJECT": return {
        title: "Từ chối Tờ trình",
        subtitle: "Trả lại tờ trình cho người lập",
        icon: XCircle,
        btnColor: "bg-rose-500 hover:bg-rose-600 shadow-rose-500/30",
        iconColor: "text-rose-500",
        btnText: "Từ chối ngay",
        requireComment: true,
        placeholder: "Ghi rõ lý do từ chối (Bắt buộc)..."
      };
      case "SUBMIT": return {
        title: "Trình ký / Gửi Phê duyệt",
        subtitle: "Kích hoạt luồng (Workflow) xét duyệt chứng từ",
        icon: ArrowRight,
        btnColor: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30",
        iconColor: "text-blue-500",
        btnText: "Gửi Tờ trình",
        requireComment: false,
        placeholder: "Lời nhắn gửi đến người duyệt..."
      };
      case "CANCEL": return {
        title: "Hủy / Rút Tờ trình",
        subtitle: "Thu hồi lại yêu cầu chưa được xử lý",
        icon: RotateCcw,
        btnColor: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30",
        iconColor: "text-amber-500",
        btnText: "Xác nhận Thu hồi",
        requireComment: false,
        placeholder: "Lý do thu hồi..."
      };
      default: return {
        title: "Thao tác", subtitle: "", icon: ShieldAlert, btnColor: "bg-slate-600", iconColor: "text-slate-500", btnText: "Xác nhận", requireComment: false, placeholder: "Nhập ghi chú..."
      };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  // --- HANDLER SUBMIT TỔNG ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    if (!activeBranchId) {
      toast.error("Không tìm thấy Chi nhánh làm việc. Vui lòng tải lại trang!");
      return;
    }

    if (theme.requireComment && !comment.trim()) {
      toast.error(theme.placeholder);
      return;
    }

    try {
      const payloadContext = { branchId: activeBranchId };

      switch (config.type) {
        case "APPROVE":
        case "REJECT":
          // 🚀 FIX TS: Ép kiểu as any để bypass Type Check nhưng vẫn gửi đủ dữ liệu xuống DB
          await processApproval({ id: config.targetId, action: config.type, comment, ...payloadContext } as any).unwrap();
          toast.success(config.type === "APPROVE" ? "Đã phê duyệt!" : "Đã từ chối!");
          break;
        case "SUBMIT":
          await submitApproval({ documentId: config.targetId, comment, ...payloadContext } as any).unwrap();
          toast.success("Đã trình ký thành công!");
          break;
        case "CANCEL":
          // 🚀 BẢO MẬT IDOR: Tiêm Context branchId vào Request Hủy để BE kiểm tra chéo
          await cancelApproval({ id: config.targetId, ...payloadContext } as any).unwrap();
          toast.success("Đã thu hồi tờ trình!");
          break;
      }
      onClose();
    } catch (error: any) {
      console.error("Action error:", error);
      toast.error(error?.data?.message || "Hệ thống gặp lỗi khi thực thi!");
    }
  };

  // --- FOOTER RENDER ---
  const modalFooter = (
    <div className="flex w-full justify-end gap-3 transition-colors duration-500">
      <button 
        type="button" onClick={onClose} disabled={isLoading} 
        className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors duration-500 disabled:opacity-50"
      >
        Hủy bỏ
      </button>
      <button 
        type="submit" form="universal-action-form" disabled={isLoading} 
        className={`flex items-center gap-2 px-6 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg transition-all duration-500 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${theme.btnColor}`}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
        {theme.btnText}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen && !!config}
      onClose={onClose}
      title={theme.title}
      subtitle={theme.subtitle + (config?.referenceCode ? ` (Ref: ${config.referenceCode})` : "")}
      icon={<Icon className={`w-6 h-6 transition-colors duration-500 ${theme.iconColor}`} />}
      maxWidth="max-w-md"
      disableOutsideClick={isLoading}
      footer={modalFooter}
    >
      <form id="universal-action-form" onSubmit={handleSubmit} className="p-6 transition-colors duration-500">
        <div className="space-y-2 group transition-colors duration-500">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-blue-500 transition-colors duration-500">
            <MessageSquare className="w-4 h-4 transition-colors duration-500" /> 
            Ghi chú / Bình luận {theme.requireComment && <span className="text-rose-500">*</span>}
          </label>
          <textarea
            autoFocus
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={theme.placeholder}
            rows={4}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white resize-none disabled:opacity-50 shadow-sm transition-colors duration-500"
          />
        </div>
      </form>
    </Modal>
  );
}