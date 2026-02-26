import React from "react";
import { Asset } from "@/state/api";
import { 
  Briefcase, Edit, Trash2, QrCode, Tag, 
  MapPin, User, Calendar, ShieldCheck, ShieldAlert, AlertTriangle, Activity, History
} from "lucide-react";

type AssetCardProps = {
  asset: Asset;
  onOpenModal: (type: "EDIT" | "QR" | "HISTORY", asset: Asset) => void;
  onDelete: (id: string) => void;
};

const AssetCard = ({ asset, onOpenModal, onDelete }: AssetCardProps) => {
  
  const getStatusDisplay = (status: string) => {
    switch(status) {
      case "Sẵn sàng": case "ACTIVE": return { color: "text-emerald-700 bg-emerald-100 border-emerald-200", icon: <ShieldCheck className="w-3.5 h-3.5"/>, label: "Sẵn sàng (Kho)" };
      case "Đang sử dụng": case "IN_USE": return { color: "text-blue-700 bg-blue-100 border-blue-200", icon: <User className="w-3.5 h-3.5"/>, label: "Đang sử dụng" };
      case "Đang bảo trì": case "MAINTENANCE": return { color: "text-amber-700 bg-amber-100 border-amber-200", icon: <AlertTriangle className="w-3.5 h-3.5"/>, label: "Bảo trì / Sửa chữa" };
      case "Hỏng hóc": case "BROKEN": return { color: "text-rose-700 bg-rose-100 border-rose-200", icon: <ShieldAlert className="w-3.5 h-3.5"/>, label: "Đã hỏng / Chờ TL" };
      default: return { color: "text-gray-700 bg-gray-100 border-gray-200", icon: <Tag className="w-3.5 h-3.5"/>, label: status };
    }
  };

  const statusInfo = getStatusDisplay(asset.status);
  
  const safePurchasePrice = asset.purchasePrice || 1; 
  const remainingPercent = Math.max(0, Math.min(100, (asset.currentValue / safePurchasePrice) * 100));
  
  const getBarColor = (percent: number) => {
    if (percent > 60) return 'bg-emerald-500';
    if (percent > 30) return 'bg-amber-500';
    return 'bg-rose-500'; 
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border ${asset.isMaintenanceOverdue ? 'border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-gray-200 dark:border-gray-700 shadow-sm'} hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group relative`}>
      
      {asset.isMaintenanceOverdue && (
        <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-br-xl z-10 flex items-center gap-1 shadow-md animate-pulse">
          <AlertTriangle className="w-3 h-3" /> QUÁ HẠN BẢO TRÌ
        </div>
      )}

      <div className="flex flex-col lg:flex-row p-4 gap-5 items-stretch">
        
        {/* CỘT 1: HÌNH ẢNH */}
        <div className="w-full lg:w-32 lg:h-32 rounded-xl bg-gray-50 border border-gray-200 flex-shrink-0 relative flex items-center justify-center overflow-hidden">
          {asset.imageUrl ? (
            <img src={asset.imageUrl} alt={asset.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 opacity-60 group-hover:scale-110 transition-transform duration-500">
              <Briefcase className="w-8 h-8 mb-1" />
            </div>
          )}
        </div>

        {/* CỘT 2: THÔNG TIN CƠ BẢN */}
        <div className="flex-1 min-w-0 flex flex-col justify-between pt-1">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate mb-1.5" title={asset.name}>
              {asset.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded flex items-center gap-1">
                 ID: {asset.assetId.substring(0,8).toUpperCase()}
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded flex items-center gap-1">
                <Tag className="w-3.5 h-3.5"/> {asset.category}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs text-gray-600 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400"/> Nhập: {new Date(asset.purchaseDate).toLocaleDateString("vi-VN")}</span>
            {asset.assignedTo && <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-blue-500"/> Giữ bởi: <strong>{asset.assignedTo}</strong></span>}
            {asset.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-500"/> Đặt tại: <strong>{asset.location}</strong></span>}
            
            {asset.nextMaintenance && (
              <span className={`flex items-center gap-1.5 font-bold ${asset.isMaintenanceOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                <AlertTriangle className={`w-4 h-4 ${asset.isMaintenanceOverdue ? 'animate-bounce' : ''}`}/> 
                Bảo trì: {new Date(asset.nextMaintenance).toLocaleDateString("vi-VN")}
              </span>
            )}
          </div>
        </div>

        {/* CỘT 3: TÌNH TRẠNG & TÀI CHÍNH */}
        <div className="w-full lg:w-56 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-center flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trạng Thái</span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1.5 rounded-lg border mb-4 w-max shadow-sm ${statusInfo.color}`}>
            {statusInfo.icon} {statusInfo.label}
          </div>

          <div className="border-t border-slate-200 pt-3">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Activity className="w-3 h-3"/> Khấu hao ({remainingPercent.toFixed(0)}%)</span>
              <span className="text-sm font-black text-gray-800">${asset.currentValue.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1 overflow-hidden shadow-inner">
              <div className={`h-2.5 rounded-full ${getBarColor(remainingPercent)} transition-all duration-1000`} style={{ width: `${remainingPercent}%` }}></div>
            </div>
            <div className="text-right text-[10px] text-gray-400 font-bold">Nguyên giá: ${asset.purchasePrice.toFixed(2)}</div>
          </div>
        </div>

        {/* CỘT 4: THAO TÁC */}
        <div className="w-full lg:w-36 flex flex-col justify-center gap-2 flex-shrink-0">
            <button onClick={() => onOpenModal("EDIT", asset)} className="w-full bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 px-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm">
              <Edit className="w-4 h-4"/> Sửa / Giao
            </button>
            <div className="flex gap-1.5">
              <button onClick={() => onOpenModal("HISTORY", asset)} className="flex-1 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 p-2 rounded-lg flex justify-center transition-colors shadow-sm" title="Lịch sử vòng đời"><History className="w-4 h-4"/></button>
              <button onClick={() => onOpenModal("QR", asset)} className="flex-1 bg-white hover:bg-purple-50 text-slate-500 hover:text-purple-600 border border-slate-200 p-2 rounded-lg flex justify-center transition-colors shadow-sm" title="In Tem QR"><QrCode className="w-4 h-4"/></button>
              <button onClick={() => onDelete(asset.assetId)} className="flex-1 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 p-2 rounded-lg flex justify-center transition-colors shadow-sm" title="Thanh lý"><Trash2 className="w-4 h-4"/></button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AssetCard;