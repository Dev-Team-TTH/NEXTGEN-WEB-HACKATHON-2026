"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Save, Loader2, DollarSign } from "lucide-react";
import { toast } from "react-hot-toast";

import { 
  useGetProductsQuery, 
  useGetCurrenciesQuery,
  useCreatePriceListMutation, 
  useUpdatePriceListMutation 
} from "@/state/api";

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

  // State quản lý danh sách sản phẩm trong bảng giá
  const [items, setItems] = useState<any[]>([]);

  // --- API HOOKS ---
  const { data: products } = useGetProductsQuery({});
  const { data: currencies } = useGetCurrenciesQuery();
  const [createPriceList, { isLoading: isCreating }] = useCreatePriceListMutation();
  const [updatePriceList, { isLoading: isUpdating }] = useUpdatePriceListMutation();

  // --- EFFECT: Load dữ liệu khi Edit ---
  useEffect(() => {
    if (priceListToEdit) {
      setFormData({
        code: priceListToEdit.code,
        name: priceListToEdit.name,
        currencyCode: priceListToEdit.currencyCode,
        isActive: priceListToEdit.isActive,
      });
      // Map lại danh sách items hiện có
      setItems(priceListToEdit.items?.map((item: any) => ({
        productId: item.productId,
        price: item.price,
        minQuantity: item.minQuantity,
      })) || []);
    } else {
      // Reset khi tạo mới
      setFormData({ code: "", name: "", currencyCode: "VND", isActive: true });
      setItems([]);
    }
  }, [priceListToEdit]);

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

    // Lọc bỏ các dòng chưa chọn sản phẩm
    const validItems = items.filter(item => item.productId !== "");

    const payload = {
      ...formData,
      items: validItems
    };

    try {
      if (priceListToEdit) {
        await updatePriceList({ id: priceListToEdit.priceListId, data: payload }).unwrap();
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-500" />
              {priceListToEdit ? "Chỉnh sửa Bảng giá" : "Thêm mới Bảng giá"}
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* THÔNG TIN CHUNG */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mã bảng giá</label>
                <input 
                  type="text" required disabled={!!priceListToEdit}
                  value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 outline-none disabled:opacity-60"
                  placeholder="VD: VIP_2026"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tên bảng giá</label>
                <input 
                  type="text" required
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 outline-none"
                  placeholder="VD: Khách hàng VIP"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Loại tiền tệ</label>
                <select 
                  value={formData.currencyCode} onChange={(e) => setFormData({...formData, currencyCode: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 outline-none"
                >
                  {currencies?.map(c => <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode} - {c.name}</option>)}
                </select>
              </div>
            </div>

            {/* DANH SÁCH SẢN PHẨM & GIÁ CHI TIẾT */}
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 flex justify-between items-center border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">Danh sách Sản phẩm áp dụng</h3>
                <button onClick={handleAddItem} className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">
                  <Plus className="w-4 h-4" /> Thêm sản phẩm
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white dark:bg-slate-900 border-b border-slate-200">
                    <tr className="text-slate-500">
                      <th className="p-3 font-semibold w-1/2">Sản phẩm</th>
                      <th className="p-3 font-semibold w-1/4">Đơn giá mới</th>
                      <th className="p-3 font-semibold w-1/4">SL Tối thiểu</th>
                      <th className="p-3 font-semibold text-center w-16">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:bg-slate-900">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400 text-sm">Chưa có sản phẩm nào. Nhấn "Thêm sản phẩm" để bắt đầu.</td>
                      </tr>
                    ) : items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <select 
                            value={item.productId} onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none"
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {products?.map(p => <option key={p.productId} value={p.productId}>[{p.productCode}] {p.name}</option>)}
                          </select>
                        </td>
                        <td className="p-3">
                          <input 
                            type="number" min="0" value={item.price} onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none text-right"
                          />
                        </td>
                        <td className="p-3">
                          <input 
                            type="number" min="1" value={item.minQuantity} onChange={(e) => handleItemChange(idx, "minQuantity", e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none text-center"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleRemoveItem(idx)} className="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50">
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

          {/* FOOTER BẤM LƯU */}
          <div className="p-6 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-3xl">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition">
              Hủy bỏ
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isCreating || isUpdating}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg flex items-center gap-2 transition active:scale-95 disabled:opacity-60"
            >
              {(isCreating || isUpdating) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {priceListToEdit ? "Lưu thay đổi" : "Tạo Bảng giá"}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}