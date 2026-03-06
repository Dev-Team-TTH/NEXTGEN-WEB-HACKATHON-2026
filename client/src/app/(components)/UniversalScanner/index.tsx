"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  X, ScanLine, AlertCircle, Maximize, 
  Zap, ZapOff, SwitchCamera, ImagePlus, Loader2
} from "lucide-react";
import toast from "react-hot-toast";

// --- REDUX ---
import { useAppDispatch } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";

// ==========================================
// COMPONENT: ENTERPRISE UNIVERSAL SCANNER
// Tích hợp: Đèn Flash, Đảo Camera, Quét từ Ảnh, React Portal
// ==========================================

interface UniversalScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UniversalScanner({ isOpen, onClose }: UniversalScannerProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // --- STATES ---
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [hasPermissionError, setHasPermissionError] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
  
  // --- REFS ---
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo Portal an toàn trên Client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Thu gọn Sidebar ngay khi mở máy quét để trả lại không gian thao tác
  useEffect(() => {
    if (isOpen) {
      dispatch(setIsSidebarCollapsed(true));
    }
  }, [isOpen, dispatch]);

  // --- LOGIC: KHỞI TẠO VÀ QUẢN LÝ CAMERA ---
  useEffect(() => {
    if (!isOpen) return;

    let isComponentMounted = true;
    setHasPermissionError(false);
    setIsFlashOn(false); // Reset trạng thái flash mỗi lần khởi tạo lại
    
    const html5QrCode = new Html5Qrcode("reader", {
      verbose: false, // Tắt log rác của thư viện
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.EAN_13,
      ]
    });
    
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: facingMode }, 
          {
            fps: 15, // Khung hình chuẩn để không gây nóng máy
            qrbox: { width: 280, height: 280 }, // Kích thước lõi nhận diện
            aspectRatio: 1.0,
          },
          (decodedText) => handleScanSuccess(decodedText),
          () => {} // Bỏ qua các cảnh báo không tìm thấy mã trong khung hình
        );
      } catch (error) {
        console.error("Lỗi khởi tạo thiết bị quang học:", error);
        if (isComponentMounted) setHasPermissionError(true);
      }
    };

    // Độ trễ nhỏ để DOM render xong thẻ <div id="reader">
    const timer = setTimeout(() => {
      if (isComponentMounted) startScanner();
    }, 350);

    // Cleanup Function: Hủy luồng Camera khi Component Unmount hoặc Đổi Camera
    return () => {
      isComponentMounted = false;
      clearTimeout(timer);
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
      }
    };
    // Re-run effect khi người dùng đảo chiều Camera (facingMode thay đổi)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facingMode]);

  // --- LOGIC: ĐIỀU KHIỂN PHẦN CỨNG (FLASH & SWITCH CAMERA) ---
  const toggleFlash = async () => {
    try {
      const videoElement = document.querySelector("#reader video") as HTMLVideoElement;
      if (!videoElement || !videoElement.srcObject) {
        toast.error("Luồng camera chưa sẵn sàng.");
        return;
      }
      const stream = videoElement.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      
      // FIX LỖI TYPESCRIPT: Ép kiểu (Type Casting) để tương thích với W3C Image Capture API
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };

      // Kiểm tra tính tương thích của phần cứng
      if (capabilities.torch) {
        await track.applyConstraints({
          // Ép kiểu 'any' cho object advanced để vượt qua strict check của TS cho thuộc tính torch
          advanced: [{ torch: !isFlashOn } as any]
        });
        setIsFlashOn(!isFlashOn);
      } else {
        toast.error("Thiết bị hoặc trình duyệt không hỗ trợ điều khiển Đèn Flash.");
      }
    } catch (error) {
      console.error("Lỗi điều khiển Flash:", error);
      toast.error("Không thể can thiệp vào phần cứng Đèn Flash.");
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  // --- LOGIC: XỬ LÝ ẢNH TẢI LÊN ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Đảm bảo có instance để giải mã
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader", { verbose: false });
      }
      
      const decodedText = await scannerRef.current.scanFile(file, true);
      await handleScanSuccess(decodedText);
    } catch (error) {
      toast.error("Hệ thống không tìm thấy mã chuẩn nào trong hình ảnh này.");
      setIsProcessing(false);
    }

    // Reset ô input để có thể chọn lại cùng một ảnh nếu cần
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- LOGIC: NGHIỆP VỤ SAU KHI QUÉT ---
  const stopScannerSafe = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (error) {
      console.error("Lỗi đóng băng thiết bị:", error);
    }
  };

  const handleClose = async () => {
    await stopScannerSafe();
    onClose();
    setTimeout(() => {
      setIsProcessing(false);
      setIsFlashOn(false);
    }, 500);
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Haptic Feedback
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([200, 100, 200]);
    }

    await stopScannerSafe();
    onClose();

    toast.success(`Mã định danh: ${decodedText}`);
    
    // Routing ERP
    setTimeout(() => {
      if (decodedText.startsWith("PRD-")) {
        router.push(`/inventory/products/${decodedText}`);
      } else if (decodedText.startsWith("AST-")) {
        router.push(`/assets/${decodedText}`);
      } else if (decodedText.startsWith("PO-") || decodedText.startsWith("SO-")) {
        router.push(`/transactions/${decodedText}`);
      } else {
        toast.error("Định dạng mã không thuộc phân hệ của hệ thống.");
        document.getElementById('global-search')?.focus();
      }
      setIsProcessing(false);
      setIsFlashOn(false);
    }, 300);
  };

  // --- HOẠT ẢNH ---
  const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } }
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  if (!isMounted) return null;

  // Render thông qua Portal để đè lên mọi lớp Z-Index của layout hiện tại
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="show"
          exit="hidden"
          className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/95 backdrop-blur-md overflow-hidden font-sans"
        >
          {/* CSS Ghi đè UI rác của thư viện, KHÔNG làm tối vùng trung tâm */}
          <style>{`
            #reader { border: none !important; background: transparent; overflow: hidden; border-radius: 24px; position: relative; width: 100% !important; }
            #reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; border-radius: 24px !important; }
            #reader img, #reader span, #reader a, #reader button, #reader select, #reader div:not(video) { display: none !important; opacity: 0 !important; pointer-events: none !important; }
            #qr-shaded-region { display: none !important; }
          `}</style>

          {/* HEADER ĐIỀU KHIỂN CHÍNH */}
          <div className="absolute top-0 left-0 right-0 p-5 sm:p-6 flex justify-between items-start z-50 bg-gradient-to-b from-slate-900/80 to-transparent">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-md rounded-full border border-emerald-500/30 w-fit">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">Scanner Active</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight ml-1">Định vị Mã vạch</h2>
            </div>
            
            <button
              onClick={handleClose}
              className="flex items-center justify-center p-3 bg-white/10 hover:bg-rose-500/80 text-white rounded-full transition-all duration-300 border border-white/20 active:scale-90"
              title="Đóng hệ thống quét"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* KHU VỰC HIỂN THỊ CAMERA CHÍNH */}
          <motion.div variants={modalVariants} className="flex-1 w-full flex flex-col items-center justify-center relative z-10 px-4 sm:px-8 mt-10 mb-24 sm:mb-32">
            
            <div className="relative w-full max-w-sm aspect-[3/4] sm:aspect-square mx-auto rounded-[32px] overflow-hidden bg-black border-2 border-slate-700/50 shadow-[0_20px_60px_rgba(0,0,0,0.8)] transform-gpu">
              
              <div id="reader" className="w-full h-full object-cover" />

              {/* HUD VIEWFIENDER SÁNG SỦA */}
              {!hasPermissionError && (
                <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                  {/* Bốn góc tiêu cự ngắm */}
                  <div className="absolute top-[15%] left-[15%] w-12 h-12 border-t-[4px] border-l-[4px] border-emerald-400 rounded-tl-2xl shadow-[-2px_-2px_12px_rgba(52,211,153,0.4)]" />
                  <div className="absolute top-[15%] right-[15%] w-12 h-12 border-t-[4px] border-r-[4px] border-emerald-400 rounded-tr-2xl shadow-[2px_-2px_12px_rgba(52,211,153,0.4)]" />
                  <div className="absolute bottom-[15%] left-[15%] w-12 h-12 border-b-[4px] border-l-[4px] border-emerald-400 rounded-bl-2xl shadow-[-2px_2px_12px_rgba(52,211,153,0.4)]" />
                  <div className="absolute bottom-[15%] right-[15%] w-12 h-12 border-b-[4px] border-r-[4px] border-emerald-400 rounded-br-2xl shadow-[2px_2px_12px_rgba(52,211,153,0.4)]" />

                  {/* Thanh tia Laser quét ngang */}
                  <motion.div 
                    animate={{ top: ["20%", "80%", "20%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-[10%] right-[10%] h-[1.5px] bg-emerald-400 shadow-[0_0_12px_3px_rgba(52,211,153,0.8)] z-30"
                  />
                  
                  {/* Điểm Focus trung tâm */}
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(52,211,153,1)] opacity-70" />
                </div>
              )}

              {/* Màn hình thông báo ngoại lệ (Lỗi Camera) */}
              {hasPermissionError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-8 text-center z-30">
                  <AlertCircle className="w-14 h-14 text-rose-500 mb-4" />
                  <p className="text-white font-bold text-lg mb-2">Không có tín hiệu thiết bị</p>
                  <p className="text-sm text-slate-400 leading-relaxed">Trình duyệt đã từ chối quyền truy cập Camera. Vui lòng cấp quyền trong cài đặt trang web để sử dụng tính năng này.</p>
                </div>
              )}

              {/* Màn hình trạng thái xử lý dữ liệu */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm z-40"
                  >
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
                    <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Đang xử lý dữ liệu...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
          </motion.div>

          {/* BOTTOM CONTROL BAR (ERGONOMIC UI) */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 bg-gradient-to-t from-black via-black/80 to-transparent z-50 pb-[env(safe-area-inset-bottom)] flex justify-center">
            
            <div className="flex items-center gap-4 sm:gap-6 bg-white/10 backdrop-blur-xl border border-white/15 p-2 sm:p-3 rounded-[2rem] shadow-2xl">
              
              {/* Nút 1: Tải ảnh lên (Import Image) */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-2xl hover:bg-white/10 transition-colors active:scale-95 w-[4.5rem] sm:w-20"
              >
                <ImagePlus className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                <span className="text-[10px] font-bold text-slate-300">Tải ảnh</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </button>

              {/* Nút 2: Bật/Tắt Flash (Torch) */}
              <button 
                onClick={toggleFlash}
                disabled={hasPermissionError}
                className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-2xl transition-colors active:scale-95 w-[4.5rem] sm:w-20 ${isFlashOn ? "bg-amber-400 text-slate-900" : "hover:bg-white/10 text-white disabled:opacity-50"}`}
              >
                {isFlashOn ? <Zap className="w-6 h-6 sm:w-7 sm:h-7" /> : <ZapOff className="w-6 h-6 sm:w-7 sm:h-7 text-slate-300" />}
                <span className={`text-[10px] font-bold ${isFlashOn ? "text-slate-900" : "text-slate-300"}`}>Đèn Flash</span>
              </button>

              {/* Nút 3: Đảo Camera (Switch Camera) */}
              <button 
                onClick={switchCamera}
                disabled={hasPermissionError}
                className="flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-2xl hover:bg-white/10 transition-colors active:scale-95 text-white w-[4.5rem] sm:w-20 disabled:opacity-50"
              >
                <SwitchCamera className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                <span className="text-[10px] font-bold text-slate-300">Đảo cam</span>
              </button>

            </div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}