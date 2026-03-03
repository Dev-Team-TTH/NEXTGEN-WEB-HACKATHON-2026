"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, QrCode, ScanLine, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

// ==========================================
// COMPONENT: MÁY QUÉT MÃ VẠCH & QR ĐA NĂNG
// Sử dụng Camera thiết bị, có Laser Animation và Haptic Feedback
// ==========================================

interface UniversalScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UniversalScanner({ isOpen, onClose }: UniversalScannerProps) {
  const router = useRouter();
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // --- LOGIC: TẮT MÁY QUÉT AN TOÀN ---
  const stopScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (err) {
      console.error("Lỗi khi tắt Camera:", err);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  // --- LOGIC: XỬ LÝ KHI QUÉT THÀNH CÔNG ---
  const handleScanSuccess = async (decodedText: string) => {
    // 1. Phản hồi xúc giác: Rung điện thoại 200ms (Nếu trình duyệt hỗ trợ)
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(200);
    }

    // 2. Dừng Camera ngay lập tức để tránh quét đúp (Double scan)
    await stopScanner();
    onClose();

    // 3. Routing thông minh dựa trên Tiền tố (Prefix) của Mã QR
    toast.success(`Đã quét mã: ${decodedText}`);
    
    // Giả lập logic điều hướng thông minh của ERP
    if (decodedText.startsWith("PRD-")) {
      // PRD-12345 -> Mở chi tiết Sản phẩm
      router.push(`/inventory/products/${decodedText}`);
    } else if (decodedText.startsWith("AST-")) {
      // AST-9876 -> Mở chi tiết Tài sản
      router.push(`/assets/${decodedText}`);
    } else if (decodedText.startsWith("PO-") || decodedText.startsWith("SO-")) {
      // PO-111 -> Mở chi tiết Đơn hàng
      router.push(`/transactions/${decodedText}`);
    } else {
      // Không rõ định dạng -> Mở trang tìm kiếm tổng
      toast("Mã không đúng chuẩn ERP. Đang chuyển đến trang tìm kiếm...", { icon: '🔍' });
    }
  };

  // --- LOGIC: KHỞI TẠO CAMERA ---
  useEffect(() => {
    if (!isOpen) return;

    setHasPermissionError(false);
    
    // FIX LỖI TYPE: Khai báo thêm verbose: false theo yêu cầu của Html5QrcodeFullConfig
    const html5QrCode = new Html5Qrcode("reader", {
      verbose: false, // Tắt log spam ra console
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128, // Mã vạch chuẩn siêu thị/kho
        Html5QrcodeSupportedFormats.EAN_13,
      ]
    });
    
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // Ưu tiên Camera sau
          {
            fps: 10,                            // Số khung hình quét mỗi giây (10 là tối ưu để không nóng máy)
            qrbox: { width: 250, height: 250 }, // Kích thước vùng lấy nét (Vuông)
            aspectRatio: 1.0,
          },
          (decodedText) => handleScanSuccess(decodedText),
          (errorMessage) => {
            // Bỏ qua lỗi không tìm thấy mã QR trong từng khung hình
          }
        );
      } catch (err) {
        console.error("Lỗi khởi tạo Camera:", err);
        setHasPermissionError(true);
        toast.error("Vui lòng cấp quyền truy cập Camera để quét mã!");
      }
    };

    // Đợi DOM render thẻ div#reader xong mới gọi start
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // --- CẤU HÌNH ANIMATION ---
  const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.3 } }
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="show"
          exit="hidden"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 sm:p-6"
        >
          {/* Nút Đóng (Góc phải trên) */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <motion.div variants={modalVariants} className="w-full max-w-sm flex flex-col items-center">
            
            {/* Header Màn hình quét */}
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4 border border-blue-500/30">
                <QrCode className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">Quét Mã Vật Tư</h2>
              <p className="text-slate-400 text-sm">Hướng camera vào mã QR hoặc Mã vạch để hệ thống tự động nhận diện.</p>
            </div>

            {/* KHU VỰC CAMERA */}
            <div className="relative w-full aspect-square max-w-[300px] mx-auto rounded-3xl overflow-hidden bg-black border border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
              
              {/* Thẻ div chứa luồng video từ Camera */}
              <div id="reader" className="w-full h-full object-cover"></div>

              {/* Lớp Overlay: Viền ngắm (Viewfinder) & Tia Laser */}
              {!hasPermissionError && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {/* Lớp làm mờ viền xung quanh (Tạo hiệu ứng tập trung ở giữa) */}
                  <div className="absolute inset-0 border-[40px] border-black/40"></div>
                  
                  {/* 4 Góc lấy nét */}
                  <div className="absolute top-[40px] left-[40px] w-12 h-12 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg"></div>
                  <div className="absolute top-[40px] right-[40px] w-12 h-12 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-[40px] left-[40px] w-12 h-12 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-[40px] right-[40px] w-12 h-12 border-b-4 border-r-4 border-emerald-500 rounded-br-lg"></div>

                  {/* Tia Laser quét ngang */}
                  <div className="absolute left-[40px] right-[40px] h-0.5 bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.5)] animate-scan-laser"></div>
                </div>
              )}

              {/* Hiển thị khi lỗi quyền Camera */}
              {hasPermissionError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center z-20">
                  <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                  <p className="text-white font-semibold mb-2">Không có quyền Camera</p>
                  <p className="text-xs text-slate-400">Vui lòng kiểm tra lại cài đặt trình duyệt và cấp quyền để sử dụng tính năng này.</p>
                </div>
              )}
            </div>

            {/* Footer Màn hình quét */}
            <div className="mt-8 flex items-center justify-center gap-2 text-emerald-400 font-medium text-sm bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
              <ScanLine className="w-4 h-4" />
              <span>Hệ thống đang sẵn sàng quét</span>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}