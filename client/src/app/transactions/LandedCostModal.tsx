"use client";

import React, { useState, useMemo } from "react";
import { 
  Anchor, DollarSign, Tag, CheckCircle2, 
  Trash2, Loader2, ArrowDownUp, AlertOctagon,
  Lock, ShieldAlert
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetLandedCostsQuery,
  useCreateLandedCostMutation,
  useDeleteLandedCostMutation,
  useAllocateLandedCostMutation,
  useGetDocumentByIdQuery // 🚀 BỔ SUNG: Fetch dữ liệu chứng từ gốc
} from "@/state/api";

// --- COMPONENTS & UTILS ---
import Modal from "@/app/(components)/Modal";
import { formatVND } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

interface LandedCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
}

export default function LandedCostModal({ isOpen, onClose, documentId }: LandedCostModalProps) {
  // --- API HOOKS ---
  // 🚀 Fetch chứng từ gốc để lấy Context (Trạng thái khóa, Tiền tệ)
  const { data: document, isLoading: loadingDoc } = useGetDocumentByIdQuery(documentId || "", { skip: !isOpen || !documentId });
  const { data: landedCosts = [], isLoading: loadingLCs } = useGetLandedCostsQuery({ documentId }, { skip: !isOpen || !documentId });
  
  const [createLandedCost, { isLoading: isCreating }] = useCreateLandedCostMutation();
  const [deleteLandedCost, { isLoading: isDeleting }] = useDeleteLandedCostMutation();
  const [allocateCost, { isLoading: isAllocating }] = useAllocateLandedCostMutation();

  // --- LÁ CHẮN KẾ TOÁN (ACCOUNTING GUARD) ---
  const isDocumentLocked = useMemo(() => {
    if (!document) return false;
    return document.isLocked || document.status === "COMPLETED" || document.status === "APPROVED" || document.status === "CANCELLED";
  }, [document]);

  const currencyCode = document?.currencyCode || "VND";

  // --- STATE ---
  const [formData, setFormData] = useState({
    expenseName: "",
    amount: "",
    allocationMethod: "BY_VALUE"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- HANDLERS ---
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId) return;

    if (isDocumentLocked) {
      return toast.error("Chứng từ đã bị khóa! Không thể thêm chi phí mới.");
    }

    if (!formData.expenseName || !formData.amount) {
      return toast.error("Vui lòng nhập tên chi phí và số tiền!");
    }

    try {
      await createLandedCost({
        documentId,
        expenseName: formData.expenseName,
        amount: Number(formData.amount),
        allocationMethod: formData.allocationMethod,
        status: "PENDING"
      }).unwrap();
      
      toast.success("Đã thêm chi phí vận chuyển!");
      setFormData({ ...formData, expenseName: "", amount: "" });
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi thêm chi phí");
    }
  };

  const handleDelete = async (id: string) => {
    if (isDocumentLocked) return toast.error("Hệ thống đã khóa, không thể xóa chi phí!");
    try {
      await deleteLandedCost(id).unwrap();
      toast.success("Đã xóa chi phí!");
    } catch (err: any) {
      toast.error("Lỗi khi xóa chi phí");
    }
  };

  const handleAllocate = async (id: string) => {
    if (isDocumentLocked) return toast.error("Hệ thống đã khóa, không thể phân bổ chi phí!");
    if (window.confirm("Thao tác này sẽ phân bổ số tiền vào Giá trị Tồn kho của các mặt hàng trong phiếu. Tiếp tục?")) {
      try {
        await allocateCost(id).unwrap();
        toast.success("Đã phân bổ chi phí thành công vào giá vốn hàng tồn kho!");
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi phân bổ! Hãy đảm bảo chứng từ hợp lệ.");
      }
    }
  };

  // --- RENDER FOOTER ---
  const modalFooter = (
    <div className="flex w-full justify-between items-center">
      <div className="text-[11px] font-bold text-slate-500">
        {isDocumentLocked ? (
          <span className="flex items-center gap-1.5 text-rose-500">
            <Lock className="w-4 h-4" /> Kế toán đã khóa chứng từ
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-emerald-500">
            <CheckCircle2 className="w-4 h-4" /> Cho phép phân bổ
          </span>
        )}
      </div>
      <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors">
        Đóng Cửa sổ
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cấu hình Landed Cost"
      subtitle={`Chi phí phụ trợ cho phiếu: ${document?.documentNumber || "Đang tải..."}`}
      icon={<Anchor className="w-6 h-6 text-orange-500" />}
      maxWidth="max-w-5xl"
      footer={modalFooter}
    >
      <div className="p-6 flex flex-col gap-6">
        
        {loadingDoc ? (
          <div className="flex justify-center items-center py-4 text-orange-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : isDocumentLocked && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-1">Cảnh báo Toàn vẹn Dữ liệu</h4>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                Chứng từ gốc đã được <b className="uppercase">{document?.status}</b> và ghi sổ kế toán (Posted). Để bảo vệ Giá vốn hàng bán (COGS), hệ thống đã vô hiệu hóa tính năng thêm mới và phân bổ Landed Cost. Bạn chỉ có quyền Xem (Read-only).
              </p>
            </div>
          </div>
        )}

        {/* KHU VỰC 1: FORM THÊM MỚI (Vô hiệu hóa nếu isLocked) */}
        <form onSubmit={handleAdd} className={cn("p-5 rounded-3xl border flex flex-col md:flex-row gap-4 items-end shadow-sm transition-all", isDocumentLocked ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 grayscale-[50%]" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700")}>
          <div className="flex-1 space-y-1.5 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase">Tên Chi phí (Phí vận chuyển, Hải quan...)</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" name="expenseName" value={formData.expenseName} onChange={handleChange} required placeholder="VD: Phí vận chuyển ViettelPost"
                disabled={isDocumentLocked || isCreating}
                className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none shadow-sm disabled:cursor-not-allowed"
              />
            </div>
          </div>
          
          <div className="flex-1 space-y-1.5 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase">Số tiền ({currencyCode})</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="number" name="amount" value={formData.amount} onChange={handleChange} required min="1" placeholder="VD: 500000"
                disabled={isDocumentLocked || isCreating}
                className="w-full pl-9 pr-3 py-3 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/50 rounded-xl text-sm font-black text-orange-600 dark:text-orange-400 focus:ring-2 focus:ring-orange-500 outline-none shadow-inner disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800"
              />
            </div>
          </div>

          <div className="flex-1 space-y-1.5 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase">Tiêu chí phân bổ</label>
            <div className="relative">
              <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                name="allocationMethod" value={formData.allocationMethod} onChange={handleChange}
                disabled={isDocumentLocked || isCreating}
                className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none shadow-sm disabled:cursor-not-allowed"
              >
                <option value="BY_VALUE">Theo Giá trị hàng hóa (Khuyên dùng)</option>
                <option value="BY_QUANTITY">Theo Thể tích / Số lượng hàng</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={isCreating || isDocumentLocked} className="w-full md:w-auto px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none shrink-0 flex items-center justify-center gap-2">
            {isCreating ? <Loader2 className="w-5 h-5 animate-spin"/> : "Ghi nhận"}
          </button>
        </form>

        {/* KHU VỰC 2: DANH SÁCH ĐÃ THÊM */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-5 py-4 bg-slate-50 dark:bg-[#0B0F19] border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Anchor className="w-4 h-4 text-orange-500" /> Bảng kê Phụ phí đã lưu
            </h4>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
              <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="p-4 w-[30%]">Tên Chi phí</th>
                  <th className="p-4 w-[20%] text-right">Số tiền ({currencyCode})</th>
                  <th className="p-4 w-[20%]">Phương thức Phân bổ</th>
                  <th className="p-4 w-[15%] text-center">Trạng thái</th>
                  <th className="p-4 w-[15%] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingLCs ? (
                  <tr><td colSpan={5} className="p-8 text-center text-orange-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr>
                ) : landedCosts.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic font-medium">Chưa có chi phí phụ trợ nào được ghi nhận cho chứng từ này.</td></tr>
                ) : (
                  landedCosts.map((lc: any) => (
                    <tr key={lc.landedCostId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{lc.expenseName}</td>
                      <td className="p-4 font-black text-orange-600 dark:text-orange-400 text-right">{formatVND(lc.amount)}</td>
                      <td className="p-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                          {lc.allocationMethod === "BY_VALUE" ? "Theo Giá trị" : "Theo Số lượng"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border shadow-sm",
                          lc.isAllocated ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400" : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400"
                        )}>
                          {lc.isAllocated ? <CheckCircle2 className="w-3.5 h-3.5"/> : <AlertOctagon className="w-3.5 h-3.5"/>}
                          {lc.isAllocated ? "Đã Phân bổ" : "Chưa thực hiện"}
                        </span>
                      </td>
                      <td className="p-4 flex items-center justify-end gap-2">
                        {!lc.isAllocated && (
                          <>
                            <button 
                              onClick={() => handleAllocate(lc.landedCostId)} 
                              disabled={isAllocating || isDocumentLocked} 
                              className="text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Áp vào Giá Vốn
                            </button>
                            <button 
                              onClick={() => handleDelete(lc.landedCostId)} 
                              disabled={isDeleting || isDocumentLocked} 
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Modal>
  );
}