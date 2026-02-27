"use client";

import { X, QrCode, Box } from "lucide-react";
import UniversalQR from "@/app/(components)/UniversalQR";

const QRCodeModal = ({ isOpen, onClose, product }: any) => {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 transition-all">
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <h2 className="text-xl font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <QrCode className="w-5 h-5" /> Tem dán Kho (SKU)
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white dark:bg-gray-700 rounded-full shadow-sm transition-all hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <UniversalQR 
            qrValue={`PRD-${product.productId}`}
            headerTitle="KHO DOANH NGHIỆP"
            badgeIcon={<Box className="w-3.5 h-3.5" />}
            badgeText="SKU Tag"
            mainName={product.name}
            infoList={[
              { label: "Mã Hệ Thống:", value: product.productId.substring(0, 10).toUpperCase() },
              { label: "Đơn giá xuất:", value: `$${product.price?.toFixed(2)} / ${product.baseUnit || 'Cái'}` },
              { label: "Quy cách:", value: product.largeUnit ? `1 ${product.largeUnit} = ${product.conversionRate} ${product.baseUnit}` : `Đơn vị: ${product.baseUnit}` }
            ]}
          />
        </div>

      </div>
    </div>
  );
};

export default QRCodeModal;