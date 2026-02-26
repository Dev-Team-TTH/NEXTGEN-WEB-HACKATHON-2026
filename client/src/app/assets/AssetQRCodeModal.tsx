"use client";

import React from "react";
import { X, Printer, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { QRCodeCanvas } from "qrcode.react"; // Dùng thư viện thay vì API

type AssetQRCodeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
};

const AssetQRCodeModal = ({ isOpen, onClose, asset }: AssetQRCodeModalProps) => {
  if (!isOpen || !asset) return null;

  const qrValue = `ASSET_ID:${asset.assetId} | NAME:${asset.name} | CATEGORY:${asset.category}`;

  // HÀM IN TEM THẬT
  const handlePrint = () => {
    // Trích xuất ảnh từ QR Canvas
    const canvas = document.getElementById("qr-canvas-asset") as HTMLCanvasElement;
    if (!canvas) return;
    const qrImageUrl = canvas.toDataURL("image/png");

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) {
      toast.error("Trình duyệt đã chặn Popup. Vui lòng cấp quyền!");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>In Tem Tài Sản - ${asset.assetId.substring(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; padding: 20px; background: #fff; margin: 0; }
            .ticket { text-align: center; border: 2px dashed #333; padding: 25px; width: 280px; border-radius: 12px; }
            .qr-image { width: 160px; height: 160px; margin-bottom: 15px; }
            h3 { margin: 0 0 5px 0; font-size: 18px; text-transform: uppercase; color: #000; line-height: 1.2; }
            p { margin: 0 0 15px 0; font-size: 14px; color: #555; font-weight: bold; }
            .id-box { background: #f4f4f4; padding: 8px; border-radius: 6px; font-family: monospace; font-weight: bold; font-size: 13px; color: #000; letter-spacing: 1px;}
            .footer { margin-top: 15px; font-size: 11px; font-weight: bold; border-top: 1px dashed #ccc; padding-top: 12px; color: #2e7d32; text-transform: uppercase; }
            
            @media print {
              body { padding: 0; }
              .ticket { border: none; width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <img src="${qrImageUrl}" class="qr-image" />
            <h3>${asset.name}</h3>
            <p>${asset.category}</p>
            <div class="id-box">ID: ${asset.assetId.split('-')[0].toUpperCase()}</div>
            <div class="footer">✓ TÀI SẢN DOANH NGHIỆP</div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden text-center animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-purple-50">
          <h2 className="text-lg font-bold flex items-center gap-2 text-purple-800">
            Tem Định Danh Tài Sản
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-white rounded-full transition-colors shadow-sm hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-8 pb-4 flex flex-col items-center bg-gray-50">
          <div className="border-2 border-dashed border-gray-300 p-6 rounded-xl flex flex-col items-center justify-center bg-white shadow-md w-full relative overflow-hidden">
            
            <div className="bg-white p-2 border border-gray-100 rounded-xl shadow-sm mb-4">
              {/* TẠO MÃ QR BẰNG CANVAS (Thư viện nội bộ) */}
              <QRCodeCanvas 
                id="qr-canvas-asset"
                value={qrValue} 
                size={140} 
                level={"H"} 
              />
            </div>
            
            <h3 className="font-black text-xl text-gray-900 mb-1 leading-tight uppercase line-clamp-2">{asset.name}</h3>
            <p className="text-sm font-bold text-gray-500 mb-4">{asset.category}</p>
            
            <div className="bg-gray-50 px-5 py-2.5 rounded-xl font-mono text-sm text-gray-700 font-bold border border-gray-200 tracking-wider w-full shadow-inner">
              ID: {asset.assetId.split('-')[0].toUpperCase()}
            </div>
            
            <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 uppercase tracking-widest w-full">
              <ShieldCheck className="w-3.5 h-3.5"/> Tài sản doanh nghiệp
            </div>
          </div>
          
          <p className="text-xs text-gray-400 mt-5 italic">Dán tem này lên thân thiết bị để tra cứu nhanh thông tin bằng Camera điện thoại.</p>
        </div>

        {/* FOOTER */}
        <div className="p-5 flex gap-3 border-t border-gray-100 bg-white">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-50 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-sm active:scale-95">
            Đóng
          </button>
          <button onClick={handlePrint} className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors flex justify-center items-center gap-2 shadow-md active:scale-95">
            <Printer className="w-4 h-4"/> In Tem Ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetQRCodeModal;