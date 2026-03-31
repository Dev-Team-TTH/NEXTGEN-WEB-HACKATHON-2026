"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ScanLine, ScanBarcode, CheckCircle2, AlertCircle, 
  Trash2, Send, Plus, Minus, Keyboard, Camera, PackageSearch,
  Search, ArrowRight, Loader2, Package, MapPin, Zap, QrCode, Lock
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG: Kéo Context User
import { useBulkStockTakeMutation, useGetProductsQuery, useGetWarehousesQuery } from "@/state/api";

// --- COMPONENTS & UTILS ---
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import { checkUniversalPermission } from "@/app/(components)/RequirePermission"; // 🚀 BỔ SUNG: Engine Phân quyền
import { cn } from "@/utils/helpers";
import { formatVND } from "@/utils/formatters";

// ==========================================
// TÍNH NĂNG ÂM THANH & RUNG (HAPTIC FEEDBACK)
// ==========================================
const playSuccessFeedback = () => {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(100); 
    }
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (err) {
    console.error("Audio API không được hỗ trợ", err);
  }
};

const playErrorFeedback = () => {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]); 
    }
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
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

type ProcessMode = "SINGLE" | "BATCH";
type InputMode = "KEYBOARD" | "CAMERA";

export default function UniversalScanner({ isOpen, onClose, defaultWarehouseId }: UniversalScannerProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // 🚀 BỐI CẢNH QUYỀN HẠN (RBAC ISOLATION)
  const currentUser = useAppSelector((state: any) => state.global?.currentUser);
  const activeBranchId = useAppSelector((state: any) => state.global?.activeBranchId);
  const canManageInventory = checkUniversalPermission(currentUser, ["ADMIN", "MANAGER"], ["MANAGE_INVENTORY", "INVENTORY"]);

  // --- APIs ---
  const { data: productsData } = useGetProductsQuery({ branchId: activeBranchId, limit: 1000 } as any, { skip: !isOpen || !activeBranchId });
  const { data: warehousesData, isLoading: isLoadingWarehouses } = useGetWarehousesQuery({ branchId: activeBranchId } as any, { skip: !isOpen || !activeBranchId });
  const [bulkStockTake, { isLoading: isSyncing }] = useBulkStockTakeMutation();

  const products = Array.isArray(productsData) ? productsData : ((productsData as any)?.data || []);
  const warehouses = Array.isArray(warehousesData) ? warehousesData : ((warehousesData as any)?.data || []);

  // --- STATES LÕI ---
  const [processMode, setProcessMode] = useState<ProcessMode>("SINGLE");
  const [inputMode, setInputMode] = useState<InputMode>("KEYBOARD");
  
  const [warehouseId, setWarehouseId] = useState<string>(defaultWarehouseId || "");
  const [manualBarcode, setManualBarcode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [singleResult, setSingleResult] = useState<any | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  
  const stateRef = useRef({ processMode, products, scannedItems });
  useEffect(() => {
    stateRef.current = { processMode, products, scannedItems };
  }, [processMode, products, scannedItems]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Khóa cuộn trang khi mở Scanner
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (inputMode === "KEYBOARD") setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      document.body.style.overflow = "unset";
      setScannedItems([]);
      setSingleResult(null);
      setManualBarcode("");
      setErrorMsg("");
      setProcessMode("SINGLE"); // Luôn reset về Single để an toàn
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, inputMode]);

  // ==========================================
  // ENGINE: XỬ LÝ MÃ VẠCH
  // ==========================================
  const handleProcessBarcode = useCallback((code: string) => {
    const { processMode, products, scannedItems: currentScannedItems } = stateRef.current;
    
    setErrorMsg("");
    const barcode = code.trim();
    if (!barcode) return;

    if (!activeBranchId) {
      playErrorFeedback();
      setErrorMsg("Bạn chưa chọn Chi nhánh làm việc!");
      return;
    }

    const product = products.find((p: any) => p.productCode.toLowerCase() === barcode.toLowerCase() || p.productId === barcode);

    if (!product) {
      playErrorFeedback();
      setErrorMsg(`Không tìm thấy thông tin cho mã: ${barcode} tại Chi nhánh hiện tại.`);
      setManualBarcode("");
      if (processMode === "SINGLE") setSingleResult(null);
      return;
    }

    playSuccessFeedback();

    if (processMode === "SINGLE") {
      setSingleResult(product);
    } else {
      const existingItemIndex = currentScannedItems.findIndex(item => item.productId === product.productId);
      if (existingItemIndex >= 0) {
        setScannedItems(prev => {
          const updated = [...prev];
          updated[existingItemIndex].countedQuantity += 1;
          return updated;
        });
      } else {
        setScannedItems(prev => [{
          productId: product.productId,
          productCode: product.productCode,
          name: product.name,
          countedQuantity: 1
        }, ...prev]);
      }
    }

    setManualBarcode("");
    if (inputMode === "KEYBOARD") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [inputMode, activeBranchId]);

  // ==========================================
  // ENGINE: HTML5 QR-CODE
  // ==========================================
  const html5QrCodeRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen || inputMode !== "CAMERA") return;

    let isMounted = true;
    let scanTimeout: NodeJS.Timeout;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!isMounted) return;

        if (html5QrCodeRef.current) {
          await html5QrCodeRef.current.stop().catch(() => {});
          html5QrCodeRef.current.clear();
        }

        const html5QrCode = new Html5Qrcode("core-qr-reader");
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, disableFlip: false },
          (decodedText) => {
            if (!isMounted) return;
            handleProcessBarcode(decodedText);
            if (html5QrCodeRef.current?.isScanning) {
              html5QrCodeRef.current.pause();
              scanTimeout = setTimeout(() => {
                if (html5QrCodeRef.current && isMounted) html5QrCodeRef.current.resume();
              }, 1500);
            }
          },
          () => {}
        );
      } catch (err) {
        console.error("Lỗi khởi tạo Camera:", err);
        if (isMounted) setErrorMsg("Không thể bật Camera. Vui lòng cấp quyền trong trình duyệt!");
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      clearTimeout(scanTimeout);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        }).catch(() => {});
      }
    };
  }, [isOpen, inputMode, handleProcessBarcode]);

  // ==========================================
  // HANDLERS UI
  // ==========================================
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessBarcode(manualBarcode);
    }
  };

  const updateItemQuantity = (productId: string, delta: number) => {
    setScannedItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, countedQuantity: Math.max(1, item.countedQuantity + delta) };
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setScannedItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleSyncToServer = async () => {
    if (!warehouseId) return setErrorMsg("Vui lòng chọn Kho để lưu phiếu kiểm kê!");
    if (scannedItems.length === 0) return setErrorMsg("Danh sách kiểm kê đang trống!");

    try {
      // 🚀 Bơm Context Chi nhánh vào Payload
      await bulkStockTake({
        branchId: activeBranchId,
        warehouseId,
        note: "Kiểm kê tự động qua thiết bị Di động",
        items: scannedItems.map(item => ({
          productId: item.productId,
          countedQuantity: item.countedQuantity
        }))
      }).unwrap();

      toast.success("Đã đồng bộ phiếu kiểm kê lên hệ thống ERP!");
      onClose();
    } catch (error: any) {
      setErrorMsg(error.data?.message || "Lỗi khi đồng bộ kiểm kê.");
      playErrorFeedback();
    }
  };

  // Các Quick Actions cho Single Mode (Khác biệt hoàn toàn so với Search)
  const handleGoToDetail = () => {
    if (singleResult) {
      onClose();
      router.push(`/inventory?search=${singleResult.productCode}`);
    }
  };

  const handlePushToBatch = () => {
    // 🚀 CHẶN CHỨC NĂNG PUSH TO BATCH NẾU KHÔNG CÓ QUYỀN
    if (!canManageInventory) {
      playErrorFeedback();
      setErrorMsg("Lỗi Bảo mật: Bạn không được phân quyền Kiểm kê kho!");
      return;
    }

    if (singleResult) {
      setScannedItems([{
        productId: singleResult.productId,
        productCode: singleResult.productCode,
        name: singleResult.name,
        countedQuantity: 1
      }, ...scannedItems]);
      setProcessMode("BATCH");
      setSingleResult(null);
    }
  };

  // 🚀 HANDLER ĐỔI CHẾ ĐỘ ĐƯỢC BẢO VỆ
  const handleModeChange = (mode: ProcessMode) => {
    if (mode === "BATCH" && !canManageInventory) {
      playErrorFeedback();
      setErrorMsg("Bạn cần quyền Quản lý Kho (MANAGE_INVENTORY) để thực hiện Kiểm kê!");
      return;
    }
    setProcessMode(mode);
    setErrorMsg("");
  };

  const batchColumns: ColumnDef<ScannedItem>[] = [
    {
      header: "Sản phẩm / Hàng hóa",
      accessorKey: "name",
      cell: (row) => (
        <div className="flex flex-col max-w-[150px] sm:max-w-[200px]">
          <span className="font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">{row.name}</span>
          <span className="text-[10px] font-mono text-slate-500 mt-0.5">{row.productCode}</span>
        </div>
      )
    },
    {
      header: "Đếm",
      accessorKey: "countedQuantity",
      align: "center",
      cell: (row) => (
        <div className="flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 w-fit mx-auto">
          <button onClick={() => updateItemQuantity(row.productId, -1)} className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors active:scale-95"><Minus className="w-3 h-3 sm:w-4 sm:h-4" /></button>
          <span className="w-6 sm:w-8 text-center font-black text-amber-600 dark:text-amber-500 text-sm sm:text-base">{row.countedQuantity}</span>
          <button onClick={() => updateItemQuantity(row.productId, 1)} className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors active:scale-95"><Plus className="w-3 h-3 sm:w-4 sm:h-4" /></button>
        </div>
      )
    },
    {
      header: "Bỏ",
      accessorKey: "actions",
      align: "right",
      cell: (row) => (
        <button onClick={() => removeItem(row.productId)} className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 rounded-xl transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  if (!mounted) return null;

  // 👉 REACT PORTAL: Bứng Scanner đè lên TẤT CẢ mọi thứ trong DOM
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 250 }}
          className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col h-[100dvh] w-screen overflow-hidden m-0 p-0"
        >
          <style dangerouslySetInnerHTML={{__html: `
            #core-qr-reader { border: none !important; width: 100% !important; height: 100% !important; }
            #core-qr-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
            #core-qr-reader__dashboard_section_csr span { display: none !important; }
            #core-qr-reader__dashboard_section_swaplink { display: none !important; }
          `}} />

          {/* 🚀 TOP NAVBAR */}
          <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-950 text-white shrink-0 border-b border-white/10 z-50 shadow-md transition-colors duration-500">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-rose-500/80 rounded-full transition-colors active:scale-95">
                <X className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors duration-500">
                <ScanBarcode className="w-4 h-4" />
                <span className="font-bold text-sm">Universal Scanner</span>
              </div>
            </div>

            {/* TABS CHUYỂN CHẾ ĐỘ TRUNG TÂM */}
            <div className="flex p-1 bg-white/10 rounded-xl border border-white/5 transition-colors duration-500">
              <button 
                onClick={() => handleModeChange("SINGLE")}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors z-10",
                  processMode === "SINGLE" ? "text-white" : "text-white/50"
                )}
              >
                {processMode === "SINGLE" && <motion.div layoutId="modeTab" className="absolute inset-0 bg-indigo-600 shadow-sm rounded-lg -z-10 transition-colors duration-500" />}
                <Search className="w-3.5 h-3.5" /> Tra cứu
              </button>
              
              {/* 🚀 UI BẢO VỆ: KHÓA NÚT KIỂM KÊ NẾU KHÔNG CÓ QUYỀN */}
              <button 
                onClick={() => handleModeChange("BATCH")}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors z-10",
                  processMode === "BATCH" ? "text-white" : "text-white/50",
                  !canManageInventory && "opacity-50"
                )}
              >
                {processMode === "BATCH" && <motion.div layoutId="modeTab" className="absolute inset-0 bg-amber-600 shadow-sm rounded-lg -z-10 transition-colors duration-500" />}
                {!canManageInventory ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <PackageSearch className="w-3.5 h-3.5" />}
                Kiểm kê
              </button>
            </div>

            <div className="flex items-center">
              <div className="flex p-1 bg-white/10 rounded-xl border border-white/5 transition-colors duration-500">
                <button onClick={() => setInputMode("KEYBOARD")} className={cn("p-2 rounded-lg transition-all", inputMode === "KEYBOARD" ? "bg-white/20 text-white" : "text-white/50")}>
                  <Keyboard className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button onClick={() => setInputMode("CAMERA")} className={cn("p-2 rounded-lg transition-all", inputMode === "CAMERA" ? "bg-white/20 text-white" : "text-white/50")}>
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* 🚀 BỐ CỤC CHÍNH ĐỘNG */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative transition-colors duration-500">
            
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay z-0" />
            
            {/* CỘT 1: KHU VỰC QUÉT */}
            <div className="h-[45%] lg:h-full lg:w-[45%] bg-[#05080f] flex flex-col items-center justify-center relative shrink-0 z-0 border-b lg:border-b-0 lg:border-r border-white/10 transition-colors duration-500">
              
              {inputMode === "KEYBOARD" ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 relative transition-colors duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 blur-3xl pointer-events-none transition-colors duration-500" />
                  <div className="w-full max-w-sm relative z-10 transition-colors duration-500">
                    <div className="relative bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-2 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.2)] transition-colors duration-500">
                      <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 text-indigo-500 opacity-50 transition-colors duration-500" />
                      <input 
                        ref={inputRef}
                        type="text"
                        placeholder="MÃ VẠCH (BARCODE)"
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full pl-16 pr-6 py-12 text-2xl sm:text-4xl font-black text-center uppercase tracking-widest bg-transparent border-none outline-none text-white placeholder-slate-700 transition-colors duration-500"
                      />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-4 text-[10px] font-bold text-indigo-400 flex items-center gap-2 tracking-widest transition-colors duration-500">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_#6366f1] transition-colors duration-500" /> ĐANG LẮNG NGHE PDA...
                      </motion.div>
                    </div>
                  </div>
                  <p className="mt-8 text-sm font-semibold text-slate-500 flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full transition-colors duration-500">
                    <Zap className="w-4 h-4 text-amber-500 transition-colors duration-500" /> Sẵn sàng nhận tín hiệu Súng bắn mã vạch
                  </p>
                </div>
              ) : (
                <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden transition-colors duration-500">
                  <div id="core-qr-reader" className="absolute inset-0 w-full h-full z-0 transition-colors duration-500" />
                  
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-colors duration-500">
                     <div className="absolute inset-0 bg-black/40 transition-colors duration-500" style={{ maskImage: 'radial-gradient(circle, transparent 20%, black 80%)', WebkitMaskImage: 'radial-gradient(circle, transparent 20%, black 80%)' }}></div>
                     
                     <div className="relative w-56 h-56 sm:w-72 sm:h-72 border-2 border-white/20 rounded-3xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-colors duration-500">
                       <motion.div 
                         animate={{ top: ["0%", "100%", "0%"] }} 
                         transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                         className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_20px_5px_rgba(52,211,153,0.8)] transition-colors duration-500" 
                       />
                       <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-500 rounded-tl-3xl transition-colors duration-500" />
                       <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-500 rounded-tr-3xl transition-colors duration-500" />
                       <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-500 rounded-bl-3xl transition-colors duration-500" />
                       <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-500 rounded-br-3xl transition-colors duration-500" />
                     </div>
                  </div>
                  
                  <div className="absolute bottom-6 text-center w-full z-30 flex justify-center transition-colors duration-500">
                    <p className="text-white/90 font-bold text-xs bg-black/60 px-5 py-2 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2 transition-colors duration-500">
                      <Camera className="w-4 h-4 transition-colors duration-500"/> Đưa mã vạch vào khung hình
                    </p>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {errorMsg && (
                  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-6 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 p-4 bg-rose-600/90 backdrop-blur-md text-white rounded-2xl flex items-start gap-3 font-bold shadow-2xl z-50 transition-colors duration-500">
                    <AlertCircle className="w-6 h-6 shrink-0 transition-colors duration-500" />
                    <p className="text-sm leading-tight transition-colors duration-500">{errorMsg}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CỘT 2: KẾT QUẢ */}
            <div className="flex-1 lg:w-[55%] flex flex-col bg-slate-50 dark:bg-slate-900 rounded-t-3xl lg:rounded-none relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] lg:shadow-none overflow-hidden mt-[-20px] lg:mt-0 transition-colors duration-500">
              
              <div className="w-full flex justify-center pt-3 pb-1 lg:hidden transition-colors duration-500">
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full transition-colors duration-500" />
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 pt-2 transition-colors duration-500">
                <AnimatePresence mode="wait">
                  
                  {/* >>> SINGLE: TRA CỨU & HÀNH ĐỘNG NHANH <<< */}
                  {processMode === "SINGLE" && (
                    <motion.div key="single" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex flex-col items-center justify-center transition-colors duration-500">
                      {!singleResult ? (
                        <div className="flex flex-col items-center text-center text-slate-400 dark:text-slate-600 transition-colors duration-500">
                          <ScanBarcode className="w-20 h-20 sm:w-32 sm:h-32 mb-4 sm:mb-6 opacity-20 transition-colors duration-500" />
                          <p className="text-xl sm:text-2xl font-black text-slate-500 transition-colors duration-500">Chờ Dữ Liệu</p>
                          <p className="text-sm font-medium mt-2 max-w-[250px] transition-colors duration-500">Quét mã vạch để phân tích nghiệp vụ tại đây.</p>
                        </div>
                      ) : (
                        <div className="w-full max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-3xl shadow-xl p-6 sm:p-8 relative overflow-hidden group transition-colors duration-500">
                          
                          <div className="flex flex-col items-center text-center gap-4 sm:gap-6 relative z-10 transition-colors duration-500">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-slate-100 dark:bg-slate-900 border-4 border-white dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-lg transition-colors duration-500">
                              {singleResult.imageUrl ? (
                                <img src={singleResult.imageUrl} alt="Product" className="w-full h-full object-cover transition-colors duration-500" />
                              ) : (
                                <Package className="w-16 h-16 text-slate-400 transition-colors duration-500" />
                              )}
                            </div>
                            
                            <div className="w-full transition-colors duration-500">
                              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 dark:border-indigo-500/30 mb-2 inline-block transition-colors duration-500">Khớp dữ liệu</span>
                              <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-2 transition-colors duration-500">{singleResult.name}</h3>
                              <p className="text-xs sm:text-sm font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg w-fit mx-auto border border-slate-200 dark:border-slate-700 transition-colors duration-500">SKU: {singleResult.productCode}</p>
                            </div>
                            
                            <div className="w-full grid grid-cols-2 gap-3 sm:gap-4 transition-colors duration-500">
                              <div className="p-4 sm:p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl transition-colors duration-500">
                                <p className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1 transition-colors duration-500">Giá bán</p>
                                <p className="text-lg sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 truncate transition-colors duration-500">{formatVND(singleResult.price)}</p>
                              </div>
                              <div className="p-4 sm:p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-2xl transition-colors duration-500">
                                <p className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-1 transition-colors duration-500">Tồn kho</p>
                                <p className="text-lg sm:text-2xl font-black text-blue-700 dark:text-blue-400 transition-colors duration-500">{singleResult.totalStock || 0} <span className="text-sm font-semibold opacity-70 transition-colors duration-500">SP</span></p>
                              </div>
                            </div>

                            {/* QUICK ACTIONS DÀNH RIÊNG CHO SCANNER */}
                            <div className="w-full grid grid-cols-2 gap-3 mt-2 border-t border-slate-100 dark:border-slate-700/50 pt-4 transition-colors duration-500">
                              <button onClick={handlePushToBatch} className={cn("flex items-center justify-center gap-2 px-4 py-3 font-bold rounded-xl transition-all shadow-sm text-xs sm:text-sm duration-500", canManageInventory ? "bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 active:scale-95" : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-60")}>
                                {!canManageInventory ? <Lock className="w-4 h-4" /> : <PackageSearch className="w-4 h-4" />} Đưa vào Kiểm kê
                              </button>
                              <button onClick={() => {toast.error("Tính năng IN TEM đang cập nhật");}} className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all active:scale-95 shadow-sm text-xs sm:text-sm duration-500">
                                <QrCode className="w-4 h-4 transition-colors duration-500" /> In mã vạch này
                              </button>
                            </div>

                            <button onClick={handleGoToDetail} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl transition-all active:scale-95 shadow-md duration-500">
                              Mở hồ sơ chi tiết kho <ArrowRight className="w-5 h-5 transition-colors duration-500" />
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* >>> BATCH: KIỂM KÊ VÀ ĐỒNG BỘ <<< */}
                  {processMode === "BATCH" && canManageInventory && (
                    <motion.div key="batch" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex flex-col gap-4 transition-colors duration-500">
                      
                      <div className="bg-amber-50 dark:bg-amber-500/10 p-4 sm:p-5 rounded-2xl border border-amber-200 dark:border-amber-500/30 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors duration-500">
                        <div className="w-full sm:w-1/2 transition-colors duration-500">
                          <label className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-1.5 flex items-center gap-1 transition-colors duration-500"><MapPin className="w-3.5 h-3.5 transition-colors duration-500"/> Chọn Kho áp dụng</label>
                          <select 
                            value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={isLoadingWarehouses}
                            className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/50 p-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 shadow-sm transition-colors duration-500"
                          >
                            <option value="">-- Bắt buộc chọn Kho --</option>
                            {warehouses.map((w: any) => <option key={w.warehouseId} value={w.warehouseId}>{w.code} - {w.name}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center justify-between w-full sm:w-auto p-3 sm:p-0 bg-white sm:bg-transparent dark:bg-slate-900 sm:dark:bg-transparent rounded-xl border sm:border-none border-amber-200 dark:border-amber-500/30 transition-colors duration-500">
                           <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest sm:mb-1 transition-colors duration-500">Tổng mã đếm</span>
                           <span className="text-2xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 leading-none transition-colors duration-500">{scannedItems.length}</span>
                        </div>
                      </div>

                      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[250px] relative z-10 transition-colors duration-500">
                        {scannedItems.length === 0 ? (
                           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8 text-center transition-colors duration-500">
                             <ScanBarcode className="w-16 h-16 sm:w-20 sm:h-20 mb-3 opacity-20 transition-colors duration-500" />
                             <p className="font-bold text-base sm:text-lg text-slate-500 transition-colors duration-500">Chưa có mã vạch nào</p>
                             <p className="text-xs sm:text-sm mt-1 max-w-[250px] transition-colors duration-500">Hãy quét mã vạch để tự động nạp dữ liệu kiểm kê vào bảng này.</p>
                           </div>
                        ) : (
                          <DataTable 
                            data={scannedItems} 
                            columns={batchColumns} 
                            itemsPerPage={10} 
                          />
                        )}
                      </div>

                      <button 
                        onClick={handleSyncToServer} disabled={isSyncing || scannedItems.length === 0 || !warehouseId}
                        className="w-full shrink-0 flex items-center justify-center gap-2 sm:gap-3 px-6 py-4 sm:py-5 bg-amber-500 hover:bg-amber-600 text-white font-black text-lg sm:text-xl rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_10px_20px_rgba(245,158,11,0.3)] mb-4 sm:mb-0 duration-500"
                      >
                        {isSyncing ? <Loader2 className="w-6 h-6 animate-spin transition-colors duration-500" /> : <Send className="w-6 h-6 sm:w-7 sm:h-7 transition-colors duration-500" />}
                        ĐỒNG BỘ LÊN HỆ THỐNG
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}