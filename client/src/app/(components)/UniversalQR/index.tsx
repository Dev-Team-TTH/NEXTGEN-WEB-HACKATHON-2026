"use client";

import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { toast } from "react-toastify";

interface QRInfoItem {
  label: string;
  value: string | React.ReactNode;
}

interface UniversalQRProps {
  qrValue: string;          // Dữ liệu mã hóa vào QR (VD: PRD-123, AST-123)
  headerTitle: string;      // Tiêu đề đen trên cùng (VD: KHO DOANH NGHIỆP)
  badgeIcon: React.ReactNode; // Icon nhỏ (Box, ShieldCheck...)
  badgeText: string;        // Text cạnh icon (VD: SKU TAG)
  mainName: string;         // Tên sản phẩm/tài sản lớn
  infoList: QRInfoItem[];   // Danh sách thông tin chi tiết (ID, Giá, Danh mục...)
  footerText?: string;      // Chữ nhỏ dưới cùng (Tùy chọn)
  size?: number;            // Kích thước QR (Mặc định 160)
}

const UniversalQR: React.FC<UniversalQRProps> = ({ 
  qrValue, headerTitle, badgeIcon, badgeText, mainName, infoList, footerText, size = 160 
}) => {
  const qrRef = useRef<HTMLDivElement>(null);

  // --- TÍNH NĂNG TẢI ẢNH ---
  const downloadQR = () => {
    try {
      const canvas = qrRef.current?.querySelector("canvas");
      if (!canvas) throw new Error("Không tìm thấy mã QR");
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_${qrValue.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đã tải mã QR về máy!");
    } catch (err) {
      toast.error("Lỗi khi tải ảnh QR!");
    }
  };

  // --- TÍNH NĂNG IN TEM NHÃN CHUẨN KHOA HỌC ---
  const printQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const qrImageUrl = canvas.toDataURL("image/png");

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) {
      toast.error("Trình duyệt đã chặn Popup in. Vui lòng cấp quyền!");
      return;
    }

    // Tạo các dòng thông tin HTML động từ infoList
    const infoRowsHtml = infoList.map(item => `
      <div class="info-row">
        <span class="info-label">${item.label}</span>
        <span class="info-value">${item.value}</span>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>In Tem Nhãn - ${mainName}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; padding: 20px; background: #f9fafb; margin: 0; }
            .label-card { background: white; border: 2px dashed #666; width: 340px; border-radius: 12px; overflow: hidden; }
            .label-header { background: #000; color: #fff; text-align: center; padding: 10px; font-size: 14px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
            .label-body { padding: 24px; display: flex; flex-direction: column; align-items: center; }
            .qr-image { width: 180px; height: 180px; margin-bottom: 15px; border: 4px solid #fff; outline: 1px solid #ddd; }
            .product-name { font-size: 18px; font-weight: 900; text-align: center; text-transform: uppercase; margin: 0 0 15px 0; color: #111; line-height: 1.3; }
            .divider { width: 100%; border-top: 2px dotted #aaa; margin: 0 0 15px 0; }
            .info-row { display: flex; justify-content: space-between; width: 100%; margin-bottom: 8px; font-size: 13px; line-height: 1.4; }
            .info-label { color: #555; font-weight: bold; width: 40%; }
            .info-value { font-weight: 900; color: #000; text-align: right; width: 60%; word-break: break-word; }
            .footer { margin-top: 20px; font-size: 11px; font-weight: bold; color: #2e7d32; text-transform: uppercase; letter-spacing: 1px; }
            @media print {
              body { background: white; padding: 0; }
              .label-card { border: none; width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="label-header">${headerTitle}</div>
            <div class="label-body">
              <img src="${qrImageUrl}" class="qr-image" />
              <h3 class="product-name">${mainName}</h3>
              <div class="divider"></div>
              ${infoRowsHtml}
              ${footerText ? `<div class="footer">${footerText}</div>` : ''}
            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 300);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="w-full">
      {/* UI TEM NHÃN TRÊN MÀN HÌNH */}
      <div className="bg-gray-50 dark:bg-gray-900 flex flex-col items-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center w-full relative overflow-hidden">
          
          {/* Badge Tag */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-700 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-b-lg flex items-center gap-1.5 shadow-sm">
            {badgeIcon} {badgeText}
          </div>

          <div ref={qrRef} className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm mt-10 mb-5">
            <QRCodeCanvas value={qrValue} size={size} level="H" includeMargin={false} />
          </div>
          
          <h3 className="text-lg font-black text-gray-900 dark:text-white text-center uppercase leading-tight line-clamp-2 w-full px-4 mb-5">
            {mainName}
          </h3>
          
          {/* Khối thông tin chi tiết */}
          <div className="w-full bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2.5">
            {infoList.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start w-full gap-4">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mt-0.5">{item.label}</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 text-right">{item.value}</span>
              </div>
            ))}
          </div>

          {footerText && (
            <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 py-2 border-t border-emerald-100 dark:border-emerald-800/50 text-center">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">{footerText}</span>
            </div>
          )}
        </div>
      </div>

      {/* BỘ NÚT CHỨC NĂNG */}
      <div className="flex items-center gap-3 mt-6">
        <button onClick={downloadQR} className="flex-1 py-3.5 text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 border border-blue-100 dark:border-blue-800/50">
          <Download className="w-4 h-4" /> Lưu Ảnh
        </button>
        <button onClick={printQR} className="flex-1 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
          <Printer className="w-4 h-4" /> In Tem Nhãn
        </button>
      </div>
    </div>
  );
};

export default UniversalQR;