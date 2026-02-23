"use client";

import React, { useState, FormEvent, useEffect, useMemo } from "react";
import { X, ArrowDownToLine, ArrowUpFromLine, Package, Layers, CalendarClock, AlertTriangle, MapPin } from "lucide-react";

const TransactionModal = ({ isOpen, onClose, product, txType, onSubmit, isSubmitting }: any) => {
  const [quantity, setQuantity] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [unitType, setUnitType] = useState<"BASE" | "LARGE">("BASE");
  
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>(""); 
  const [newBatchNumber, setNewBatchNumber] = useState<string>(""); 
  const [expiryDate, setExpiryDate] = useState<string>(""); 
  const [location, setLocation] = useState<string>(""); 

  const isOut = txType === "OUT";

  const availableBatches = useMemo(() => {
    if (!product?.Batches) return [];
    let filtered = product.Batches;
    if (product.hasVariants && selectedVariantId) {
      filtered = filtered.filter((b: any) => b.variantId === selectedVariantId);
    }
    if (isOut) {
      filtered = filtered.filter((b: any) => b.stockQuantity > 0);
    }
    return filtered.sort((a: any, b: any) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [product, selectedVariantId, isOut]);

  useEffect(() => {
    if (isOut && availableBatches.length > 0) {
      setSelectedBatchId(availableBatches[0].batchId);
    } else {
      setSelectedBatchId("");
    }
  }, [availableBatches, isOut]);

  useEffect(() => {
    if (isOpen) {
      setQuantity(""); setNote(""); setUnitType("BASE"); setSelectedVariantId(""); setSelectedBatchId(""); setNewBatchNumber(""); setExpiryDate(""); setLocation("");
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) return;
    if (product.hasVariants && !selectedVariantId) return alert("Vui lòng chọn Phân loại!");
    if (product.hasBatches) {
      if (isOut && !selectedBatchId) return alert("Kho không còn lô hàng nào để xuất!");
      if (!isOut && (!newBatchNumber || !expiryDate)) return alert("Vui lòng nhập Số lô và Hạn sử dụng!");
    }

    onSubmit(
      Number(quantity), note, unitType, 
      selectedVariantId || undefined, 
      selectedBatchId || undefined,
      newBatchNumber || undefined,
      expiryDate || undefined,
      location || undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto">
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-100 ${isOut ? "bg-orange-50" : "bg-green-50"}`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${isOut ? "text-orange-700" : "text-green-700"}`}>
            {isOut ? <ArrowUpFromLine className="w-6 h-6" /> : <ArrowDownToLine className="w-6 h-6" />}
            {isOut ? "Tạo Phiếu Yêu Cầu Xuất Kho" : "Tạo Phiếu Yêu Cầu Nhập Kho"}
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:bg-white rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="w-12 h-12 bg-white rounded flex items-center justify-center border shadow-sm"><Package className="w-6 h-6 text-gray-500" /></div>
            <div>
              <h3 className="font-bold text-gray-900 line-clamp-1">{product.name}</h3>
              <p className="text-sm text-gray-500">Tổng kho SP: <strong className="text-blue-600">{product.stockQuantity} {product.baseUnit}</strong></p>
            </div>
          </div>

          {product.hasVariants && (
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-purple-700 mb-2"><Layers className="w-4 h-4"/> 1. Chọn Phân loại <span className="text-red-500">*</span></label>
              <select value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-purple-200 bg-purple-50 focus:ring-2 focus:ring-purple-500 outline-none font-medium text-purple-900" required>
                <option value="">-- Bấm để chọn phân loại --</option>
                {product.Variants?.map((v: any) => (
                  <option key={v.variantId} value={v.variantId}>{v.attributes} (Tồn loại này: {v.stockQuantity})</option>
                ))}
              </select>
            </div>
          )}

          {product.hasBatches && (!product.hasVariants || selectedVariantId) && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-amber-800"><CalendarClock className="w-4 h-4"/> 2. Quản lý Lô / Date <span className="text-red-500">*</span></label>
              {isOut ? (
                <div>
                  <select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white outline-none font-medium" required>
                    <option value="">-- Chọn Lô để xuất hàng --</option>
                    {availableBatches.map((b: any, index: number) => (
                      <option key={b.batchId} value={b.batchId}>
                        {index === 0 ? "🔥 ƯU TIÊN XUẤT (FEFO): " : ""} Lô {b.batchNumber} - HSD: {new Date(b.expiryDate).toLocaleDateString("vi-VN")} - Tồn: {b.stockQuantity}
                      </option>
                    ))}
                  </select>
                  {availableBatches.length === 0 && <p className="text-xs text-red-500 font-bold mt-2">Biến thể này đã hết hàng trong mọi lô!</p>}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-amber-700 mb-1">Mã Lô in trên hộp <span className="text-red-500">*</span></label><input type="text" value={newBatchNumber} onChange={(e) => setNewBatchNumber(e.target.value)} placeholder="VD: L01-2026" className="w-full px-3 py-2 rounded border border-amber-300 outline-none uppercase" required /></div>
                  <div><label className="block text-xs font-semibold text-amber-700 mb-1">Ngày Hết Hạn <span className="text-red-500">*</span></label><input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3 py-2 rounded border border-red-300 text-red-700 font-bold outline-none" required /></div>
                  <div className="col-span-2"><label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1"><MapPin className="w-3 h-3"/> Vị trí cất lô hàng này (Tùy chọn)</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: Kệ B - Tầng 2" className="w-full px-3 py-2 rounded border border-gray-300 outline-none" /></div>
                  <p className="col-span-2 text-[11px] text-amber-600 italic">💡 Hệ thống sẽ tự gộp số lượng nếu bạn nhập trùng Mã Lô của cùng 1 biến thể.</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">3. Số lượng Giao dịch <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))} className="flex-1 px-4 py-3 text-xl font-bold text-center rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" required />
              <select value={unitType} onChange={(e) => setUnitType(e.target.value as any)} className="w-1/3 px-4 py-3 rounded-xl border border-gray-300 font-semibold outline-none cursor-pointer">
                <option value="BASE">{product.baseUnit || "Lẻ"}</option>
                {product.largeUnit && <option value="LARGE">{product.largeUnit} (x{product.conversionRate})</option>}
              </select>
            </div>
          </div>

          <div><label className="block text-xs font-semibold text-gray-500 mb-1">Ghi chú phiếu (Tùy chọn)</label><input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 outline-none" placeholder="VD: Nhập hàng từ xe tải 51C..." /></div>

          <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed"><strong>Lưu ý:</strong> Nút này chỉ tạo <b>Phiếu Yêu Cầu</b> (PENDING). Tồn kho thực tế sẽ thay đổi sau khi Quản lý duyệt phiếu.</p>
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="px-5 py-3.5 font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Hủy</button>
            <button type="submit" disabled={isSubmitting || (isOut && product.hasBatches && availableBatches.length === 0)} className={`flex-1 py-3.5 text-base font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 ${isSubmitting ? 'opacity-70 cursor-wait' : isOut ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>
              Gửi Yêu Cầu {isOut ? "Xuất" : "Nhập"} Kho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default TransactionModal;