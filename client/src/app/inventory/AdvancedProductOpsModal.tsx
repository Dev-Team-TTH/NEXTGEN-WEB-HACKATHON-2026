"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Calendar, AlertTriangle, Plus, Trash2, 
  ArrowRight, Loader2, CheckCircle2,
  PackageSearch, Activity, Calculator, History, Layers, Box
} from "lucide-react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  Product,
  useGetProductBatchesQuery,
  useCreateProductBatchMutation,
  useDeleteProductBatchMutation,
  useGetUomConversionsQuery,
  useCreateUomConversionMutation,
  useDeleteUomConversionMutation,
  useGetUoMsQuery
} from "@/state/api";

// --- IMPORT CORE MODAL ---
import Modal from "@/app/(components)/Modal";

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
type TabType = "BATCHES" | "UOM";

interface AdvancedProductOpsProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

// ==========================================
// COMPONENT CHÍNH: TRẠM NGHIỆP VỤ HÀNG HÓA SÂU
// ==========================================
export default function AdvancedProductOpsModal({ isOpen, onClose, product }: AdvancedProductOpsProps) {
  
  // --- STATE TABS & FORMS ---
  const [activeTab, setActiveTab] = useState<TabType>("BATCHES");

  // State Form Lô hàng (Batch)
  const [batchNumber, setBatchNumber] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expDate, setExpDate] = useState("");

  // State Form Quy đổi (UoM)
  const [fromUomId, setFromUomId] = useState("");
  const [toUomId, setToUomId] = useState("");
  const [conversionRate, setConversionRate] = useState("");

  // --- API HOOKS ---
  const { data: batches = [], isLoading: loadingBatches } = useGetProductBatchesQuery(product?.productId || "", { skip: !isOpen || !product || activeTab !== "BATCHES" });
  const { data: conversions = [], isLoading: loadingConvs } = useGetUomConversionsQuery({ productId: product?.productId }, { skip: !isOpen || !product || activeTab !== "UOM" });
  const { data: masterUoms = [] } = useGetUoMsQuery(undefined, { skip: !isOpen });

  const [createBatch, { isLoading: isCreatingBatch }] = useCreateProductBatchMutation();
  const [deleteBatch, { isLoading: isDeletingBatch }] = useDeleteProductBatchMutation();
  const [createConversion, { isLoading: isCreatingConv }] = useCreateUomConversionMutation();
  const [deleteConversion, { isLoading: isDeletingConv }] = useDeleteUomConversionMutation();

  const isProcessing = isCreatingBatch || isCreatingConv;

  // --- RESET STATE ---
  useEffect(() => {
    if (isOpen && product) {
      setActiveTab("BATCHES");
      setBatchNumber(`LOT-${dayjs().format('YYYYMMDD')}-${Math.floor(Math.random() * 1000)}`);
      setMfgDate(dayjs().format('YYYY-MM-DD'));
      setExpDate(dayjs().add(1, 'year').format('YYYY-MM-DD'));
      
      setFromUomId("");
      setToUomId(product.uomId || ""); 
      setConversionRate("");
    }
  }, [isOpen, product]);

  // --- HANDLERS ---
  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!batchNumber || !mfgDate || !expDate) {
      toast.error("Vui lòng điền đầy đủ Số lô, NSX và HSD!"); return;
    }
    if (dayjs(expDate).isBefore(dayjs(mfgDate))) {
      toast.error("Hạn sử dụng không thể trước Ngày sản xuất!"); return;
    }

    try {
      await createBatch({
        productId: product.productId,
        batchNumber,
        manufactureDate: new Date(mfgDate).toISOString(), // FIX LỖI TS2561: Đổi thành manufactureDate
        expiryDate: new Date(expDate).toISOString(),
        isActive: true
      }).unwrap();
      toast.success("Đã ghi nhận Lô hàng mới!");
      setBatchNumber(`LOT-${dayjs().format('YYYYMMDD')}-${Math.floor(Math.random() * 1000)}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi tạo lô hàng!");
    }
  };

  const handleDeleteBatch = async (id: string, code: string) => {
    if (window.confirm(`Xóa Lô [${code}]? Mọi tồn kho thuộc lô này có thể bị mồ côi.`)) {
      try {
        await deleteBatch(id).unwrap();
        toast.success("Đã xóa Lô hàng!");
      } catch (err) {
        toast.error("Lô hàng đang có tồn kho, không thể xóa!");
      }
    }
  };

  const handleAddConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!fromUomId || !toUomId || !conversionRate || Number(conversionRate) <= 0) {
      toast.error("Vui lòng nhập Đơn vị quy đổi và Tỷ lệ > 0!"); return;
    }
    if (fromUomId === toUomId) {
      toast.error("Không thể quy đổi cùng một đơn vị!"); return;
    }

    try {
      await createConversion({
        productId: product.productId,
        fromUomId,
        toUomId,
        conversionRate: Number(conversionRate)
      }).unwrap();
      toast.success("Thiết lập Quy đổi thành công!");
      setFromUomId(""); setConversionRate("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi thiết lập quy đổi!");
    }
  };

  const handleDeleteConversion = async (id: string) => {
    if (window.confirm(`Xóa cấu hình quy đổi này?`)) {
      try {
        await deleteConversion(id).unwrap();
        toast.success("Đã xóa quy đổi!");
      } catch (err) {
        toast.error("Không thể xóa!");
      }
    }
  };

  // --- ANIMATION CONFIG ---
  const listVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } };

  const productName = product?.name || "Chưa chọn sản phẩm";
  const productCode = product?.productCode || "N/A";

  return (
    <Modal
      isOpen={isOpen && !!product}
      onClose={onClose}
      maxWidth="max-w-5xl"
      disableOutsideClick={isProcessing}
      hideHeader={true}
      hideFooter={true}
    >
      <div className="flex flex-col md:flex-row h-[85vh] w-full relative">
        {/* ========================================== */}
        {/* SIDEBAR BÊN TRÁI: ĐIỀU HƯỚNG TABS           */}
        {/* ========================================== */}
        <div className="w-full md:w-64 bg-white dark:bg-[#0B0F19] border-r border-slate-200 dark:border-white/10 shrink-0 flex flex-col shadow-[10px_0_20px_rgba(0,0,0,0.02)] z-20">
          <div className="p-5 border-b border-slate-200 dark:border-white/5 flex flex-col gap-1 bg-indigo-50/50 dark:bg-indigo-900/10">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-indigo-700 dark:text-indigo-400">Advanced Product</h2>
              <button onClick={onClose} disabled={isProcessing} className="md:hidden p-1 bg-white dark:bg-slate-800 rounded-md text-slate-500 shadow-sm"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-2" title={productName}>{productName}</p>
            <span className="text-[10px] font-mono text-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded w-fit">{productCode}</span>
          </div>
          
          <div className="p-3 flex flex-col gap-2 flex-1">
            <button 
              onClick={() => setActiveTab("BATCHES")}
              className={`relative px-4 py-3.5 rounded-xl flex items-center gap-3 text-sm font-bold transition-all text-left overflow-hidden group ${activeTab === "BATCHES" ? "text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              {activeTab === "BATCHES" && <motion.div layoutId="advProdTabBg" className="absolute inset-0 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl -z-10" />}
              <Calendar className={`w-5 h-5 ${activeTab === "BATCHES" ? "text-emerald-500" : "text-slate-400 group-hover:text-emerald-500 transition-colors"}`} /> 
              Hạn mức Lô hàng (Batches)
            </button>
            
            <button 
              onClick={() => setActiveTab("UOM")}
              className={`relative px-4 py-3.5 rounded-xl flex items-center gap-3 text-sm font-bold transition-all text-left overflow-hidden group ${activeTab === "UOM" ? "text-blue-700 dark:text-blue-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              {activeTab === "UOM" && <motion.div layoutId="advProdTabBg" className="absolute inset-0 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl -z-10" />}
              <Calculator className={`w-5 h-5 ${activeTab === "UOM" ? "text-blue-500" : "text-slate-400 group-hover:text-blue-500 transition-colors"}`} /> 
              Quy đổi Đơn vị (UoM)
            </button>
          </div>

          <div className="hidden md:block p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 mt-auto">
            <button onClick={onClose} disabled={isProcessing} className="w-full py-3 bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/20 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold transition-colors shadow-sm">
              Đóng thiết lập
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* MAIN CONTENT AREA                          */}
        {/* ========================================== */}
        <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-slate-50/50 dark:bg-transparent">
          <AnimatePresence mode="wait">
            
            {/* ---------------------------------------------------- */}
            {/* TAB 1: BATCHES (QUẢN LÝ LÔ & HẠN SỬ DỤNG)             */}
            {/* ---------------------------------------------------- */}
            {activeTab === "BATCHES" && (
              <motion.div key="tab-batches" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute inset-0 flex flex-col p-6 overflow-y-auto scrollbar-thin">
                <div className="flex flex-col lg:flex-row gap-6 h-full pb-10 md:pb-0">
                  
                  {/* KHỐI FORM THÊM LÔ MỚI */}
                  <div className="w-full lg:w-[350px] shrink-0">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-4 sticky top-0">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <Plus className="w-4 h-4 text-emerald-500" /> Tạo Lô (Batch/Lot) mới
                      </h3>
                      <form onSubmit={handleAddBatch} className="flex flex-col gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase">Mã số Lô (Batch Number) *</label>
                          <input type="text" required value={batchNumber} onChange={(e) => setBatchNumber(e.target.value.toUpperCase())} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 uppercase"/>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase">Ngày Sản Xuất (MFG) *</label>
                          <input type="date" required value={mfgDate} onChange={(e) => setMfgDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"/>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-rose-500 uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Hạn Sử Dụng (EXP) *</label>
                          <input type="date" required value={expDate} onChange={(e) => setExpDate(e.target.value)} className="w-full px-3 py-2.5 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-sm font-bold text-rose-700 dark:text-rose-400 outline-none focus:ring-2 focus:ring-rose-500"/>
                        </div>
                        <button type="submit" disabled={isProcessing} className="mt-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex justify-center items-center gap-2">
                          {isCreatingBatch ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>} Xác nhận tạo Lô
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* KHỐI DANH SÁCH & DATA VIZ */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm p-5 flex-1 flex flex-col">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-500" /> Vòng đời Lô hàng (Expiry Tracking)
                      </h3>
                      
                      {loadingBatches ? (
                        <div className="flex-1 flex items-center justify-center text-emerald-500"><Loader2 className="w-10 h-10 animate-spin"/></div>
                      ) : batches.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
                          <Layers className="w-12 h-12 mb-3 opacity-30" />
                          <p className="font-bold text-slate-600 dark:text-slate-300">Chưa có Lô hàng nào</p>
                          <p className="text-xs mt-1">Sản phẩm này hiện đang quản lý chung không phân biệt Lô/Date.</p>
                        </div>
                      ) : (
                        <motion.div variants={listVariants} initial="hidden" animate="visible" className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                          {batches.map((batch: any) => {
                            // Data Viz: Tính toán cảnh báo Hạn sử dụng
                            const daysToExpiry = dayjs(batch.expiryDate).diff(dayjs(), 'day');
                            let status = { label: "Còn Hạn dài", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/30", bar: "bg-emerald-500", percent: 10 };
                            if (daysToExpiry < 0) {
                              status = { label: "Đã Hết Hạn", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-200 dark:border-rose-500/30", bar: "bg-rose-500", percent: 100 };
                            } else if (daysToExpiry <= 60) {
                              status = { label: "Cận Date", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-500/30", bar: "bg-amber-500", percent: 80 };
                            }

                            return (
                              <motion.div variants={itemVariants} key={batch.batchId || batch.id} className={`p-4 rounded-2xl border ${status.bg} ${status.border} flex flex-col gap-3 group relative overflow-hidden`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                      <PackageSearch className={`w-5 h-5 ${status.color}`} />
                                    </div>
                                    <div>
                                      <h4 className="font-black text-slate-800 dark:text-slate-100">{batch.batchNumber}</h4>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${status.color} ${status.border} bg-white dark:bg-transparent`}>
                                        {status.label} {daysToExpiry > 0 && `(Còn ${daysToExpiry} ngày)`}
                                      </span>
                                    </div>
                                  </div>
                                  <button onClick={() => handleDeleteBatch(batch.batchId || batch.id, batch.batchNumber)} disabled={isDeletingBatch} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-white dark:hover:bg-rose-900/50 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 className="w-4 h-4"/>
                                  </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-xs font-semibold bg-white/50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-white/20 dark:border-slate-700/50">
                                  <div><span className="text-slate-500 font-medium">MFG:</span> <span className="text-slate-700 dark:text-slate-300">{dayjs(batch.manufacturingDate).format('DD/MM/YYYY')}</span></div>
                                  <div className="text-right"><span className="text-slate-500 font-medium">EXP:</span> <span className={status.color}>{dayjs(batch.expiryDate).format('DD/MM/YYYY')}</span></div>
                                </div>

                                {/* Expiry Bar */}
                                <div className="w-full h-1.5 bg-white dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className={`h-full ${status.bar}`} style={{ width: `${status.percent}%` }} />
                                </div>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* ---------------------------------------------------- */}
            {/* TAB 2: UOM (QUY ĐỔI ĐƠN VỊ TÍNH)                    */}
            {/* ---------------------------------------------------- */}
            {activeTab === "UOM" && (
              <motion.div key="tab-uom" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute inset-0 flex flex-col p-6 overflow-y-auto scrollbar-thin">
                 
                 <div className="flex flex-col lg:flex-row gap-6 h-full pb-10 md:pb-0">
                  
                  {/* KHỐI FORM THÊM QUY ĐỔI */}
                  <div className="w-full lg:w-[350px] shrink-0">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-4 sticky top-0">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <Activity className="w-4 h-4 text-blue-500" /> Thiết lập Đơn vị mới
                      </h3>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Đơn vị đích (To UoM) là đơn vị nhỏ nhất muốn quy ra. VD: 1 Thùng (From) = 24 Lon (To).
                      </p>
                      <form onSubmit={handleAddConversion} className="flex flex-col gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">Đơn vị Lớn (From UoM) *</label>
                          <select required value={fromUomId} onChange={(e) => setFromUomId(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Chọn đơn vị (Thùng, Hộp) --</option>
                            {masterUoms.map(u => <option key={u.uomId} value={u.uomId}>{u.name} ({u.code})</option>)}
                          </select>
                        </div>
                        
                        <div className="flex justify-center -my-2"><ArrowRight className="w-5 h-5 text-blue-500 rotate-90"/></div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase">Hệ số quy đổi (Rate) *</label>
                          <div className="relative">
                            <X className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500" />
                            <input type="number" min="1" step="0.01" required value={conversionRate} onChange={(e) => setConversionRate(e.target.value)} placeholder="VD: 24, 10, 5.5..." className="w-full pl-9 pr-3 py-2.5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/30 rounded-xl text-lg font-black text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500"/>
                          </div>
                        </div>

                        <div className="flex justify-center -my-2"><ArrowRight className="w-5 h-5 text-blue-500 rotate-90"/></div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase">Đơn vị Nhỏ (To UoM) *</label>
                          <select required value={toUomId} onChange={(e) => setToUomId(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Chọn đơn vị đích --</option>
                            {masterUoms.map(u => <option key={u.uomId} value={u.uomId}>{u.name} ({u.code})</option>)}
                          </select>
                        </div>

                        <button type="submit" disabled={isProcessing} className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex justify-center items-center gap-2">
                          {isCreatingConv ? <Loader2 className="w-5 h-5 animate-spin"/> : <Calculator className="w-5 h-5"/>} Ghi nhận Công thức
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* KHỐI DANH SÁCH CÔNG THỨC */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm p-5 flex-1 flex flex-col">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Box className="w-4 h-4 text-blue-500" /> Bảng Công thức Đã thiết lập
                      </h3>
                      
                      {loadingConvs ? (
                        <div className="flex-1 flex items-center justify-center text-blue-500"><Loader2 className="w-10 h-10 animate-spin"/></div>
                      ) : conversions.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
                          <Calculator className="w-12 h-12 mb-3 opacity-30" />
                          <p className="font-bold text-slate-600 dark:text-slate-300">Chưa có công thức quy đổi</p>
                          <p className="text-xs mt-1">Sản phẩm này chỉ bán theo Đơn vị cơ sở gốc.</p>
                        </div>
                      ) : (
                        <motion.div variants={listVariants} initial="hidden" animate="visible" className="flex flex-col gap-3">
                          {conversions.map((conv: any) => {
                            const fromName = masterUoms.find(u => u.uomId === conv.fromUomId)?.name || "N/A";
                            const toName = masterUoms.find(u => u.uomId === conv.toUomId)?.name || "N/A";

                            return (
                              <motion.div variants={itemVariants} key={conv.conversionId || conv.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors">
                                
                                {/* Data Viz: Visual Equation */}
                                <div className="flex items-center flex-wrap gap-2 sm:gap-4 font-black">
                                  <span className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 shadow-sm text-sm">
                                    1 <span className="text-blue-600 dark:text-blue-400">{fromName}</span>
                                  </span>
                                  
                                  <span className="text-slate-400 font-mono text-lg">=</span>
                                  
                                  <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg text-blue-700 dark:text-blue-400 shadow-sm text-lg flex items-center gap-1">
                                    <X className="w-4 h-4"/> {conv.conversionRate}
                                  </span>
                                  
                                  <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                  
                                  <span className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 shadow-sm text-sm">
                                    <span className="text-emerald-600 dark:text-emerald-400">{toName}</span>
                                  </span>
                                </div>

                                <button onClick={() => handleDeleteConversion(conv.conversionId || conv.id)} disabled={isDeletingConv} className="p-2 text-rose-400 hover:text-white bg-white hover:bg-rose-500 dark:bg-slate-800 dark:hover:bg-rose-600 rounded-xl transition-colors shadow-sm opacity-0 group-hover:opacity-100">
                                  <Trash2 className="w-4 h-4"/>
                                </button>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
}