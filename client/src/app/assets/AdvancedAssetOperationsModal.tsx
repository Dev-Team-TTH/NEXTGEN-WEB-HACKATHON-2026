"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Laptop, ArrowRight, CheckCircle2, XCircle, 
  Loader2, ShieldAlert, Wrench, TrendingUp, TrendingDown,
  DollarSign, FileText, Activity, AlertOctagon, Scale,
  Clock, // ✅ Đã bổ sung import Clock để fix lỗi TypeScript
  Package, User, Search
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { 
  useGetAssetsQuery,
  useGetAssetRequestsQuery,
  useApproveAssetRequestMutation,
  useRejectAssetRequestMutation,
  useRevaluateAssetMutation,
  useCompleteAssetMaintenanceMutation
} from "@/state/api";

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

type OperationTab = "REQUESTS" | "REVALUATION" | "MAINTENANCE";

interface AdvancedOperationsProps {
  isOpen: boolean;
  onClose: () => void;
}

// ==========================================
// COMPONENT CHÍNH: TRẠM NGHIỆP VỤ TÀI SẢN NÂNG CAO
// ==========================================
export default function AdvancedAssetOperationsModal({ isOpen, onClose }: AdvancedOperationsProps) {
  // --- STATE ĐIỀU HƯỚNG ---
  const [activeTab, setActiveTab] = useState<OperationTab>("REQUESTS");
  const [searchReq, setSearchReq] = useState("");

  // --- API HOOKS FETCHING ---
  const { data: assets = [], isLoading: loadingAssets } = useGetAssetsQuery(undefined, { skip: !isOpen });
  const { data: rawRequests = [], isLoading: loadingRequests, refetch: refetchRequests } = useGetAssetRequestsQuery({}, { skip: !isOpen || activeTab !== "REQUESTS" });

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
    if (!revAssetId || !newValue || !revReason) {
      toast.error("Vui lòng nhập đầy đủ giá trị và lý do định giá lại!"); return;
    }
    if (window.confirm(`Xác nhận ghi nhận giá trị sổ sách mới là ${formatVND(Number(newValue))}?\nHệ thống sẽ tự sinh bút toán chênh lệch (Lãi/Lỗ đánh giá lại tài sản).`)) {
      try {
        await revaluateAsset({
          id: revAssetId,
          data: { newValue: Number(newValue), reason: revReason, revaluationDate: dayjs().format('YYYY-MM-DD') }
        }).unwrap();
        toast.success("Đánh giá lại tài sản thành công! Sổ cái đã cập nhật.");
        setRevAssetId(""); setNewValue(""); setRevReason("");
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi ghi nhận nghiệp vụ!");
      }
    }
  };

  const handleCompleteMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintAssetId || !maintCost) {
      toast.error("Vui lòng chọn thiết bị và nhập tổng chi phí bảo trì!"); return;
    }
    
    const activeMaintenanceId = selectedMaintAsset?.maintenanceHistory?.[0]?.maintenanceId || "N/A";
    
    try {
      await completeMaintenance({
        maintenanceId: activeMaintenanceId, // Trong thực tế lấy đúng ID bảo trì
        data: { cost: Number(maintCost), notes: maintNotes, endDate: dayjs().format('YYYY-MM-DD') }
      }).unwrap();
      toast.success("Đã nghiệm thu! Thiết bị đã sẵn sàng sử dụng.");
      setMaintAssetId(""); setMaintCost(""); setMaintNotes("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi khi nghiệm thu!");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };
  const listVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md"
        >
          <div className="absolute inset-0" onClick={!isProcessing ? onClose : undefined} />

          <motion.div
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-5xl bg-slate-50 dark:bg-[#0B0F19] rounded-3xl shadow-2xl border border-amber-500/20 overflow-hidden z-10 flex flex-col md:flex-row h-[85vh]"
          >
            {/* 1. SIDEBAR MENU CẤP CAO */}
            <div className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 shrink-0 flex flex-col shadow-[10px_0_20px_rgba(0,0,0,0.02)] z-20">
              <div className="p-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
                <div>
                  <h2 className="font-black text-amber-700 dark:text-amber-500">Advanced Ops</h2>
                  <p className="text-[10px] text-amber-600/70 font-bold uppercase tracking-wider mt-1">Trạm Nghiệp Vụ Chuyên Sâu</p>
                </div>
                <button onClick={onClose} disabled={isProcessing} className="md:hidden p-1.5 bg-white dark:bg-slate-800 rounded-lg text-slate-500 shadow-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-3 flex flex-col gap-2 flex-1">
                <button 
                  onClick={() => setActiveTab("REQUESTS")}
                  className={`relative px-4 py-3.5 rounded-xl flex items-center gap-3 text-sm font-bold transition-all text-left overflow-hidden group ${activeTab === "REQUESTS" ? "text-blue-700 dark:text-blue-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  {activeTab === "REQUESTS" && <motion.div layoutId="advAssetBg" className="absolute inset-0 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl -z-10" />}
                  <FileText className={`w-5 h-5 ${activeTab === "REQUESTS" ? "text-blue-500" : "text-slate-400 group-hover:text-blue-500 transition-colors"}`} /> Xét duyệt Yêu cầu
                </button>
                
                <button 
                  onClick={() => setActiveTab("REVALUATION")}
                  className={`relative px-4 py-3.5 rounded-xl flex items-center gap-3 text-sm font-bold transition-all text-left overflow-hidden group ${activeTab === "REVALUATION" ? "text-purple-700 dark:text-purple-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  {activeTab === "REVALUATION" && <motion.div layoutId="advAssetBg" className="absolute inset-0 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl -z-10" />}
                  <Scale className={`w-5 h-5 ${activeTab === "REVALUATION" ? "text-purple-500" : "text-slate-400 group-hover:text-purple-500 transition-colors"}`} /> Đánh giá lại (IFRS)
                </button>
                
                <button 
                  onClick={() => setActiveTab("MAINTENANCE")}
                  className={`relative px-4 py-3.5 rounded-xl flex items-center gap-3 text-sm font-bold transition-all text-left overflow-hidden group ${activeTab === "MAINTENANCE" ? "text-amber-700 dark:text-amber-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  {activeTab === "MAINTENANCE" && <motion.div layoutId="advAssetBg" className="absolute inset-0 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl -z-10" />}
                  <Wrench className={`w-5 h-5 ${activeTab === "MAINTENANCE" ? "text-amber-500" : "text-slate-400 group-hover:text-amber-500 transition-colors"}`} /> Nghiệm thu Bảo trì
                </button>
              </div>

              <div className="hidden md:block p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
                <button onClick={onClose} disabled={isProcessing} className="w-full py-3 bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/20 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold transition-colors shadow-sm">
                  Đóng Trạm Nghiệp Vụ
                </button>
              </div>
            </div>

            {/* 2. MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-transparent relative overflow-hidden">
              <AnimatePresence mode="wait">
                
                {/* ==========================================
                    TAB 1: XÉT DUYỆT YÊU CẦU 
                    ========================================== */}
                {activeTab === "REQUESTS" && (
                  <motion.div key="tab-req" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 flex flex-col p-6 overflow-y-auto scrollbar-thin">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-xl"><FileText className="w-6 h-6 text-blue-600 dark:text-blue-400"/></div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Duyệt Yêu Cầu Tài Sản</h3>
                          <p className="text-xs text-slate-500">Phê duyệt hoặc từ chối đề xuất cấp mới thiết bị của nhân viên.</p>
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" placeholder="Tìm người gửi, thiết bị..." 
                          value={searchReq} onChange={(e) => setSearchReq(e.target.value)}
                          className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                      </div>
                    </div>

                    {loadingRequests ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-blue-500"><Loader2 className="w-8 h-8 animate-spin"/></div>
                    ) : requests.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10">
                        <Package className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-bold text-slate-600 dark:text-slate-300">Không có yêu cầu cấp phát nào.</p>
                        <p className="text-sm mt-1">Mọi thứ đều đã được giải quyết xong!</p>
                      </div>
                    ) : (
                      <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {requests.map((req: any) => (
                          <motion.div variants={itemVariants} key={req.requestId || req.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 group">
                            <div className="flex justify-between items-start">
                              <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                  <User className="w-5 h-5 text-slate-500" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-900 dark:text-white">{req.requestedItem || "Thiết bị văn phòng"}</h4>
                                  <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500">
                                    <span>Bởi: <b className="text-blue-600 dark:text-blue-400">{req.requester?.fullName || "Nhân viên"}</b></span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {dayjs(req.createdAt).fromNow()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl text-sm text-slate-700 dark:text-slate-300 border-l-2 border-blue-500 italic">
                              "{req.reason}"
                            </div>

                            <div className="flex items-center justify-end border-t border-slate-100 dark:border-white/5 pt-4 mt-auto">
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
                                <span className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
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
                     <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 bg-purple-100 dark:bg-purple-900/50 rounded-xl"><Scale className="w-6 h-6 text-purple-600 dark:text-purple-400"/></div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Định giá lại Tài sản (Revaluation)</h3>
                        <p className="text-xs text-slate-500">Ghi nhận Thặng dư / Thâm hụt giá trị sổ sách theo chuẩn mực IFRS.</p>
                      </div>
                    </div>

                    <form onSubmit={handleRevaluate} className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
                      
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Laptop className="w-4 h-4"/> Chọn tài sản định giá *</label>
                          <select 
                            value={revAssetId} onChange={(e) => setRevAssetId(e.target.value)} disabled={loadingAssets || isProcessing}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                          >
                            <option value="">-- Mở danh sách tài sản sổ cái --</option>
                            {assets.filter(a => a.status !== "LIQUIDATED").map(a => (
                              <option key={a.assetId} value={a.assetId}>{a.assetCode} - {a.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* DATA VIZ: BẢNG SO SÁNH GIÁ TRỊ (DIFF) */}
                        <AnimatePresence>
                          {selectedRevAsset && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                              <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 dark:bg-[#0B0F19] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                                {/* Bên Trái: Sổ sách */}
                                <div className="flex-1 w-full text-center p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Giá trị Sổ sách (Cũ)</p>
                                  <p className="text-xl font-black text-slate-700 dark:text-slate-300">{formatVND(selectedRevAsset.currentValue)}</p>
                                </div>
                                
                                <ArrowRight className="w-6 h-6 text-slate-300 dark:text-slate-600 hidden md:block" />
                                
                                {/* Bên Phải: Định giá mới */}
                                <div className={`flex-1 w-full text-center p-4 rounded-xl shadow-sm border-2 ${!newValue ? 'bg-white border-transparent dark:bg-slate-800' : diffValue > 0 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-500/30' : diffValue < 0 ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-500/30' : 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Định giá Mới (Sau điều chỉnh)</p>
                                  <p className={`text-xl font-black ${!newValue ? 'text-slate-400' : diffValue > 0 ? 'text-emerald-600 dark:text-emerald-400' : diffValue < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {newValue ? formatVND(Number(newValue)) : "Nhập giá bên dưới..."}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Thông báo Chênh lệch */}
                              {newValue && (
                                <div className={`mt-3 flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-bold ${diffValue > 0 ? 'text-emerald-700 dark:text-emerald-400' : diffValue < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {diffValue > 0 ? <TrendingUp className="w-5 h-5" /> : diffValue < 0 ? <TrendingDown className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                                  {diffValue > 0 ? "Phát sinh Lãi/Thặng dư ĐGL:" : diffValue < 0 ? "Phát sinh Lỗ/Thâm hụt ĐGL:" : "Không có thay đổi giá trị:"}
                                  <span className="text-lg">{formatVND(Math.abs(diffValue))}</span>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/5 pt-5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Giá trị Mới (VND) *</label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                              <input 
                                type="number" min="0" required disabled={!selectedRevAsset || isProcessing}
                                value={newValue} onChange={(e) => setNewValue(e.target.value)}
                                placeholder="Nhập giá mới..."
                                className="w-full pl-9 pr-4 py-3 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/30 rounded-xl text-lg font-black text-purple-700 dark:text-purple-400 focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase">Lý do / Căn cứ pháp lý *</label>
                            <input 
                              type="text" required disabled={!selectedRevAsset || isProcessing}
                              value={revReason} onChange={(e) => setRevReason(e.target.value)}
                              placeholder="VD: Biên bản thẩm định giá số..."
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>

                      <button type="submit" disabled={!selectedRevAsset || !newValue || isProcessing} className="w-full sm:w-auto self-end px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xl shadow-purple-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
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
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-xl"><Wrench className="w-6 h-6 text-amber-600 dark:text-amber-400"/></div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Nghiệm thu Hoàn tất Bảo trì</h3>
                        <p className="text-xs text-slate-500">Trả tài sản về trạng thái sẵn sàng và ghi nhận chi phí sửa chữa.</p>
                      </div>
                    </div>

                    <form onSubmit={handleCompleteMaintenance} className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                            <span className="flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-amber-500"/> Chọn Thiết bị đang "nằm viện" *</span>
                            <span className="text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-lg">Đang có {maintenanceAssets.length} máy</span>
                          </label>
                          <select 
                            value={maintAssetId} onChange={(e) => setMaintAssetId(e.target.value)} disabled={loadingAssets || isProcessing || maintenanceAssets.length === 0}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                          >
                            <option value="">-- Danh sách đang bảo trì --</option>
                            {maintenanceAssets.map(a => (
                              <option key={a.assetId} value={a.assetId}>{a.assetCode} - {a.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/5 pt-5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Chi phí thực tế (VND) *</label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                              <input 
                                type="number" min="0" required disabled={!selectedMaintAsset || isProcessing}
                                value={maintCost} onChange={(e) => setMaintCost(e.target.value)}
                                placeholder="VD: 1500000"
                                className="w-full pl-9 pr-4 py-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-lg font-black text-amber-700 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase">Ghi chú Nghiệm thu *</label>
                            <input 
                              type="text" required disabled={!selectedMaintAsset || isProcessing}
                              value={maintNotes} onChange={(e) => setMaintNotes(e.target.value)}
                              placeholder="Mô tả linh kiện thay thế..."
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>

                      <button type="submit" disabled={!selectedMaintAsset || !maintCost || isProcessing} className="w-full sm:w-auto self-end px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xl shadow-amber-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Xác nhận Trả kho & Ghi sổ
                      </button>
                    </form>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}