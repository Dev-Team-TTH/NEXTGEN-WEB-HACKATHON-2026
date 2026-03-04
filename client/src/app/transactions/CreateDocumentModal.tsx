"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Plus, Trash2, Calculator, ShoppingCart, 
  TrendingUp, Truck, Receipt, Building, Package,
  Hash, DollarSign, Loader2, Save, FileText, Percent
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useCreateDocumentMutation,
  useGetProductsQuery,
  useGetSuppliersQuery,
  useGetCustomersQuery,
  useGetTaxesQuery
} from "@/state/api";

// ==========================================
// 1. INTERFACES & HELPERS
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

interface LineItem {
  id: string; // Fake ID for React key mapping
  productId: string;
  quantity: number | string;
  unitPrice: number | string;
  taxRate: number; // Tỷ lệ phần trăm (VD: 8, 10)
}

interface CreateDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ==========================================
// COMPONENT CHÍNH: WIZARD TẠO CHỨNG TỪ ĐỘNG
// ==========================================
export default function CreateDocumentModal({ isOpen, onClose }: CreateDocModalProps) {
  
  // --- API HOOKS (Dữ liệu nền) ---
  const { data: products = [], isLoading: loadingProds } = useGetProductsQuery({}, { skip: !isOpen });
  const { data: suppliers = [], isLoading: loadingSupps } = useGetSuppliersQuery(undefined, { skip: !isOpen });
  const { data: customers = [], isLoading: loadingCusts } = useGetCustomersQuery(undefined, { skip: !isOpen });
  const { data: taxes = [], isLoading: loadingTaxes } = useGetTaxesQuery(undefined, { skip: !isOpen });
  
  const [createDocument, { isLoading: isSubmitting }] = useCreateDocumentMutation();

  // --- STATE BẢN GHI (HEADER) ---
  const [docType, setDocType] = useState<"PURCHASE_ORDER" | "SALES_ORDER" | "GOODS_RECEIPT" | "INVOICE">("PURCHASE_ORDER");
  const [partnerId, setPartnerId] = useState("");
  const [notes, setNotes] = useState("");

  // --- STATE DÒNG HÀNG HÓA (LINES) ---
  const [lines, setLines] = useState<LineItem[]>([]);

  // Khởi tạo 1 dòng trống khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setDocType("PURCHASE_ORDER");
      setPartnerId("");
      setNotes("");
      setLines([{ id: Date.now().toString(), productId: "", quantity: 1, unitPrice: "", taxRate: 0 }]);
    }
  }, [isOpen]);

  // --- ĐỘNG NĂNG: XÁC ĐỊNH MÔI TRƯỜNG ---
  const isPurchasing = docType === "PURCHASE_ORDER" || docType === "GOODS_RECEIPT";
  const partners = isPurchasing ? suppliers : customers;
  const partnerLabel = isPurchasing ? "Nhà Cung Cấp" : "Khách Hàng";

  const getDocTheme = () => {
    if (docType === "PURCHASE_ORDER") return { icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/30", label: "Tạo Đơn Mua Hàng" };
    if (docType === "SALES_ORDER") return { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/30", label: "Tạo Đơn Bán Hàng" };
    if (docType === "GOODS_RECEIPT") return { icon: Truck, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10", border: "border-purple-200 dark:border-purple-500/30", label: "Tạo Phiếu Nhập Kho" };
    return { icon: Receipt, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/30", label: "Tạo Hóa Đơn Xuất" };
  };
  const theme = getDocTheme();
  const ThemeIcon = theme.icon;

  // --- HANDLERS DÒNG HÀNG HÓA ---
  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), productId: "", quantity: 1, unitPrice: "", taxRate: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) return toast.error("Phải có ít nhất 1 dòng sản phẩm!");
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof LineItem, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      const updatedLine = { ...line, [field]: value };
      
      // AUTO-FILL: Nếu người dùng chọn Sản phẩm, tự động kéo giá chuẩn vào Đơn giá
      if (field === "productId") {
        const selectedProd = products.find((p: any) => p.productId === value || p.id === value);
        if (selectedProd) {
          // Lấy giá vốn nếu Mua, lấy giá bán nếu Bán
          updatedLine.unitPrice = isPurchasing ? (selectedProd.purchasePrice || 0) : (selectedProd.price || 0);
        }
      }
      return updatedLine;
    }));
  };

  // --- AUTO-CALCULATING ENGINE (DATA VIZ) ---
  const summary = useMemo(() => {
    let subTotal = 0;
    let totalTax = 0;

    lines.forEach(line => {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.unitPrice) || 0;
      const taxRate = Number(line.taxRate) || 0;

      const lineTotal = qty * price;
      subTotal += lineTotal;
      totalTax += lineTotal * (taxRate / 100);
    });

    return { subTotal, totalTax, grandTotal: subTotal + totalTax };
  }, [lines]);

  // --- SUBMIT FORM ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) return toast.error(`Vui lòng chọn ${partnerLabel}!`);
    
    // Validate các dòng hàng hóa
    const validLines = lines.filter(l => l.productId && Number(l.quantity) > 0 && Number(l.unitPrice) >= 0);
    if (validLines.length === 0) return toast.error("Chứng từ phải có ít nhất 1 sản phẩm hợp lệ!");

    try {
      const payload = {
        type: docType,
        partnerId: partnerId,
        notes: notes,
        totalAmount: summary.grandTotal, // Gửi lên cho backend tham chiếu
        // Map data để khớp với interface DocumentTransactionLine
        transactions: validLines.map(l => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          totalPrice: Number(l.quantity) * Number(l.unitPrice)
        }))
      };

      await createDocument(payload).unwrap();
      toast.success("Khởi tạo Chứng từ thành công!");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi khi lưu chứng từ vào cơ sở dữ liệu!");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 30 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-xl"
          style={{ perspective: 1500 }}
        >
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-6xl bg-slate-50 dark:bg-[#0B0F19] rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/10 overflow-hidden z-10 flex flex-col h-[90vh]"
          >
            {/* 1. HEADER KHU VỰC THAO TÁC */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 border-b shrink-0 z-20 ${theme.bg} ${theme.border}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm ${theme.color}`}>
                  <ThemeIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{theme.label}</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Khởi tạo dữ liệu Giao dịch</p>
                </div>
              </div>

              {/* Bộ chuyển đổi loại chứng từ */}
              <div className="mt-4 sm:mt-0 flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-white/5">
                <select 
                  value={docType} onChange={(e) => setDocType(e.target.value as any)}
                  className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none px-3 py-1.5 cursor-pointer"
                >
                  <option value="PURCHASE_ORDER">Đơn Mua Hàng (PO)</option>
                  <option value="SALES_ORDER">Đơn Bán Hàng (SO)</option>
                  <option value="GOODS_RECEIPT">Phiếu Nhập Kho (GRPO)</option>
                  <option value="INVOICE">Hóa đơn Xuất (INV)</option>
                </select>
              </div>
            </div>

            {/* 2. BODY KHU VỰC NHẬP LIỆU (FLEX 2 CỘT) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col xl:flex-row bg-slate-50 dark:bg-transparent">
              
              {/* CỘT TRÁI: DÒNG HÀNG HÓA (LINE ITEMS) */}
              <div className="flex-1 p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Package className={`w-4 h-4 ${theme.color}`}/> Danh sách Sản phẩm
                  </h3>
                  <button onClick={addLine} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 dark:bg-indigo-500/20 dark:hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5"/> Thêm dòng
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                    <thead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0F19]">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center">#</th>
                        <th className="px-4 py-3 w-[35%]">Mã & Tên Sản phẩm</th>
                        <th className="px-4 py-3 w-[15%]">Số lượng</th>
                        <th className="px-4 py-3 w-[20%]">Đơn giá (VND)</th>
                        <th className="px-4 py-3 w-[15%]">Thuế %</th>
                        <th className="px-4 py-3 w-[15%] text-right">Thành tiền</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      <AnimatePresence initial={false}>
                        {lines.map((line, index) => {
                          const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                          return (
                            <motion.tr 
                              key={line.id}
                              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                              className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                            >
                              <td className="px-4 py-3 text-center text-xs font-bold text-slate-400">{index + 1}</td>
                              
                              {/* Chọn Sản phẩm */}
                              <td className="px-4 py-3">
                                <select 
                                  value={line.productId} onChange={(e) => updateLine(line.id, "productId", e.target.value)}
                                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 dark:text-slate-200"
                                >
                                  <option value="">-- Chọn mặt hàng --</option>
                                  {products.map((p: any) => (
                                    <option key={p.productId || p.id} value={p.productId || p.id}>{p.productCode} - {p.name}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Số lượng */}
                              <td className="px-4 py-3">
                                <div className="relative">
                                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <input 
                                    type="number" min="1" value={line.quantity} onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                  />
                                </div>
                              </td>

                              {/* Đơn giá */}
                              <td className="px-4 py-3">
                                <div className="relative">
                                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <input 
                                    type="number" min="0" value={line.unitPrice} onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-emerald-600 dark:text-emerald-400"
                                  />
                                </div>
                              </td>

                              {/* Thuế suất */}
                              <td className="px-4 py-3">
                                <div className="relative">
                                  <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <select 
                                    value={line.taxRate} onChange={(e) => updateLine(line.id, "taxRate", e.target.value)}
                                    className="w-full pl-8 pr-2 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                  >
                                    <option value="0">0%</option>
                                    {taxes.map((t: any) => (
                                      <option key={t.taxId || t.id} value={t.rate}>{t.rate}% - {t.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>

                              {/* Thành tiền Data Viz */}
                              <td className="px-4 py-3 text-right">
                                <span className="font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 inline-block min-w-[120px]">
                                  {formatVND(lineTotal)}
                                </span>
                              </td>

                              {/* Xóa dòng */}
                              <td className="px-4 py-3 text-center">
                                <button onClick={() => removeLine(line.id)} className="p-2 text-rose-400 hover:text-white bg-white hover:bg-rose-500 dark:bg-slate-800 dark:hover:bg-rose-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                  <Trash2 className="w-4 h-4"/>
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CỘT PHẢI: CONFIG META & SUMMARY TỔNG (FIXED WIDTH) */}
              <div className="w-full xl:w-[400px] border-l border-slate-200 dark:border-white/5 bg-white dark:bg-[#090D14] flex flex-col shrink-0">
                
                {/* Meta Form */}
                <div className="p-6 flex flex-col gap-5 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Thông tin {partnerLabel}</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Building className="w-3.5 h-3.5"/> Chọn {partnerLabel} *</label>
                    {loadingSupps || loadingCusts ? (
                      <div className="w-full h-11 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                    ) : (
                      <select 
                        required value={partnerId} onChange={(e) => setPartnerId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Click để tìm kiếm --</option>
                        {partners.map((p: any) => (
                          <option key={p.supplierId || p.customerId || p.id} value={p.supplierId || p.customerId || p.id}>
                            {p.code} - {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Ghi chú / Điều khoản</label>
                    <textarea 
                      rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Nhập ghi chú cho chứng từ này..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </div>

                {/* Dashboard Panel Tổng Kết (Sticky Bottom) */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Calculator className="w-4 h-4 text-indigo-500"/> Tổng cộng</h4>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center text-sm font-semibold text-slate-600 dark:text-slate-400">
                      <span>Cộng tiền hàng (Subtotal):</span>
                      <span>{formatVND(summary.subTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-semibold text-slate-600 dark:text-slate-400">
                      <span>Tiền Thuế VAT (Taxes):</span>
                      <span>{formatVND(summary.totalTax)}</span>
                    </div>
                    <div className="h-px w-full bg-slate-200 dark:bg-slate-700/50" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-slate-900 dark:text-white uppercase">Tổng Thanh Toán:</span>
                      <span className={`text-2xl font-black ${theme.color}`}>{formatVND(summary.grandTotal)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleSubmit} disabled={isSubmitting || summary.grandTotal === 0}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-lg"
                    >
                      {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                      PHÁT HÀNH CHỨNG TỪ
                    </button>
                    <button 
                      onClick={onClose} disabled={isSubmitting}
                      className="w-full py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}