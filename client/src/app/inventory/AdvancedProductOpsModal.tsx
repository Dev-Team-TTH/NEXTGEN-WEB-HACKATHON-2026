"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, Tags, Scale, Plus, Trash2, 
  Loader2, AlertCircle, ArrowRight 
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { 
  useGetUomConversionsQuery,
  useCreateUomConversionMutation,
  useDeleteUomConversionMutation,
  useGetProductBatchesQuery,
  useCreateProductBatchMutation,
  useDeleteProductBatchMutation,
  useGetUoMsQuery,
  Product
} from "@/state/api";

// --- COMPONENTS & UTILS ---
import Modal from "@/app/(components)/Modal";
import { formatDate } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

interface AdvProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function AdvancedProductOpsModal({ isOpen, onClose, product }: AdvProductModalProps) {
  const [activeTab, setActiveTab] = useState<"UOM" | "BATCH">("UOM");

  // --- API HOOKS ---
  const { data: uoms = [] } = useGetUoMsQuery(undefined, { skip: !isOpen });
  const { data: conversions = [], isLoading: loadingUoms } = useGetUomConversionsQuery({ productId: product?.productId }, { skip: !isOpen || !product });
  const { data: batches = [], isLoading: loadingBatches } = useGetProductBatchesQuery(product?.productId || "", { skip: !isOpen || !product });

  const [createUomConversion, { isLoading: isCreatingUom }] = useCreateUomConversionMutation();
  // 🚀 BỔ SUNG: Rút trích trạng thái isDeleting để khóa nút chống Spam API
  const [deleteUomConversion, { isLoading: isDeletingUom }] = useDeleteUomConversionMutation();
  
  const [createBatch, { isLoading: isCreatingBatch }] = useCreateProductBatchMutation();
  // 🚀 BỔ SUNG: Rút trích trạng thái isDeleting để khóa nút chống Spam API
  const [deleteBatch, { isLoading: isDeletingBatch }] = useDeleteProductBatchMutation();

  // --- FORM STATES ---
  const [uomForm, setUomForm] = useState({ toUomId: "", conversionRate: "" });
  const [batchForm, setBatchForm] = useState({ batchNumber: "", manufactureDate: "", expiryDate: "" });

  // 🚀 TỐI ƯU HIỆU NĂNG: Chỉ tìm lại UOM khi danh sách UOM hoặc Product thay đổi
  const baseUomName = useMemo(() => {
    if (!product) return "Đơn vị gốc";
    return uoms.find((u: any) => u.uomId === product.uomId)?.name || "Đơn vị gốc";
  }, [uoms, product]);

  if (!product) return null;

  // --- HANDLERS ---
  const handleAddUom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uomForm.toUomId || !uomForm.conversionRate) {
      return toast.error("Vui lòng điền đủ thông tin Quy đổi!");
    }
    if (Number(uomForm.conversionRate) <= 0) {
      return toast.error("Hệ số quy đổi phải lớn hơn 0!");
    }

    try {
      await createUomConversion({
        productId: product.productId,
        fromUomId: product.uomId,
        toUomId: uomForm.toUomId,
        conversionRate: Number(uomForm.conversionRate)
      }).unwrap();
      toast.success("Thêm quy tắc quy đổi thành công!");
      setUomForm({ toUomId: "", conversionRate: "" });
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi tạo quy đổi");
    }
  };

  // 🚀 LÁ CHẮN BẢO MẬT: Xác nhận trước khi xóa Quy đổi ĐVT
  const handleDeleteUom = async (conversionId: string) => {
    if (window.confirm("CẢNH BÁO: Xóa quy tắc quy đổi có thể ảnh hưởng đến các báo cáo hoặc giao dịch cũ đang dùng đơn vị này. Tiếp tục?")) {
      try {
        await deleteUomConversion(conversionId).unwrap();
        toast.success("Đã xóa quy tắc quy đổi!");
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi khi xóa quy tắc!");
      }
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.batchNumber) {
      return toast.error("Vui lòng nhập số Lô (Batch Number)!");
    }

    // VALIDATION: NGÀY THÁNG
    if (batchForm.manufactureDate && batchForm.expiryDate) {
      const mfgDate = dayjs(batchForm.manufactureDate);
      const expDate = dayjs(batchForm.expiryDate);
      
      if (expDate.isBefore(mfgDate)) {
        toast.error("LỖI LOGIC: Hạn sử dụng không thể nhỏ hơn Ngày sản xuất!");
        return;
      }
    }

    try {
      // 🚀 CHUẨN HÓA DỮ LIỆU: Convert sang ISO-8601 để tránh lệch Timezone ở Backend
      await createBatch({
        productId: product.productId,
        batchNumber: batchForm.batchNumber.trim().toUpperCase(),
        manufactureDate: batchForm.manufactureDate ? new Date(batchForm.manufactureDate).toISOString() : undefined,
        expiryDate: batchForm.expiryDate ? new Date(batchForm.expiryDate).toISOString() : undefined
      }).unwrap();
      
      toast.success("Khởi tạo Lô hàng thành công!");
      setBatchForm({ batchNumber: "", manufactureDate: "", expiryDate: "" });
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi giao tiếp máy chủ khi tạo lô!");
    }
  };

  // 🚀 LÁ CHẮN BẢO MẬT: Xác nhận trước khi xóa Lô hàng
  const handleDeleteBatch = async (batchId: string, batchNumber: string) => {
    if (window.confirm(`XÁC NHẬN: Bạn muốn xóa Lô [${batchNumber}]?\nLưu ý: Nếu lô này đã phát sinh tồn kho hoặc giao dịch, hệ thống cơ sở dữ liệu sẽ chặn thao tác xóa để bảo vệ sổ cái.`)) {
      try {
        await deleteBatch(batchId).unwrap();
        toast.success(`Đã xóa thành công Lô ${batchNumber}!`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể xóa Lô này vì đã có dữ liệu liên kết!");
      }
    }
  };

  const modalFooter = (
    <div className="w-full flex justify-end">
      <button onClick={onClose} className="px-6 py-2.5 font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95 shadow-sm">
        Đóng cấu hình
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cấu hình Master Data: ${product.productCode}`}
      subtitle={product.name}
      icon={<Settings className="w-6 h-6 text-indigo-500" />}
      maxWidth="max-w-4xl"
      footer={modalFooter}
    >
      <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-500">
        
        {/* TABS HEADER */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0 transition-colors duration-500">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit border border-slate-200/50 dark:border-white/5 transition-colors duration-500">
            <button 
              onClick={() => setActiveTab("UOM")}
              className={cn(
                "relative flex items-center gap-2 px-5 py-2.5 font-bold text-sm rounded-lg transition-colors whitespace-nowrap z-10",
                activeTab === "UOM" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {activeTab === "UOM" && <motion.div layoutId="advOpsTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-lg -z-10 transition-colors duration-500" />}
              <Scale className="w-4 h-4"/> Đơn vị tính (UoM)
            </button>
            
            {product.hasBatches && (
              <button 
                onClick={() => setActiveTab("BATCH")}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-2.5 font-bold text-sm rounded-lg transition-colors whitespace-nowrap z-10",
                  activeTab === "BATCH" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {activeTab === "BATCH" && <motion.div layoutId="advOpsTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-lg -z-10 transition-colors duration-500" />}
                <Tags className="w-4 h-4"/> Quản lý Lô / Date
              </button>
            )}
          </div>
        </div>

        {/* ==========================================
            TAB CONTENT 1: UOM CONVERSION 
            ========================================== */}
        <AnimatePresence mode="wait">
          {activeTab === "UOM" && (
            <motion.div key="uom" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 flex flex-col gap-6">
              
              <div className="bg-indigo-50 dark:bg-indigo-500/10 p-5 rounded-2xl flex items-start gap-4 border border-indigo-100 dark:border-indigo-500/20 shadow-sm transition-colors duration-500">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg shrink-0 mt-0.5 transition-colors duration-500">
                  <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 transition-colors duration-500">Đơn vị tính quy chuẩn</h4>
                  <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400/80 leading-relaxed transition-colors duration-500">
                    Đơn vị nhỏ nhất của sản phẩm này là: <span className="font-black uppercase bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm text-indigo-600 transition-colors duration-500">{baseUomName}</span>. 
                    Bạn có thể tạo thêm đơn vị lớn hơn để tiện nhập/xuất kho.
                    <br />
                    <span className="italic opacity-80">(Ví dụ: 1 Đơn vị mới = X {baseUomName})</span>
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-500">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 transition-colors duration-500">Thêm quy tắc chuyển đổi</h4>
                <form onSubmit={handleAddUom} className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider transition-colors duration-500">Đơn vị Lớn (Đích)</label>
                    <select required value={uomForm.toUomId} onChange={(e) => setUomForm({...uomForm, toUomId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none transition-colors duration-500">
                      <option value="">-- Chọn đơn vị --</option>
                      {uoms.filter((u:any) => u.uomId !== product.uomId).map((u:any) => (
                        <option key={u.uomId || u.id} value={u.uomId || u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="hidden sm:flex shrink-0 mb-4 text-slate-300 dark:text-slate-600 transition-colors duration-500">
                     <ArrowRight className="w-5 h-5" />
                  </div>

                  <div className="w-full sm:w-48">
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider transition-colors duration-500">Bằng bao nhiêu {baseUomName}?</label>
                    <input type="number" required min="0.01" step="any" value={uomForm.conversionRate} onChange={(e) => setUomForm({...uomForm, conversionRate: e.target.value})} placeholder={`Số lượng ${baseUomName}`} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-black text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-500"/>
                  </div>

                  <button type="submit" disabled={isCreatingUom} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isCreatingUom ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Plus className="w-4 h-4" /> Thêm</>}
                  </button>
                </form>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col transition-colors duration-500">
                <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/30 transition-colors duration-500">
                   <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Danh sách Quy đổi đã lưu</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black text-slate-400 uppercase tracking-wider transition-colors duration-500">
                      <tr>
                        <th className="p-4 w-1/3">1 Đơn vị này</th>
                        <th className="p-4 w-1/3 text-center">Bằng (=)</th>
                        <th className="p-4 w-1/4">Từng này Đơn vị gốc</th>
                        <th className="p-4 text-right">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 transition-colors duration-500">
                      {conversions.map((conv: any) => (
                        <tr key={conv.conversionId} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-colors group">
                          <td className="p-4 font-bold text-indigo-700 dark:text-indigo-400 text-base">{conv.toUom?.name}</td>
                          <td className="p-4 text-center text-slate-300 dark:text-slate-600"><ArrowRight className="w-4 h-4 mx-auto" /></td>
                          <td className="p-4 font-black text-slate-800 dark:text-slate-200 text-base transition-colors duration-500">
                            {conv.conversionRate} <span className="text-sm text-slate-500 font-medium ml-1">{conv.fromUom?.name}</span>
                          </td>
                          <td className="p-4 text-right">
                            {/* 🚀 ĐÃ KHÓA BUTTON KHI ĐANG LOADING */}
                            <button onClick={() => handleDeleteUom(conv.conversionId)} disabled={isDeletingUom} title="Xóa Quy tắc" className="text-slate-400 hover:text-rose-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/20 p-2 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed">
                              {isDeletingUom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4"/>}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {conversions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-10 text-center flex flex-col items-center gap-2 text-slate-400 transition-colors duration-500">
                            <Scale className="w-10 h-10 opacity-20" />
                            <span className="text-sm font-medium">Chưa có cấu hình quy đổi nào.</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==========================================
              TAB CONTENT 2: BATCH MANAGEMENT 
              ========================================== */}
          {activeTab === "BATCH" && product.hasBatches && (
            <motion.div key="batch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 flex flex-col gap-6">
              
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-500">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Mở Lô hàng mới</h4>
                <form onSubmit={handleAddBatch} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  
                  <div className="md:col-span-4">
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider transition-colors duration-500">Mã / Số Lô (Batch No.) *</label>
                    <input type="text" required value={batchForm.batchNumber} onChange={(e) => setBatchForm({...batchForm, batchNumber: e.target.value})} placeholder="VD: LOT-2024-001" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500 transition-colors duration-500"/>
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider transition-colors duration-500">Ngày SX (MFG)</label>
                    <input type="date" value={batchForm.manufactureDate} onChange={(e) => setBatchForm({...batchForm, manufactureDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 transition-colors duration-500 text-slate-700 dark:text-slate-300"/>
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider transition-colors duration-500">Hạn SD (EXP)</label>
                    <input type="date" value={batchForm.expiryDate} onChange={(e) => setBatchForm({...batchForm, expiryDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 transition-colors duration-500 text-slate-700 dark:text-slate-300"/>
                  </div>

                  <div className="md:col-span-2 pt-6">
                    <button type="submit" disabled={isCreatingBatch} className="w-full px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                      {isCreatingBatch ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Plus className="w-4 h-4"/> Tạo</>}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col transition-colors duration-500">
                <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/30 transition-colors duration-500">
                   <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Lịch sử Lô hàng</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black text-slate-400 uppercase tracking-wider transition-colors duration-500">
                      <tr>
                        <th className="p-4">Mã Lô (Batch ID)</th>
                        <th className="p-4 text-center">Ngày Sản Xuất</th>
                        <th className="p-4 text-center">Hạn Sử Dụng</th>
                        <th className="p-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 transition-colors duration-500">
                      {batches.map((b: any) => (
                        <tr key={b.batchId} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-500/10 transition-colors group">
                          <td className="p-4 font-black text-emerald-700 dark:text-emerald-400 text-base">{b.batchNumber}</td>
                          <td className="p-4 text-center text-slate-600 dark:text-slate-400 font-medium transition-colors duration-500">
                            {b.manufactureDate ? formatDate(b.manufactureDate, "DD/MM/YYYY") : <span className="text-slate-300 dark:text-slate-600">-</span>}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-800 dark:text-slate-200 transition-colors duration-500">
                            {b.expiryDate ? formatDate(b.expiryDate, "DD/MM/YYYY") : <span className="text-slate-300 dark:text-slate-600">-</span>}
                          </td>
                          <td className="p-4 text-right">
                            {/* 🚀 ĐÃ KHÓA BUTTON KHI ĐANG LOADING */}
                            <button onClick={() => handleDeleteBatch(b.batchId, b.batchNumber)} disabled={isDeletingBatch} title="Xóa Lô hàng" className="text-slate-400 hover:text-rose-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/20 p-2 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed">
                              {isDeletingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4"/>}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {batches.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-10 text-center flex flex-col items-center gap-2 text-slate-400 transition-colors duration-500">
                            <Tags className="w-10 h-10 opacity-20" />
                            <span className="text-sm font-medium">Chưa có lô hàng nào được khởi tạo.</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </Modal>
  );
}