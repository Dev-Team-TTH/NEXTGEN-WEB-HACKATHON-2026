"use client";

import React, { useState, useEffect } from "react";
import { 
  Package, Barcode, Tag, DollarSign, Layers, 
  CheckCircle2, Loader2, Link as LinkIcon, Building2, AlertCircle, Edit 
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useUpdateProductMutation, 
  useGetCategoriesQuery, 
  useGetUoMsQuery,
  useGetSuppliersQuery,
  Product
} from "@/state/api";

// --- COMPONENTS CỐT LÕI & UTILS ---
import Modal from "@/app/(components)/Modal";
import FileDropzone from "@/app/(components)/FileDropzone";
import { safeRound } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

interface UpdateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const INITIAL_FORM_STATE = {
  productCode: "",
  name: "",
  barcode: "",
  categoryId: "",
  uomId: "",
  supplierId: "",
  price: "",
  purchasePrice: "",
  reorderPoint: "10",
  hasVariants: false,
  hasBatches: false,
  imageUrl: "", 
};

export default function UpdateProductModal({ isOpen, onClose, product }: UpdateProductModalProps) {
  // --- STATE ---
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // --- API HOOKS ---
  const { data: categories = [], isLoading: loadingCats } = useGetCategoriesQuery(undefined, { skip: !isOpen });
  const { data: uoms = [], isLoading: loadingUoms } = useGetUoMsQuery(undefined, { skip: !isOpen });
  const { data: suppliers = [], isLoading: loadingSuppliers } = useGetSuppliersQuery(undefined, { skip: !isOpen });
  
  const [updateProduct, { isLoading: isSubmitting }] = useUpdateProductMutation();

  // 🚀 NẠP DỮ LIỆU CŨ VÀO FORM KHI MỞ MODAL
  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        productCode: product.productCode || "",
        name: product.name || "",
        barcode: (product as any).barcode || "",
        categoryId: product.categoryId || "",
        uomId: product.uomId || "",
        supplierId: (product as any).supplierId || "",
        price: product.price?.toString() || "0",
        purchasePrice: product.purchasePrice?.toString() || "0",
        reorderPoint: product.reorderPoint?.toString() || "10",
        hasVariants: product.hasVariants || false,
        hasBatches: product.hasBatches || false,
        imageUrl: product.imageUrl || "", 
      });
    } else {
      setFormData(INITIAL_FORM_STATE);
    }
  }, [isOpen, product]);

  // --- HANDLERS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUploadSuccess = (url: string) => {
    setFormData((prev) => ({ ...prev, imageUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!formData.productCode || !formData.name || !formData.categoryId || !formData.uomId) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc (*)");
      return;
    }

    const priceVal = Number(formData.price);
    const purchasePriceVal = Number(formData.purchasePrice);
    const reorderVal = Number(formData.reorderPoint);

    if (isNaN(priceVal) || isNaN(purchasePriceVal) || isNaN(reorderVal)) {
      toast.error("Giá tiền và Định mức tồn kho phải là một số hợp lệ!");
      return;
    }

    if (priceVal < 0 || purchasePriceVal < 0 || reorderVal < 0) {
      toast.error("Các giá trị số (Giá, Định mức) không được âm!");
      return;
    }

    if (priceVal > 0 && purchasePriceVal > 0 && priceVal < purchasePriceVal) {
      if (!window.confirm(`CẢNH BÁO: Giá bán (${formData.price}) đang thấp hơn Giá vốn (${formData.purchasePrice}).\nBạn có chắc chắn muốn lưu cấu hình bán lỗ này không?`)) {
        return; 
      }
    }

    try {
      const payload = {
        ...formData,
        productCode: formData.productCode.trim().toUpperCase(),
        name: formData.name.trim(),
        barcode: formData.barcode?.trim(),
        price: safeRound(priceVal),
        purchasePrice: safeRound(purchasePriceVal),
        reorderPoint: reorderVal,
        supplierId: formData.supplierId || undefined, 
      };

      // Gọi API Cập nhật
      await updateProduct({ id: product.productId, data: payload }).unwrap();
      toast.success(`Đã cập nhật sản phẩm: ${formData.name}`);
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi giao tiếp với máy chủ khi cập nhật sản phẩm!");
    }
  };

  const modalFooter = (
    <>
      <button
        type="button" onClick={onClose} disabled={isSubmitting}
        className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        Hủy bỏ
      </button>
      <button
        type="submit" form="update-product-form" disabled={isSubmitting}
        className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2"
      >
        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</> : "Lưu Thay Đổi"}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title="Cập nhật Sản phẩm / Vật tư" subtitle="Điều chỉnh thông tin Master Data"
      icon={<Edit className="w-6 h-6 text-blue-500" />} maxWidth="max-w-5xl" disableOutsideClick={isSubmitting} footer={modalFooter}
    >
      <div className="p-6">
        <form id="update-product-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
          
          {/* CỘT TRÁI: UPLOAD ẢNH */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div className="sticky top-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-500" /> Hình ảnh nhận diện
              </h3>
              
              {formData.imageUrl && (
                <div className="mb-4 relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 aspect-square flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                  <img src={formData.imageUrl} alt="Preview" className="object-contain w-full h-full" />
                </div>
              )}

              <FileDropzone 
                onUploadSuccess={handleImageUploadSuccess}
                accept="image/png, image/jpeg, image/webp"
                label="Kéo thả để tải ảnh mới lên"
                maxSizeMB={5}
              />
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN CHI TIẾT */}
          <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            <div className="sm:col-span-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                1. Thông tin Định danh
              </h3>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                Mã SKU <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" name="productCode" value={formData.productCode} onChange={handleChange} required disabled
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 uppercase cursor-not-allowed"
                  title="Mã SKU là định danh hệ thống, không thể sửa sau khi tạo"
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                Mã Vạch (Barcode)
              </label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" name="barcode" value={formData.barcode} onChange={handleChange}
                  placeholder="Quét mã vạch vào đây..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">
                Tên Hàng hóa / Sản phẩm <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" name="name" value={formData.name} onChange={handleChange} required
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="sm:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                2. Phân loại & Đo lường
              </h3>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">Danh mục <span className="text-rose-500">*</span></label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange} required disabled={loadingCats} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c: any) => <option key={c.categoryId || c.id} value={c.categoryId || c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">Đơn vị gốc (UoM) <span className="text-rose-500">*</span></label>
              <select name="uomId" value={formData.uomId} onChange={handleChange} required disabled={loadingUoms} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                <option value="">-- Chọn đơn vị tính --</option>
                {uoms.map((u: any) => <option key={u.uomId || u.id} value={u.uomId || u.id}>{u.name} ({u.code})</option>)}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">Nhà Cung Cấp Mặc Định</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select name="supplierId" value={formData.supplierId} onChange={handleChange} disabled={loadingSuppliers} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none">
                  <option value="">-- Bỏ trống nếu nhập từ nhiều NCC --</option>
                  {suppliers.map((s: any) => <option key={s.supplierId || s.id} value={s.supplierId || s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                3. Thiết lập Giá & Cảnh báo Kho
              </h3>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">Giá Bán Cơ Sở (VND)</label>
              <div className="relative">
                <DollarSign className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", Number(formData.price) > 0 && Number(formData.price) < Number(formData.purchasePrice) ? "text-rose-500" : "text-emerald-500")} />
                <input type="number" name="price" value={formData.price} onChange={handleChange} min="0" step="1000" className={cn("w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-xl text-sm font-bold outline-none transition-all", Number(formData.price) > 0 && Number(formData.price) < Number(formData.purchasePrice) ? "text-rose-600 border-rose-300 focus:ring-rose-500 bg-rose-50/50 dark:bg-rose-500/10" : "text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-700 focus:ring-emerald-500")} />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">Giá Nhập / Giá Vốn Cơ Sở (VND)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} min="0" step="1000" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-orange-600 dark:text-orange-400 focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors">Định mức tồn tối thiểu (Reorder Point)</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="number" name="reorderPoint" value={formData.reorderPoint} onChange={handleChange} min="0" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border transition-colors mt-2 bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800">
              <label className={cn("flex-1 flex items-center gap-3 p-3 cursor-pointer group rounded-xl border transition-all", formData.hasVariants ? "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30" : "border-transparent")}>
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" name="hasVariants" checked={formData.hasVariants} onChange={handleChange} className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md checked:bg-blue-500 checked:border-blue-500 transition-colors cursor-pointer" />
                  <CheckCircle2 className="absolute text-white w-3.5 h-3.5 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                </div>
                <span className={cn("text-sm font-bold transition-colors", formData.hasVariants ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300 group-hover:text-blue-500")}>Có Biến thể</span>
              </label>

              <label className={cn("flex-1 flex items-center gap-3 p-3 cursor-pointer group rounded-xl border transition-all", formData.hasBatches ? "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30" : "border-transparent")}>
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" name="hasBatches" checked={formData.hasBatches} onChange={handleChange} className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md checked:bg-blue-500 checked:border-blue-500 transition-colors cursor-pointer" />
                  <CheckCircle2 className="absolute text-white w-3.5 h-3.5 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                </div>
                <span className={cn("text-sm font-bold transition-colors", formData.hasBatches ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300 group-hover:text-blue-500")}>Quản lý Lô / Date</span>
              </label>
            </div>

          </div>
        </form>
      </div>
    </Modal>
  );
}