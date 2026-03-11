"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Printer, Package, QrCode, Settings2, 
  Plus, Minus
} from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "react-qr-code";

// --- REDUX & API ---
import { useGetProductsQuery, Product } from "@/state/api";

// --- IMPORT CORE MODAL & UTILS ---
import Modal from "@/app/(components)/Modal";
import { cn } from "@/utils/helpers";

// ==========================================
// COMPONENT: MODAL IN TEM NHÃN MÃ VẠCH / QR
// ==========================================
interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProductId?: string;
}

export default function BarcodePrintModal({ isOpen, onClose, defaultProductId = "" }: BarcodePrintModalProps) {
  // --- API HOOKS ---
  // FIX LỖI TS2339: Lấy data từ PaginatedResponse và thêm limit lớn để chọn được mọi SP
  const { data: productsResponse, isLoading: loadingProducts } = useGetProductsQuery({ limit: 1000 }, { skip: !isOpen });
  const productsList = productsResponse?.data || [];

  // --- LOCAL STATE ---
  const [selectedProductId, setSelectedProductId] = useState<string>(defaultProductId);
  const [printQuantity, setPrintQuantity] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<"SMALL" | "LARGE">("LARGE");
  
  const printRef = useRef<HTMLDivElement>(null);

  // FIX LỖI TS7006: Khai báo kiểu Product rõ ràng
  const selectedProduct = productsList.find((p: Product) => p.productId === selectedProductId || (p as any).id === selectedProductId);

  // --- HANDLERS ---
  const handlePrint = () => {
    if (!selectedProduct) {
      toast.error("Vui lòng chọn một sản phẩm để in!");
      return;
    }
    if (printQuantity < 1 || printQuantity > 100) {
      toast.error("Số lượng in phải từ 1 đến 100 tem!");
      return;
    }

    // Cơ chế In chuẩn Enterprise: Tự động mở hộp thoại Print của Trình duyệt
    const printContent = printRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      
      // Khôi phục lại giao diện sau khi in xong
      document.body.innerHTML = originalContents;
      window.location.reload(); 
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-4xl"
      hideHeader={true}
      hideFooter={true}
    >
      <div className="flex flex-col md:flex-row h-[85vh] md:h-[600px] w-full relative bg-slate-50/50 dark:bg-transparent">
        
        {/* ==========================================
            CỘT TRÁI: CẤU HÌNH IN (SETTINGS)
            ========================================== */}
        <div className="w-full md:w-1/2 flex flex-col border-r border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 shrink-0">
          
          {/* Header Split */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">In Tem Nhãn</h2>
                <p className="text-xs text-slate-500 font-medium">Cấu hình máy in mã vạch / QR</p>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Settings */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-thin">
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" /> Chọn Vật tư / Sản phẩm
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={loadingProducts}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white shadow-sm"
              >
                <option value="">-- Chọn sản phẩm cần in tem --</option>
                {productsList.map((p: Product) => (
                  <option key={p.productId} value={p.productId || (p as any).id}>[{p.productCode}] {p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400" /> Số lượng tem (Bản in)
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 shadow-sm">
                  <button 
                    onClick={() => setPrintQuantity(Math.max(1, printQuantity - 1))}
                    className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input 
                    type="number" 
                    value={printQuantity}
                    onChange={(e) => setPrintQuantity(Number(e.target.value))}
                    className="w-16 text-center bg-transparent border-none outline-none font-bold text-slate-900 dark:text-white"
                  />
                  <button 
                    onClick={() => setPrintQuantity(Math.min(100, printQuantity + 1))}
                    className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-slate-500 font-medium">Tối đa 100 tem/lần</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Kích thước Khổ giấy
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setLabelSize("LARGE")}
                  className={cn(
                    "p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                    labelSize === "LARGE" 
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold shadow-md" 
                      : "border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <span className="text-sm">Tem Thùng (100x100)</span>
                </button>
                <button 
                  onClick={() => setLabelSize("SMALL")}
                  className={cn(
                    "p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                    labelSize === "SMALL" 
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold shadow-md" 
                      : "border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <span className="text-sm">Tem Dán (50x30)</span>
                </button>
              </div>
            </div>

          </div>

          {/* Action Split Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/50">
            <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-sm">
              Hủy
            </button>
            <button 
              onClick={handlePrint}
              disabled={!selectedProduct}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" /> Phát lệnh In
            </button>
          </div>
        </div>

        {/* ==========================================
            CỘT PHẢI: LIVE PREVIEW (BẢN XEM TRƯỚC)
            ========================================== */}
        <div className="w-full md:w-1/2 bg-slate-100/50 dark:bg-[#080B14] p-6 flex flex-col relative overflow-hidden">
          <button onClick={onClose} className="hidden md:flex absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors z-20">
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 text-center">
            Bản xem trước (Live Preview)
          </h3>

          <div className="flex-1 flex items-center justify-center overflow-auto custom-scrollbar p-4">
            <AnimatePresence mode="wait">
              {selectedProduct ? (
                <motion.div 
                  key="preview"
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                  className={cn(
                    "bg-white shadow-xl rounded-lg p-6 flex flex-col border border-slate-200 text-black transition-all",
                    labelSize === "LARGE" ? "w-[300px] aspect-square justify-between" : "w-[250px] h-[150px] justify-center gap-2"
                  )}
                >
                  <div className={cn(labelSize === "LARGE" ? "text-center" : "flex items-center justify-between")}>
                    <h1 className={cn("font-black uppercase truncate", labelSize === "LARGE" ? "text-xl mb-1" : "text-sm max-w-[150px]")}>
                      {selectedProduct.name}
                    </h1>
                    <p className={cn("font-mono text-slate-500", labelSize === "LARGE" ? "text-sm" : "text-xs")}>
                      {selectedProduct.productCode}
                    </p>
                  </div>

                  <div className="flex justify-center my-2">
                    <QRCode 
                      value={selectedProduct.productCode} 
                      size={labelSize === "LARGE" ? 140 : 64} 
                      level="H" 
                    />
                  </div>

                  {labelSize === "LARGE" && (
                    <div className="text-center border-t border-slate-200 pt-3 mt-2">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Công ty Cổ phần TTH ERP</p>
                      <p className="text-[10px] text-slate-400">Quét mã bằng thiết bị để truy xuất dữ liệu</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-slate-400 gap-3 border-2 border-dashed border-slate-300 dark:border-slate-700 w-[300px] h-[300px] rounded-3xl">
                  <QrCode className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">Chưa chọn sản phẩm</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* VÙNG IN ẨN (Dùng cho window.print()) */}
        <div className="hidden">
          <div ref={printRef} className="print-container">
            {selectedProduct && Array.from({ length: printQuantity }).map((_, index) => (
              <div key={index} className="print-page" style={{ 
                pageBreakAfter: 'always', display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center',
                width: labelSize === 'LARGE' ? '100mm' : '50mm',
                height: labelSize === 'LARGE' ? '100mm' : '30mm',
                fontFamily: 'sans-serif', color: '#000', padding: '5mm', boxSizing: 'border-box'
              }}>
                <h1 style={{ fontSize: labelSize === 'LARGE' ? '14pt' : '8pt', margin: '0 0 5px 0', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>
                  {selectedProduct.name}
                </h1>
                <QRCode value={selectedProduct.productCode} size={labelSize === "LARGE" ? 120 : 40} level="H" />
                <p style={{ fontSize: labelSize === 'LARGE' ? '10pt' : '6pt', margin: '5px 0 0 0', fontFamily: 'monospace' }}>
                  {selectedProduct.productCode}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Modal>
  );
}