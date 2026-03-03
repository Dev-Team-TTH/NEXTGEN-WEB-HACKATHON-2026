"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, CheckCircle2, XCircle, ArrowRight, 
  RotateCcw, MessageSquare, Loader2, ShieldAlert
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useProcessApprovalMutation,
  useSubmitApprovalMutation,
  useCancelApprovalMutation
} from "@/state/api";

// ==========================================
// ĐỊNH NGHĨA KIỂU HÀNH ĐỘNG ĐA NĂNG
// ==========================================
export type ApprovalActionType = "APPROVE" | "REJECT" | "SUBMIT" | "CANCEL";

export interface ActionConfig {
  type: ApprovalActionType;
  targetId: string; // requestId (đối với duyệt/từ chối/hủy) hoặc documentId (đối với trình ký)
  referenceCode?: string; // Mã chứng từ hiển thị cho đẹp
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
  // --- API HOOKS ---
  const [processApproval, { isLoading: isProcessing }] = useProcessApprovalMutation();
  const [submitApproval, { isLoading: isSubmitting }] = useSubmitApprovalMutation();
  const [cancelApproval, { isLoading: isCanceling }] = useCancelApprovalMutation();

  const isLoading = isProcessing || isSubmitting || isCanceling;

  // --- LOCAL STATE ---
  const [comment, setComment] = useState("");

  // Reset form khi mở
  useEffect(() => {
    if (isOpen) {
      setComment("");
    }
  }, [isOpen]);

  // --- CẤU HÌNH GIAO DIỆN THEO ACTION (DATA VIZ TỰ ĐỘNG) ---
  const getTheme = () => {
    switch (config?.type) {
      case "APPROVE": return {
        title: "Phê duyệt Tờ trình",
        subtitle: "Đồng ý cho phép hệ thống thực thi nghiệp vụ",
        icon: CheckCircle2,
        color: "emerald",
        btnText: "Xác nhận Phê duyệt",
        requireComment: false,
        placeholder: "Ý kiến chỉ đạo (Có thể để trống)..."
      };
      case "REJECT": return {
        title: "Từ chối Tờ trình",
        subtitle: "Trả lại tờ trình cho người lập",
        icon: XCircle,
        color: "rose",
        btnText: "Từ chối ngay",
        requireComment: true,
        placeholder: "Ghi rõ lý do từ chối (Bắt buộc)..."
      };
      case "SUBMIT": return {
        title: "Trình ký / Gửi Phê duyệt",
        subtitle: "Kích hoạt luồng (Workflow) xét duyệt chứng từ",
        icon: ArrowRight,
        color: "blue",
        btnText: "Gửi Tờ trình",
        requireComment: false,
        placeholder: "Lời nhắn gửi đến người duyệt..."
      };
      case "CANCEL": return {
        title: "Hủy / Rút Tờ trình",
        subtitle: "Thu hồi lại yêu cầu chưa được xử lý",
        icon: RotateCcw,
        color: "amber",
        btnText: "Xác nhận Thu hồi",
        requireComment: false,
        placeholder: "Lý do thu hồi..."
      };
      default: return {
        title: "Thao tác", subtitle: "", icon: ShieldAlert, color: "slate", btnText: "Xác nhận", requireComment: false, placeholder: "Nhập ghi chú..."
      };
    }
  };

  const theme = getTheme();

  // Mapping class Tailwind linh hoạt theo biến màu
  const colorMap = {
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/10", border: "border-emerald-100 dark:border-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", btn: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30" },
    rose: { bg: "bg-rose-50 dark:bg-rose-900/10", border: "border-rose-100 dark:border-rose-900/30", text: "text-rose-700 dark:text-rose-400", btn: "bg-rose-500 hover:bg-rose-600 shadow-rose-500/30" },
    blue: { bg: "bg-blue-50 dark:bg-blue-900/10", border: "border-blue-100 dark:border-blue-900/30", text: "text-blue-700 dark:text-blue-400", btn: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30" },
    amber: { bg: "bg-amber-50 dark:bg-amber-900/10", border: "border-amber-100 dark:border-amber-900/30", text: "text-amber-700 dark:text-amber-400", btn: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" },
    slate: { bg: "bg-slate-50 dark:bg-slate-900/10", border: "border-slate-100 dark:border-slate-900/30", text: "text-slate-700 dark:text-slate-400", btn: "bg-slate-600 hover:bg-slate-700 shadow-slate-500/30" },
  };
  const uiStyle = colorMap[theme.color as keyof typeof colorMap];
  const Icon = theme.icon;

  // --- HANDLER SUBMIT TỔNG ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    if (theme.requireComment && !comment.trim()) {
      toast.error(theme.placeholder);
      return;
    }

    try {
      switch (config.type) {
        case "APPROVE":
        case "REJECT":
          await processApproval({ id: config.targetId, action: config.type, comment }).unwrap();
          toast.success(config.type === "APPROVE" ? "Đã phê duyệt!" : "Đã từ chối!");
          break;
        case "SUBMIT":
          await submitApproval({ documentId: config.targetId, comment }).unwrap();
          toast.success("Đã trình ký thành công!");
          break;
        case "CANCEL":
          if (window.confirm("Bạn chắc chắn muốn rút lại tờ trình này?")) {
            await cancelApproval(config.targetId).unwrap();
            toast.success("Đã thu hồi tờ trình!");
          } else {
            return; // Ngắt nếu cancel confirm
          }
          break;
      }
      onClose();
    } catch (error: any) {
      console.error("Action error:", error);
      toast.error(error?.data?.message || "Hệ thống gặp lỗi khi thực thi!");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && config && (
        <motion.div 
          variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          {/* Khóa nền khi đang load API */}
          <div className="absolute inset-0" onClick={!isLoading ? onClose : undefined} />

          <motion.div 
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-10"
          >
            {/* 1. HEADER (Đổi màu theo ngữ cảnh) */}
            <div className={`p-6 border-b flex justify-between items-start ${uiStyle.bg} ${uiStyle.border}`}>
              <div>
                <h3 className={`text-xl font-bold flex items-center gap-2 ${uiStyle.text}`}>
                  <Icon className="w-6 h-6" /> {theme.title}
                </h3>
                <p className="text-xs mt-1 opacity-80 font-medium text-slate-600 dark:text-slate-400">
                  {theme.subtitle}
                </p>
                {config.referenceCode && (
                  <div className="mt-2 inline-block px-2 py-0.5 bg-white/50 dark:bg-black/20 rounded text-[10px] font-mono border border-current opacity-70">
                    Ref: {config.referenceCode}
                  </div>
                )}
              </div>
              <button onClick={onClose} disabled={isLoading} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* 2. BODY FORM */}
            <form id="universal-action-form" onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" /> 
                  Ghi chú / Bình luận {theme.requireComment && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  autoFocus
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={theme.placeholder}
                  rows={4}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white resize-none disabled:opacity-50"
                />
              </div>
            </form>

            {/* 3. FOOTER ACTIONS */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-[#0B0F19] border-t border-slate-200 dark:border-white/5 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isLoading} 
                className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                form="universal-action-form"
                disabled={isLoading} 
                className={`flex items-center gap-2 px-6 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${uiStyle.btn}`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                {theme.btnText}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}