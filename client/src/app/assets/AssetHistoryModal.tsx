"use client";

import React from "react";
import { X, History, PlusCircle, User, ShieldAlert, Wrench, Edit3, Clock } from "lucide-react";
import { useGetAssetHistoryQuery } from "@/state/api";

type AssetHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
};

const AssetHistoryModal = ({ isOpen, onClose, asset }: AssetHistoryModalProps) => {
  // Chỉ gọi API khi Modal đang mở và đã có asset
  const { data: historyLogs, isLoading } = useGetAssetHistoryQuery(asset?.assetId ?? "", {
    skip: !isOpen || !asset,
  });

  if (!isOpen || !asset) return null;

  // Render Icon và Màu sắc dựa trên loại hành động
  const getActionConfig = (type: string) => {
    switch (type) {
      case "CREATED": return { icon: <PlusCircle className="w-4 h-4 text-white"/>, color: "bg-emerald-500", label: "MUA MỚI" };
      case "HANDOVER": return { icon: <User className="w-4 h-4 text-white"/>, color: "bg-blue-500", label: "BÀN GIAO" };
      case "MAINTENANCE": return { icon: <Wrench className="w-4 h-4 text-white"/>, color: "bg-orange-500", label: "BẢO TRÌ" };
      case "BROKEN": return { icon: <ShieldAlert className="w-4 h-4 text-white"/>, color: "bg-rose-500", label: "BÁO HỎNG" };
      default: return { icon: <Edit3 className="w-4 h-4 text-white"/>, color: "bg-gray-500", label: "CẬP NHẬT" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
          <h2 className="text-xl font-black flex items-center gap-2 text-slate-800 tracking-tight">
            <History className="w-5 h-5 text-blue-600" /> Nhật Ký Vòng Đời Tài Sản
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full transition-colors shadow-sm border border-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* THÔNG TIN TÓM TẮT */}
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight">{asset.name}</h3>
            <p className="text-sm font-semibold text-gray-500 mt-0.5">Mã TS: <span className="text-blue-600">{asset.assetId.split('-')[0].toUpperCase()}</span></p>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            Tổng cộng: <span className="text-blue-600 text-sm">{historyLogs?.length || 0}</span> bản ghi
          </div>
        </div>

        {/* BODY - TIMELINE */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Clock className="w-8 h-8 animate-spin mb-3 text-blue-500" />
              <p className="font-bold text-sm">Đang trích xuất dữ liệu lịch sử...</p>
            </div>
          ) : !historyLogs || historyLogs.length === 0 ? (
            <div className="text-center py-10 text-gray-500 italic">Chưa có dữ liệu lịch sử nào cho tài sản này.</div>
          ) : (
            <div className="relative border-l-2 border-gray-200 ml-4 lg:ml-8 my-2">
              {historyLogs.map((log, index) => {
                const config = getActionConfig(log.actionType);
                return (
                  <div key={log.historyId} className="mb-8 ml-8 relative group">
                    {/* Chấm tròn Icon trên dòng thời gian */}
                    <div className={`absolute -left-[41px] w-9 h-9 rounded-full ${config.color} flex items-center justify-center border-4 border-white shadow-sm ring-1 ring-gray-100 group-hover:scale-110 transition-transform`}>
                      {config.icon}
                    </div>
                    
                    {/* Thẻ nội dung */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md text-white ${config.color} uppercase tracking-widest`}>
                          {config.label}
                        </span>
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3"/> {new Date(log.timestamp).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-700 font-medium leading-relaxed mb-3">
                        {log.description}
                      </p>
                      
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-slate-500"/>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                          Xác nhận bởi: <strong className="text-slate-700">{log.changedBy}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AssetHistoryModal;