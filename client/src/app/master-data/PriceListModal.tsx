"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion"; // 🚀 BỔ SUNG: Dùng cho Toggle Switch
import { Plus, Trash2, Save, Loader2, DollarSign, Tag, Info, AlertCircle, AlertOctagon, Activity } from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG CONTEXT CHI NHÁNH
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
  // 🚀 BỐI CẢNH REDUX
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  const [formData, setFormData] = useState<PriceListForm>({
    code: "",
    name: "",
    currencyCode: "",
    isActive: true,
  });

  const [items, setItems] = useState<PriceListItem[]>([]);

  // 🚀 BƠM NHÁNH VÀO QUERY ĐỂ LẤY SẢN PHẨM CỦA CHI NHÁNH ĐÓ THÔI
  const { data: productsResponse, isLoading: loadingProducts } = useGetProductsQuery(
    { branchId: activeBranchId, limit: 1000 } as any, 
    { skip: !isOpen || !activeBranchId }
  );
  
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
    
    if (!activeBranchId) {
      toast.error("Lỗi: Chưa chọn Chi nhánh hoạt động!");
      return;
    }

    if (!formData.code || !formData.name) {
      toast.error("Vui lòng nhập Mã và Tên bảng giá!");
      return;
    }
    if (!formData.currencyCode) {
      toast.error("Vui lòng chọn Loại Tiền Tệ áp dụng cho bảng giá này!");
      return;
    }

    const validItems = items.filter(item => item.productId && item.productId.trim() !== "");
    
    // 🚀 SỬ DỤNG UTILS `safeRound` + `Math.max` ĐỂ KHỬ SỐ ÂM KHI COPY-PASTE
    const sanitizedItems = validItems.map(item => ({
      ...(item.itemId ? { itemId: item.itemId } : {}), 
      productId: item.productId,
      price: Math.max(0, safeRound(Number(item.price) || 0)),
      minQuantity: Math.max(1, safeRound(Number(item.minQuantity) || 1))
    }));

    if (sanitizedItems.length === 0 && items.length > 0) {
      toast.error("Vui lòng chọn Sản phẩm cho các dòng cấu hình giá!");
      return;
    }

    // 🚀 LÁ CHẮN BẢO MẬT: CHỐNG TRÙNG LẶP BẬC GIÁ (TIERED PRICING COLLISION)
    const duplicates = sanitizedItems.filter((item, index, self) =>
      index !== self.findIndex((t) => (
        t.productId === item.productId && t.minQuantity === item.minQuantity
      ))
    );

    if (duplicates.length > 0) {
      toast.error("LỖI LOGIC: Phát hiện cấu hình trùng lặp! Một sản phẩm không thể có 2 mức giá với cùng chung một yêu cầu số lượng (Min Qty).");
      return;
    }

    const payload = { 
      ...formData, 
      branchId: activeBranchId, // 🚀 BƠM NGỮ CẢNH CHI NHÁNH
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

  // 🚀 BẢO VỆ GIAO DIỆN TRỐNG CHI NHÁNH
  if (!activeBranchId && isOpen) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Cảnh báo Hệ thống" maxWidth="max-w-md">
        <div className="flex flex-col items-center justify-center py-10 text-center transition-colors duration-500">
          <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 transition-colors duration-500">Chưa chọn Chi nhánh</h2>
          <p className="text-slate-500 text-sm transition-colors duration-500">Vui lòng chọn Chi nhánh làm việc để tạo Bảng giá.</p>
          <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold transition-colors duration-500">Đóng</button>
        </div>
      </Modal>
    );
  }

  const modalFooter = (
    <div className="flex w-full items-center justify-between transition-colors duration-500">
      <p className="text-[11px] font-bold text-slate-400 hidden sm:flex items-center gap-1.5 transition-colors duration-500">
        <AlertCircle className="w-3.5 h-3.5" /> Bảng giá sẽ được tự động quét và áp dụng khi lập Đơn hàng (PO/SO).
      </p>
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button 
          type="button" onClick={onClose} disabled={isSubmitting} 
          className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-all duration-500 active:scale-95 disabled:opacity-50"
        >
          Hủy bỏ
        </button>
        <button 
          onClick={handleSubmit} disabled={isSubmitting}
          className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all duration-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
      subtitle="Quản lý chính sách giá bán/mua riêng biệt, hỗ trợ định giá theo cấp bậc số lượng (Tiered Pricing)."
      icon={<DollarSign className="w-6 h-6 text-indigo-500" />}
      maxWidth="max-w-5xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <div className="p-6 sm:p-8 flex flex-col gap-8 bg-slate-50/50 dark:bg-transparent transition-colors duration-500">
        
        <div className="glass-panel rounded-2xl p-6 shadow-sm transition-colors duration-500">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2 transition-colors duration-500">
            <Tag className="w-4 h-4 text-indigo-500" /> Định danh Bảng giá
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors tracking-wider duration-500">
                Mã bảng giá <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" required disabled={!!priceListToEdit}
                value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                placeholder="VD: VIP_2026"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60 transition-all duration-500 shadow-inner uppercase text-slate-900 dark:text-white"
              />
            </div>
            
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors tracking-wider duration-500">
                Tên bảng giá <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" required
                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="VD: Chính sách Đại lý Cấp 1"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-500 shadow-inner text-slate-900 dark:text-white"
              />
            </div>
            
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors tracking-wider duration-500">
                Đồng tiền <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                {loadingCurrencies && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-500 transition-colors duration-500" />}
                <select 
                  value={formData.currencyCode} onChange={(e) => setFormData({...formData, currencyCode: e.target.value})}
                  disabled={loadingCurrencies}
                  className="w-full pl-4 pr-10 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-sm font-black text-indigo-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-500 shadow-sm cursor-pointer appearance-none disabled:opacity-50"
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

            {/* 🚀 BỔ SUNG: GIAO DIỆN BẬT/TẮT TRẠNG THÁI */}
            <div className="space-y-1.5 group flex flex-col justify-start">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors tracking-wider duration-500 mb-1">
                Trạng thái <span className="text-rose-500">*</span>
              </label>
              <div 
                onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                className={cn("w-14 h-7 mt-1 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shadow-inner", formData.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")}
              >
                <motion.div layout className="w-5 h-5 bg-white rounded-full shadow-md" transition={{ type: "spring", stiffness: 500, damping: 30 }} animate={{ x: formData.isActive ? 28 : 0 }} />
              </div>
            </div>

          </div>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden shadow-sm flex flex-col transition-colors duration-500">
          <div className="bg-slate-50 dark:bg-[#0B0F19] px-5 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0 transition-colors duration-500">
            <div>
              <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-widest transition-colors duration-500">Danh sách Sản phẩm áp dụng</h3>
              <p className="text-[11px] font-bold text-slate-500 mt-1 transition-colors duration-500">Cấu hình giá bán/mua ưu đãi tương ứng với Khối lượng (Tiered Pricing).</p>
            </div>
            <button 
              type="button" onClick={handleAddItem} 
              className="flex items-center justify-center gap-2 text-sm font-black text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30 px-5 py-2.5 rounded-xl transition-all duration-500 active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm Mặt hàng
            </button>
          </div>
          
          <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors duration-500">
                <tr className="text-slate-500">
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] w-1/2">Mã / Tên Hàng hóa</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] w-1/4 text-right">Đơn giá ({formData.currencyCode})</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] w-1/4 text-center">Yêu cầu SL (Min Qty)</th>
                  <th className="p-4 font-black uppercase tracking-widest text-[10px] text-center w-16">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-500">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center transition-colors duration-500">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-300 dark:border-slate-700 transition-colors duration-500">
                        <DollarSign className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm font-bold transition-colors duration-500">Bảng giá chưa có mặt hàng nào.</p>
                      <p className="text-slate-500 text-xs font-medium mt-1 transition-colors duration-500">Vui lòng bấm nút "Thêm Mặt hàng" ở góc trên bên phải.</p>
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white dark:hover:bg-slate-800/80 transition-colors duration-500 group">
                    <td className="p-3">
                      <select 
                        value={item.productId} onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                        disabled={loadingProducts}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer appearance-none transition-colors duration-500"
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
                            "w-full pl-3 pr-12 py-2.5 bg-white dark:bg-slate-900 border rounded-lg text-sm font-black text-right outline-none transition-all duration-500 shadow-sm",
                            Number(item.price) > 0 
                              ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                              : "text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          )}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 pointer-events-none transition-colors duration-500">
                          {formData.currencyCode || "N/A"}
                        </span>
                      </div>
                    </td>
                    
                    <td className="p-3">
                      <div className="relative">
                        <input 
                          type="number" min="1" step="1"
                          value={item.minQuantity} onChange={(e) => handleItemChange(idx, "minQuantity", e.target.value)}
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-center text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm transition-colors duration-500"
                        />
                      </div>
                    </td>
                    
                    <td className="p-3 text-center">
                      <button 
                        type="button" onClick={() => handleRemoveItem(idx)} 
                        title="Xóa dòng này"
                        className="text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-500/20 p-2.5 rounded-lg transition-all duration-500 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30 shadow-sm opacity-50 group-hover:opacity-100 focus:opacity-100"
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