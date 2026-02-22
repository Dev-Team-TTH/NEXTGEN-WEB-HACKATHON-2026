"use client";

import { X, Save, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useState, useEffect, ChangeEvent, FormEvent } from "react";

const TransactionModal = ({ 
  isOpen, 
  onClose, 
  product, 
  txType, 
  stockDisplay, 
  onSubmit, 
  isSubmitting 
}: any) => {
  const [txForm, setTxForm] = useState({ quantity: 0, note: "", unitType: "BASE" });

  useEffect(() => {
    if (isOpen) {
      setTxForm({ quantity: 0, note: "", unitType: "BASE" });
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTxForm((prev) => ({ 
      ...prev, 
      [name]: name === "quantity" ? parseInt(value) || 0 : value 
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(txForm.quantity, txForm.note, txForm.unitType);
  };

  // Tính toán trực tiếp số lượng cơ bản sẽ bị biến động
  const multiplier = txForm.unitType === "LARGE" ? (product.conversionRate || 1) : 1;
  const finalQuantity = (txForm.quantity || 0) * multiplier;
  const isLargeSelected = txForm.unitType === "LARGE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 ${txType === "IN" ? "bg-green-50 dark:bg-green-900/20" : "bg-orange-50 dark:bg-orange-900/20"}`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${txType === "IN" ? "text-green-700 dark:text-green-400" : "text-orange-700 dark:text-orange-400"}`}>
            {txType === "IN" ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpFromLine className="w-5 h-5" />}
            {txType === "IN" ? "Nhập Hàng" : "Xuất Hàng"}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white dark:bg-gray-700 rounded-full shadow-sm transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
            <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{product.name}</h3>
            <p className="text-sm dark:text-gray-300">
              Tồn kho hiện hành: <span className="font-bold text-blue-600 dark:text-blue-400">{stockDisplay}</span>
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Số lượng</label>
              <input 
                type="number" 
                name="quantity" 
                min="1" 
                value={txForm.quantity || ""} 
                onChange={handleChange} 
                className="w-full px-4 py-3 text-2xl font-bold text-center rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all" 
                required 
                autoFocus 
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Chọn Đơn vị</label>
              <select 
                name="unitType" 
                value={txForm.unitType} 
                onChange={handleChange} 
                className="w-full px-4 py-3 text-lg font-bold rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none cursor-pointer transition-all"
              >
                <option value="BASE">{product.baseUnit || "Cái"}</option>
                {product.largeUnit && product.conversionRate && product.conversionRate > 1 && (
                  <option value="LARGE">{product.largeUnit}</option>
                )}
              </select>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${txType === "IN" ? "bg-green-50 border-green-200 text-green-800" : "bg-orange-50 border-orange-200 text-orange-800"}`}>
            <p className="text-xs font-semibold uppercase opacity-80 mb-1">Dữ liệu gốc ghi nhận vào thẻ kho:</p>
            <p className="text-xl font-black">
              {txType === "IN" ? "+" : "-"} {finalQuantity} {product.baseUnit}
            </p>
            {isLargeSelected && (
              <div className="mt-2 pt-2 border-t border-current/20">
                <p className="text-sm font-medium">
                  Diễn giải: {txForm.quantity || 0} {product.largeUnit} × {product.conversionRate} {product.baseUnit}/{product.largeUnit}
                </p>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ghi chú (Tùy chọn)</label>
            <textarea 
              name="note" 
              rows={2} 
              value={txForm.note} 
              onChange={handleChange} 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none resize-none transition-all" 
              placeholder={`VD: ${txType === "IN" ? "Nhập" : "Xuất"} ${txForm.quantity || 0} ${txForm.unitType === "LARGE" ? product.largeUnit : product.baseUnit} từ NCC...`}
            />
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 ${txType === "IN" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"} ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              <Save className="w-4 h-4" /> Ghi sổ thẻ kho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;