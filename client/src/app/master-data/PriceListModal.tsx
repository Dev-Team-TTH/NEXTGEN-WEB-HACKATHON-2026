"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Save, Loader2, DollarSign, Tag, Info, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

// --- API ---
import { 
  useGetProductsQuery, 
  useGetCurrenciesQuery,
  useCreatePriceListMutation, 
  useUpdatePriceListMutation 
} from "@/state/api";

import Modal from "@/app/(components)/Modal";
// 🚀 TÁI SỬ DỤNG UTILS
import { safeRound } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  priceListToEdit?: any | null;
};

// ==========================================
// CẤU TRÚC INTERFACE BẢNG GIÁ
// ==========================================
interface PriceListItem {
  itemId?: string; 
  productId: string;
  price: number | string;
  minQuantity: number | string;
}

interface PriceListForm {
  code: string;
  name: string;
  currencyCode: string;
  isActive: boolean;
}

export default function PriceListModal({ isOpen, onClose, priceListToEdit }: Props) {
  const [formData, setFormData] = useState<PriceListForm>({
    code: "",
    name: "",
    currencyCode: "",
    isActive: true,
  });

  const [items, setItems] = useState<PriceListItem[]>([]);

  const { data: productsResponse, isLoading: loadingProducts } = useGetProductsQuery({ limit: 1000 } as any, { skip: !isOpen });
  const { data: currenciesResponse, isLoading: loadingCurrencies } = useGetCurrenciesQuery(undefined, { skip: !isOpen });
  
  const [createPriceList, { isLoading: isCreating }] = useCreatePriceListMutation();
  const [updatePriceList, { isLoading: isUpdating }] = useUpdatePriceListMutation();

  const isSubmitting = isCreating || isUpdating;

  const products = useMemo(() => {
    if (!productsResponse) return [];
    return Array.isArray(productsResponse) ? productsResponse : ((productsResponse as any).data || []);
  }, [productsResponse]);

  const currencies = useMemo(() => {
    if (!currenciesResponse) return [];
    return Array.isArray(currenciesResponse) ? currenciesResponse : ((currenciesResponse as any).data || []);
  }, [currenciesResponse]);

  useEffect(() => {
    if (isOpen) {
      if (priceListToEdit) {
        setFormData({
          code: priceListToEdit.code || "",
          name: priceListToEdit.name || "",
          currencyCode: priceListToEdit.currencyCode || (currencies[0]?.currencyCode || "VND"),
          isActive: priceListToEdit.isActive !== false,
        });
        
        const mappedItems = priceListToEdit.items?.map((item: any) => ({
          itemId: item.itemId || item.id, 
          productId: item.productId || "",
          price: item.price || 0,
          minQuantity: item.minQuantity || 1,
        })) || [];
        setItems(mappedItems);

      } else {
        setFormData({ 
          code: "", 
          name: "", 
          currencyCode: currencies[0]?.currencyCode || "VND", 
          isActive: true 
        });
        setItems([]);
      }
    }
  }, [isOpen, priceListToEdit, currencies]);

  const handleAddItem = () => {
    setItems(prev => [...prev, { productId: "", price: 0, minQuantity: 1 }]);
  };

  const handleRemoveItem = (indexToRemove: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleItemChange = (index: number, field: keyof PriceListItem, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name) {
      toast.error("Vui lòng nhập Mã và Tên bảng giá!");
      return;
    }
    if (!formData.currencyCode) {
      toast.error("Vui lòng chọn Loại Tiền Tệ áp dụng cho bảng giá này!");
      return;
    }

    const validItems = items.filter(item => item.productId && item.productId.trim() !== "");
    
    // 🚀 SỬ DỤNG UTILS `safeRound` ĐỂ CHỐNG LỖI SAI SỐ THẬP PHÂN KHI BẮN LÊN DATABASE
    const sanitizedItems = validItems.map(item => ({
      ...(item.itemId ? { itemId: item.itemId } : {}), 
      productId: item.productId,
      price: safeRound(Number(item.price) || 0),
      minQuantity: safeRound(Number(item.minQuantity) || 1)
    }));

    if (sanitizedItems.length === 0 && items.length > 0) {
      toast.error("Vui lòng chọn Sản phẩm cho các dòng cấu hình giá!");
      return;
    }

    const payload = { 
      ...formData, 
      items: sanitizedItems 
    };

    try {
      if (priceListToEdit) {
        const recordId = priceListToEdit.priceListId || priceListToEdit.id;
        await updatePriceList({ id: recordId, data: payload }).unwrap();
        toast.success(`Đã cập nhật Bảng giá: ${formData.name}`);
      } else {
        await createPriceList(payload).unwrap();
        toast.success(`Đã khởi tạo Bảng giá: ${formData.name}`);
      }
      onClose(); 
    } catch (error: any) {
      console.error("Lỗi lưu Bảng Giá:", error);
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi giao tiếp với máy chủ!");
    }
  };

  const modalFooter = (
    <div className="flex w-full items-center justify-between">
      <p className="text-[11px] font-bold text-slate-400 hidden sm:flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" /> Bảng giá sẽ được tự động áp dụng khi lập Đơn hàng (PO/SO).
      </p>
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button 
          type="button" onClick={onClose} disabled={isSubmitting} 
          className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 disabled:opacity-50"
        >
          Hủy bỏ
        </button>
        <button 
          onClick={handleSubmit} disabled={isSubmitting}
          className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {priceListToEdit ? "Lưu thay đổi" : "Ban hành Bảng giá"}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={priceListToEdit ? "Cập nhật Bảng giá (Price List)" : "Thiết lập Bảng giá mới"}
      subtitle="Quản lý chính sách giá bán/mua riêng biệt cho từng cấp độ đối tác."
      icon={<DollarSign className="w-6 h-6 text-indigo-500" />}
      maxWidth="max-w-5xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6 sm:p-8 flex flex-col gap-8 bg-slate-50/30 dark:bg-[#0B0F19]/50">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
            <Tag className="w-4 h-4 text-indigo-500" /> Định danh Bảng giá
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors tracking-wider">
                Mã bảng giá <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" required disabled={!!priceListToEdit}
                value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                placeholder="VD: VIP_2026"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60 transition-all shadow-inner uppercase"
              />
            </div>
            
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors tracking-wider">
                Tên bảng giá <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" required
                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="VD: Chính sách Đại lý Cấp 1"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
              />
            </div>
            
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors tracking-wider">
                Đồng tiền giao dịch <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                {loadingCurrencies && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-500" />}
                <select 
                  value={formData.currencyCode} onChange={(e) => setFormData({...formData, currencyCode: e.target.value})}
                  disabled={loadingCurrencies}
                  className="w-full pl-4 pr-10 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-sm font-black text-indigo-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm cursor-pointer appearance-none disabled:opacity-50"
                >
                  <option value="" disabled>-- Chọn --</option>
                  {currencies.map((c: any) => (
                    <option key={c.currencyCode || c.id} value={c.currencyCode} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">
                      {c.currencyCode} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="bg-slate-50 dark:bg-[#050810] px-5 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-white/5 shrink-0">
            <div>
              <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-widest">Danh sách Sản phẩm áp dụng</h3>
              <p className="text-[11px] font-bold text-slate-500 mt-1">Cấu hình giá bán/mua ưu đãi tương ứng với Khối lượng (Tiered Pricing).</p>
            </div>
            <button 
              type="button" onClick={handleAddItem} 
              className="flex items-center justify-center gap-2 text-sm font-black text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30 px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm Mặt hàng
            </button>
          </div>
          
          <div className="overflow-x-auto max-h-[400px] scrollbar-thin">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 sticky top-0 z-10">
                <tr className="text-slate-500">
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] w-1/2">Mã / Tên Hàng hóa</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] w-1/4 text-right">Đơn giá ({formData.currencyCode})</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] w-1/4 text-center">Yêu cầu SL (Min Qty)</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] text-center w-16">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-slate-50/50 dark:bg-slate-900/50">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-300 dark:border-slate-700">
                        <DollarSign className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm font-bold">Bảng giá chưa có mặt hàng nào.</p>
                      <p className="text-slate-500 text-xs font-medium mt-1">Vui lòng bấm nút "Thêm Mặt hàng" ở góc trên bên phải.</p>
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white dark:hover:bg-slate-800/80 transition-colors group">
                    <td className="p-3">
                      <select 
                        value={item.productId} onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                        disabled={loadingProducts}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer appearance-none"
                      >
                        <option value="" disabled className="text-slate-400">-- Click để Chọn Sản phẩm --</option>
                        {products.map((p: any) => (
                          <option key={p.productId || p.id} value={p.productId || p.id}>
                            [{p.productCode || "N/A"}] {p.name || "Sản phẩm không xác định"}
                          </option>
                        ))}
                      </select>
                    </td>
                    
                    <td className="p-3">
                      <div className="relative">
                        <input 
                          type="number" min="0" step="any"
                          value={item.price} onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                          className={cn(
                            "w-full pl-3 pr-12 py-2.5 bg-white dark:bg-slate-900 border rounded-lg text-sm font-black text-right outline-none transition-all shadow-sm",
                            Number(item.price) > 0 
                              ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                              : "text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          )}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 pointer-events-none">
                          {formData.currencyCode || "N/A"}
                        </span>
                      </div>
                    </td>
                    
                    <td className="p-3">
                      <div className="relative">
                        <input 
                          type="number" min="1" step="1"
                          value={item.minQuantity} onChange={(e) => handleItemChange(idx, "minQuantity", e.target.value)}
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-center text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                        />
                      </div>
                    </td>
                    
                    <td className="p-3 text-center">
                      <button 
                        type="button" onClick={() => handleRemoveItem(idx)} 
                        title="Xóa dòng này"
                        className="text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-500/20 p-2.5 rounded-lg transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30 shadow-sm opacity-50 group-hover:opacity-100 focus:opacity-100"
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