"use client";

import React, { useState } from "react";
import { 
  useGetTransactionsQuery, 
  useApproveTransactionMutation, 
  useRejectTransactionMutation 
} from "@/state/api";
import Header from "@/app/(components)/Header";
import { 
  ClipboardCheck, Clock, CheckCircle2, XCircle, 
  ArrowDownToLine, ArrowUpFromLine, User, Calendar, MapPin
} from "lucide-react";
import { toast } from "react-toastify";

const ApprovalsPage = () => {
  const { data: transactions, isLoading } = useGetTransactionsQuery();
  const [approveTx, { isLoading: isApproving }] = useApproveTransactionMutation();
  const [rejectTx, { isLoading: isRejecting }] = useRejectTransactionMutation();
  
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED" | "REJECTED">("PENDING");

  // Fix lỗi TypeScript implicit any bằng cách thêm kiểu (tx: any)
  const filteredTransactions = transactions?.filter((tx: any) => 
    filter === "ALL" ? true : tx.status === filter
  ) || [];

  const handleApprove = async (id: string) => {
    if (!window.confirm("Xác nhận DUYỆT phiếu này? Tồn kho thực tế sẽ thay đổi.")) return;
    try {
      await approveTx({ id, approvedBy: "Giám Đốc Lâm" }).unwrap();
      toast.success("Đã duyệt phiếu thành công!");
    } catch (err: any) { 
      // Lấy câu thông báo lỗi chi tiết từ Backend (Interactive Transaction)
      const errorMessage = err?.data?.message || "Lỗi hệ thống khi duyệt phiếu!";
      toast.error(errorMessage); 
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("Bạn chắc chắn muốn TỪ CHỐI phiếu này?")) return;
    try {
      await rejectTx({ id, approvedBy: "Giám Đốc Lâm" }).unwrap();
      toast.info("Đã từ chối phiếu yêu cầu.");
    } catch (err) { toast.error("Lỗi khi từ chối phiếu!"); }
  };

  if (isLoading) return <div className="p-10 text-center font-bold text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="flex flex-col w-full pb-10">
      <Header 
        name="Trung Tâm Phê Duyệt" 
        subtitle="Quản lý và xét duyệt các phiếu yêu cầu Nhập/Xuất kho từ Thủ kho"
        icon={ClipboardCheck}
      />

      {/* TABS LỌC TRẠNG THÁI */}
      <div className="mt-6 flex gap-3 mb-6">
        {[
          { id: "PENDING", label: "Chờ duyệt", icon: <Clock className="w-4 h-4"/>, color: "bg-amber-100 text-amber-700" },
          { id: "COMPLETED", label: "Đã duyệt", icon: <CheckCircle2 className="w-4 h-4"/>, color: "bg-green-100 text-green-700" },
          { id: "REJECTED", label: "Đã từ chối", icon: <XCircle className="w-4 h-4"/>, color: "bg-red-100 text-red-700" },
          { id: "ALL", label: "Tất cả", icon: <ClipboardCheck className="w-4 h-4"/>, color: "bg-gray-100 text-gray-700" },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm border ${filter === tab.id ? `${tab.color} ring-2 ring-offset-1` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
          >
            {tab.icon} {tab.label} 
            {tab.id === "PENDING" && transactions && (
              <span className="ml-2 bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs">
                {/* Fix lỗi TypeScript implicit any bằng cách thêm kiểu (t: any) */}
                {transactions.filter((t: any) => t.status === "PENDING").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* DANH SÁCH PHIẾU */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500 font-medium">Không có phiếu nào trong trạng thái này.</div>
        ) : (
          // Fix lỗi TypeScript implicit any bằng cách thêm kiểu (tx: any)
          filteredTransactions.map((tx: any) => (
            <div key={tx.transactionId} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow">
              
              {/* CỘT 1: Thông tin Giao dịch & SP */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl flex items-center justify-center font-bold shadow-sm ${tx.type === "IN" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {tx.type === "IN" ? <><ArrowDownToLine className="w-5 h-5 mr-1"/> NHẬP</> : <><ArrowUpFromLine className="w-5 h-5 mr-1"/> XUẤT</>}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 line-clamp-1">{tx.product?.name || "Sản phẩm không xác định"}</h3>
                    <p className="text-sm font-semibold text-gray-500">Mã SP: {tx.productId}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div><p className="text-xs font-bold text-gray-400 uppercase">Số lượng</p><p className="font-black text-blue-600 text-lg">{tx.quantity}</p></div>
                  <div><p className="text-xs font-bold text-gray-400 uppercase">Phân loại</p><p className="font-bold text-gray-700">{tx.variant?.attributes || "Mặc định"}</p></div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Mã Lô</p>
                    <p className="font-bold text-gray-700">{tx.newBatchNumber || tx.batch?.batchNumber || "Không có lô"}</p>
                  </div>
                  {tx.location && <div><p className="text-xs font-bold text-gray-400 uppercase">Vị trí cất</p><p className="font-bold text-gray-700 flex items-center gap-1"><MapPin className="w-3 h-3"/>{tx.location}</p></div>}
                </div>
                {tx.note && <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-100"><strong>Ghi chú:</strong> {tx.note}</p>}
              </div>

              {/* CỘT 2: Trạng thái & Thao tác */}
              <div className="w-full md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                <div className="space-y-2 mb-4">
                  <p className="text-xs flex items-center gap-2 text-gray-500"><User className="w-3.5 h-3.5"/> Yêu cầu bởi: <strong className="text-gray-800">{tx.createdBy || "System"}</strong></p>
                  <p className="text-xs flex items-center gap-2 text-gray-500"><Calendar className="w-3.5 h-3.5"/> Lúc: {new Date(tx.timestamp).toLocaleString("vi-VN")}</p>
                  
                  {/* Badge Trạng thái */}
                  <div className="mt-3">
                    {tx.status === "PENDING" && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 font-bold rounded-lg text-xs"><Clock className="w-3.5 h-3.5"/> CHỜ DUYỆT</span>}
                    {tx.status === "COMPLETED" && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 font-bold rounded-lg text-xs"><CheckCircle2 className="w-3.5 h-3.5"/> ĐÃ DUYỆT ({new Date(tx.approvedAt).toLocaleDateString("vi-VN")})</span>}
                    {tx.status === "REJECTED" && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 font-bold rounded-lg text-xs"><XCircle className="w-3.5 h-3.5"/> ĐÃ TỪ CHỐI</span>}
                  </div>
                </div>

                {/* Các nút bấm Duyệt (Chỉ hiện khi PENDING) */}
                {tx.status === "PENDING" && (
                  <div className="flex gap-2 w-full">
                    <button onClick={() => handleApprove(tx.transactionId)} disabled={isApproving} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-all text-sm flex justify-center items-center gap-1">
                      <CheckCircle2 className="w-4 h-4"/> Duyệt
                    </button>
                    <button onClick={() => handleReject(tx.transactionId)} disabled={isRejecting} className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl shadow-sm transition-all text-sm flex justify-center items-center gap-1">
                      <XCircle className="w-4 h-4"/> Từ chối
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ApprovalsPage;