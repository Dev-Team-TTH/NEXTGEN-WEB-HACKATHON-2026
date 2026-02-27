"use client";

import React from "react";
import { X, QrCode, ShieldCheck } from "lucide-react";
import UniversalQR from "@/app/(components)/UniversalQR";

type AssetQRCodeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
};

const AssetQRCodeModal = ({ isOpen, onClose, asset }: AssetQRCodeModalProps) => {
  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 transition-all">
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20">
          <h2 className="text-xl font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2">
            <QrCode className="w-5 h-5" /> Tem Định Danh Tài Sản
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white dark:bg-gray-700 rounded-full shadow-sm transition-all hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <UniversalQR 
            qrValue={`AST-${asset.assetId}`}
            headerTitle="QUẢN LÝ TÀI SẢN"
            badgeIcon={<ShieldCheck className="w-3.5 h-3.5" />}
            badgeText="Định Danh"
            mainName={asset.name}
            infoList={[
              { label: "Mã Tài Sản:", value: asset.assetId.split('-')[0].toUpperCase() },
              { label: "Danh mục:", value: asset.category },
              { label: "Người giữ:", value: asset.assignedTo || "Đang lưu kho" },
              { label: "Trạng thái:", value: asset.status || "Sẵn sàng" }
            ]}
            footerText="✓ TÀI SẢN DOANH NGHIỆP"
          />
        </div>

      </div>
    </div>
  );
};

export default AssetQRCodeModal;