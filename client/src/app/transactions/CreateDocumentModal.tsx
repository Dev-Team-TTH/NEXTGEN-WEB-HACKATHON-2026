"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Plus, Trash2, Calculator, ShoppingCart, 
  TrendingUp, Truck, Receipt, Building, Package,
  Hash, DollarSign, Loader2, Save, FileText, Percent, Zap, Warehouse
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; 
import { 
  useCreateDocumentMutation,
  useGetProductsQuery,
  useGetSuppliersQuery,
  useGetCustomersQuery,
  useGetTaxesQuery,
  useGetUoMsQuery,                    
  useCalculateDynamicPriceMutation,
  useGetWarehousesQuery               
} from "@/state/api";

// ==========================================
// 1. INTERFACES & HELPERS
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

interface LineItem {
  id: string; 
  productId: string;
  uomId: string;             
  quantity: number | string;
  unitCost: number | string; // [FIX TỬ HUYỆT 1] Sử dụng unitCost khớp với Backend Prisma
  taxId: string;             
  taxRate: number;           
  taxAmount: number;         
  isAutoPriced?: boolean;    
}

interface CreateDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ==========================================
// COMPONENT CHÍNH: WIZARD TẠO CHỨNG TỪ PRO
// ==========================================
export default function CreateDocumentModal({ isOpen, onClose }: CreateDocModalProps) {
  
  // --- BỐI CẢNH (CONTEXT) TỪ REDUX ---
  const { activeBranchId } = useAppSelector(state => state.global);

  // --- API HOOKS (SỬ DỤNG DỮ LIỆU THỰC TẾ, KHÔNG DÙNG MOCK) ---
  const { data: products = [], isLoading: loadingProds } = useGetProductsQuery({}, { skip: !isOpen });
  const { data: suppliers = [], isLoading: loadingSupps } = useGetSuppliersQuery(undefined, { skip: !isOpen });
  const { data: customers = [], isLoading: loadingCusts } = useGetCustomersQuery(undefined, { skip: !isOpen });
  const { data: taxes = [], isLoading: loadingTaxes } = useGetTaxesQuery(undefined, { skip: !isOpen });
  const { data: uoms = [], isLoading: loadingUoms } = useGetUoMsQuery(undefined, { skip: !isOpen });
  
  // [FIX TỬ HUYỆT 3] Chỉ lấy kho thuộc chi nhánh đang làm việc
  const { data: warehouses = [], isLoading: loadingWhs } = useGetWarehousesQuery(
    { branchId: activeBranchId }, 
    { skip: !isOpen || !activeBranchId }
  );
  
  const [createDocument, { isLoading: isSubmitting }] = useCreateDocumentMutation();
  const [calculateDynamicPrice] = useCalculateDynamicPriceMutation();

  // --- STATE ---
  const [docType, setDocType] = useState<"PURCHASE_ORDER" | "SALES_ORDER" | "PURCHASE_RECEIPT" | "SALES_ISSUE">("PURCHASE_ORDER");
  const [partnerId, setPartnerId] = useState("");
  const [warehouseId, setWarehouseId] = useState(""); 
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);

  // Khởi tạo trạng thái ban đầu khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setDocType("PURCHASE_ORDER");
      setPartnerId("");
      setWarehouseId("");
      setNote("");
      setLines([{ id: Date.now().toString(), productId: "", uomId: "", quantity: 1, unitCost: "", taxId: "", taxRate: 0, taxAmount: 0 }]);
    }
  }, [isOpen]);

  // --- ĐỘNG NĂNG: XÁC ĐỊNH MÔI TRƯỜNG ---
  const isPurchasing = docType === "PURCHASE_ORDER" || docType === "PURCHASE_RECEIPT";
  const partners = isPurchasing ? suppliers : customers;
  const partnerLabel = isPurchasing ? "Nhà Cung Cấp" : "Khách Hàng";

  const getDocTheme = () => {
    if (docType === "PURCHASE_ORDER") return { icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/30", label: "Tạo Đơn Mua Hàng" };
    if (docType === "SALES_ORDER") return { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/30", label: "Tạo Đơn Bán Hàng" };
    if (docType === "PURCHASE_RECEIPT") return { icon: Truck, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10", border: "border-purple-200 dark:border-purple-500/30", label: "Tạo Phiếu Nhập Kho" };
    return { icon: Receipt, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/30", label: "Tạo Phiếu Xuất Kho / Hóa đơn" };
  };
  const theme = getDocTheme();
  const ThemeIcon = theme.icon;

  // --- ⚡ ĐỘNG CƠ ĐỊNH GIÁ LẠI TOÀN BỘ (AUTO-REPRICE) KHI ĐỔI ĐỐI TÁC ---
  useEffect(() => {
    if (partnerId && isOpen) {
      const repriceAllLines = async () => {
        const newLines = await Promise.all(lines.map(async (line) => {
          if (!line.productId) return line;
          try {
            const res = await calculateDynamicPrice({
              partnerId, partnerType: isPurchasing ? "SUPPLIER" : "CUSTOMER",
              productId: line.productId, quantity: Number(line.quantity) || 1
            }).unwrap();
            
            const qty = Number(line.quantity) || 0;
            const price = res.finalPrice;
            const taxAmount = qty * price * (line.taxRate / 100);

            return { ...line, unitCost: price, taxAmount, isAutoPriced: res.appliedPriceList !== null };
          } catch { return line; }
        }));
        setLines(newLines);
      };
      repriceAllLines();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, isPurchasing]);

  // --- HANDLERS DÒNG HÀNG HÓA ---
  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), productId: "", uomId: "", quantity: 1, unitCost: "", taxId: "", taxRate: 0, taxAmount: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) return toast.error("Phải có ít nhất 1 dòng sản phẩm!");
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = async (id: string, field: keyof LineItem, value: any) => {
    const currentLine = lines.find(l => l.id === id);
    if (!currentLine) return;

    let updatedPrice: number | null = null;
    let updatedUom: string | null = null;
    let selectedTaxRate: number | null = null;
    let isAuto = false;

    const currentQty = field === "quantity" ? Number(value) : Number(currentLine.quantity || 1);
    const currentProdId = field === "productId" ? value : currentLine.productId;

    // 1. Khi chọn Sản phẩm mới -> Tự động kéo giá và UOM
    if (field === "productId" && value) {
      const prod = products.find((p: any) => p.productId === value || p.id === value);
      if (prod) {
        updatedUom = prod.uomId; 
        try {
          const res = await calculateDynamicPrice({
            partnerId, partnerType: isPurchasing ? "SUPPLIER" : "CUSTOMER",
            productId: value, quantity: currentQty
          }).unwrap();
          updatedPrice = res.finalPrice;
          isAuto = res.appliedPriceList !== null;
        } catch(e) {
          updatedPrice = isPurchasing ? (prod.purchasePrice || 0) : (prod.price || 0);
        }
      }
    }

    // 2. Khi đổi Số lượng -> Chạy lại Engine để xem có đạt mốc giảm giá hay không
    if (field === "quantity" && currentProdId) {
      try {
        const res = await calculateDynamicPrice({
          partnerId, partnerType: isPurchasing ? "SUPPLIER" : "CUSTOMER",
          productId: currentProdId, quantity: currentQty
        }).unwrap();
        updatedPrice = res.finalPrice;
        isAuto = res.appliedPriceList !== null;
      } catch(e) {}
    }

    // 3. Khi đổi Thuế
    if (field === "taxId") {
      const tax = taxes.find((t: any) => (t.taxId || t.id) === value);
      selectedTaxRate = tax ? Number(tax.rate) : 0;
    }

    // Cập nhật State
    setLines(prev => prev.map(line => {
      if (line.id !== id) return line;
      const newLine = { ...line, [field]: value };
      
      if (updatedPrice !== null) newLine.unitCost = updatedPrice;
      if (updatedUom !== null) newLine.uomId = updatedUom;
      if (selectedTaxRate !== null) newLine.taxRate = selectedTaxRate;
      if (isAuto) newLine.isAutoPriced = true;
      if (updatedPrice !== null && !isAuto) newLine.isAutoPriced = false;

      // Tính tự động tiền thuế
      const qty = Number(newLine.quantity) || 0;
      const price = Number(newLine.unitCost) || 0;
      newLine.taxAmount = qty * price * (newLine.taxRate / 100);

      return newLine;
    }));
  };

  // --- AUTO-CALCULATING ENGINE ---
  const summary = useMemo(() => {
    let subTotal = 0;
    let totalTax = 0;
    lines.forEach(line => {
      subTotal += (Number(line.quantity) || 0) * (Number(line.unitCost) || 0);
      totalTax += line.taxAmount;
    });
    return { subTotal, totalTax, grandTotal: subTotal + totalTax };
  }, [lines]);

  // --- SUBMIT FORM TỚI PRISMA BACKEND ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate khắt khe
    if (!activeBranchId) return toast.error("Không tìm thấy bối cảnh Chi nhánh. Vui lòng F5 lại trang!");
    if (!partnerId) return toast.error(`Vui lòng chọn ${partnerLabel}!`);
    if (!warehouseId) return toast.error(`Vui lòng chọn Kho lưu trữ!`);
    
    const validLines = lines.filter(l => l.productId && Number(l.quantity) > 0 && Number(l.unitCost) >= 0);
    if (validLines.length === 0) return toast.error("Chứng từ phải có ít nhất 1 sản phẩm hợp lệ!");
    if (validLines.some(l => !l.uomId)) return toast.error("Vui lòng chọn Đơn vị tính cho tất cả sản phẩm!");

    try {
      // [FIX TỬ HUYỆT 2] Tự động sinh Document Number định dạng chuẩn
      const prefix = docType === "PURCHASE_ORDER" ? "PO" : docType === "SALES_ORDER" ? "SO" : docType === "PURCHASE_RECEIPT" ? "GR" : "INV";
      const generatedDocNumber = `${prefix}-${Date.now().toString().slice(-6)}`;

      // PAYLOAD CHUẨN XÁC 100% THEO SCHEMA.PRISMA
      const payload: any = {
        documentNumber: generatedDocNumber, 
        branchId: activeBranchId,           
        type: docType,
        note: note, 
        currencyCode: "VND", // Mặc định Base Currency
        exchangeRate: 1,
        totalAmount: summary.grandTotal, 
        
        // Ánh xạ đúng khóa ngoại
        ...(isPurchasing ? { supplierId: partnerId } : { customerId: partnerId }),

        // [FIX TỬ HUYỆT 1 & 3] Gửi kèm ID Kho hàng và trường unitCost
        transactions: validLines.map(l => ({
          productId: l.productId,
          uomId: l.uomId, 
          fromWarehouseId: !isPurchasing ? warehouseId : null, // Xuất kho thì Kho nằm ở 'Từ'
          toWarehouseId: isPurchasing ? warehouseId : null,    // Nhập kho thì Kho nằm ở 'Đến'
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost) // Backend Prisma yêu cầu unitCost
        })),

        // Gửi mảng thuế
        taxes: validLines.filter(l => l.taxId && l.taxAmount > 0).map(l => ({
          taxId: l.taxId,
          taxAmount: l.taxAmount
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
            className="relative w-full max-w-7xl bg-slate-50 dark:bg-[#0B0F19] rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/10 overflow-hidden z-10 flex flex-col h-[90vh]"
          >
            {/* 1. HEADER KHU VỰC THAO TÁC */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 border-b shrink-0 z-20 ${theme.bg} ${theme.border}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm ${theme.color}`}>
                  <ThemeIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{theme.label}</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Hệ thống Lập chứng từ Thông minh</p>
                </div>
              </div>

              <div className="mt-4 sm:mt-0 flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-white/5">
                <select 
                  value={docType} onChange={(e) => setDocType(e.target.value as any)}
                  className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none px-3 py-1.5 cursor-pointer"
                >
                  <option value="PURCHASE_ORDER">Đơn Đặt Mua Hàng (PO)</option>
                  <option value="SALES_ORDER">Đơn Đặt Bán Hàng (SO)</option>
                  <option value="PURCHASE_RECEIPT">Phiếu Nhập Kho Gốc (GRPO)</option>
                  <option value="SALES_ISSUE">Phiếu Xuất Kho / Hóa đơn (INV)</option>
                </select>
              </div>
            </div>

            {/* 2. BODY KHU VỰC NHẬP LIỆU */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col xl:flex-row bg-slate-50 dark:bg-transparent">
              
              {/* CỘT TRÁI: DÒNG HÀNG HÓA */}
              <div className="flex-1 p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Package className={`w-4 h-4 ${theme.color}`}/> Danh sách Giao dịch
                  </h3>
                  <button onClick={addLine} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 dark:bg-indigo-500/20 dark:hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                    <Plus className="w-3.5 h-3.5"/> Thêm dòng
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-x-auto flex-1 scrollbar-hide">
                  <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
                    <thead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0F19]">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center">#</th>
                        <th className="px-4 py-3 w-[25%]">Mã & Tên Sản phẩm</th>
                        <th className="px-4 py-3 w-[15%]">Đơn vị (UoM)</th>
                        <th className="px-4 py-3 w-[12%]">Số lượng</th>
                        <th className="px-4 py-3 w-[18%]">Đơn giá (VND)</th>
                        <th className="px-4 py-3 w-[15%]">Mã Thuế</th>
                        <th className="px-4 py-3 w-[15%] text-right">Thành tiền</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      <AnimatePresence initial={false}>
                        {lines.map((line, index) => {
                          const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitCost) || 0);
                          return (
                            <motion.tr 
                              key={line.id}
                              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                              className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                            >
                              <td className="px-4 py-3 text-center text-xs font-bold text-slate-400">{index + 1}</td>
                              
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

                              <td className="px-4 py-3">
                                <select 
                                  value={line.uomId} onChange={(e) => updateLine(line.id, "uomId", e.target.value)}
                                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                                >
                                  <option value="">- ĐVT -</option>
                                  {uoms.map((u: any) => (
                                    <option key={u.uomId || u.id} value={u.uomId || u.id}>{u.name}</option>
                                  ))}
                                </select>
                              </td>

                              <td className="px-4 py-3">
                                <div className="relative">
                                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <input 
                                    type="number" min="1" value={line.quantity} onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                                    className="w-full pl-8 pr-2 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                  />
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div className="relative flex items-center gap-1.5">
                                  <div className="relative flex-1">
                                    <DollarSign className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${line.isAutoPriced ? "text-orange-500" : "text-slate-400"}`} />
                                    <input 
                                      type="number" min="0" value={line.unitCost} onChange={(e) => updateLine(line.id, "unitCost", e.target.value)}
                                      className={`w-full pl-8 pr-2 py-2 bg-slate-100 dark:bg-slate-900 border rounded-lg outline-none focus:ring-2 font-bold ${line.isAutoPriced ? "text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/50 focus:ring-orange-500" : "text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-700 focus:ring-indigo-500"}`}
                                    />
                                  </div>
                                  {line.isAutoPriced && (
                                    <div className="flex items-center justify-center p-1.5 bg-orange-100 dark:bg-orange-500/20 rounded-md" title="Đã áp dụng Bảng giá / Khuyến mãi tự động">
                                      <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div className="relative">
                                  <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <select 
                                    value={line.taxId} onChange={(e) => updateLine(line.id, "taxId", e.target.value)}
                                    className="w-full pl-8 pr-2 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                  >
                                    <option value="">VAT 0%</option>
                                    {taxes.map((t: any) => (
                                      <option key={t.taxId || t.id} value={t.taxId || t.id}>{t.rate}% - {t.code}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-right">
                                <span className="font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 inline-block min-w-[130px]">
                                  {formatVND(lineTotal)}
                                </span>
                              </td>

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

              {/* CỘT PHẢI: CONFIG META & SUMMARY TỔNG */}
              <div className="w-full xl:w-[400px] border-l border-slate-200 dark:border-white/5 bg-white dark:bg-[#090D14] flex flex-col shrink-0">
                
                <div className="p-6 flex flex-col gap-5 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Thông tin Bối cảnh</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Building className="w-3.5 h-3.5"/> Xác định {partnerLabel} *</label>
                    {loadingSupps || loadingCusts ? (
                      <div className="w-full h-11 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                    ) : (
                      <select 
                        required value={partnerId} onChange={(e) => setPartnerId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-indigo-700 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Click để tìm đối tác --</option>
                        {partners.map((p: any) => (
                          <option key={p.supplierId || p.customerId || p.id} value={p.supplierId || p.customerId || p.id}>
                            {p.code} - {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Warehouse className="w-3.5 h-3.5"/> Lưu trữ tại Kho *</label>
                    {loadingWhs ? (
                      <div className="w-full h-11 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                    ) : (
                      <select 
                        required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Chọn Kho Giao Dịch --</option>
                        {warehouses.map((w: any) => (
                          <option key={w.warehouseId || w.id} value={w.warehouseId || w.id}>
                            {w.code} - {w.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Diễn giải (Note)</label>
                    <textarea 
                      rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                      placeholder="Nhập ghi chú cho chứng từ này..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                  
                  <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl">
                     <p className="text-[11px] font-medium text-blue-700 dark:text-blue-400 flex items-start gap-2 leading-relaxed">
                        <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        Hệ thống định giá tự động (Auto-Pricing Engine) sẽ kích hoạt và quét bảng giá khi bạn thay đổi Khách hàng hoặc Số lượng.
                     </p>
                  </div>
                </div>

                {/* Dashboard Panel Tổng Kết */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Calculator className="w-4 h-4 text-indigo-500"/> Sổ cái ước tính</h4>
                  
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