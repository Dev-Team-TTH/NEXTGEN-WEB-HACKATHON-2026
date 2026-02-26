"use client";
import React from "react";
import { useGetTransactionsQuery, useApproveTransactionMutation, useRejectTransactionMutation } from "@/state/api";
import { ArrowDownToLine, ArrowUpFromLine, User, Calendar, CheckCircle2, XCircle, Edit3, MapPin } from "lucide-react";
import { toast } from "react-toastify";

const InventoryApprovals = ({ filter }: { filter: string }) => {
  // Đã sửa: Nhận responseData chứa cả data và pagination
  const { data: responseData, isLoading } = useGetTransactionsQuery();
  const [approveTx, { isLoading: isApproving }] = useApproveTransactionMutation();
  const [rejectTx, { isLoading: isRejecting }] = useRejectTransactionMutation();

  // Đã sửa: Trích xuất mảng dữ liệu thực tế từ responseData.data
  const transactions = responseData?.data || [];
  const filteredData = transactions.filter((tx: any) => filter === "ALL" ? true : tx.status === filter);

  const handleAction = async (actionFn: any, id: string, successMsg: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    try {
      await actionFn({ id, approvedBy: "Giám Đốc" }).unwrap();
      toast.success(successMsg);
    } catch (err: any) { toast.error(err?.data?.message || "Lỗi xử lý yêu cầu!"); }
  };

  if (isLoading) return <div className="py-10 text-center text-gray-500">Đang tải Phiếu Kho...</div>;
  if (filteredData.length === 0) return <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500 font-medium">Không có phiếu kho nào.</div>;

  return (
    <div className="flex flex-col gap-4">
      {filteredData.map((tx: any) => (
        <div key={tx.transactionId} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl font-bold flex items-center justify-center shadow-sm ${tx.type === "NHAP_HANG" ? "bg-green-100 text-green-700" : tx.type === "DIEU_CHINH" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}>
                {tx.type === "NHAP_HANG" ? <><ArrowDownToLine className="w-5 h-5 mr-1"/> NHẬP KHO</> : 
                 tx.type === "DIEU_CHINH" ? <><Edit3 className="w-5 h-5 mr-1"/> ĐIỀU CHỈNH</> : 
                 <><ArrowUpFromLine className="w-5 h-5 mr-1"/> XUẤT KHO</>}
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 line-clamp-1">{tx.product?.name || "Sản phẩm không xác định"}</h3>
                <p className="text-sm font-semibold text-gray-500">Mã SP: {tx.productId}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div><p className="text-xs font-bold text-gray-400 uppercase">Số lượng</p><p className={`font-black text-lg ${tx.quantity < 0 ? 'text-red-600' : 'text-blue-600'}`}>{tx.quantity}</p></div>
              <div><p className="text-xs font-bold text-gray-400 uppercase">Phân loại</p><p className="font-bold text-gray-700 truncate">{tx.variant?.attributes || "Mặc định"}</p></div>
              <div><p className="text-xs font-bold text-gray-400 uppercase">Mã Lô</p><p className="font-bold text-gray-700 truncate">{tx.newBatchNumber || tx.batch?.batchNumber || "Trống"}</p></div>
              {tx.location && <div><p className="text-xs font-bold text-gray-400 uppercase">Vị trí cất</p><p className="font-bold text-gray-700 flex items-center gap-1 truncate"><MapPin className="w-3 h-3"/>{tx.location}</p></div>}
            </div>
            {tx.note && <p className="text-sm text-gray-600 bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-100"><strong>Ghi chú:</strong> {tx.note}</p>}
          </div>

          <div className="w-full md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
            <div className="space-y-2 mb-4">
              <p className="text-xs flex items-center gap-2 text-gray-500"><User className="w-3.5 h-3.5"/> Yêu cầu: <strong>{tx.createdBy || "System"}</strong></p>
              <p className="text-xs flex items-center gap-2 text-gray-500"><Calendar className="w-3.5 h-3.5"/> Lúc: {new Date(tx.timestamp).toLocaleString("vi-VN")}</p>
              <div className="mt-3">
                 {tx.status === "COMPLETED" && <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 font-bold rounded-lg text-xs"><CheckCircle2 className="w-3.5 h-3.5 mr-1"/> ĐÃ DUYỆT</span>}
                 {tx.status === "REJECTED" && <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 font-bold rounded-lg text-xs"><XCircle className="w-3.5 h-3.5 mr-1"/> ĐÃ TỪ CHỐI</span>}
              </div>
            </div>
            {tx.status === "PENDING" && (
              <div className="flex gap-2 w-full mt-auto">
                <button onClick={() => handleAction(approveTx, tx.transactionId, "Duyệt thành công", "Duyệt phiếu này?")} disabled={isApproving} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm flex justify-center items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Duyệt</button>
                <button onClick={() => handleAction(rejectTx, tx.transactionId, "Đã từ chối", "Từ chối phiếu này?")} disabled={isRejecting} className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-sm flex justify-center items-center gap-1"><XCircle className="w-4 h-4"/> Hủy</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
export default InventoryApprovals;