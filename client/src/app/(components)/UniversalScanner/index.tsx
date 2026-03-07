"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ScanLine, ScanBarcode, CheckCircle2, AlertCircle, 
  Trash2, Send, Plus, Minus, Keyboard, Camera, Loader2, PackageSearch
} from "lucide-react";
import { useBulkStockTakeMutation, useGetProductsQuery, useGetWarehousesQuery } from "@/state/api";

// ==========================================
// TÍNH NĂNG ÂM THANH: BEEP BEEP (WEB AUDIO API)
// ==========================================
const playBeep = (type: "success" | "error" = "success") => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (err) {
    console.error("Audio API không được hỗ trợ", err);
  }
};

// ==========================================
// INTERFACES
// ==========================================
interface UniversalScannerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWarehouseId?: string;
}

interface ScannedItem {
  productId: string;
  productCode: string;
  name: string;
  countedQuantity: number;
}

export default function UniversalScanner({ isOpen, onClose, defaultWarehouseId }: UniversalScannerProps) {
  // --- APIs ---
  const { data: productsData, isLoading: isLoadingProducts } = useGetProductsQuery({ limit: 1000 } as any);
  const { data: warehousesData } = useGetWarehousesQuery({});
  const [bulkStockTake, { isLoading: isSyncing }] = useBulkStockTakeMutation();

  const products = Array.isArray(productsData) ? productsData : ((productsData as any)?.data || []);
  const warehouses = Array.isArray(warehousesData) ? warehousesData : ((warehousesData as any)?.data || []);

  // --- STATES ---
  const [warehouseId, setWarehouseId] = useState<string>(defaultWarehouseId || "");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [manualBarcode, setManualBarcode] = useState("");
  const [mode, setMode] = useState<"CAMERA" | "KEYBOARD">("KEYBOARD");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus vào ô input khi mở Modal để máy quét PDA/Bluetooth có thể bắn text vào ngay
  useEffect(() => {
    if (isOpen && mode === "KEYBOARD") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, mode]);

  // XÓA TRẠNG THÁI KHI ĐÓNG MODAL
  useEffect(() => {
    if (!isOpen) {
      setScannedItems([]);
      setManualBarcode("");
      setErrorMsg("");
    }
  }, [isOpen]);

  // --- LOGIC XỬ LÝ MÃ VẠCH (CORE ENGINE) ---
  const handleProcessBarcode = (code: string) => {
    setErrorMsg("");
    const barcode = code.trim();
    if (!barcode) return;

    // 1. Tìm sản phẩm dựa trên Barcode / ProductCode
    const product = products.find((p: any) => p.productCode.toLowerCase() === barcode.toLowerCase() || p.productId === barcode);

    if (!product) {
      playBeep("error");
      setErrorMsg(`Không tìm thấy sản phẩm với mã: ${barcode}`);
      setManualBarcode("");
      return;
    }

    playBeep("success");

    // 2. Cập nhật mảng Local State (Gộp nhóm nếu quét trùng mã)
    setScannedItems((prev) => {
      const existingItemIndex = prev.findIndex(item => item.productId === product.productId);
      if (existingItemIndex >= 0) {
        const updated = [...prev];
        updated[existingItemIndex].countedQuantity += 1; // Cộng dồn số lượng
        return updated;
      } else {
        return [{
          productId: product.productId,
          productCode: product.productCode,
          name: product.name,
          countedQuantity: 1
        }, ...prev]; // Đẩy item mới lên đầu danh sách
      }
    });

    setManualBarcode("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessBarcode(manualBarcode);
    }
  };

  const updateItemQuantity = (productId: string, delta: number) => {
    setScannedItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.countedQuantity + delta);
        return { ...item, countedQuantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setScannedItems(prev => prev.filter(item => item.productId !== productId));
  };

  // --- GỌI API ĐỒNG BỘ KIỂM KÊ ---
  const handleSyncToServer = async () => {
    if (!warehouseId) {
      setErrorMsg("Vui lòng chọn Kho để tiến hành kiểm kê!");
      return;
    }
    if (scannedItems.length === 0) {
      setErrorMsg("Danh sách kiểm kê trống!");
      return;
    }

    try {
      await bulkStockTake({
        warehouseId,
        note: "Kiểm kê tự động qua Universal Scanner",
        items: scannedItems.map(item => ({
          productId: item.productId,
          countedQuantity: item.countedQuantity
        }))
      }).unwrap();

      // Thành công -> Đóng modal
      onClose();
    } catch (error: any) {
      setErrorMsg(error.data?.message || "Lỗi khi đồng bộ kiểm kê.");
      playBeep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
        {/* BACKDROP BLUR */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* MODAL CONTENT */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-white/10"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <ScanBarcode className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">Máy quét Kiểm kê (Bulk)</h2>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Quét liên tục. Dữ liệu sẽ được cộng dồn cục bộ trước khi đồng bộ.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* MAIN BODY: 2 CỘT */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* CỘT TRÁI: CẤU HÌNH & KHU VỰC QUÉT */}
            <div className="w-full md:w-5/12 p-6 border-r border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-transparent flex flex-col gap-6 overflow-y-auto">
              
              {/* Chọn Kho */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Vị trí Kiểm kê</label>
                <select 
                  value={warehouseId} 
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                >
                  <option value="">-- Chọn Kho hàng --</option>
                  {warehouses.map((w: any) => (
                    <option key={w.warehouseId} value={w.warehouseId}>{w.code} - {w.name}</option>
                  ))}
                  <option value="wh-test-01">KHO TỔNG - TEST (Dữ liệu mẫu)</option>
                </select>
              </div>

              {/* Toggle Chế độ Quét */}
              <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
                <button 
                  onClick={() => setMode("KEYBOARD")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${mode === "KEYBOARD" ? "bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  <Keyboard className="w-4 h-4" /> Quét thủ công
                </button>
                <button 
                  onClick={() => setMode("CAMERA")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${mode === "CAMERA" ? "bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  <Camera className="w-4 h-4" /> Dùng Camera
                </button>
              </div>

              {/* KHU VỰC NHẬP/QUÉT MÃ */}
              {mode === "KEYBOARD" ? (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      ref={inputRef}
                      type="text"
                      placeholder="Tít mã vạch hoặc nhập tay..."
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full pl-10 pr-24 py-4 bg-white dark:bg-slate-800/80 border-2 border-indigo-100 dark:border-indigo-500/30 rounded-2xl text-lg font-mono font-bold text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all shadow-inner"
                    />
                    <button 
                      onClick={() => handleProcessBarcode(manualBarcode)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all active:scale-95"
                    >
                      Nhập
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 text-center mt-2 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Hỗ trợ máy quét PDA kết nối USB/Bluetooth.
                  </p>
                </div>
              ) : (
                <div className="relative w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center group">
                  {/* Mô phỏng khung quét Camera */}
                  <div className="absolute inset-8 border-2 border-white/20 rounded-xl pointer-events-none">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>
                  </div>
                  <motion.div 
                    animate={{ y: ["-100%", "200%"] }} 
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute w-full h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10" 
                  />
                  <div className="text-center z-20">
                    <Camera className="w-10 h-10 text-white/30 mx-auto mb-2" />
                    <p className="text-sm font-bold text-white/50">Tính năng Camera đang Tắt</p>
                    <p className="text-xs text-white/30 mt-1 px-4">Tích hợp html5-qrcode tại đây.</p>
                  </div>
                </div>
              )}

              {/* Thông báo lỗi */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-sm font-bold"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{errorMsg}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CỘT PHẢI: DANH SÁCH HÀNG ĐÃ QUÉT */}
            <div className="w-full md:w-7/12 p-6 flex flex-col bg-white dark:bg-transparent h-[400px] md:h-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <PackageSearch className="w-5 h-5 text-emerald-500" /> 
                  Danh sách đã quét
                </h3>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-bold">
                  Tổng: {scannedItems.length} SKUs
                </span>
              </div>

              {/* LIST ITEMS */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                <AnimatePresence>
                  {scannedItems.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center"
                    >
                      <ScanBarcode className="w-12 h-12 mb-3 opacity-50" />
                      <p className="font-bold">Chưa có dữ liệu.</p>
                      <p className="text-sm mt-1">Hãy bắt đầu quét mã vạch để kiểm kê.</p>
                    </motion.div>
                  ) : (
                    scannedItems.map((item) => (
                      <motion.div 
                        key={item.productId}
                        layout
                        initial={{ opacity: 0, scale: 0.95, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 20 }}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">{item.name}</p>
                            <p className="text-xs font-mono text-slate-500 mt-0.5">{item.productCode}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Bộ điều khiển Số lượng */}
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-white/5">
                            <button onClick={() => updateItemQuantity(item.productId, -1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 transition-colors shadow-sm">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-black text-slate-800 dark:text-white text-sm">
                              {item.countedQuantity}
                            </span>
                            <button onClick={() => updateItemQuantity(item.productId, 1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 transition-colors shadow-sm">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          
                          {/* Xóa Item */}
                          <button onClick={() => removeItem(item.productId)} className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* FOOTER & ACTIONS */}
          <div className="p-5 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Trạng thái mạng: <span className="text-emerald-500">Đã kết nối</span>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSyncToServer}
                disabled={isSyncing || scannedItems.length === 0}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
              >
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Đồng bộ Lên hệ thống
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}