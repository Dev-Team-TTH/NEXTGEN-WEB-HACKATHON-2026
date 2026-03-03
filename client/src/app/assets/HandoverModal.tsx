"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, ArrowRightLeft, Loader2, CheckCircle2, 
  UserCheck, RotateCcw, Laptop, CalendarDays, FileText, AlertOctagon, Building
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { 
  useGetAssetByIdQuery, 
  useGetUsersQuery,
  useGetAssetHistoryQuery,
  useAssignAssetMutation,
  useReturnAssetMutation
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL BÀN GIAO / THU HỒI TÀI SẢN
// ==========================================
interface HandoverModalProps {
  assetId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function HandoverModal({ assetId, isOpen, onClose }: HandoverModalProps) {
  // --- API HOOKS ---
  const { data: asset, isLoading: isLoadingAsset } = useGetAssetByIdQuery(assetId || "", {
    skip: !assetId || !isOpen
  });
  
  const { data: users = [], isLoading: isLoadingUsers } = useGetUsersQuery(undefined, {
    skip: !isOpen
  });

  // Gọi API lấy lịch sử để truy xuất người đang mượn (Vì Asset gốc không lưu assignedUserId)
  const { data: history = [], isLoading: isLoadingHistory } = useGetAssetHistoryQuery(assetId || "", {
    skip: !assetId || !isOpen || asset?.status !== "IN_USE"
  });

  // Sử dụng đúng các Mutation nghiệp vụ thay vì Update chung chung
  const [assignAsset, { isLoading: isAssigning }] = useAssignAssetMutation();
  const [returnAsset, { isLoading: isReturning }] = useReturnAssetMutation();

  const isSubmitting = isAssigning || isReturning;

  // --- LOCAL STATE (FORM) ---
  const [userId, setUserId] = useState("");
  const [actionDate, setActionDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [notes, setNotes] = useState("");

  // Xác định Mode
  const isHandoverMode = asset?.status === "ACTIVE";
  const isReturnMode = asset?.status === "IN_USE";

  // Lọc tìm người đang giữ tài sản từ Lịch sử (An toàn TypeScript 100%)
  const currentAssigneeName = useMemo(() => {
    if (!isReturnMode || !history || history.length === 0) return "Đang truy xuất...";
    // Giả định backend trả về log có chứa action ASSIGN và thông tin user
    const lastAssign = history.find((h: any) => h.action === "ASSIGN" || h.type === "ASSIGN");
    return lastAssign?.user?.fullName || lastAssign?.user?.email || "Nhân viên đang mượn";
  }, [history, isReturnMode]);

  // Reset form khi mở
  useEffect(() => {
    if (isOpen) {
      setUserId("");
      setActionDate(dayjs().format('YYYY-MM-DD'));
      setNotes("");
    }
  }, [isOpen]);

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) return;

    if (isHandoverMode && !userId) {
      toast.error("Vui lòng chọn nhân viên để bàn giao tài sản!");
      return;
    }

    try {
      if (isHandoverMode) {
        // GỌI API BÀN GIAO (ASSIGN)
        await assignAsset({ 
          id: assetId, 
          data: { userId, assignDate: actionDate, notes } 
        }).unwrap();
        toast.success("Bàn giao tài sản cho nhân viên thành công!");
      } else {
        // GỌI API THU HỒI (RETURN)
        await returnAsset({ 
          id: assetId, 
          data: { returnDate: actionDate, notes } 
        }).unwrap();
        toast.success("Thu hồi tài sản về kho thành công!");
      }
      
      onClose();
    } catch (error: any) {
      console.error("Lỗi luân chuyển tài sản:", error);
      toast.error(error?.data?.message || "Lỗi hệ thống khi thực hiện luân chuyển tài sản!");
    }
  };

  const getUserDisplayName = (u: any) => u.fullName || u.email || u.username || `User ID: ${u.userId}`;

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
        >
          {/* Khóa click ra ngoài khi đang submit API */}
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-2xl glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-5 border-b shrink-0 ${isReturnMode ? 'border-amber-500/10 bg-amber-50/50 dark:bg-amber-900/10' : 'border-indigo-500/10 bg-indigo-50/50 dark:bg-indigo-900/10'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isReturnMode ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-indigo-100 dark:bg-indigo-500/20'}`}>
                  {isReturnMode 
                    ? <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    : <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  }
                </div>
                <div>
                  <h2 className={`text-xl font-bold leading-tight ${isReturnMode ? 'text-amber-700 dark:text-amber-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
                    {isReturnMode ? "Thu hồi Tài sản (Return)" : "Bàn giao Tài sản (Handover)"}
                  </h2>
                  <p className={`text-xs font-medium ${isReturnMode ? 'text-amber-600/70' : 'text-indigo-600/70'}`}>
                    Luân chuyển thiết bị giữa Kho và Nhân viên
                  </p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className={`p-2 rounded-full transition-colors disabled:opacity-50 ${isReturnMode ? 'text-amber-400 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30' : 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto scrollbar-thin bg-white/50 dark:bg-black/20 flex flex-col gap-6">
              
              {isLoadingAsset || isLoadingUsers ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isReturnMode ? 'text-amber-500' : 'text-indigo-500'}`} />
                  <p className="text-sm font-medium text-slate-500">Đang tải thông tin thiết bị và nhân sự...</p>
                </div>
              ) : !asset ? (
                <div className="text-center py-10 text-slate-500">Không tìm thấy dữ liệu tài sản.</div>
              ) : asset.status === "MAINTENANCE" || asset.status === "LIQUIDATED" ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <AlertOctagon className="w-12 h-12 text-rose-500 opacity-80" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tài sản đang Bảo trì hoặc đã Thanh lý.</p>
                  <p className="text-xs text-slate-500">Không thể thực hiện luân chuyển lúc này.</p>
                </div>
              ) : (
                <>
                  {/* DATA VIZ: LUỒNG LUÂN CHUYỂN ĐỘNG */}
                  <div className="flex items-center justify-center gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10">
                    
                    <div className="flex flex-col items-center text-center gap-2 flex-1">
                      <div className={`p-3 rounded-full ${isHandoverMode ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 shadow-inner' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'}`}>
                        <Building className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Kho Lưu Trữ</p>
                        <p className="text-[10px] text-slate-500">Sẵn sàng cấp phát</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <motion.div 
                        initial={{ x: isHandoverMode ? -10 : 10, opacity: 0.5 }}
                        animate={{ x: isHandoverMode ? 10 : -10, opacity: 1 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", repeatType: "reverse" }}
                        className={isHandoverMode ? 'text-indigo-500' : 'text-amber-500'}
                      >
                        <ArrowRightLeft className="w-5 h-5" />
                      </motion.div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isHandoverMode ? 'text-indigo-500' : 'text-amber-500'}`}>
                        {isHandoverMode ? "Giao cho" : "Thu hồi từ"}
                      </span>
                    </div>

                    <div className="flex flex-col items-center text-center gap-2 flex-1">
                      <div className={`p-3 rounded-full ${isReturnMode ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 shadow-inner' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'}`}>
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nhân viên</p>
                        <p className="text-[10px] text-slate-500">Người sử dụng</p>
                      </div>
                    </div>

                  </div>

                  {/* THÔNG TIN TÀI SẢN (READ-ONLY) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Laptop className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{asset.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{asset.assetCode}</p>
                    </div>
                  </div>

                  {/* FORM NHẬP LIỆU */}
                  <form id="handover-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                    
                    {/* CHỌN NHÂN VIÊN (BÀN GIAO) / HIỂN THỊ (THU HỒI) */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {isHandoverMode ? "Người nhận tài sản (Nhân viên)" : "Đang được sử dụng bởi"} <span className="text-rose-500">*</span>
                      </label>
                      {isHandoverMode ? (
                        <select
                          value={userId}
                          onChange={(e) => setUserId(e.target.value)}
                          disabled={isLoadingUsers}
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                        >
                          <option value="">-- Chọn nhân viên --</option>
                          {users?.map(u => (
                            <option key={u.userId} value={u.userId}>
                              {getUserDisplayName(u)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 cursor-not-allowed flex items-center justify-between">
                          <span>{currentAssigneeName}</span>
                          {isLoadingHistory && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                        </div>
                      )}
                    </div>

                    {/* NGÀY THỰC HIỆN */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-slate-400" /> Ngày {isHandoverMode ? "Bàn giao" : "Thu hồi"} <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="date" 
                        value={actionDate}
                        onChange={(e) => setActionDate(e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none text-slate-900 dark:text-white focus:ring-2 ${isHandoverMode ? 'focus:ring-indigo-500' : 'focus:ring-amber-500'}`}
                      />
                    </div>

                    {/* GHI CHÚ */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" /> Ghi chú tình trạng thiết bị
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={isHandoverMode ? "Ghi nhận tình trạng ngoại quan khi giao (VD: Máy mới 100%, có chuột đi kèm)..." : "Ghi nhận hư hỏng, xước xát (nếu có) khi thu hồi..."}
                        rows={3}
                        className={`w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none text-slate-900 dark:text-white resize-none focus:ring-2 ${isHandoverMode ? 'focus:ring-indigo-500' : 'focus:ring-amber-500'}`}
                      />
                    </div>

                  </form>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isSubmitting} 
                className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              
              {asset?.status === "ACTIVE" || asset?.status === "IN_USE" ? (
                <button 
                  type="submit" 
                  form="handover-form" 
                  disabled={isSubmitting || isLoadingAsset} 
                  className={`flex items-center gap-2 px-6 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${
                    isHandoverMode 
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30' 
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30'
                  }`}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Xác nhận {isHandoverMode ? "Bàn giao" : "Thu hồi"}</>
                  )}
                </button>
              ) : null}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}