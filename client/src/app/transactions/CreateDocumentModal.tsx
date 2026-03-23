"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, ShoppingCart, TrendingUp, Truck, 
  Receipt, Building, Package, Hash, DollarSign, 
  Loader2, Save, FileText, Percent, Zap, Warehouse, Link as LinkIcon, Globe
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
  useGetCurrenciesQuery,                   
  useCalculateDynamicPriceMutation,
  useGetWarehousesQuery               
} from "@/state/api";

// --- COMPONENTS & UTILS ---
import Modal from "@/app/(components)/Modal";
import FileDropzone from "@/app/(components)/FileDropzone";
import { formatVND, safeRound } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

// ==========================================
// 1. INTERFACES
// ==========================================
interface LineItem {
  id: string; 
  productId: string;
  uomId: string;             
  quantity: number | string;
  unitCost: number | string; 
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
  
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- API HOOKS ---
  const { data: productsResponse, isLoading: loadingProds } = useGetProductsQuery({ limit: 1000 }, { skip: !isOpen });
  const products = productsResponse?.data || []; 

  const { data: suppliers = [], isLoading: loadingSupps } = useGetSuppliersQuery(undefined, { skip: !isOpen });
  const { data: customers = [], isLoading: loadingCusts } = useGetCustomersQuery(undefined, { skip: !isOpen });
  const { data: taxes = [], isLoading: loadingTaxes } = useGetTaxesQuery(undefined, { skip: !isOpen });
  const { data: uoms = [], isLoading: loadingUoms } = useGetUoMsQuery(undefined, { skip: !isOpen });
  const { data: currencies = [], isLoading: loadingCurrencies } = useGetCurrenciesQuery(undefined, { skip: !isOpen });
  
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
  const [referenceDoc, setReferenceDoc] = useState(""); 
  const [currencyCode, setCurrencyCode] = useState("VND");
  const [exchangeRate, setExchangeRate] = useState<number | string>(1);
  const [note, setNote] = useState("");
  const [documentUrl, setDocumentUrl] = useState(""); 
  const [lines, setLines] = useState<LineItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDocType("PURCHASE_ORDER");
      setPartnerId("");
      setWarehouseId("");
      setReferenceDoc("");
      setCurrencyCode("VND");
      setExchangeRate(1);
      setNote("");
      setDocumentUrl("");
      setLines([{ id: Date.now().toString(), productId: "", uomId: "", quantity: 1, unitCost: "", taxId: "", taxRate: 0, taxAmount: 0 }]);
    }
  }, [isOpen]);

  const isPurchasing = docType === "PURCHASE_ORDER" || docType === "PURCHASE_RECEIPT";
  const partners = isPurchasing ? suppliers : customers;
  const partnerLabel = isPurchasing ? "Nhà Cung Cấp" : "Khách Hàng";

  const getDocTheme = () => {
    if (docType === "PURCHASE_ORDER") return { icon: ShoppingCart, color: "text-blue-500", label: "Đơn Mua Hàng (PO)" };
    if (docType === "SALES_ORDER") return { icon: TrendingUp, color: "text-emerald-500", label: "Đơn Bán Hàng (SO)" };
    if (docType === "PURCHASE_RECEIPT") return { icon: Truck, color: "text-purple-500", label: "Phiếu Nhập Kho (GRPO)" };
    return { icon: Receipt, color: "text-amber-500", label: "Phiếu Xuất / Hóa đơn (INV)" };
  };
  const theme = getDocTheme();
  const ThemeIcon = theme.icon;

  // Xử lý tự động thay đổi Tỷ giá khi chọn loại Tiền tệ
  useEffect(() => {
    const selectedCurrency = currencies.find(c => c.currencyCode === currencyCode);
    if (selectedCurrency) {
      setExchangeRate(selectedCurrency.exchangeRate);
    }
  }, [currencyCode, currencies]);

  // --- ENGINE ĐỊNH GIÁ LẠI KHI ĐỔI ĐỐI TÁC ---
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
            const taxAmount = safeRound(qty * price * (line.taxRate / 100));

            return { ...line, unitCost: price, taxAmount, isAutoPriced: res.appliedPriceList !== null };
          } catch { return line; }
        }));
        setLines(newLines);
      };
      repriceAllLines();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, isPurchasing]);

  // --- HANDLERS ---
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

    if (field === "taxId") {
      const tax = taxes.find((t: any) => (t.taxId || t.id) === value);
      selectedTaxRate = tax ? Number(tax.rate) : 0;
    }

    setLines(prev => prev.map(line => {
      if (line.id !== id) return line;
      const newLine = { ...line, [field]: value };
      
      if (updatedPrice !== null) newLine.unitCost = updatedPrice;
      if (updatedUom !== null) newLine.uomId = updatedUom;
      if (selectedTaxRate !== null) newLine.taxRate = selectedTaxRate;
      if (isAuto) newLine.isAutoPriced = true;
      if (updatedPrice !== null && !isAuto) newLine.isAutoPriced = false;

      const qty = Number(newLine.quantity) || 0;
      const price = Number(newLine.unitCost) || 0;
      newLine.taxAmount = safeRound(qty * price * (newLine.taxRate / 100));

      return newLine;
    }));
  };

  // --- ENGINE TÍNH TỔNG KẾ TOÁN ---
  const summary = useMemo(() => {
    let subTotal = 0;
    let totalTax = 0;
    lines.forEach(line => {
      subTotal += safeRound((Number(line.quantity) || 0) * (Number(line.unitCost) || 0));
      totalTax += line.taxAmount;
    });
    return { subTotal, totalTax, grandTotal: subTotal + totalTax };
  }, [lines]);

  // --- SUBMIT: KHỚP CHUẨN BACKEND 100% ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBranchId) return toast.error("Lỗi cấu hình Chi nhánh. Vui lòng F5 lại trang!");
    if (!partnerId) return toast.error(`Vui lòng chọn ${partnerLabel}!`);
    if (!warehouseId) return toast.error(`Vui lòng chọn Kho lưu trữ!`);
    
    const validLines = lines.filter(l => l.productId && Number(l.quantity) > 0 && Number(l.unitCost) >= 0);
    if (validLines.length === 0) return toast.error("Chứng từ phải có ít nhất 1 sản phẩm hợp lệ!");
    if (validLines.some(l => !l.uomId)) return toast.error("Vui lòng chọn Đơn vị tính cho tất cả sản phẩm!");

    try {
      const prefix = docType === "PURCHASE_ORDER" ? "PO" : docType === "SALES_ORDER" ? "SO" : docType === "PURCHASE_RECEIPT" ? "GR" : "INV";
      const generatedDocNumber = `${prefix}-${Date.now().toString().slice(-6)}`;

      // CỨU DỮ LIỆU: Ghép link file đính kèm vào Note để không bị xóa khi Backend phê duyệt
      const finalNote = documentUrl 
        ? `${note}\n\n[Tài liệu đính kèm]: ${documentUrl}`.trim() 
        : note;

      // THUẬT TOÁN GỘP THUẾ FRONTEND (Bảo hiểm 2 lớp cùng Backend)
      const groupedTaxes: Record<string, number> = {};
      validLines.forEach(l => {
        if (l.taxId && l.taxAmount > 0) {
          groupedTaxes[l.taxId] = (groupedTaxes[l.taxId] || 0) + l.taxAmount;
        }
      });
      const taxesPayload = Object.keys(groupedTaxes).map(taxId => ({
        taxId,
        taxAmount: groupedTaxes[taxId]
      }));

      const payload: any = {
        documentNumber: generatedDocNumber, 
        branchId: activeBranchId,           
        type: docType,
        note: finalNote, 
        referenceDoc: referenceDoc || null, 
        currencyCode: currencyCode, 
        exchangeRate: Number(exchangeRate) || 1,
        totalAmount: summary.grandTotal, 
        
        ...(isPurchasing ? { supplierId: partnerId } : { customerId: partnerId }),

        transactions: validLines.map(l => ({
          productId: l.productId,
          uomId: l.uomId, 
          fromWarehouseId: !isPurchasing ? warehouseId : null,
          toWarehouseId: isPurchasing ? warehouseId : null,   
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost) 
        })),

        taxes: taxesPayload
      };

      await createDocument(payload).unwrap();
      toast.success("Khởi tạo Chứng từ thành công!");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi khi lưu chứng từ vào cơ sở dữ liệu!");
    }
  };

  // --- FOOTER RENDER ---
  const modalFooter = (
    <div className="flex w-full items-center justify-between">
      <div className="hidden sm:flex items-center gap-6">
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cộng tiền hàng</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">{formatVND(summary.subTotal)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thuế VAT</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">{formatVND(summary.totalTax)}</p>
        </div>
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng thanh toán</p>
          <p className={cn("text-xl font-black", theme.color)}>{formatVND(summary.grandTotal)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button 
          type="button" onClick={onClose} disabled={isSubmitting} 
          className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          Hủy bỏ
        </button>
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting || summary.grandTotal === 0} 
          className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          PHÁT HÀNH
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={theme.label}
      subtitle="Hệ thống Lập chứng từ Tự động (Hỗ trợ Định giá & Thuế linh hoạt)"
      icon={<ThemeIcon className={cn("w-6 h-6", theme.color)} />}
      maxWidth="max-w-7xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="flex flex-col xl:flex-row h-full overflow-hidden bg-slate-50/30 dark:bg-transparent">
        
        {/* CỘT TRÁI: DÒNG HÀNG HÓA */}
        <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden border-r border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Package className={cn("w-4 h-4", theme.color)}/> Danh mục Hàng hóa
            </h3>
            <button onClick={addLine} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 dark:bg-blue-500/20 dark:hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5"/> Thêm dòng
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[950px]">
              <thead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-800/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">#</th>
                  <th className="px-4 py-3 w-[25%]">Sản phẩm / Vật tư</th>
                  <th className="px-4 py-3 w-[12%]">Đơn vị (UoM)</th>
                  <th className="px-4 py-3 w-[12%]">Số lượng</th>
                  <th className="px-4 py-3 w-[18%]">Đơn giá</th>
                  <th className="px-4 py-3 w-[15%]">Thuế VAT</th>
                  <th className="px-4 py-3 w-[15%] text-right">Thành tiền</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-transparent">
                <AnimatePresence initial={false}>
                  {lines.map((line, index) => {
                    const lineTotal = safeRound((Number(line.quantity) || 0) * (Number(line.unitCost) || 0));
                    return (
                      <motion.tr 
                        key={line.id}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-center text-xs font-bold text-slate-400">{index + 1}</td>
                        
                        <td className="px-4 py-3">
                          <select 
                            value={line.productId} onChange={(e) => updateLine(line.id, "productId", e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-200 transition-colors"
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
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300 transition-colors"
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
                              className="w-full pl-8 pr-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-colors"
                            />
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="relative flex items-center gap-1.5">
                            <div className="relative flex-1">
                              <DollarSign className={cn(
                                "absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors",
                                line.isAutoPriced ? "text-orange-500" : "text-slate-400"
                              )} />
                              <input 
                                type="number" min="0" value={line.unitCost} onChange={(e) => updateLine(line.id, "unitCost", e.target.value)}
                                className={cn(
                                  "w-full pl-8 pr-2 py-2 border rounded-lg outline-none focus:ring-2 font-bold transition-all",
                                  line.isAutoPriced 
                                    ? "bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/50 focus:ring-orange-500" 
                                    : "bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-700 focus:ring-blue-500"
                                )}
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
                              className="w-full pl-8 pr-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            >
                              <option value="">VAT 0%</option>
                              {taxes.map((t: any) => (
                                <option key={t.taxId || t.id} value={t.taxId || t.id}>{t.rate}% - {t.code}</option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className="font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 inline-block min-w-[130px] transition-colors">
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

        {/* CỘT PHẢI: CONFIG META */}
        <div className="w-full xl:w-[400px] glass-panel border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto p-6 z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col gap-5 flex-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Thuộc tính Chứng từ</h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">Phân loại Giao dịch *</label>
              <select 
                value={docType} onChange={(e) => setDocType(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
              >
                <option value="PURCHASE_ORDER">Đơn Đặt Mua Hàng (PO)</option>
                <option value="SALES_ORDER">Đơn Đặt Bán Hàng (SO)</option>
                <option value="PURCHASE_RECEIPT">Phiếu Nhập Kho (GRPO)</option>
                <option value="SALES_ISSUE">Phiếu Xuất / Hóa đơn (INV)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Building className="w-3.5 h-3.5"/> Xác định {partnerLabel} *</label>
              {loadingSupps || loadingCusts ? (
                <div className="w-full h-11 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ) : (
                <select 
                  required value={partnerId} onChange={(e) => setPartnerId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-blue-700 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
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

            {/* 🚀 HỖ TRỢ ĐA TIỀN TỆ (MULTI-CURRENCY) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Globe className="w-3.5 h-3.5"/> Tiền tệ *</label>
                {loadingCurrencies ? (
                  <div className="w-full h-11 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ) : (
                  <select 
                    value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    {currencies.map((c: any) => (
                      <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">Tỷ giá</label>
                <input 
                  type="number" min="1" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)}
                  disabled={currencyCode === "VND"}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5"/> Số Hóa đơn / PO Tham chiếu</label>
              <input 
                type="text" value={referenceDoc} onChange={(e) => setReferenceDoc(e.target.value)}
                placeholder="VD: HD-0012345..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Diễn giải chung (Note)</label>
              <textarea 
                rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú cho chứng từ..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">Hồ sơ / Báo giá đính kèm</label>
              <FileDropzone 
                onUploadSuccess={(url) => setDocumentUrl(url)}
                accept="application/pdf, image/*"
                label="Kéo thả PDF / Hình ảnh đính kèm"
                maxSizeMB={10}
              />
            </div>
            
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl mt-auto">
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-start gap-2 leading-relaxed">
                  <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Hệ thống định giá (Auto-Pricing Engine) sẽ quét bảng giá động để áp dụng mức chiết khấu tốt nhất.
                </p>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}