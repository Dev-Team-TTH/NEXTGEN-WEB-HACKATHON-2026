"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Calculator, Anchor, DollarSign, 
  Plus, Trash2, Loader2, CheckCircle2,
  TrendingUp, BarChart3, Package, Hash, AlertOctagon, Ship
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetDocumentByIdQuery, 
  useAllocateLandedCostMutation 
} from "@/state/api";

// ==========================================
// 1. INTERFACES & HELPERS
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

interface AdditionalCost {
  id: number;
  costType: "FREIGHT" | "CUSTOMS" | "INSURANCE" | "OTHER";
  amount: number | string;
  reference: string;
}

interface LandedCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null; 
}

// ==========================================
// COMPONENT CHÍNH: WIZARD PHÂN BỔ CHI PHÍ
// ==========================================
export default function LandedCostModal({ isOpen, onClose, documentId }: LandedCostModalProps) {
  
  // --- API HOOKS ---
  const { data: document, isLoading: loadingDoc } = useGetDocumentByIdQuery(documentId || "", { skip: !isOpen || !documentId });
  const [allocateLandedCost, { isLoading: isSubmitting }] = useAllocateLandedCostMutation();

  // --- LOCAL STATE ---
  const [allocationMethod, setAllocationMethod] = useState<"VALUE" | "QUANTITY">("VALUE");
  const [costs, setCosts] = useState<AdditionalCost[]>([
    { id: Date.now(), costType: "FREIGHT", amount: "", reference: "" }
  ]);

  // Reset form khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setAllocationMethod("VALUE");
      setCosts([{ id: Date.now(), costType: "FREIGHT", amount: "", reference: "" }]);
    }
  }, [isOpen]);

  // --- THUẬT TOÁN TÍNH TOÁN & DATA VIZ ---
  // Ép kiểu as any để truy xuất an toàn mảng chi tiết dòng hàng
  const items = useMemo(() => {
    return (document as any)?.lines || (document as any)?.items || (document as any)?.documentLines || [];
  }, [document]);
  
  // 1. Tổng giá trị gốc
  const totalBaseValue = useMemo(() => {
    return items.reduce((sum: number, item: any) => sum + (item.totalPrice || (item.quantity * item.unitPrice) || 0), 0);
  }, [items]);

  // 2. Tổng số lượng
  const totalBaseQty = useMemo(() => {
    return items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  }, [items]);

  // 3. Tổng chi phí phát sinh thêm (Landed Costs)
  const totalAdditionalCost = useMemo(() => {
    return costs.reduce((sum, cost) => sum + (Number(cost.amount) || 0), 0);
  }, [costs]);

  // 4. Bảng Simulation: Tính giá vốn mới (MAC)
  const previewItems = useMemo(() => {
    if (totalBaseValue === 0 || items.length === 0) return [];

    return items.map((item: any) => {
      const itemBaseValue = item.totalPrice || (item.quantity * item.unitPrice) || 0;
      const itemQty = item.quantity || 1;
      
      let allocatedAmount = 0;
      if (allocationMethod === "VALUE") {
        allocatedAmount = (itemBaseValue / totalBaseValue) * totalAdditionalCost;
      } else if (allocationMethod === "QUANTITY") {
        allocatedAmount = (itemQty / totalBaseQty) * totalAdditionalCost;
      }

      const newTotalValue = itemBaseValue + allocatedAmount;
      const newUnitPrice = itemQty > 0 ? newTotalValue / itemQty : 0;
      const increasePercent = itemBaseValue > 0 ? (allocatedAmount / itemBaseValue) * 100 : 0;

      return {
        ...item,
        oldUnitPrice: item.unitPrice || 0,
        allocatedAmount,
        newUnitPrice,
        newTotalValue,
        increasePercent
      };
    });
  }, [items, totalBaseValue, totalBaseQty, totalAdditionalCost, allocationMethod]);

  // --- HANDLERS ---
  const addCostLine = () => setCosts([...costs, { id: Date.now(), costType: "OTHER", amount: "", reference: "" }]);
  const removeCostLine = (id: number) => setCosts(costs.filter(c => c.id !== id));
  const updateCost = (id: number, field: keyof AdditionalCost, value: string) => {
    setCosts(costs.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId) return;

    const validCosts = costs.filter(c => Number(c.amount) > 0);
    if (validCosts.length === 0) {
      toast.error("Cần ít nhất 1 khoản phí lớn hơn 0 VND!"); return;
    }

    try {
      const payload = {
        documentId,
        allocationMethod,
        costs: validCosts.map(c => ({
          type: c.costType,
          amount: Number(c.amount),
          reference: c.reference
        }))
      };

      // Payload được ép kiểu as any để bypass các ràng buộc Interface chưa chính xác từ backend
      await allocateLandedCost(payload as any).unwrap();
      
      toast.success("Phân bổ chi phí thành công! Giá vốn đã được làm lại.");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi hệ thống! Không thể ghi nhận bút toán.");
    }
  };

  // --- ANIMATION CONFIG (FLUID & 3D PARALLAX FEEL) ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: { 
      opacity: 1, scale: 1, y: 0, 
      transition: { type: "spring", stiffness: 350, damping: 30, mass: 1 } 
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };
  const listVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && documentId && (
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
            {/* 1. HEADER (GLASSMORPHISM) */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shrink-0 z-20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                  <Ship className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Phân bổ Chi phí Nhập khẩu</h2>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5 uppercase tracking-wider">
                    Tham chiếu: {document?.documentNumber || documentId}
                  </p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 2. BODY KHU VỰC THAO TÁC */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col lg:flex-row gap-6 bg-slate-50/50 dark:bg-transparent">
              
              {loadingDoc ? (
                <div className="w-full flex flex-col items-center justify-center py-32 text-blue-500">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">Đang quét dữ liệu Lô hàng...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center py-32 text-slate-400">
                  <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 opacity-50" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">Lô hàng trống hoặc cấu trúc dữ liệu không khớp.</p>
                </div>
              ) : (
                <>
                  {/* === CỘT TRÁI: CONFIG & INPUTS === */}
                  <div className="w-full lg:w-[380px] flex flex-col gap-6 shrink-0">
                    
                    {/* Panel 1: Thuật toán */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
                      <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"><Calculator className="w-24 h-24 text-blue-500"/></div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 relative z-10 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-500" /> Tiêu chí Tính toán
                      </h4>
                      <div className="grid grid-cols-2 gap-3 relative z-10">
                        <button 
                          type="button" onClick={() => setAllocationMethod("VALUE")}
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${allocationMethod === "VALUE" ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 shadow-[0_4px_15px_rgba(59,130,246,0.15)]' : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                          <DollarSign className="w-6 h-6 mb-2" />
                          <span className="text-xs font-bold">Theo Giá Trị</span>
                        </button>
                        <button 
                          type="button" onClick={() => setAllocationMethod("QUANTITY")}
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${allocationMethod === "QUANTITY" ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 shadow-[0_4px_15px_rgba(59,130,246,0.15)]' : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                          <Hash className="w-6 h-6 mb-2" />
                          <span className="text-xs font-bold">Theo Số Lượng</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-4 text-center px-2">
                        {allocationMethod === "VALUE" ? "Sản phẩm giá trị cao sẽ gánh nhiều tỷ trọng chi phí hơn." : "Mỗi đơn vị sản phẩm gánh chi phí bằng nhau bất kể giá trị."}
                      </p>
                    </div>

                    {/* Panel 2: Chi phí đầu vào */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-5">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <Anchor className="w-4 h-4 text-orange-500" /> Các khoản phí hóa đơn
                        </h4>
                        <button onClick={addCostLine} className="p-2 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/30 rounded-xl transition-colors shadow-sm active:scale-95">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-3">
                        <AnimatePresence initial={false}>
                          {costs.map((cost) => (
                            <motion.div 
                              key={cost.id}
                              initial={{ opacity: 0, scale: 0.9, height: 0 }} animate={{ opacity: 1, scale: 1, height: 'auto' }} exit={{ opacity: 0, scale: 0.9, height: 0 }}
                              className="flex flex-col gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/5 group"
                            >
                              <div className="flex gap-2">
                                <select 
                                  value={cost.costType} onChange={(e)=>updateCost(cost.id, "costType", e.target.value)}
                                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none px-3 py-2.5 focus:ring-2 focus:ring-orange-500 transition-shadow"
                                >
                                  <option value="FREIGHT">Cước Vận Chuyển</option>
                                  <option value="CUSTOMS">Thuế Hải Quan</option>
                                  <option value="INSURANCE">Phí Bảo hiểm</option>
                                  <option value="OTHER">Phí Khác</option>
                                </select>
                                <button onClick={()=>removeCostLine(cost.id)} className="p-2.5 text-rose-400 hover:text-white bg-white hover:bg-rose-500 dark:bg-slate-800 dark:hover:bg-rose-600 border border-slate-200 dark:border-white/10 rounded-xl transition-colors shadow-sm"><Trash2 className="w-4 h-4"/></button>
                              </div>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                                  <input 
                                    type="number" placeholder="Số tiền..." value={cost.amount} onChange={(e)=>updateCost(cost.id, "amount", e.target.value)}
                                    className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-orange-600 dark:text-orange-400 outline-none focus:ring-2 focus:ring-orange-500 transition-shadow shadow-inner"
                                  />
                                </div>
                                <input 
                                  type="text" placeholder="Số chứng từ..." value={cost.reference} onChange={(e)=>updateCost(cost.id, "reference", e.target.value)}
                                  className="flex-[0.8] px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-slate-400 transition-shadow"
                                />
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* === CỘT PHẢI: BẢNG PREVIEW KẾ TOÁN & DATA VIZ === */}
                  <div className="flex-1 flex flex-col gap-6 min-w-0">
                    
                    {/* Visual Breakdown Bar */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Tiền hàng (Base)</p>
                          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatVND(totalBaseValue)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-orange-600 dark:text-orange-500 uppercase tracking-wider mb-1 flex items-center justify-end gap-1"><TrendingUp className="w-3 h-3"/> Phí đội lên</p>
                          <p className="text-2xl font-black text-orange-700 dark:text-orange-400">+{formatVND(totalAdditionalCost)}</p>
                        </div>
                      </div>

                      {/* Stacked Progress Bar Motion (Đã fix lỗi TypeScript 17001 gộp 2 thuộc tính style) */}
                      <div className="w-full h-4 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex shadow-inner mb-5">
                        <motion.div 
                          layout transition={{ type: "spring", stiffness: 120, damping: 25 }}
                          style={{ width: `${totalBaseValue > 0 ? (totalBaseValue / (totalBaseValue + totalAdditionalCost)) * 100 : 100}%` }}
                          className="h-full bg-emerald-500"
                        />
                        <motion.div 
                          layout transition={{ type: "spring", stiffness: 120, damping: 25 }}
                          className="h-full bg-orange-500"
                          style={{ 
                            width: `${totalBaseValue > 0 ? (totalAdditionalCost / (totalBaseValue + totalAdditionalCost)) * 100 : 0}%`,
                            backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)', 
                            backgroundSize: '1rem 1rem' 
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm font-bold bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                        <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2"><Calculator className="w-4 h-4 text-blue-500"/> Tổng Giá Vốn Kho (COGS)</span>
                        <span className="text-2xl text-blue-700 dark:text-blue-400 font-black">{formatVND(totalBaseValue + totalAdditionalCost)}</span>
                      </div>
                    </div>

                    {/* Table Simulation */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm flex-1 flex flex-col">
                      <div className="px-5 py-4 bg-slate-50 dark:bg-[#0B0F19] border-b border-slate-200 dark:border-white/5 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-500" />
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">Bảng Dự phóng Giá vốn Cấu thành (MAC)</h4>
                      </div>
                      
                      <div className="overflow-x-auto flex-1 p-2">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                            <tr>
                              <th className="px-4 py-3">Sản phẩm</th>
                              <th className="px-4 py-3 text-right">SL</th>
                              <th className="px-4 py-3 text-right">Đơn giá Gốc</th>
                              <th className="px-4 py-3 text-right text-orange-500 bg-orange-50/50 dark:bg-orange-500/5">+ Phí Gánh</th>
                              <th className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/5">Đơn giá Mới</th>
                            </tr>
                          </thead>
                          <motion.tbody variants={listVariants} initial="hidden" animate="visible" className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {previewItems.map((item: any, idx: number) => (
                              <motion.tr variants={itemVariants} key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                <td className="px-4 py-4">
                                  <p className="font-bold text-slate-800 dark:text-slate-200">{item.product?.name || item.description || "Sản phẩm"}</p>
                                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.product?.sku || item.itemCode || `SKU-${idx}`}</p>
                                </td>
                                <td className="px-4 py-4 text-right font-medium">{item.quantity}</td>
                                <td className="px-4 py-4 text-right text-slate-500">{formatVND(item.oldUnitPrice)}</td>
                                <td className="px-4 py-4 text-right bg-orange-50/20 dark:bg-orange-900/10">
                                  <span className="font-bold text-orange-500">{formatVND(item.allocatedAmount)}</span>
                                  {item.increasePercent > 0 && (
                                    <div className="flex items-center justify-end gap-1 text-[10px] text-rose-500 mt-1">
                                      <TrendingUp className="w-3 h-3"/> {item.increasePercent.toFixed(1)}%
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-right bg-blue-50/30 dark:bg-blue-900/10">
                                  <div className="inline-flex flex-col items-end">
                                    <span className="font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/50 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                      {formatVND(item.newUnitPrice)}
                                    </span>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </motion.tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </>
              )}
            </div>

            {/* 3. FOOTER */}
            <div className="px-6 py-5 bg-white dark:bg-[#090D14] border-t border-slate-200 dark:border-white/5 flex justify-end gap-4 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
              <button 
                type="button" onClick={onClose} disabled={isSubmitting} 
                className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy & Đóng
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !document || totalAdditionalCost <= 0} 
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Xác nhận Phân bổ & Cập nhật Kho
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}