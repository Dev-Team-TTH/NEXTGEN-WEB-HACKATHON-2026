"use client";

import React, { useState } from "react";
import { 
  Settings, Tags, Scale, Plus, Trash2, 
  Loader2, AlertCircle 
} from "lucide-react";
import { toast } from "react-hot-toast";

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
  const [deleteUomConversion] = useDeleteUomConversionMutation();
  const [createBatch, { isLoading: isCreatingBatch }] = useCreateProductBatchMutation();
  const [deleteBatch] = useDeleteProductBatchMutation();

  // --- FORM STATES ---
  const [uomForm, setUomForm] = useState({ toUomId: "", conversionRate: "" });
  const [batchForm, setBatchForm] = useState({ batchNumber: "", manufactureDate: "", expiryDate: "" });

  if (!product) return null;

  // --- HANDLERS ---
  const handleAddUom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uomForm.toUomId || !uomForm.conversionRate) return toast.error("Vui lòng điền đủ thông tin Quy đổi!");
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

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.batchNumber) return toast.error("Vui lòng nhập số Lô!");
    try {
      await createBatch({
        productId: product.productId,
        ...batchForm
      }).unwrap();
      toast.success("Khởi tạo Lô hàng thành công!");
      setBatchForm({ batchNumber: "", manufactureDate: "", expiryDate: "" });
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi tạo lô");
    }
  };

  const modalFooter = (
    <div className="w-full flex justify-end">
      <button onClick={onClose} className="px-5 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl transition-colors">
        Đóng cấu hình
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cấu hình Nâng cao: ${product.productCode}`}
      subtitle={product.name}
      icon={<Settings className="w-6 h-6 text-purple-500" />}
      maxWidth="max-w-4xl"
      footer={modalFooter}
    >
      <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B0F19]">
        
        {/* TABS HEADER */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-4 shrink-0 bg-white dark:bg-slate-900">
          <button 
            onClick={() => setActiveTab("UOM")}
            className={cn(
              "flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-colors",
              activeTab === "UOM" ? "border-purple-500 text-purple-600 dark:text-purple-400" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <Scale className="w-4 h-4"/> Quy đổi Đơn vị tính
          </button>
          {product.hasBatches && (
            <button 
              onClick={() => setActiveTab("BATCH")}
              className={cn(
                "flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-colors",
                activeTab === "BATCH" ? "border-purple-500 text-purple-600 dark:text-purple-400" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <Tags className="w-4 h-4"/> Quản lý Lô (Batch/Date)
            </button>
          )}
        </div>

        {/* TAB CONTENT: UOM CONVERSION */}
        {activeTab === "UOM" && (
          <div className="p-6 flex flex-col gap-6">
            <div className="bg-purple-50 dark:bg-purple-500/10 p-4 rounded-xl flex items-start gap-3 border border-purple-100 dark:border-purple-500/20">
              <AlertCircle className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-purple-700 dark:text-purple-300 leading-relaxed">
                Đơn vị tính gốc của sản phẩm này là: <span className="font-bold uppercase bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm">{uoms.find((u:any) => u.uomId === product.uomId)?.name}</span>. Bạn có thể thiết lập các đơn vị quy đổi (VD: 1 Thùng = 12 Hộp).
              </p>
            </div>

            <form onSubmit={handleAddUom} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Đơn vị đích (To UoM)</label>
                <select required value={uomForm.toUomId} onChange={(e) => setUomForm({...uomForm, toUomId: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-purple-500 shadow-sm">
                  <option value="">Chọn đơn vị...</option>
                  {uoms.filter((u:any) => u.uomId !== product.uomId).map((u:any) => (
                    <option key={u.uomId || u.id} value={u.uomId || u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-32">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Hệ số (Factor)</label>
                <input type="number" required min="0.01" step="any" value={uomForm.conversionRate} onChange={(e) => setUomForm({...uomForm, conversionRate: e.target.value})} placeholder="VD: 12" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-purple-600 outline-none focus:border-purple-500 shadow-inner"/>
              </div>
              <button type="submit" disabled={isCreatingUom} className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 h-[42px] shadow-sm">
                {isCreatingUom ? <Loader2 className="w-4 h-4 animate-spin"/> : "Thêm quy tắc"}
              </button>
            </form>

            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 uppercase">
                  <tr><th className="p-3">Từ Đơn vị</th><th className="p-3">Sang Đơn vị</th><th className="p-3 text-center">Hệ số quy đổi</th><th className="p-3 text-right">Xóa</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {conversions.map((conv: any) => (
                    <tr key={conv.conversionId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-semibold">{conv.fromUom?.name}</td>
                      <td className="p-3 font-semibold text-purple-600">{conv.toUom?.name}</td>
                      <td className="p-3 text-center font-black bg-slate-50 dark:bg-slate-800/30">x {conv.conversionRate}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => deleteUomConversion(conv.conversionId)} className="text-rose-400 hover:text-white bg-transparent hover:bg-rose-500 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  ))}
                  {conversions.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm">Chưa có cấu hình quy đổi nào.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB CONTENT: BATCH MANAGEMENT */}
        {activeTab === "BATCH" && product.hasBatches && (
           <div className="p-6 flex flex-col gap-6">
            <form onSubmit={handleAddBatch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Số hiệu Lô (Batch Number) *</label>
                <input type="text" required value={batchForm.batchNumber} onChange={(e) => setBatchForm({...batchForm, batchNumber: e.target.value})} placeholder="VD: LOT-2024-001" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold uppercase outline-none focus:border-amber-500 shadow-inner"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">NSX (MFG)</label>
                <input type="date" value={batchForm.manufactureDate} onChange={(e) => setBatchForm({...batchForm, manufactureDate: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-amber-500 shadow-sm"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">HSD (EXP)</label>
                <input type="date" value={batchForm.expiryDate} onChange={(e) => setBatchForm({...batchForm, expiryDate: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-amber-500 shadow-sm"/>
              </div>
              <button type="submit" disabled={isCreatingBatch} className="sm:col-span-4 px-5 py-2.5 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2">
                {isCreatingBatch ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Thêm Lô mới
              </button>
            </form>

            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 uppercase">
                  <tr><th className="p-3">Mã Lô</th><th className="p-3 text-center">NSX</th><th className="p-3 text-center">HSD</th><th className="p-3 text-right">Xóa</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {batches.map((b: any) => (
                    <tr key={b.batchId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-black text-amber-600">{b.batchNumber}</td>
                      <td className="p-3 text-center text-slate-600 dark:text-slate-400">{b.manufactureDate ? formatDate(b.manufactureDate, "DD/MM/YYYY") : '-'}</td>
                      <td className="p-3 text-center font-semibold text-slate-800 dark:text-slate-200">{b.expiryDate ? formatDate(b.expiryDate, "DD/MM/YYYY") : '-'}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => deleteBatch(b.batchId)} className="text-rose-400 hover:text-white bg-transparent hover:bg-rose-500 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  ))}
                  {batches.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm">Chưa có lô hàng nào.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}