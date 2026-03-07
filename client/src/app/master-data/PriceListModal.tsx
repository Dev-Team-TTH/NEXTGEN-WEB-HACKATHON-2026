"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Loader2, DollarSign, Tag, Info } from "lucide-react";
import { toast } from "react-hot-toast";

// --- API ---
import { 
  useGetProductsQuery, 
  useGetCurrenciesQuery,
  useCreatePriceListMutation, 
  useUpdatePriceListMutation 
} from "@/state/api";

// --- IMPORT CORE MODAL ---
import Modal from "@/app/(components)/Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  priceListToEdit?: any | null;
};

export default function PriceListModal({ isOpen, onClose, priceListToEdit }: Props) {
  // --- STATE ---
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    currencyCode: "VND",
    isActive: true,
  });

  const [items, setItems] = useState<any[]>([]);

  // --- API HOOKS ---
  const { data: productsData } = useGetProductsQuery({} as any);
  const { data: currencies } = useGetCurrenciesQuery();
  const [createPriceList, { isLoading: isCreating }] = useCreatePriceListMutation();
  const [updatePriceList, { isLoading: isUpdating }] = useUpdatePriceListMutation();

  const isSubmitting = isCreating || isUpdating;
  const products = Array.isArray(productsData) ? productsData : ((productsData as any)?.data || []);

  // --- EFFECT ---
  useEffect(() => {
    if (isOpen) {
      if (priceListToEdit) {
        setFormData({
          code: priceListToEdit.code || "",
          name: priceListToEdit.name || "",
          currencyCode: priceListToEdit.currencyCode || "VND",
          isActive: priceListToEdit.isActive !== false,
        });
        setItems(priceListToEdit.items?.map((item: any) => ({
          productId: item.productId,
          price: item.price,
          minQuantity: item.minQuantity,
        })) || []);
      } else {
        setFormData({ code: "", name: "", currencyCode: "VND", isActive: true });
        setItems([]);
      }
    }
  }, [isOpen, priceListToEdit]);

  // --- HANDLERS ---
  const handleAddItem = () => {
    setItems([...items, { productId: "", price: 0, minQuantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast.error("Vui lòng nhập Mã và Tên bảng giá!");
      return;
    }

    const validItems = items.filter(item => item.productId !== "");
    const payload = { ...formData, items: validItems };

    try {
      if (priceListToEdit) {
        await updatePriceList({ id: priceListToEdit.priceListId || priceListToEdit.id, data: payload }).unwrap();
        toast.success("Cập nhật Bảng giá thành công!");
      } else {
        await createPriceList(payload).unwrap();
        toast.success("Tạo Bảng giá thành công!");
      }
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi lưu bảng giá!");
    }
  };

  // --- FOOTER RENDER ---
  const modalFooter = (
    <>
      <button 
        type="button" onClick={onClose} disabled={isSubmitting} 
        className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition"
      >
        Hủy bỏ
      </button>
      <button 
        onClick={handleSubmit} disabled={isSubmitting}
        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg flex items-center gap-2 transition active:scale-95 disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {priceListToEdit ? "Lưu thay đổi" : "Lưu Bảng giá"}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={priceListToEdit ? "Cập nhật Bảng giá (Price List)" : "Thiết lập Bảng giá mới"}
      subtitle="Quản lý chính sách giá bán/mua theo từng cấp độ khách hàng."
      icon={<DollarSign className="w-6 h-6" />}
      maxWidth="max-w-5xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6 sm:p-8 flex flex-col gap-8">
        
        {/* 1. THÔNG TIN CHUNG */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-500" /> Định danh Bảng giá
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">
                Mã bảng giá <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" required disabled={!!priceListToEdit}
                value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="VD: VIP_2026"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 transition-all shadow-sm"
              />
            </div>
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">
                Tên bảng giá <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" required
                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="VD: Chính sách Đại lý Cấp 1"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">
                Loại tiền tệ áp dụng
              </label>
              <select 
                value={formData.currencyCode} onChange={(e) => setFormData({...formData, currencyCode: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-indigo-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm cursor-pointer"
              >
                {currencies?.map(c => <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode} - {c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 2. CẤU HÌNH CHI TIẾT SẢN PHẨM */}
        <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-white/5">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Danh mục Sản phẩm</h3>
              <p className="text-xs text-slate-500 mt-0.5">Thiết lập giá bán/mua riêng biệt cho từng mặt hàng.</p>
            </div>
            <button 
              type="button" onClick={handleAddItem} 
              className="flex items-center justify-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm Dòng (Line)
            </button>
          </div>
          
          <div className="overflow-x-auto max-h-[350px] custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/5 sticky top-0 z-10">
                <tr className="text-slate-500">
                  <th className="p-4 font-bold uppercase tracking-wider text-xs w-1/2">Hàng hóa / Dịch vụ</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-xs w-1/4 text-right">Đơn giá quy định</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-xs w-1/4 text-center">Yêu cầu SL tối thiểu</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-xs text-center w-16">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-900/50">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center">
                      <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm font-medium">Bảng giá đang trống. Nhấn "Thêm Dòng" để cấu hình.</p>
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3">
                      <select 
                        value={item.productId} onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Click để Chọn Sản phẩm --</option>
                        {products?.map((p: any) => <option key={p.productId} value={p.productId}>[{p.productCode}] {p.name}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="relative">
                        <input 
                          type="number" min="0" 
                          value={item.price} onChange={(e) => handleItemChange(idx, "price", Number(e.target.value))}
                          className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-bold text-right text-indigo-700 dark:text-indigo-400 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">{formData.currencyCode}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <input 
                        type="number" min="1" 
                        value={item.minQuantity} onChange={(e) => handleItemChange(idx, "minQuantity", Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-bold text-center outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        type="button" onClick={() => handleRemoveItem(idx)} 
                        className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Modal>
  );
}