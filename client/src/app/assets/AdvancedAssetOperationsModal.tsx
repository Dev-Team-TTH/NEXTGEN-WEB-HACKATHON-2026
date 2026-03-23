"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  Laptop, ArrowRight, CheckCircle2, XCircle, 
  Loader2, Wrench, TrendingUp, TrendingDown,
  DollarSign, FileText, Activity, AlertOctagon, Scale,
  Clock, Package, User, Search, CalendarDays
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux";
import { 
  useGetAssetsQuery,
  useGetAssetRequestsQuery,
  useGetFiscalPeriodsQuery, 
  useApproveAssetRequestMutation,
  useRejectAssetRequestMutation,
  useRevaluateAssetMutation,
  useCompleteAssetMaintenanceMutation
} from "@/state/api";

// --- IMPORT CORE MODAL & UTILS ---
import Modal from "@/app/(components)/Modal";
import { formatVND } from "@/utils/formatters";
import { cn } from "@/utils/helpers"; // 🚀 FIX: Đã import hàm cn

type OperationTab = "REQUESTS" | "REVALUATION" | "MAINTENANCE";

interface AdvancedOperationsProps {
  isOpen: boolean;
  onClose: () => void;
}

// ==========================================
// COMPONENT CHÍNH: TRẠM NGHIỆP VỤ TÀI SẢN NÂNG CAO
// ==========================================
export default function AdvancedAssetOperationsModal({ isOpen, onClose }: AdvancedOperationsProps) {
  // 🚀 BỐI CẢNH REDUX
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- STATE ĐIỀU HƯỚNG ---
  const [activeTab, setActiveTab] = useState<OperationTab>("REQUESTS");
  const [searchReq, setSearchReq] = useState("");

  // --- API HOOKS FETCHING ---
  const { data: assets = [], isLoading: loadingAssets } = useGetAssetsQuery(undefined, { skip: !isOpen });
  const { data: rawRequests = [], isLoading: loadingRequests, refetch: refetchRequests } = useGetAssetRequestsQuery({}, { skip: !isOpen || activeTab !== "REQUESTS" });
  const { data: periods = [], isLoading: loadingPeriods } = useGetFiscalPeriodsQuery(undefined, { skip: !isOpen || activeTab !== "REVALUATION" });

  // --- API HOOKS MUTATIONS ---
  const [approveRequest, { isLoading: isApprovingReq }] = useApproveAssetRequestMutation();
  const [rejectRequest, { isLoading: isRejectingReq }] = useRejectAssetRequestMutation();
  const [revaluateAsset, { isLoading: isRevaluating }] = useRevaluateAssetMutation();
  const [completeMaintenance, { isLoading: isCompletingMaint }] = useCompleteAssetMaintenanceMutation();

  const isProcessing = isApprovingReq || isRejectingReq || isRevaluating || isCompletingMaint;

  // Lọc Request
  const requests = useMemo(() => {
    return rawRequests.filter((r: any) => 
      r.requestedItem?.toLowerCase().includes(searchReq.toLowerCase()) || 
      r.requester?.fullName?.toLowerCase().includes(searchReq.toLowerCase())
    );
  }, [rawRequests, searchReq]);

  // --- LOCAL STATE: REVALUATION (ĐÁNH GIÁ LẠI) ---
  const [revAssetId, setRevAssetId] = useState("");
  const [newValue, setNewValue] = useState("");
  const [revReason, setRevReason] = useState("");
  const [fiscalPeriodId, setFiscalPeriodId] = useState(""); 

  const selectedRevAsset = useMemo(() => assets.find(a => a.assetId === revAssetId), [assets, revAssetId]);
  const diffValue = selectedRevAsset ? Number(newValue) - selectedRevAsset.currentValue : 0;

  // --- LOCAL STATE: MAINTENANCE (NGHIỆM THU BẢO TRÌ) ---
  const [maintAssetId, setMaintAssetId] = useState("");
  const [maintCost, setMaintCost] = useState("");
  const [maintNotes, setMaintNotes] = useState("");
  
  const maintenanceAssets = useMemo(() => assets.filter(a => a.status === "MAINTENANCE"), [assets]);
  const selectedMaintAsset = useMemo(() => maintenanceAssets.find(a => a.assetId === maintAssetId), [maintenanceAssets, maintAssetId]);

  // --- HANDLERS ---
  const handleApproveRequest = async (id: string) => {
    if (window.confirm("Phê duyệt yêu cầu cấp phát này? Hệ thống sẽ cập nhật trạng thái để bộ phận kho xuất thiết bị.")) {
      try {
        await approveRequest({ id, data: { status: "APPROVED", approvedAt: new Date().toISOString() } }).unwrap();
        toast.success("Đã phê duyệt yêu cầu cấp phát!");
        refetchRequests();
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi hệ thống khi phê duyệt!");
      }
    }
  };

  const handleRejectRequest = async (id: string) => {
    const reason = window.prompt("Vui lòng ghi rõ lý do từ chối để nhân sự biết:");
    if (!reason) return;
    try {
      await rejectRequest({ id, data: { status: "REJECTED", reason } }).unwrap();
      toast.success("Đã từ chối yêu cầu!");
      refetchRequests();
    } catch (err: any) {
      toast.error("Lỗi khi thực hiện từ chối!");
    }
  };

  const handleRevaluate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeBranchId) {
      return toast.error("Không tìm thấy Chi nhánh làm việc. Vui lòng F5 lại trang!");
    }

    if (!revAssetId || !newValue || !revReason || !fiscalPeriodId) {
      return toast.error("Vui lòng nhập đầy đủ giá trị, lý do định giá lại và Kỳ kế toán!");
    }
    
    if (window.confirm(`Xác nhận ghi nhận giá trị sổ sách mới là ${formatVND(Number(newValue))}?\nHệ thống sẽ tự sinh bút toán chênh lệch (Lãi/Lỗ đánh giá lại tài sản) vào sổ cái tháng này.`)) {
      try {
        await revaluateAsset({
          id: revAssetId,
          data: { 
            branchId: activeBranchId,     
            fiscalPeriodId,               
            newValue: Number(newValue), 
            reason: revReason, 
            revaluationDate: dayjs().format('YYYY-MM-DD') 
          }
        }).unwrap();
        toast.success("Đánh giá lại tài sản thành công! Sổ cái đã cập nhật.");
        setRevAssetId(""); setNewValue(""); setRevReason(""); setFiscalPeriodId("");
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi ghi nhận nghiệp vụ!");
      }
    }
  };

  const handleCompleteMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBranchId) return toast.error("Không tìm thấy Chi nhánh làm việc!");

    if (!maintAssetId || !maintCost) {
      toast.error("Vui lòng chọn thiết bị và nhập tổng chi phí bảo trì!"); return;
    }
    
    const activeMaintenanceId = selectedMaintAsset?.maintenanceHistory?.[0]?.maintenanceId || "N/A";
    
    try {
      await completeMaintenance({
        maintenanceId: activeMaintenanceId, 
        data: { 
          branchId: activeBranchId, 
          cost: Number(maintCost), 
          description: maintNotes, 
          completedDate: dayjs().format('YYYY-MM-DD') 
        }
      }).unwrap();
      toast.success("Đã nghiệm thu! Thiết bị đã sẵn sàng sử dụng.");
      setMaintAssetId(""); setMaintCost(""); setMaintNotes("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi khi nghiệm thu!");
    }
  };

  // --- ANIMATION CONFIG ---
  const listVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="" 
      maxWidth="max-w-5xl"
      disableOutsideClick={isProcessing}
      hideHeader={true} 
      hideFooter={true}
    >
      <div className="flex flex-col md:flex-row h-[85vh] w-full relative transition-colors duration-500">
        {/* 1. SIDEBAR MENU CẤP CAO */}
        <div className="w-full md:w-64 bg-slate-50 dark:bg-[#0B0F19] border-r border-slate-200 dark:border-slate-800 shrink-0 flex flex-col shadow-[10px_0_20px_rgba(0,0,0,0.02)] z-20 transition-colors duration-500">
          
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 transition-colors duration-500">
            <div>
              <h2 className="font-black text-amber-700 dark:text-amber-500">Advanced Ops</h2>
              <p className="text-[10px] text-amber-600/70 font-bold uppercase tracking-wider mt-1">Trạm Nghiệp Vụ Chuyên Sâu</p>
            </div>
          </div>
          
          <div className="p-3 flex flex-col gap-2 flex-1 transition-colors duration-500">
            <button 
              onClick={() => setActiveTab("REQUESTS")}
              className={`relative px-4 py-3.5 rounded-xl flex items-center gap-3 text-sm font-bold transition-all text-left overflow-hidden group ${activeTab === "REQUESTS" ? "text-blue-700 dark:text-blue-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              {activeTab === "REQUESTS" && <motion.div layoutId="advAssetBg" className="absolute inset-0 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl -z-10 transition-colors duration-500" />}
              <FileText className={`w-5 h-5 ${activeTab === "REQUESTS" ? "text-blue-500" : "text-slate-400 group-hover:text-blue-500 transition-colors"}`} /> Xét duyệt Yêu cầu
            </button>
            
            <button 
              onClick={() => setActiveTab("REVALUATION")}
              className={`relative px-4 py-3.5 rounded-xl flex items-center gap-3 text-sm font-bold transition-all text-left overflow-hidden group ${activeTab === "REVALUATION" ? "text-purple-700 dark:text-purple-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              {activeTab === "REVALUATION" && <motion.div layoutId="advAssetBg" className="absolute inset-0 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl -z-10 transition-colors duration-500" />}
              <Scale className={`w-5 h-5 ${activeTab === "REVALUATION" ? "text-purple-500" : "text-slate-400 group-hover:text-purple-500 transition-colors"}`} /> Đánh giá lại (IFRS)
            </button>
            
            <button 
              onClick={() => setActiveTab("MAINTENANCE")}
              className={`relative px-4 py-3.5 rounded-xl flex items-center gap-3 text-sm font-bold transition-all text-left overflow-hidden group ${activeTab === "MAINTENANCE" ? "text-amber-700 dark:text-amber-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              {activeTab === "MAINTENANCE" && <motion.div layoutId="advAssetBg" className="absolute inset-0 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl -z-10 transition-colors duration-500" />}
              <Wrench className={`w-5 h-5 ${activeTab === "MAINTENANCE" ? "text-amber-500" : "text-slate-400 group-hover:text-amber-500 transition-colors"}`} /> Nghiệm thu Bảo trì
            </button>
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 mt-auto transition-colors duration-500">
            <button onClick={onClose} disabled={isProcessing} className="w-full py-3 bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/20 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold transition-colors duration-500 shadow-sm">
              Đóng Trạm Nghiệp Vụ
            </button>
          </div>
        </div>

        {/* 2. MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-transparent relative overflow-hidden transition-colors duration-500">
          <AnimatePresence mode="wait">
            
            {/* ==========================================
                TAB 1: XÉT DUYỆT YÊU CẦU 
                ========================================== */}
            {activeTab === "REQUESTS" && (
              <motion.div key="tab-req" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col p-6 overflow-y-auto scrollbar-thin">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0 transition-colors duration-500">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-xl transition-colors duration-500"><FileText className="w-6 h-6 text-blue-600 dark:text-blue-400"/></div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white transition-colors duration-500">Duyệt Yêu Cầu Tài Sản</h3>
                      <p className="text-xs text-slate-500 transition-colors duration-500">Phê duyệt hoặc từ chối đề xuất cấp mới thiết bị của nhân viên.</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" placeholder="Tìm người gửi, thiết bị..." 
                      value={searchReq} onChange={(e) => setSearchReq(e.target.value)}
                      className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-slate-900 dark:text-white transition-colors duration-500"
                    />
                  </div>
                </div>

                {loadingRequests ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-blue-500"><Loader2 className="w-8 h-8 animate-spin"/></div>
                ) : requests.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 transition-colors duration-500">
                    <Package className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">Không có yêu cầu cấp phát nào.</p>
                    <p className="text-sm mt-1">Mọi thứ đều đã được giải quyết xong!</p>
                  </div>
                ) : (
                  <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-10">
                    {requests.map((req: any) => (
                      <motion.div variants={itemVariants} key={req.requestId || req.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 group">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 transition-colors duration-500">
                              <User className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white transition-colors duration-500">{req.requestedItem || "Thiết bị văn phòng"}</h4>
                              <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500 transition-colors duration-500">
                                <span>Bởi: <b className="text-blue-600 dark:text-blue-400">{req.requester?.fullName || "Nhân viên"}</b></span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {dayjs(req.createdAt).fromNow()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl text-sm text-slate-700 dark:text-slate-300 border-l-2 border-blue-500 italic transition-colors duration-500">
                          "{req.reason}"
                        </div>

                        <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-700/50 pt-4 mt-auto transition-colors duration-500">
                          {req.status === "PENDING" ? (
                            <div className="flex gap-2">
                              <button onClick={() => handleRejectRequest(req.requestId || req.id)} disabled={isProcessing} className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-500 hover:text-white dark:bg-rose-500/10 dark:hover:bg-rose-500 dark:text-rose-400 rounded-xl transition-colors flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5"/> Từ chối
                              </button>
                              <button onClick={() => handleApproveRequest(req.requestId || req.id)} disabled={isProcessing} className="px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10 dark:hover:bg-emerald-500 dark:text-emerald-400 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5"/> Phê duyệt cấp
                              </button>
                            </div>
                          ) : (
                            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors duration-500 ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400'}`}>
                              {req.status === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5"/> : <XCircle className="w-3.5 h-3.5"/>}
                              {req.status}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ==========================================
                TAB 2: ĐÁNH GIÁ LẠI (REVALUATION - IFRS) 
                ========================================== */}
            {activeTab === "REVALUATION" && (
              <motion.div key="tab-rev" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col p-6 overflow-y-auto scrollbar-thin">
                 <div className="flex items-center gap-3 mb-8 shrink-0 transition-colors duration-500">
                  <div className="p-2.5 bg-purple-100 dark:bg-purple-900/50 rounded-xl transition-colors duration-500"><Scale className="w-6 h-6 text-purple-600 dark:text-purple-400"/></div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white transition-colors duration-500">Định giá lại Tài sản (Revaluation)</h3>
                    <p className="text-xs text-slate-500 transition-colors duration-500">Ghi nhận Thặng dư / Thâm hụt giá trị sổ sách theo chuẩn mực IFRS.</p>
                  </div>
                </div>

                <form onSubmit={handleRevaluate} className="flex flex-col gap-6 max-w-3xl w-full pb-10">
                  
                  <div className="glass-panel p-6 rounded-3xl shadow-sm flex flex-col gap-5 transition-colors duration-500">
                    <div className="space-y-1.5 group">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 group-focus-within:text-purple-500 transition-colors"><Laptop className="w-4 h-4"/> Chọn tài sản định giá *</label>
                      <select 
                        value={revAssetId} onChange={(e) => setRevAssetId(e.target.value)} disabled={loadingAssets || isProcessing}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 font-semibold shadow-sm text-slate-900 dark:text-white cursor-pointer transition-colors duration-500"
                      >
                        <option value="">-- Mở danh sách tài sản sổ cái --</option>
                        {assets.filter((a: any) => a.status !== "LIQUIDATED").map((a: any) => (
                          <option key={a.assetId} value={a.assetId}>{a.assetCode} - {a.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* DATA VIZ: BẢNG SO SÁNH GIÁ TRỊ (DIFF) */}
                    <AnimatePresence>
                      {selectedRevAsset && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                          <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors duration-500">
                            {/* Bên Trái: Sổ sách */}
                            <div className="flex-1 w-full text-center p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm transition-colors duration-500">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Giá trị Sổ sách (Cũ)</p>
                              <p className="text-xl font-black text-slate-700 dark:text-slate-300">{formatVND(selectedRevAsset.currentValue)}</p>
                            </div>
                            
                            <ArrowRight className="w-6 h-6 text-slate-300 dark:text-slate-600 hidden md:block" />
                            
                            {/* Bên Phải: Định giá mới */}
                            <div className={cn("flex-1 w-full text-center p-4 rounded-xl shadow-sm border-2 transition-colors duration-500", !newValue ? 'bg-white border-transparent dark:bg-slate-800' : diffValue > 0 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-500/30' : diffValue < 0 ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-500/30' : 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600')}>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Định giá Mới (Sau điều chỉnh)</p>
                              <p className={cn("text-xl font-black transition-colors duration-500", !newValue ? 'text-slate-400' : diffValue > 0 ? 'text-emerald-600 dark:text-emerald-400' : diffValue < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300')}>
                                {newValue ? formatVND(Number(newValue)) : "Nhập giá bên dưới..."}
                              </p>
                            </div>
                          </div>
                          
                          {/* Thông báo Chênh lệch */}
                          {newValue && (
                            <div className={cn("mt-3 flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-bold transition-colors duration-500", diffValue > 0 ? 'text-emerald-700 dark:text-emerald-400' : diffValue < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400')}>
                              {diffValue > 0 ? <TrendingUp className="w-5 h-5" /> : diffValue < 0 ? <TrendingDown className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                              {diffValue > 0 ? "Phát sinh Lãi/Thặng dư ĐGL:" : diffValue < 0 ? "Phát sinh Lỗ/Thâm hụt ĐGL:" : "Không có thay đổi giá trị:"}
                              <span className="text-lg">{formatVND(Math.abs(diffValue))}</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700/50 pt-5 transition-colors duration-500">
                      {/* 🚀 BỔ SUNG: KỲ KẾ TOÁN */}
                      <div className="space-y-1.5 group md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 group-focus-within:text-purple-500 transition-colors">
                          <CalendarDays className="w-4 h-4"/> Kỳ Kế Toán Ghi Sổ *
                        </label>
                        <select 
                          value={fiscalPeriodId} onChange={(e) => setFiscalPeriodId(e.target.value)} required disabled={loadingPeriods || isProcessing}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 font-semibold shadow-sm text-slate-900 dark:text-white cursor-pointer transition-colors duration-500"
                        >
                          <option value="">-- Chọn Kỳ Hạch Toán Auto-GL --</option>
                          {periods.map((p: any) => (
                            <option key={p.periodId} value={p.periodId} disabled={p.isClosed || p.status === "CLOSED"}>
                              {p.periodName} {p.isClosed || p.status === "CLOSED" ? "(Đã Khóa)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5 group">
                        <label className="text-xs font-bold text-slate-500 group-focus-within:text-purple-500 transition-colors uppercase">Giá trị Mới (VND) *</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500" />
                          <input 
                            type="number" min="0" required disabled={!selectedRevAsset || isProcessing}
                            value={newValue} onChange={(e) => setNewValue(e.target.value)}
                            placeholder="Nhập giá mới..."
                            className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-purple-700 dark:text-purple-400 focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 shadow-inner transition-colors duration-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 group">
                        <label className="text-xs font-bold text-slate-500 group-focus-within:text-purple-500 transition-colors uppercase">Lý do / Căn cứ pháp lý *</label>
                        <input 
                          type="text" required disabled={!selectedRevAsset || isProcessing}
                          value={revReason} onChange={(e) => setRevReason(e.target.value)}
                          placeholder="VD: Biên bản thẩm định giá số..."
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 shadow-sm text-slate-900 dark:text-white transition-colors duration-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={!selectedRevAsset || !newValue || !fiscalPeriodId || isProcessing} className="w-full sm:w-auto self-end px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xl shadow-purple-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Ghi nhận Sổ cái
                  </button>
                </form>
              </motion.div>
            )}

            {/* ==========================================
                TAB 3: NGHIỆM THU BẢO TRÌ 
                ========================================== */}
            {activeTab === "MAINTENANCE" && (
              <motion.div key="tab-maint" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col p-6 overflow-y-auto scrollbar-thin">
                <div className="flex items-center gap-3 mb-8 shrink-0 transition-colors duration-500">
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-xl transition-colors duration-500"><Wrench className="w-6 h-6 text-amber-600 dark:text-amber-400"/></div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white transition-colors duration-500">Nghiệm thu Hoàn tất Bảo trì</h3>
                    <p className="text-xs text-slate-500 transition-colors duration-500">Trả tài sản về trạng thái sẵn sàng và ghi nhận chi phí sửa chữa.</p>
                  </div>
                </div>

                <form onSubmit={handleCompleteMaintenance} className="flex flex-col gap-6 max-w-3xl w-full pb-10">
                  <div className="glass-panel p-6 rounded-3xl shadow-sm flex flex-col gap-5 transition-colors duration-500">
                    <div className="space-y-1.5 group">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between group-focus-within:text-amber-500 transition-colors">
                        <span className="flex items-center gap-2"><AlertOctagon className="w-4 h-4"/> Chọn Thiết bị đang "nằm viện" *</span>
                        <span className="text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-lg">Đang có {maintenanceAssets.length} máy</span>
                      </label>
                      <select 
                        value={maintAssetId} onChange={(e) => setMaintAssetId(e.target.value)} disabled={loadingAssets || isProcessing || maintenanceAssets.length === 0}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 font-semibold shadow-sm text-slate-900 dark:text-white cursor-pointer transition-colors duration-500"
                      >
                        <option value="">-- Danh sách đang bảo trì --</option>
                        {maintenanceAssets.map((a: any) => (
                          <option key={a.assetId} value={a.assetId}>{a.assetCode} - {a.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700/50 pt-5 transition-colors duration-500">
                      <div className="space-y-1.5 group">
                        <label className="text-xs font-bold text-slate-500 group-focus-within:text-amber-500 transition-colors uppercase">Chi phí thực tế (VND) *</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500" />
                          <input 
                            type="number" min="0" required disabled={!selectedMaintAsset || isProcessing}
                            value={maintCost} onChange={(e) => setMaintCost(e.target.value)}
                            placeholder="VD: 1500000"
                            className="w-full pl-9 pr-4 py-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-lg font-black text-amber-700 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50 shadow-inner transition-colors duration-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 group">
                        <label className="text-xs font-bold text-slate-500 group-focus-within:text-amber-500 transition-colors uppercase">Ghi chú Nghiệm thu *</label>
                        <input 
                          type="text" required disabled={!selectedMaintAsset || isProcessing}
                          value={maintNotes} onChange={(e) => setMaintNotes(e.target.value)}
                          placeholder="Mô tả linh kiện thay thế..."
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50 shadow-sm text-slate-900 dark:text-white transition-colors duration-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={!selectedMaintAsset || !maintCost || isProcessing} className="w-full sm:w-auto self-end px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xl shadow-amber-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Xác nhận Trả kho & Ghi nhận phí
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </Modal>
  );
}