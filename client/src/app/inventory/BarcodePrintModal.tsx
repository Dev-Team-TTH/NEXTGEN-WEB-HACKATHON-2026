"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, Printer, Package, QrCode, Settings2, 
  Plus, Minus, CheckCircle2, AlertCircle 
} from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "react-qr-code";

// --- REDUX & API ---
import { useGetProductsQuery } from "@/state/api";

// ==========================================
// COMPONENT: MODAL IN TEM NHÃN MÃ VẠCH / QR
// ==========================================
interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProductId?: string; // Hỗ trợ truyền sẵn ID nếu ấn từ màn ProductList
}

export default function BarcodePrintModal({ isOpen, onClose, defaultProductId = "" }: BarcodePrintModalProps) {
  // --- API HOOKS ---
  const { data: products, isLoading: loadingProducts } = useGetProductsQuery({});

  // --- LOCAL STATE ---
  const [selectedProductId, setSelectedProductId] = useState<string>(defaultProductId);
  const [printQuantity, setPrintQuantity] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<"SMALL" | "LARGE">("LARGE");
  
  const printRef = useRef<HTMLDivElement>(null);

  // Tìm sản phẩm đang được chọn để render Preview
  const selectedProduct = products?.find(p => p.productId === selectedProductId);

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
      window.location.reload(); // Tải lại để gắn lại các event listeners của React
    }
  };

  // --- ANIMATION CONFIG CHUẨN TYPESCRIPT ---
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { type: "spring" as const, stiffness: 300, damping: 25 } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 20, 
      transition: { duration: 0.2 } 
    }
  };

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
          {/* Backdrop click */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-4xl glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col md:flex-row max-h-[95vh]"
          >
            {/* ==========================================
                CỘT TRÁI: CẤU HÌNH IN (SETTINGS)
                ========================================== */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10">
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
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                
                {/* 1. Chọn Sản phẩm */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" /> Chọn Vật tư / Sản phẩm
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    disabled={loadingProducts}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  >
                    <option value="">-- Chọn sản phẩm cần in tem --</option>
                    {products?.map(p => (
                      <option key={p.productId} value={p.productId}>[{p.productCode}] {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Số lượng tem */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-slate-400" /> Số lượng tem (Bản in)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50">
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

                {/* 3. Kích thước tem */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Kích thước Khổ giấy
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setLabelSize("LARGE")}
                      className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${labelSize === "LARGE" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold" : "border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                    >
                      <span className="text-sm">Tem Thùng (100x100)</span>
                    </button>
                    <button 
                      onClick={() => setLabelSize("SMALL")}
                      className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${labelSize === "SMALL" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold" : "border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                    >
                      <span className="text-sm">Tem Dán (50x30)</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Action */}
              <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
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
            <div className="w-full md:w-1/2 bg-slate-100/50 dark:bg-[#080B14] p-6 flex flex-col relative">
              <button onClick={onClose} className="hidden md:flex absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors z-20">
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 text-center">
                Bản xem trước (Live Preview)
              </h3>

              <div className="flex-1 flex items-center justify-center overflow-auto">
                {selectedProduct ? (
                  // BẢN THIẾT KẾ TEM NHÃN (Sẽ được in ra)
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`bg-white shadow-xl rounded-lg p-6 flex flex-col border border-slate-200 text-black mx-auto transition-all ${
                      labelSize === "LARGE" ? "w-[300px] aspect-square justify-between" : "w-[250px] h-[150px] justify-center gap-2"
                    }`}
                  >
                    {/* Header tem */}
                    <div className={`${labelSize === "LARGE" ? "text-center" : "flex items-center justify-between"}`}>
                      <h1 className={`font-black uppercase truncate ${labelSize === "LARGE" ? "text-xl mb-1" : "text-sm max-w-[150px]"}`}>
                        {selectedProduct.name}
                      </h1>
                      <p className={`font-mono text-slate-500 ${labelSize === "LARGE" ? "text-sm" : "text-xs"}`}>
                        {selectedProduct.productCode}
                      </p>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center my-2">
                      <QRCode 
                        value={selectedProduct.productCode} 
                        size={labelSize === "LARGE" ? 140 : 64} 
                        level="H" 
                      />
                    </div>

                    {/* Footer tem */}
                    {labelSize === "LARGE" && (
                      <div className="text-center border-t border-slate-200 pt-3 mt-2">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Công ty Cổ phần TTH ERP</p>
                        <p className="text-[10px] text-slate-400">Quét mã bằng thiết bị để truy xuất dữ liệu</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                    <QrCode className="w-12 h-12 opacity-20" />
                    <p className="text-sm font-medium">Chưa chọn sản phẩm</p>
                  </div>
                )}
              </div>
            </div>

            {/* VÙNG IN ẨN (Dùng cho window.print()) */}
            <div className="hidden">
              <div ref={printRef} className="print-container">
                {/* Render ra số lượng tem đúng bằng printQuantity */}
                {selectedProduct && Array.from({ length: printQuantity }).map((_, index) => (
                  <div key={index} className="print-page" style={{ 
                    pageBreakAfter: 'always', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: labelSize === 'LARGE' ? '100mm' : '50mm',
                    height: labelSize === 'LARGE' ? '100mm' : '30mm',
                    fontFamily: 'sans-serif',
                    color: '#000',
                    padding: '5mm',
                    boxSizing: 'border-box'
                  }}>
                    <h1 style={{ fontSize: labelSize === 'LARGE' ? '14pt' : '8pt', margin: '0 0 5px 0', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>
                      {selectedProduct.name}
                    </h1>
                    <QRCode 
                      value={selectedProduct.productCode} 
                      size={labelSize === "LARGE" ? 120 : 40} 
                      level="H" 
                    />
                    <p style={{ fontSize: labelSize === 'LARGE' ? '10pt' : '6pt', margin: '5px 0 0 0', fontFamily: 'monospace' }}>
                      {selectedProduct.productCode}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}