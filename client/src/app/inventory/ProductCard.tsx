import React from "react";
import { Product } from "@/state/api";
import Rating from "@/app/(components)/Rating";
import { 
  ArrowDownToLine, ArrowUpFromLine, Edit, Trash2, QrCode, 
  ImageOff, Tag, AlertTriangle, ChevronDown, ChevronUp, Layers, TrendingUp, Package, Box
} from "lucide-react";

type ProductCardProps = {
  product: Product;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onOpenModal: (type: "TX_IN" | "TX_OUT" | "EDIT" | "QR", product: Product) => void;
  onDelete: (id: string) => void;
  formatStockDisplay: (product: Product) => string;
};

const ProductCard = ({ product, isExpanded, onToggleExpand, onOpenModal, onDelete, formatStockDisplay }: ProductCardProps) => {
  const purchasePrice = product.purchasePrice || 0;
  const sellingPrice = product.price || 0;
  const profitMargin = sellingPrice - purchasePrice;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group">
      
      {/* --- PHẦN 1: THÔNG TIN TỔNG QUAN --- */}
      <div className="flex flex-col lg:flex-row p-4 gap-5 items-stretch">
        
        {/* CỘT 1: HÌNH ẢNH (Kích thước cố định chống vỡ) */}
        <div className="w-full lg:w-28 lg:h-28 rounded-xl bg-gray-50 border border-gray-200 flex-shrink-0 relative flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 opacity-60">
              <ImageOff className="w-8 h-8 mb-1" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Trống</span>
            </div>
          )}
          {product.status === "DISCONTINUED" && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10">
              <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase shadow-md">Ngừng KD</span>
            </div>
          )}
        </div>

        {/* CỘT 2: THÔNG TIN CƠ BẢN (Dùng min-w-0 để chống tràn text dài) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate mb-1.5" title={product.name}>
              {product.name}
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                 <Package className="w-3.5 h-3.5 text-gray-500"/> {product.productId}
              </span>
              {product.category && (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                  <Tag className="w-3.5 h-3.5"/> {product.category}
                </span>
              )}
              <Rating rating={product.rating || 0} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {product.hasBatches && <span className="text-[10px] font-bold text-orange-800 bg-orange-100 px-2.5 py-1 rounded-md border border-orange-200 shadow-sm">🗓 QUẢN LÝ LÔ (FEFO)</span>}
            {product.hasVariants && <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 shadow-sm">🏷 CÓ PHÂN LOẠI</span>}
          </div>
        </div>

        {/* CỘT 3: TÀI CHÍNH (Widget Độc lập, Nền xám nhạt) */}
        <div className="w-full lg:w-48 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-center flex-shrink-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Giá Bán</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giá Vốn</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xl font-black text-blue-700 truncate mr-2" title={`$${sellingPrice.toFixed(2)}`}>${sellingPrice.toFixed(2)}</span>
            <span className="text-sm font-semibold text-slate-400 line-through truncate">${purchasePrice.toFixed(2)}</span>
          </div>
          {profitMargin > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100/50 w-full px-2 py-1 rounded border border-emerald-100">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600"/> Lãi: <span className="truncate">+${profitMargin.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* CỘT 4: TỒN KHO & NÚT EXPAND (Widget Độc lập, Nền xanh nhạt) */}
        <div className="w-full lg:w-44 bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex flex-col justify-center items-center flex-shrink-0 relative">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Box className="w-3 h-3"/> TỔNG TỒN KHO</span>
          
          <span className={`text-xl font-black text-center truncate w-full ${product.stockQuantity === 0 ? 'text-rose-600' : 'text-blue-800'}`} title={formatStockDisplay(product)}>
            {formatStockDisplay(product)}
          </span>
          
          {product.stockQuantity > 0 && product.stockQuantity <= (product.reorderPoint || 0) && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
              <AlertTriangle className="w-3 h-3"/> Sắp hết hàng
            </div>
          )}

          {/* Nút nội soi Tồn Kho chi tiết */}
          {(product.hasVariants || product.hasBatches) && (
            <button 
              onClick={() => onToggleExpand(product.productId)} 
              className={`mt-2.5 w-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all py-1.5 rounded-lg border ${isExpanded ? 'bg-blue-600 text-white border-blue-700 shadow-inner' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-sm'}`}
            >
              {isExpanded ? <><ChevronUp className="w-4 h-4"/> Đóng Lô/Size</> : <><ChevronDown className="w-4 h-4"/> Nội soi Kho</>}
            </button>
          )}
        </div>

        {/* CỘT 5: THAO TÁC (Chia dòng logic) */}
        <div className="w-full lg:w-36 flex flex-col gap-2 flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={() => onOpenModal("TX_IN", product)} disabled={product.status === "DISCONTINUED"} className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              <ArrowDownToLine className="w-4 h-4"/> Nhập
            </button>
            <button onClick={() => onOpenModal("TX_OUT", product)} disabled={product.stockQuantity <= 0} className="flex-1 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white border border-amber-200 px-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              <ArrowUpFromLine className="w-4 h-4"/> Xuất
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onOpenModal("QR", product)} className="flex-1 bg-white hover:bg-purple-50 text-slate-500 hover:text-purple-600 border border-slate-200 p-2 rounded-lg flex justify-center transition-colors shadow-sm" title="In Tem QR"><QrCode className="w-4 h-4"/></button>
            <button onClick={() => onOpenModal("EDIT", product)} className="flex-1 bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 p-2 rounded-lg flex justify-center transition-colors shadow-sm" title="Sửa Master Data"><Edit className="w-4 h-4"/></button>
            <button onClick={() => onDelete(product.productId)} className="flex-1 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 p-2 rounded-lg flex justify-center transition-colors shadow-sm" title="Xóa Sản Phẩm"><Trash2 className="w-4 h-4"/></button>
          </div>
        </div>

      </div>

      {/* --- PHẦN 2: EXPAND (CHI TIẾT LÔ / SIZE) --- */}
      {isExpanded && (
        <div className="border-t border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/30 p-4 lg:p-6 animate-in slide-in-from-top-2 fade-in duration-300">
          <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600"/> Phân bổ Tồn kho theo Thuộc tính & Lô hàng
          </h4>
          
          <div className="overflow-x-auto rounded-xl border border-indigo-100 shadow-sm bg-white">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-indigo-50/50 text-indigo-800 text-[11px] font-bold uppercase tracking-wider border-b border-indigo-100">
                  <th className="px-5 py-3">Phân loại (Variant)</th>
                  <th className="px-5 py-3">Mã Lô (Batch)</th>
                  <th className="px-5 py-3">Hạn sử dụng</th>
                  <th className="px-5 py-3 text-right">Tồn Kho Thực Tế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {product.hasBatches && product.Batches && product.Batches.length > 0 ? (
                  product.Batches.map((batch: any) => {
                    const variantInfo = product.Variants?.find(v => v.variantId === batch.variantId);
                    const isExpired = new Date(batch.expiryDate).getTime() < new Date().getTime();
                    return (
                      <tr key={batch.batchId} className="hover:bg-blue-50/50 text-sm transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-indigo-700">{variantInfo?.attributes || "Mặc định"}</td>
                        <td className="px-5 py-3.5 font-mono font-bold text-orange-700">{batch.batchNumber}</td>
                        <td className={`px-5 py-3.5 font-bold flex items-center gap-2 ${isExpired ? 'text-rose-600' : 'text-slate-700'}`}>
                          {new Date(batch.expiryDate).toLocaleDateString("vi-VN")} 
                          {isExpired && <span className="text-[9px] bg-rose-100 px-1.5 py-0.5 rounded text-rose-700 border border-rose-200">HẾT HẠN</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-blue-700 text-base">{batch.stockQuantity}</td>
                      </tr>
                    );
                  })
                ) : product.hasVariants && product.Variants && product.Variants.length > 0 ? (
                  product.Variants.map((variant: any) => (
                    <tr key={variant.variantId} className="hover:bg-blue-50/50 text-sm transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-indigo-700">{variant.attributes}</td>
                      <td className="px-5 py-3.5 text-slate-400 italic text-xs">Không áp dụng</td>
                      <td className="px-5 py-3.5 text-slate-400 italic text-xs">Không áp dụng</td>
                      <td className="px-5 py-3.5 text-right font-black text-blue-700 text-base">{variant.stockQuantity}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm font-medium text-slate-400">Chưa có dữ liệu tồn kho chi tiết.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;