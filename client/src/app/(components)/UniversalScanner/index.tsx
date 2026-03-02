"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X, QrCode, Package, MonitorSmartphone, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const UniversalScanner = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Cấu hình khung camera tối ưu cho màn hình điện thoại
    const scanner = new Html5QrcodeScanner(
      "tth-reader",
      { 
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1, 
      },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onClose();
        
        if (decodedText.startsWith("PRD-")) {
          toast.success(`Đã tìm thấy Sản phẩm: ${decodedText}`);
          const id = decodedText.replace("PRD-", "");
          router.push(`/inventory?search=${id}`); 
        } else if (decodedText.startsWith("AST-")) {
          toast.success(`Đã tìm thấy Tài sản: ${decodedText}`);
          const id = decodedText.replace("AST-", "");
          router.push(`/assets?search=${id}`);
        } else {
          toast.error("Mã QR không hợp lệ trong hệ thống TTH TEAM!");
        }
      },
      (error) => {}
    );

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, [isOpen, router, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    /* SỬA h-[100dvh] ĐỂ TRÁNH LỖI THANH CUỘN SAFARI TRÊN MOBILE */
    <div className="fixed inset-0 h-[100dvh] z-[99999] flex flex-col bg-[rgba(15,23,42,0.95)] backdrop-blur-xl transition-all animate-in zoom-in-95 fade-in duration-300 font-sans overflow-hidden">
      
      <style>{`
        #tth-reader { 
          border: none !important; 
          border-radius: 1.25rem !important;
          overflow: hidden !important;
          background: #1e293b; /* Nền xám đen cho khung chờ */
        }
        #tth-reader video {
          object-fit: cover !important;
        }
        #tth-reader__dashboard_section_csr span { color: #9ca3af !important; font-size: 0.875rem; }
        #tth-reader__dashboard_section_swaplink { 
          color: #10b981 !important; text-decoration: none; font-weight: 600; margin-top: 15px; display: inline-block; padding: 10px;
        }
        /* Nút cấp quyền Camera to và dễ bấm hơn trên điện thoại */
        #tth-reader button { 
          background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important; 
          color: white !important; 
          border: none !important; 
          border-radius: 1rem !important; 
          padding: 0.8rem 1.5rem !important; /* Tăng padding */
          margin-top: 1rem !important; 
          font-weight: 600; 
          cursor: pointer; 
          width: 90% !important; /* Mở rộng nút bấm trên mobile */
          max-width: 300px;
          transition: all 0.3s ease !important; 
          font-size: 1rem !important;
        }
        #tth-reader button:active { transform: scale(0.95) !important; }
        
        @keyframes scan-laser {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          50% { box-shadow: 0 0 20px 2px #34d399; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .laser-beam {
          background: linear-gradient(to bottom, rgba(52, 211, 153, 0) 0%, #34d399 50%, rgba(52, 211, 153, 0) 100%);
          animation: scan-laser 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* HEADER - Tăng padding top cho Tai thỏ / Status Bar */}
      <div className="w-full px-4 py-4 pt-6 sm:pt-5 flex justify-between items-center z-10 border-b border-white/10 bg-slate-900/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl shadow-lg">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-base sm:text-lg text-white leading-tight">Quét Mã QR</h2>
            <p className="text-[11px] sm:text-xs text-emerald-400 font-medium">Hệ thống nhận diện TTH</p>
          </div>
        </div>
        {/* Nút Close to hơn cho ngón tay */}
        <button 
          onClick={onClose} 
          className="p-3 bg-white/10 rounded-full text-gray-200 hover:bg-white/20 active:bg-white/30 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* KHU VỰC CAMERA CHÍNH - w-[75vw] Tự co giãn theo màn hình điện thoại */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 w-full h-full">
        <div className="relative w-[75vw] max-w-[280px] sm:max-w-[320px] aspect-square">
          {/* Lớp Overlay 4 góc */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-500 rounded-tl-[1.2rem]"></div>
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-500 rounded-tr-[1.2rem]"></div>
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-500 rounded-bl-[1.2rem]"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-500 rounded-br-[1.2rem]"></div>
            
            <div className="laser-beam absolute left-3 right-3 h-[3px] rounded-full z-20"></div>
          </div>

          <div className="bg-slate-800 rounded-[1.4rem] relative z-0 w-full h-full flex items-center justify-center p-1 border border-slate-700 shadow-2xl">
            <div id="tth-reader" className="w-full h-full rounded-[1.2rem]"></div>
          </div>
        </div>
        
        {/* Trạng thái quét */}
        <div className="mt-8 flex items-center gap-2 bg-emerald-500/15 px-5 py-2.5 rounded-full border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-sm font-medium">Đang tìm kiếm mã QR...</span>
        </div>
      </div>

      {/* BOTTOM SHEET - Thêm padding-bottom (pb-8) để né thanh Home Bar của iPhone */}
      <div className="w-full bg-slate-900 rounded-t-[2rem] px-5 pt-5 pb-8 sm:pb-6 z-10 border-t border-slate-700 shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6"></div>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Card Sản Phẩm */}
          <div className="bg-slate-800/80 p-3.5 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 border border-slate-700 active:bg-slate-700 transition-colors">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            <div className="flex flex-col mt-1">
              <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Sản Phẩm</span>
              <strong className="text-blue-400 font-mono text-[11px] sm:text-xs mt-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">PRD-...</strong>
            </div>
          </div>

          {/* Card Tài Sản */}
          <div className="bg-slate-800/80 p-3.5 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 border border-slate-700 active:bg-slate-700 transition-colors">
             <div className="p-3 bg-orange-500/20 rounded-xl">
              <MonitorSmartphone className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
            </div>
            <div className="flex flex-col mt-1">
              <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Tài Sản</span>
              <strong className="text-orange-400 font-mono text-[11px] sm:text-xs mt-1 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">AST-...</strong>
            </div>
          </div>
        </div>
      </div>

    </div>,
    document.body
  );
};

export default UniversalScanner;