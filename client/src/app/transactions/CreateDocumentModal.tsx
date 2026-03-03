"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, FilePlus2, Loader2, CheckCircle2, 
  ArrowDownLeft, ArrowUpRight, Plus, Trash2, Calculator, AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useCreateDocumentMutation, 
  useGetProductsQuery,
  useGetSuppliersQuery,
  useGetCustomersQuery
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL TẠO CHỨNG TỪ (PO / SO)
// ==========================================
interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateDocumentModal({ isOpen, onClose }: CreateDocumentModalProps) {
  // --- API HOOKS ---
  const { data: products, isLoading: loadingProducts } = useGetProductsQuery({});
  const { data: suppliers, isLoading: loadingSuppliers } = useGetSuppliersQuery();
  const { data: customers, isLoading: loadingCustomers } = useGetCustomersQuery();
  const [createDocument, { isLoading: isSubmitting }] = useCreateDocumentMutation();

  // --- LOCAL STATE ---
  const [docType, setDocType] = useState<"PO" | "SO">("PO");
  const [partnerId, setPartnerId] = useState("");
  const [notes, setNotes] = useState("");
  
  // Danh sách các dòng hàng hóa (Dynamic Array)
  const [lines, setLines] = useState([{ id: Date.now(), productId: "", quantity: 1, unitPrice: 0 }]);

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setDocType("PO");
      setPartnerId("");
      setNotes("");
      setLines([{ id: Date.now(), productId: "", quantity: 1, unitPrice: 0 }]);
    }
  }, [isOpen]);

  // --- HANDLERS CHO DÒNG HÀNG HÓA ---
  const addLine = () => {
    setLines([...lines, { id: Date.now(), productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (id: number) => {
    if (lines.length === 1) {
      toast.error("Phải có ít nhất 1 dòng hàng hóa!");
      return;
    }
    setLines(lines.filter(line => line.id !== id));
  };

  const handleLineChange = (id: number, field: string, value: string | number) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        const newLine = { ...line, [field]: value };
        // Tự động điền giá nếu chọn sản phẩm
        if (field === "productId") {
          const selectedProduct = products?.find(p => p.productId === value);
          if (selectedProduct) {
            // Nếu là PO (Mua) thì lấy Giá nhập, nếu SO (Bán) thì lấy Giá bán
            newLine.unitPrice = docType === "PO" ? selectedProduct.purchasePrice : selectedProduct.price;
          }
        }
        return newLine;
      }
      return line;
    }));
  };

  // Tính tổng tiền toàn phiếu
  const totalAmount = useMemo(() => {
    return lines.reduce((sum, line) => sum + (Number(line.quantity) * Number(line.unitPrice)), 0);
  }, [lines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!partnerId) {
      toast.error(`Vui lòng chọn ${docType === "PO" ? "Nhà cung cấp" : "Khách hàng"}!`);
      return;
    }

    const invalidLines = lines.some(l => !l.productId || l.quantity <= 0 || l.unitPrice < 0);
    if (invalidLines) {
      toast.error("Vui lòng kiểm tra lại thông tin hàng hóa (Sản phẩm, Số lượng > 0, Đơn giá >= 0)!");
      return;
    }

    try {
      // Ép kiểu chuẩn cấu trúc API DocumentTx
      const payload = {
        type: docType,
        partnerId: partnerId, // Backend tự map sang supplierId hoặc customerId dựa vào type
        notes: notes,
        transactions: lines.map(l => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice)
        }))
      };

      await createDocument(payload).unwrap();
      
      toast.success(`Tạo ${docType === "PO" ? "Đơn mua hàng" : "Đơn bán hàng"} thành công!`);
      onClose(); 
    } catch (error: any) {
      console.error("Lỗi tạo chứng từ:", error);
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi lưu chứng từ!");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

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
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-4xl glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col max-h-[95vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <FilePlus2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Tạo Chứng từ Mới</h2>
                  <p className="text-xs text-slate-500 font-medium">Khởi tạo Đơn mua hàng (PO) hoặc Đơn bán hàng (SO)</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 flex flex-col gap-6">
              
              {/* 1. LOẠI CHỨNG TỪ & ĐỐI TÁC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Chọn Loại */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loại Chứng từ <span className="text-rose-500">*</span></label>
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/5">
                    <button 
                      type="button"
                      onClick={() => { setDocType("PO"); setPartnerId(""); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${docType === "PO" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      <ArrowDownLeft className="w-4 h-4" /> Đơn Mua (PO)
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setDocType("SO"); setPartnerId(""); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${docType === "SO" ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      <ArrowUpRight className="w-4 h-4" /> Đơn Bán (SO)
                    </button>
                  </div>
                </div>

                {/* Chọn Đối tác (Tự động đổi Nhà Cung Cấp / Khách hàng) */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {docType === "PO" ? "Nhà cung cấp" : "Khách hàng"} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    disabled={docType === "PO" ? loadingSuppliers : loadingCustomers}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  >
                    <option value="">-- Chọn đối tác --</option>
                    {docType === "PO" 
                      ? suppliers?.map(s => <option key={s.supplierId} value={s.supplierId}>{s.name} ({s.code})</option>)
                      : customers?.map(c => <option key={c.customerId} value={c.customerId}>{c.name} ({c.code})</option>)
                    }
                  </select>
                </div>
              </div>

              {/* 2. DANH SÁCH HÀNG HÓA (DYNAMIC ARRAY) */}
              <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Chi tiết Hàng hóa</h3>
                  <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    <Plus className="w-3.5 h-3.5" /> Thêm dòng
                  </button>
                </div>
                
                <div className="p-4 space-y-4 max-h-[40vh] overflow-y-auto scrollbar-thin">
                  <AnimatePresence>
                    {lines.map((line, index) => (
                      <motion.div 
                        key={line.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col sm:flex-row items-end sm:items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-white/5"
                      >
                        <div className="w-full sm:w-2/5 space-y-1">
                          <span className="text-xs text-slate-500 font-medium">Sản phẩm</span>
                          <select
                            value={line.productId}
                            onChange={(e) => handleLineChange(line.id, "productId", e.target.value)}
                            disabled={loadingProducts}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none"
                          >
                            <option value="">-- Chọn --</option>
                            {products?.map(p => <option key={p.productId} value={p.productId}>{p.name}</option>)}
                          </select>
                        </div>
                        
                        <div className="w-full sm:w-1/5 space-y-1">
                          <span className="text-xs text-slate-500 font-medium">Số lượng</span>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(line.id, "quantity", e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none text-right"
                          />
                        </div>

                        <div className="w-full sm:w-1/5 space-y-1">
                          <span className="text-xs text-slate-500 font-medium">Đơn giá</span>
                          <input
                            type="number"
                            min="0"
                            value={line.unitPrice}
                            onChange={(e) => handleLineChange(line.id, "unitPrice", e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none text-right"
                          />
                        </div>

                        <div className="w-full sm:w-[15%] space-y-1 flex flex-col justify-end">
                          <span className="text-xs text-slate-500 font-medium sm:hidden">Thành tiền</span>
                          <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold text-right text-slate-700 dark:text-slate-300">
                            {formatVND(Number(line.quantity) * Number(line.unitPrice))}
                          </div>
                        </div>

                        <button 
                          type="button" 
                          onClick={() => removeLine(line.id)}
                          className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Tổng cộng */}
                <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400">
                    <Calculator className="w-4 h-4" /> Tổng cộng
                  </span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {formatVND(totalAmount)}
                  </span>
                </div>
              </div>

              {/* 3. GHI CHÚ */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ghi chú / Diễn giải</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú thêm cho chứng từ này..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white resize-none"
                />
              </div>

            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
                Hủy bỏ
              </button>
              <button 
                type="button" 
                onClick={handleSubmit} 
                disabled={isSubmitting} 
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</> : <><CheckCircle2 className="w-4 h-4" /> Hoàn tất Chứng từ</>}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}