"use client";
import React from "react";
import { useGetMasterDataRequestsQuery, useApproveMasterDataMutation, useRejectMasterDataMutation } from "@/state/api";
import { User, Calendar, CheckCircle2, XCircle, Edit3, Database, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";

const renderDiff = (label: string, oldVal: any, newVal: any, isCurrency: boolean = false) => {
  if (newVal === null || newVal === undefined || oldVal === newVal) return null;
  return (
    <div className="flex items-center gap-2 text-sm bg-blue-50/50 p-2 rounded-lg border border-blue-100">
      <span className="font-semibold text-gray-500 w-24">{label}:</span>
      <span className="text-gray-500 line-through truncate max-w-[120px]" title={String(oldVal)}>{isCurrency ? `$${Number(oldVal).toFixed(2)}` : String(oldVal)}</span>
      <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <span className="font-bold text-blue-700 truncate max-w-[150px]" title={String(newVal)}>{isCurrency ? `$${Number(newVal).toFixed(2)}` : String(newVal)}</span>
    </div>
  );
};

const MasterDataApprovals = ({ filter }: { filter: string }) => {
  const { data: requests, isLoading } = useGetMasterDataRequestsQuery();
  const [approveMdm, { isLoading: isApproving }] = useApproveMasterDataMutation();
  const [rejectMdm, { isLoading: isRejecting }] = useRejectMasterDataMutation();

  const filteredData = requests?.filter((req: any) => filter === "ALL" ? true : req.status === filter) || [];

  const handleAction = async (actionFn: any, id: string, successMsg: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    try {
      await actionFn({ id, approvedBy: "Giám Đốc" }).unwrap();
      toast.success(successMsg);
    } catch (err: any) { toast.error(err?.data?.message || "Lỗi xử lý yêu cầu!"); }
  };

  if (isLoading) return <div className="py-10 text-center text-gray-500">Đang tải Yêu cầu Dữ liệu...</div>;
  if (filteredData.length === 0) return <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500 font-medium">Không có yêu cầu thay đổi Dữ liệu gốc nào.</div>;

  return (
    <div className="flex flex-col gap-4">
      {filteredData.map((req: any) => (
        <div key={req.requestId} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center shadow-sm"><Edit3 className="w-5 h-5 mr-1"/> SỬA DATA</div>
              <div>
                <h3 className="text-lg font-black text-gray-900 line-clamp-1">{req.product?.name || "SP đã bị xóa"}</h3>
                <p className="text-sm font-semibold text-gray-500">Mã SP: <span className="text-blue-600">{req.productId}</span></p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1.5"><Database className="w-3.5 h-3.5"/> Chi tiết thay đổi</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {renderDiff("Tên Sản phẩm", req.product?.name, req.newName)}
                {renderDiff("Giá Bán", req.product?.price, req.newPrice, true)}
                {renderDiff("Giá Vốn", req.product?.purchasePrice, req.newPurchasePrice, true)}
                {renderDiff("Danh mục", req.product?.category, req.newCategory)}
                {renderDiff("Trạng thái", req.product?.status, req.newStatus)}
                {renderDiff("Mức cảnh báo", req.product?.reorderPoint, req.newReorderPoint)}
              </div>
            </div>
          </div>
          <div className="w-full md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
            <div className="space-y-2 mb-4">
              <p className="text-xs flex items-center gap-2 text-gray-500"><User className="w-3.5 h-3.5"/> Yêu cầu: <strong>{req.requestedBy}</strong></p>
              <p className="text-xs flex items-center gap-2 text-gray-500"><Calendar className="w-3.5 h-3.5"/> Lúc: {new Date(req.timestamp).toLocaleString("vi-VN")}</p>
              <div className="mt-3">
                 {req.status === "APPROVED" && <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-xs"><CheckCircle2 className="w-3.5 h-3.5 mr-1"/> ĐÃ CẬP NHẬT</span>}
                 {req.status === "REJECTED" && <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 font-bold rounded-lg text-xs"><XCircle className="w-3.5 h-3.5 mr-1"/> TỪ CHỐI</span>}
              </div>
            </div>
            {req.status === "PENDING" && (
              <div className="flex gap-2 w-full mt-auto">
                <button onClick={() => handleAction(approveMdm, req.requestId, "Đã cập nhật Master Data", "Xác nhận duyệt ghi đè Data?")} disabled={isApproving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm flex justify-center items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Cập nhật</button>
                <button onClick={() => handleAction(rejectMdm, req.requestId, "Đã từ chối", "Từ chối ghi đè?")} disabled={isRejecting} className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-sm flex justify-center items-center gap-1"><XCircle className="w-4 h-4"/> Hủy</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
export default MasterDataApprovals;