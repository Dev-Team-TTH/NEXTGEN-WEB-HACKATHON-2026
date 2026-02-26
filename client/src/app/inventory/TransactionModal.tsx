"use client";

import React, { useState, FormEvent, useEffect, useMemo } from "react";
import { X, ArrowRightLeft, Package, Layers, CalendarClock, AlertTriangle, MapPin } from "lucide-react";

const TransactionModal = ({ isOpen, onClose, product, onSubmit, isSubmitting }: any) => {
  // NÂNG CẤP: Trạng thái cho Loại giao dịch và hướng điều chỉnh
  const [txCategory, setTxCategory] = useState<"NHAP_HANG" | "XUAT_BAN" | "XUAT_NOI_BO" | "DIEU_CHINH">("NHAP_HANG");
  const [adjustDirection, setAdjustDirection] = useState<"TANG" | "GIAM">("GIAM"); // Dùng cho phần Điều Chỉnh
  
  const [quantity, setQuantity] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [unitType, setUnitType] = useState<"BASE" | "LARGE">("BASE");
  
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>(""); 
  const [newBatchNumber, setNewBatchNumber] = useState<string>(""); 
  const [expiryDate, setExpiryDate] = useState<string>(""); 
  const [location, setLocation] = useState<string>(""); 

  // Logic xác định xem giao dịch này sẽ làm TĂNG hay GIẢM tồn kho
  const isDecrease = txCategory === "XUAT_BAN" || txCategory === "XUAT_NOI_BO" || (txCategory === "DIEU_CHINH" && adjustDirection === "GIAM");

  // Lấy ra các lô khả dụng nếu giao dịch là GIẢM tồn kho
  const availableBatches = useMemo(() => {
    if (!product?.Batches) return [];
    let filtered = product.Batches;
    if (product.hasVariants && selectedVariantId) {
      filtered = filtered.filter((b: any) => b.variantId === selectedVariantId);
    }
    if (isDecrease) {
      filtered = filtered.filter((b: any) => b.stockQuantity > 0);
    }
    return filtered.sort((a: any, b: any) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [product, selectedVariantId, isDecrease]);

  useEffect(() => {
    if (isDecrease && availableBatches.length > 0) {
      setSelectedBatchId(availableBatches[0].batchId);
    } else {
      setSelectedBatchId("");
    }
  }, [availableBatches, isDecrease]);

  useEffect(() => {
    if (isOpen) {
      setTxCategory("NHAP_HANG"); setAdjustDirection("GIAM"); setQuantity(""); setNote(""); setUnitType("BASE"); setSelectedVariantId(""); setSelectedBatchId(""); setNewBatchNumber(""); setExpiryDate(""); setLocation("");
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) return;
    if (product.hasVariants && !selectedVariantId) return alert("Vui lòng chọn Phân loại!");
    if (product.hasBatches) {
      if (isDecrease && !selectedBatchId) return alert("Kho không còn lô hàng nào để xuất/giảm!");
      if (!isDecrease && (!newBatchNumber || !expiryDate)) return alert("Vui lòng nhập Số lô và Hạn sử dụng!");
    }

    // Nếu là Điều chỉnh giảm, ta gửi số âm lên Backend để đánh dấu
    const finalQuantity = (txCategory === "DIEU_CHINH" && adjustDirection === "GIAM") ? -Number(quantity) : Number(quantity);

    onSubmit(
      finalQuantity, 
      note, 
      unitType, 
      selectedVariantId || undefined, 
      selectedBatchId || undefined,
      newBatchNumber || undefined,
      expiryDate || undefined,
      location || undefined,
      txCategory // Gửi thêm loại giao dịch lên API
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-purple-50">
          <h2 className="text-xl font-bold flex items-center gap-2 text-purple-700">
            <ArrowRightLeft className="w-6 h-6" />
            Tạo Phiếu Kho
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

          {/* NÂNG CẤP: CHỌN LOẠI GIAO DỊCH */}
          <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Loại giao dịch <span className="text-red-500">*</span></label>
            <select 
              value={txCategory} 
              onChange={(e) => setTxCategory(e.target.value as any)} 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none font-medium cursor-pointer bg-gray-50 hover:bg-white transition-colors"
            >
              <option value="NHAP_HANG">📦 Nhập hàng (Từ nhà cung cấp)</option>
              <option value="XUAT_BAN">🛒 Xuất bán (Cho khách hàng)</option>
              <option value="XUAT_NOI_BO">🏢 Xuất nội bộ (Sử dụng, luân chuyển)</option>
              <option value="DIEU_CHINH">⚖️ Điều chỉnh tồn kho (Kiểm kê sai lệch)</option>
            </select>
            
            {/* Nếu là Điều chỉnh, cần hỏi người dùng muốn tăng hay giảm */}
            {txCategory === "DIEU_CHINH" && (
              <div className="mt-3 flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <label className="flex-1 flex items-center gap-2 cursor-pointer p-2 bg-white rounded-md border shadow-sm">
                  <input type="radio" name="adjust" checked={adjustDirection === "TANG"} onChange={() => setAdjustDirection("TANG")} className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm text-green-700">Tăng tồn kho (+)</span>
                </label>
                <label className="flex-1 flex items-center gap-2 cursor-pointer p-2 bg-white rounded-md border shadow-sm">
                  <input type="radio" name="adjust" checked={adjustDirection === "GIAM"} onChange={() => setAdjustDirection("GIAM")} className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm text-red-700">Giảm tồn kho (-)</span>
                </label>
              </div>
            )}
          </div>

          {product.hasVariants && (
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2"><Layers className="w-4 h-4"/> 1. Chọn Phân loại <span className="text-red-500">*</span></label>
              <select value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium text-gray-900" required>
                <option value="">-- Bấm để chọn phân loại --</option>
                {product.Variants?.map((v: any) => (
                  <option key={v.variantId} value={v.variantId}>{v.attributes} (Tồn loại này: {v.stockQuantity})</option>
                ))}
              </select>
            </div>
          )}

          {product.hasBatches && (!product.hasVariants || selectedVariantId) && (
            <div className={`p-4 rounded-xl border space-y-3 ${isDecrease ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}`}>
              <label className={`flex items-center gap-2 text-sm font-bold ${isDecrease ? "text-orange-800" : "text-green-800"}`}><CalendarClock className="w-4 h-4"/> 2. Quản lý Lô / Date <span className="text-red-500">*</span></label>
              {isDecrease ? (
                <div>
                  <select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-orange-300 bg-white outline-none font-medium" required>
                    <option value="">-- Chọn Lô để xuất/giảm --</option>
                    {availableBatches.map((b: any, index: number) => (
                      <option key={b.batchId} value={b.batchId}>
                        {index === 0 ? "🔥 ƯU TIÊN (FEFO): " : ""} Lô {b.batchNumber} - HSD: {new Date(b.expiryDate).toLocaleDateString("vi-VN")} - Tồn: {b.stockQuantity}
                      </option>
                    ))}
                  </select>
                  {availableBatches.length === 0 && <p className="text-xs text-red-500 font-bold mt-2">Biến thể này đã hết hàng trong mọi lô!</p>}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-green-700 mb-1">Mã Lô in trên hộp <span className="text-red-500">*</span></label><input type="text" value={newBatchNumber} onChange={(e) => setNewBatchNumber(e.target.value)} placeholder="VD: L01-2026" className="w-full px-3 py-2 rounded border border-green-300 outline-none uppercase bg-white" required /></div>
                  <div><label className="block text-xs font-semibold text-green-700 mb-1">Ngày Hết Hạn <span className="text-red-500">*</span></label><input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3 py-2 rounded border border-green-300 text-green-800 font-bold outline-none bg-white" required /></div>
                  <div className="col-span-2"><label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1"><MapPin className="w-3 h-3"/> Vị trí cất lô hàng này (Tùy chọn)</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: Kệ B - Tầng 2" className="w-full px-3 py-2 rounded border border-gray-300 outline-none bg-white" /></div>
                  <p className="col-span-2 text-[11px] text-green-700 italic">💡 Hệ thống sẽ tự gộp số lượng nếu bạn nhập trùng Mã Lô của cùng 1 biến thể.</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">3. Số lượng giao dịch (Giá trị tuyệt đối) <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))} className="flex-1 px-4 py-3 text-xl font-bold text-center rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="0" required />
              <select value={unitType} onChange={(e) => setUnitType(e.target.value as any)} className="w-1/3 px-4 py-3 rounded-xl border border-gray-300 font-semibold outline-none cursor-pointer">
                <option value="BASE">{product.baseUnit || "Lẻ"}</option>
                {product.largeUnit && <option value="LARGE">{product.largeUnit} (x{product.conversionRate})</option>}
              </select>
            </div>
          </div>

          <div><label className="block text-xs font-semibold text-gray-500 mb-1">Ghi chú phiếu (Tùy chọn)</label><input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 outline-none" placeholder="VD: Lý do xuất/nhập, Biển số xe..." /></div>

          <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed"><strong>Lưu ý:</strong> Nút này chỉ tạo <b>Phiếu Yêu Cầu</b> (PENDING). Tồn kho thực tế sẽ thay đổi sau khi Quản lý duyệt phiếu.</p>
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="px-5 py-3.5 font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Hủy</button>
            <button type="submit" disabled={isSubmitting || (isDecrease && product.hasBatches && availableBatches.length === 0)} className={`flex-1 py-3.5 text-base font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 ${isSubmitting ? 'opacity-70 cursor-wait' : 'bg-purple-600 hover:bg-purple-700'}`}>
              Gửi Yêu Cầu Giao Dịch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default TransactionModal;