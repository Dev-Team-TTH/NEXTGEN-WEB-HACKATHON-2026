"use client";

import { X, QrCode, Printer, Download, Box } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { QRCodeCanvas } from "qrcode.react"; // Dùng thư viện thay vì API

const QRCodeModal = ({ isOpen, onClose, product, onPrint }: any) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !product) return null;

  // TÍNH NĂNG 1: TẢI ẢNH QR XUỐNG MÁY (Trực tiếp từ Canvas, cực nhanh)
  const handleDownload = () => {
    try {
      setIsDownloading(true);
      const canvas = document.getElementById("qr-canvas-inventory") as HTMLCanvasElement;
      if (!canvas) throw new Error("Canvas không tồn tại");
      
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_${product.productId.substring(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success("Đã tải mã QR về máy!");
    } catch (error) {
      toast.error("Lỗi khi tải ảnh. Vui lòng thử lại!");
    } finally {
      setIsDownloading(false);
    }
  };

  // TÍNH NĂNG 2: IN TEM TRỰC TIẾP
  const handleRealPrint = () => {
    // Trích xuất ảnh từ QR Canvas
    const canvas = document.getElementById("qr-canvas-inventory") as HTMLCanvasElement;
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
          <title>In Tem Nhãn - ${product.name}</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; padding: 20px; background: #f9fafb; margin: 0; }
            .label-card { background: white; border: 2px dashed #888; width: 320px; border-radius: 8px; overflow: hidden; }
            .label-header { background: #000; color: #fff; text-align: center; padding: 8px; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
            .label-body { padding: 24px; display: flex; flex-direction: column; align-items: center; }
            .qr-image { width: 180px; height: 180px; margin-bottom: 15px; }
            .product-name { font-size: 18px; font-weight: 900; text-align: center; text-transform: uppercase; margin: 0 0 15px 0; color: #111; line-height: 1.3; }
            .divider { width: 100%; border-top: 2px dotted #ccc; margin: 0 0 12px 0; }
            .info-row { display: flex; justify-content: space-between; width: 100%; margin-bottom: 6px; font-size: 14px; }
            .info-label { color: #555; font-weight: bold; }
            .info-value { font-weight: bold; color: #000; font-family: monospace; }
            
            @media print {
              body { background: white; padding: 0; display: block; }
              .label-card { border: none; width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="label-header">KHO DOANH NGHIỆP</div>
            <div class="label-body">
              <img src="${qrImageUrl}" class="qr-image" />
              <h3 class="product-name">${product.name}</h3>
              <div class="divider"></div>
              <div class="info-row">
                <span class="info-label">SKU:</span>
                <span class="info-value">${product.productId.substring(0, 12)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">ĐƠN GIÁ:</span>
                <span class="info-value">$${product.price.toFixed(2)} / ${product.baseUnit || 'Cái'}</span>
              </div>
            </div>
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
    if(onPrint) onPrint(); 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 transition-all">
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20">
          <h2 className="text-xl font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2">
            <QrCode className="w-5 h-5" /> Trình Quản lý Tem Nhãn
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white dark:bg-gray-700 rounded-full shadow-sm transition-all hover:bg-gray-100 dark:hover:bg-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* KHU VỰC HIỂN THỊ TEM NHÃN MÔ PHỎNG VẬT LÝ */}
        <div className="p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="bg-white p-5 rounded-xl shadow-md border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center w-full relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
              <Box className="w-3 h-3" /> SKU Tag
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-100 mt-2 mb-4">
              {/* TẠO MÃ QR BẰNG CANVAS (Thư viện nội bộ) */}
              <QRCodeCanvas 
                id="qr-canvas-inventory"
                value={product.productId} 
                size={160} 
                level={"H"} 
              />
            </div>
            
            <h3 className="text-lg font-black text-gray-900 text-center uppercase leading-tight line-clamp-2 w-full">
              {product.name}
            </h3>
            
            <div className="w-full border-t border-gray-200 mt-4 pt-3 flex flex-col gap-1">
              <div className="flex justify-between items-center w-full">
                <span className="text-xs font-bold text-gray-500 uppercase">Mã Hệ Thống:</span>
                <span className="text-sm font-mono font-bold text-gray-800">{product.productId.substring(0, 10)}</span>
              </div>
              <div className="flex justify-between items-center w-full">
                <span className="text-xs font-bold text-gray-500 uppercase">Quy cách:</span>
                <span className="text-sm font-bold text-blue-600">
                  {product.largeUnit ? `1 ${product.largeUnit} = ${product.conversionRate} ${product.baseUnit}` : `Đơn vị: ${product.baseUnit}`}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* BỘ NÚT CHỨC NĂNG */}
        <div className="flex items-center gap-3 p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button onClick={handleDownload} disabled={isDownloading} className="flex-1 py-3 text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95">
            <Download className="w-4 h-4" /> Tải Ảnh
          </button>
          <button onClick={handleRealPrint} className="flex-[2] py-3 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-lg hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 active:scale-95">
            <Printer className="w-4 h-4" /> In Tem Nhãn
          </button>
        </div>

      </div>
    </div>
  );
};

export default QRCodeModal;