"use client";

import React, { useState } from "react";
import { 
  Anchor, DollarSign, Tag, CheckCircle2, 
  Trash2, Loader2, ArrowDownUp 
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetLandedCostsQuery,
  useCreateLandedCostMutation,
  useDeleteLandedCostMutation,
  useAllocateLandedCostMutation
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
  const { data: landedCosts = [], isLoading: loadingLCs } = useGetLandedCostsQuery({ documentId }, { skip: !isOpen || !documentId });
  
  const [createLandedCost, { isLoading: isCreating }] = useCreateLandedCostMutation();
  const [deleteLandedCost, { isLoading: isDeleting }] = useDeleteLandedCostMutation();
  const [allocateCost, { isLoading: isAllocating }] = useAllocateLandedCostMutation();

  const [formData, setFormData] = useState({
    expenseName: "",
    amount: "",
    allocationMethod: "BY_VALUE"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId) return;

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
    try {
      await deleteLandedCost(id).unwrap();
      toast.success("Đã xóa chi phí!");
    } catch (err: any) {
      toast.error("Lỗi khi xóa chi phí");
    }
  };

  const handleAllocate = async (id: string) => {
    try {
      await allocateCost(id).unwrap();
      toast.success("Đã phân bổ chi phí thành công vào giá vốn hàng tồn kho!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi phân bổ");
    }
  };

  const modalFooter = (
    <div className="flex w-full justify-end">
      <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors">
        Đóng
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cấu hình Landed Cost"
      subtitle="Phân bổ chi phí phụ tùng trực tiếp vào giá vốn (COGS) của phiếu nhập."
      icon={<Anchor className="w-6 h-6 text-orange-500" />}
      maxWidth="max-w-4xl"
      footer={modalFooter}
    >
      <div className="p-6 flex flex-col gap-6">
        
        {/* KHU VỰC 1: FORM THÊM MỚI */}
        <form onSubmit={handleAdd} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-end shadow-sm">
          <div className="flex-1 space-y-1.5 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase">Tên Chi phí</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" name="expenseName" value={formData.expenseName} onChange={handleChange} required placeholder="VD: Phí vận chuyển ViettelPost"
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 space-y-1.5 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase">Số tiền (VND)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="number" name="amount" value={formData.amount} onChange={handleChange} required min="1" placeholder="VD: 500000"
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-orange-600 focus:ring-2 focus:ring-orange-500 outline-none shadow-inner"
              />
            </div>
          </div>

          <div className="flex-1 space-y-1.5 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase">Tiêu chí phân bổ</label>
            <div className="relative">
              <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                name="allocationMethod" value={formData.allocationMethod} onChange={handleChange}
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"
              >
                <option value="BY_VALUE">Theo Giá trị hàng hóa</option>
                <option value="BY_QUANTITY">Theo Số lượng hàng</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={isCreating} className="w-full md:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 shrink-0 h-[42px] flex items-center justify-center gap-2">
            {isCreating ? <Loader2 className="w-5 h-5 animate-spin"/> : "Thêm"}
          </button>
        </form>

        {/* KHU VỰC 2: DANH SÁCH ĐÃ THÊM */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Tên Chi phí</th>
                <th className="p-4">Số tiền (VND)</th>
                <th className="p-4">Tiêu chí</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingLCs ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr>
              ) : landedCosts.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic font-medium bg-slate-50/50 dark:bg-transparent">Chưa có chi phí nào được ghi nhận.</td></tr>
              ) : (
                landedCosts.map((lc: any) => (
                  <tr key={lc.landedCostId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{lc.expenseName}</td>
                    <td className="p-4 font-black text-orange-600 dark:text-orange-400">{formatVND(lc.amount)}</td>
                    <td className="p-4 text-xs font-medium text-slate-600 dark:text-slate-400">{lc.allocationMethod === "BY_VALUE" ? "Theo Giá trị" : "Theo Số lượng"}</td>
                    <td className="p-4 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md border",
                        lc.isAllocated ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400" : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400"
                      )}>
                        {lc.isAllocated ? <CheckCircle2 className="w-3.5 h-3.5"/> : <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
                        {lc.isAllocated ? "Đã Phân bổ" : "Đang chờ"}
                      </span>
                    </td>
                    <td className="p-4 flex items-center justify-end gap-2">
                      {!lc.isAllocated && (
                        <>
                          <button onClick={() => handleAllocate(lc.landedCostId)} disabled={isAllocating} className="text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                            Phân bổ
                          </button>
                          <button onClick={() => handleDelete(lc.landedCostId)} disabled={isDeleting} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors">
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
    </Modal>
  );
}