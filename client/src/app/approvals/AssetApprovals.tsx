"use client";
import React from "react";
import { useGetAssetRequestsQuery, useApproveAssetRequestMutation, useRejectAssetRequestMutation } from "@/state/api";
import { User, Calendar, CheckCircle2, XCircle, Edit3, Briefcase, ArrowRight, PlusCircle, Trash2, Activity, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";

const renderDiff = (label: string, oldVal: any, newVal: any) => {
  if (newVal === null || newVal === undefined || oldVal === newVal) return null;
  return (
    <div className="flex items-center gap-2 text-sm bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
      <span className="font-semibold text-gray-500 min-w-[100px]">{label}:</span>
      <span className="text-gray-500 line-through truncate max-w-[100px]" title={String(oldVal)}>{String(oldVal || "0")}</span>
      <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <span className="font-bold text-amber-700 truncate max-w-[120px]" title={String(newVal)}>{String(newVal || "0")}</span>
    </div>
  );
};

const AssetApprovals = ({ filter }: { filter: string }) => {
  const { data: requests, isLoading } = useGetAssetRequestsQuery();
  const [approveAsset, { isLoading: isApproving }] = useApproveAssetRequestMutation();
  const [rejectAsset, { isLoading: isRejecting }] = useRejectAssetRequestMutation();

  const filteredData = requests?.filter((req: any) => filter === "ALL" ? true : req.status === filter) || [];

  const handleAction = async (actionFn: any, id: string, successMsg: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    try {
      await actionFn({ id, approvedBy: "Giám Đốc" }).unwrap();
      toast.success(successMsg);
    } catch (err: any) { toast.error(err?.data?.message || "Lỗi xử lý yêu cầu!"); }
  };

  if (isLoading) return <div className="py-10 text-center text-gray-500 font-bold animate-pulse">Đang tải Phiếu Tài sản...</div>;
  if (filteredData.length === 0) return <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500 font-medium">Không có phiếu yêu cầu Tài sản nào.</div>;

  return (
    <div className="flex flex-col gap-4">
      {filteredData.map((req: any) => (
        <div key={req.requestId} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl font-bold flex items-center justify-center shadow-sm ${
                req.requestType === "CREATE" ? "bg-emerald-100 text-emerald-700" :
                req.requestType === "UPDATE" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
              }`}>
                {req.requestType === "CREATE" && <><PlusCircle className="w-5 h-5 mr-1"/> MUA MỚI</>}
                {req.requestType === "UPDATE" && <><Edit3 className="w-5 h-5 mr-1"/> BÀN GIAO / SỬA</>}
                {req.requestType === "DELETE" && <><Trash2 className="w-5 h-5 mr-1"/> THANH LÝ</>}
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 line-clamp-1">{req.name || req.asset?.name || "TS không xác định"}</h3>
                {req.assetId && <p className="text-sm font-semibold text-gray-500">Mã TS: <span className="text-blue-600">{req.assetId.substring(0,8).toUpperCase()}</span></p>}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5"/> Chi tiết yêu cầu</h4>
              
              {/* PHIẾU MUA MỚI */}
              {req.requestType === "CREATE" && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                   <p><strong>Loại:</strong> {req.category}</p>
                   <p><strong>Trạng thái:</strong> <span className="text-emerald-600 font-bold">{req.assetStatus}</span></p>
                   <p><strong>Giá mua:</strong> ${Number(req.purchasePrice).toFixed(2)}</p>
                   {req.assignedTo && <p><strong>Giao cho:</strong> {req.assignedTo}</p>}
                   {/* 2 Trường mới thêm */}
                   <p className="flex items-center gap-1.5 text-orange-700 bg-orange-50 px-2 py-1 rounded w-max"><Activity className="w-4 h-4"/> <strong>Khấu hao:</strong> {req.depreciationMonths ? `${req.depreciationMonths} tháng` : 'Không'}</p>
                   <p className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-1 rounded w-max"><ShieldCheck className="w-4 h-4"/> <strong>Bảo trì:</strong> {req.maintenanceCycle ? `${req.maintenanceCycle} tháng/lần` : 'Không'}</p>
                </div>
              )}

              {/* PHIẾU SỬA / BÀN GIAO */}
              {req.requestType === "UPDATE" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {renderDiff("Trạng thái", req.asset?.status, req.assetStatus)}
                  {renderDiff("Người giữ", req.asset?.assignedTo, req.assignedTo)}
                  {renderDiff("Vị trí", req.asset?.location, req.location)}
                  {/* 2 Trường mới thêm */}
                  {renderDiff("Khấu hao (tháng)", req.asset?.depreciationMonths, req.depreciationMonths)}
                  {renderDiff("Bảo trì (tháng)", req.asset?.maintenanceCycle, req.maintenanceCycle)}
                </div>
              )}

              {/* PHIẾU THANH LÝ */}
              {req.requestType === "DELETE" && <p className="text-sm text-rose-600 font-bold">⚠️ Đề xuất xóa tài sản khỏi hệ thống vĩnh viễn.</p>}
            </div>
          </div>

          {/* CỘT THAO TÁC */}
          <div className="w-full md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
            <div className="space-y-2 mb-4">
              <p className="text-xs flex items-center gap-2 text-gray-500"><User className="w-3.5 h-3.5"/> Yêu cầu: <strong>{req.requestedBy || "Nhân viên"}</strong></p>
              <p className="text-xs flex items-center gap-2 text-gray-500"><Calendar className="w-3.5 h-3.5"/> Lúc: {new Date(req.timestamp).toLocaleString("vi-VN")}</p>
              <div className="mt-3">
                 {req.status === "APPROVED" && <span className="inline-flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs"><CheckCircle2 className="w-3.5 h-3.5 mr-1"/> ĐÃ DUYỆT</span>}
                 {req.status === "REJECTED" && <span className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 font-bold rounded-lg text-xs"><XCircle className="w-3.5 h-3.5 mr-1"/> TỪ CHỐI</span>}
              </div>
            </div>
            {req.status === "PENDING" && (
              <div className="flex gap-2 w-full mt-auto">
                <button onClick={() => handleAction(approveAsset, req.requestId, "Đã duyệt phiếu!", "Thực thi yêu cầu Tài sản này?")} disabled={isApproving} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex justify-center items-center gap-1 active:scale-95 transition-transform"><CheckCircle2 className="w-4 h-4"/> Duyệt</button>
                <button onClick={() => handleAction(rejectAsset, req.requestId, "Đã hủy phiếu", "Từ chối phiếu này?")} disabled={isRejecting} className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-sm flex justify-center items-center gap-1 active:scale-95 transition-transform"><XCircle className="w-4 h-4"/> Hủy</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
export default AssetApprovals;