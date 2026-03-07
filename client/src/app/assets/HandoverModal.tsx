"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  ArrowRightLeft, Loader2, CheckCircle2, 
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

// --- IMPORT CORE MODAL ---
import Modal from "@/app/(components)/Modal";

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

  const { data: history = [], isLoading: isLoadingHistory } = useGetAssetHistoryQuery(assetId || "", {
    skip: !assetId || !isOpen || asset?.status !== "IN_USE"
  });

  const [assignAsset, { isLoading: isAssigning }] = useAssignAssetMutation();
  const [returnAsset, { isLoading: isReturning }] = useReturnAssetMutation();

  const isSubmitting = isAssigning || isReturning;

  // --- LOCAL STATE (FORM) ---
  const [userId, setUserId] = useState("");
  const [actionDate, setActionDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [notes, setNotes] = useState("");

  const isHandoverMode = asset?.status === "ACTIVE";
  const isReturnMode = asset?.status === "IN_USE";

  const currentAssigneeName = useMemo(() => {
    if (!isReturnMode || !history || history.length === 0) return "Đang truy xuất...";
    const lastAssign = history.find((h: any) => h.action === "ASSIGN" || h.type === "ASSIGN");
    return lastAssign?.user?.fullName || lastAssign?.user?.email || "Nhân viên đang mượn";
  }, [history, isReturnMode]);

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
        await assignAsset({ id: assetId, data: { userId, assignDate: actionDate, notes } }).unwrap();
        toast.success("Bàn giao tài sản cho nhân viên thành công!");
      } else {
        await returnAsset({ id: assetId, data: { returnDate: actionDate, notes } }).unwrap();
        toast.success("Thu hồi tài sản về kho thành công!");
      }
      onClose();
    } catch (error: any) {
      console.error("Lỗi luân chuyển tài sản:", error);
      toast.error(error?.data?.message || "Lỗi hệ thống khi thực hiện luân chuyển tài sản!");
    }
  };

  const getUserDisplayName = (u: any) => u.fullName || u.email || u.username || `User ID: ${u.userId}`;

  // --- FOOTER RENDER ---
  const modalFooter = (
    <>
      <button 
        type="button" onClick={onClose} disabled={isSubmitting} 
        className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
      >
        Hủy bỏ
      </button>
      
      {asset?.status === "ACTIVE" || asset?.status === "IN_USE" ? (
        <button 
          type="submit" form="handover-form" disabled={isSubmitting || isLoadingAsset} 
          className={`flex items-center gap-2 px-6 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${
            isHandoverMode ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30'
          }`}
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Xác nhận {isHandoverMode ? "Bàn giao" : "Thu hồi"}</>
          )}
        </button>
      ) : null}
    </>
  );

  return (
    <Modal
      isOpen={isOpen && !!assetId}
      onClose={onClose}
      title={isReturnMode ? "Thu hồi Tài sản (Return)" : "Bàn giao Tài sản (Handover)"}
      subtitle="Luân chuyển thiết bị giữa Kho và Nhân viên"
      icon={isReturnMode ? <RotateCcw className="w-6 h-6 text-amber-500" /> : <UserCheck className="w-6 h-6 text-indigo-500" />}
      maxWidth="max-w-2xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6 sm:p-8 flex flex-col gap-6">
        
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
            <form id="handover-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-focus-within:text-blue-500 transition-colors">
                  {isHandoverMode ? "Người nhận tài sản (Nhân viên)" : "Đang được sử dụng bởi"} <span className="text-rose-500">*</span>
                </label>
                {isHandoverMode ? (
                  <select
                    value={userId} onChange={(e) => setUserId(e.target.value)} disabled={isLoadingUsers}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white shadow-sm"
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {users?.map(u => <option key={u.userId} value={u.userId}>{getUserDisplayName(u)}</option>)}
                  </select>
                ) : (
                  <div className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 cursor-not-allowed flex items-center justify-between shadow-inner">
                    <span>{currentAssigneeName}</span>
                    {isLoadingHistory && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
                  <CalendarDays className="w-4 h-4" /> Ngày {isHandoverMode ? "Bàn giao" : "Thu hồi"} <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="date" required value={actionDate} onChange={(e) => setActionDate(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold outline-none text-slate-900 dark:text-white focus:ring-2 shadow-sm ${isHandoverMode ? 'focus:ring-indigo-500' : 'focus:ring-amber-500'}`}
                />
              </div>

              <div className="space-y-1.5 group">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
                  <FileText className="w-4 h-4" /> Ghi chú tình trạng thiết bị
                </label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder={isHandoverMode ? "Ghi nhận tình trạng ngoại quan khi giao (VD: Máy mới 100%, có chuột đi kèm)..." : "Ghi nhận hư hỏng, xước xát (nếu có) khi thu hồi..."}
                  rows={3}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none text-slate-900 dark:text-white resize-none focus:ring-2 shadow-sm ${isHandoverMode ? 'focus:ring-indigo-500' : 'focus:ring-amber-500'}`}
                />
              </div>

            </form>
          </>
        )}
      </div>
    </Modal>
  );
}