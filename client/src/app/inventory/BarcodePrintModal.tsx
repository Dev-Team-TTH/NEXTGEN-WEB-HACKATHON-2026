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
  // 💡 FIX LỖI TS2339: Lấy data từ PaginatedResponse an toàn bằng cách ép kiểu (as any)
  const { data: productsResponse, isLoading: loadingProducts } = useGetProductsQuery({ limit: 1000 }, { skip: !isOpen });
  const productsList = (productsResponse as any)?.data || [];

  // --- LOCAL STATE ---
  const [selectedProductId, setSelectedProductId] = useState<string>(defaultProductId);
  const [printQuantity, setPrintQuantity] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<"SMALL" | "LARGE">("LARGE");
  
  const printRef = useRef<HTMLDivElement>(null);

  // 💡 FIX LỖI TS7006: Khai báo kiểu (p: any) rõ ràng để TS không báo lỗi ngầm định
  const selectedProduct = productsList.find((p: any) => p.productId === selectedProductId || p.id === selectedProductId);

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
      <div className="flex flex-col md:flex-row h-[85vh] md:h-[600px] w-full relative bg-slate-50/50 dark:bg-transparent overflow-hidden">
        
        {/* ==========================================
            CỘT TRÁI: CẤU HÌNH IN (SETTINGS)
            ========================================== */}
        <div className="w-full md:w-1/2 flex flex-col border-r border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 shrink-0 z-10">
          
          {/* Header Split */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">In Tem Nhãn</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Cấu hình máy in mã vạch / QR</p>
              </div>
            </div>
            {/* Nút đóng trên Mobile */}
            <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Settings */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-thin">
            
            <div className="space-y-2 group">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">
                <Package className="w-3.5 h-3.5" /> Chọn Vật tư / Sản phẩm <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={loadingProducts}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white shadow-sm cursor-pointer"
              >
                <option value="">-- Chọn sản phẩm cần in tem --</option>
                {productsList.map((p: any) => (
                  <option key={p.productId || p.id} value={p.productId || p.id}>[{p.productCode}] {p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 group">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">
                <Settings2 className="w-3.5 h-3.5" /> Số lượng tem (Bản in) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-inner">
                  <button 
                    onClick={() => setPrintQuantity(Math.max(1, printQuantity - 1))}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors border-r border-slate-200 dark:border-white/10"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input 
                    type="number" 
                    value={printQuantity}
                    onChange={(e) => setPrintQuantity(Number(e.target.value))}
                    className="w-16 h-full text-center bg-transparent border-none outline-none font-black text-lg text-indigo-600 dark:text-indigo-400"
                  />
                  <button 
                    onClick={() => setPrintQuantity(Math.min(100, printQuantity + 1))}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors border-l border-slate-200 dark:border-white/10"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Tối đa 100 tem</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Kích thước Khổ giấy in
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setLabelSize("LARGE")}
                  className={cn(
                    "p-3.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95",
                    labelSize === "LARGE" 
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold shadow-md shadow-indigo-500/10" 
                      : "border-slate-200 dark:border-white/10 text-slate-500 hover:bg-white dark:hover:bg-slate-800"
                  )}
                >
                  <span className="text-sm">Tem Thùng</span>
                  <span className="text-[10px] opacity-70 font-mono">100x100 mm</span>
                </button>
                <button 
                  onClick={() => setLabelSize("SMALL")}
                  className={cn(
                    "p-3.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95",
                    labelSize === "SMALL" 
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold shadow-md shadow-indigo-500/10" 
                      : "border-slate-200 dark:border-white/10 text-slate-500 hover:bg-white dark:hover:bg-slate-800"
                  )}
                >
                  <span className="text-sm">Tem Dán</span>
                  <span className="text-[10px] opacity-70 font-mono">50x30 mm</span>
                </button>
              </div>
            </div>

          </div>

          {/* Action Split Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/50">
            <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-sm active:scale-95">
              Hủy bỏ
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
        <div className="w-full md:w-1/2 bg-slate-100/80 dark:bg-[#050810] p-6 flex flex-col relative">
          
          {/* 💡 FIX LỖI UX: Đưa nút Close ra Layer trên cùng (z-50) để luôn bấm được */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2.5 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-full transition-all active:scale-90 z-50"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>

          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8 text-center mt-2">
            Bản xem trước (Live Preview)
          </h3>

          <div className="flex-1 flex items-center justify-center overflow-auto custom-scrollbar p-4 relative z-10">
            <AnimatePresence mode="wait">
              {selectedProduct ? (
                <motion.div 
                  key="preview"
                  initial={{ scale: 0.8, opacity: 0, rotate: -5 }} 
                  animate={{ scale: 1, opacity: 1, rotate: 0 }} 
                  exit={{ scale: 0.8, opacity: 0, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={cn(
                    "bg-white shadow-2xl rounded-xl p-6 flex flex-col border-2 border-slate-200 text-black transition-all mx-auto",
                    labelSize === "LARGE" ? "w-[280px] aspect-square justify-between" : "w-[250px] h-[140px] justify-center gap-2"
                  )}
                >
                  {/* Nội dung TEM */}
                  {labelSize === "LARGE" ? (
                    // TEM THÙNG (To)
                    <>
                      <div className="text-center border-b border-slate-200 pb-3 mb-2">
                         <h1 className="font-black text-lg uppercase truncate leading-tight tracking-tight">
                          {selectedProduct.name}
                        </h1>
                        <p className="font-mono text-slate-600 text-sm mt-1 bg-slate-100 px-2 py-0.5 rounded w-fit mx-auto">
                          {selectedProduct.productCode}
                        </p>
                      </div>
                      <div className="flex justify-center items-center my-2">
                        <QRCode value={selectedProduct.productCode} size={130} level="H" />
                      </div>
                      <div className="text-center pt-2">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">TTH Enterprise ERP</p>
                      </div>
                    </>
                  ) : (
                    // TEM DÁN (Nhỏ)
                    <div className="flex items-center justify-between w-full h-full gap-3">
                      <div className="flex flex-col h-full justify-center flex-1 min-w-0">
                         <h1 className="font-black text-[11px] uppercase line-clamp-2 leading-tight">
                          {selectedProduct.name}
                        </h1>
                        <p className="font-mono text-slate-600 text-[10px] mt-1 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                          {selectedProduct.productCode}
                        </p>
                        <p className="text-[8px] text-slate-400 uppercase font-bold mt-auto pt-2 border-t border-slate-100">
                          TTH ERP
                        </p>
                      </div>
                      <div className="shrink-0 p-1.5 border border-slate-200 rounded bg-white">
                        <QRCode value={selectedProduct.productCode} size={60} level="H" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-slate-400 gap-4 border-2 border-dashed border-slate-300 dark:border-slate-700 w-[280px] h-[280px] rounded-3xl bg-slate-50 dark:bg-slate-900/50">
                  <QrCode className="w-14 h-14 opacity-20" />
                  <p className="text-sm font-bold">Chưa chọn sản phẩm</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ==========================================
            VÙNG IN ẨN (Dùng cho window.print() ra máy in)
            ========================================== */}
        <div className="hidden">
          <div ref={printRef} className="print-container">
            {selectedProduct && Array.from({ length: printQuantity }).map((_, index) => (
              <div key={index} className="print-page" style={{ 
                pageBreakAfter: 'always', display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
                width: labelSize === 'LARGE' ? '100mm' : '50mm',
                height: labelSize === 'LARGE' ? '100mm' : '30mm',
                fontFamily: 'sans-serif', color: '#000', padding: '3mm', boxSizing: 'border-box',
                margin: 0
              }}>
                {labelSize === 'LARGE' ? (
                  <>
                    <h1 style={{ fontSize: '13pt', margin: '0 0 5px 0', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.2' }}>
                      {selectedProduct.name}
                    </h1>
                    <QRCode value={selectedProduct.productCode} size={150} level="H" />
                    <p style={{ fontSize: '10pt', margin: '8px 0 0 0', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {selectedProduct.productCode}
                    </p>
                  </>
                ) : (
                  <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '5px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                       <h1 style={{ fontSize: '9pt', margin: '0', fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.2' }}>
                        {selectedProduct.name}
                      </h1>
                      <p style={{ fontSize: '8pt', margin: '3px 0 0 0', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {selectedProduct.productCode}
                      </p>
                    </div>
                    <QRCode value={selectedProduct.productCode} size={65} level="H" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </Modal>
  );
}