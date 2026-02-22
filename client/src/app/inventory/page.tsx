"use client";

import { 
  useGetProductsQuery, 
  useCreateTransactionMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  Product 
} from "@/state/api";
import Header from "@/app/(components)/Header";
import Rating from "@/app/(components)/Rating";
import CreateProductModal from "./CreateProductModal";
import TransactionModal from "./TransactionModal";
import EditProductModal from "./EditProductModal";
import QRCodeModal from "./QRCodeModal";
import { 
  Archive, Download, Search, PackageOpen, 
  ArrowDownToLine, ArrowUpFromLine, PlusCircleIcon, 
  Edit, Trash2, QrCode, ImageOff, MapPin, Tag, AlertTriangle, TrendingUp, SlidersHorizontal, XCircle 
} from "lucide-react";
import { toast } from "react-toastify";
import { useState, useMemo } from "react";
import { exportInventoryToExcel } from "./exportUtils";

const InventoryUnified = () => {
  // --- STATE TÌM KIẾM & BỘ LỌC NÂNG CAO ---
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterStock, setFilterStock] = useState("ALL"); // ALL, LOW, OUT_OF_STOCK

  const [activeModal, setActiveModal] = useState<"CREATE" | "TX_IN" | "TX_OUT" | "EDIT" | "QR" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: products, isError, isLoading } = useGetProductsQuery();
  const [createTransaction, { isLoading: isSubmittingTx }] = useCreateTransactionMutation();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  // Tự động lấy danh sách Danh mục (Category) độc nhất từ dữ liệu
  const uniqueCategories = useMemo(() => {
    if (!products) return [];
    const categories = products.map(p => p.category).filter(Boolean) as string[];
    return Array.from(new Set(categories));
  }, [products]);

  // Thuật toán lọc kết hợp Đa điều kiện (Search + Category + Status + Stock)
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter((p) => {
      // 1. Lọc theo Search Term (Tên hoặc SKU)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchLower) || 
        p.productId.toLowerCase().includes(searchLower);

      // 2. Lọc theo Danh mục
      const matchesCategory = filterCategory === "ALL" || p.category === filterCategory;

      // 3. Lọc theo Trạng thái kinh doanh
      const matchesStatus = filterStatus === "ALL" || p.status === filterStatus;

      // 4. Lọc theo Tình trạng tồn kho
      let matchesStock = true;
      if (filterStock === "LOW") {
        matchesStock = p.stockQuantity > 0 && p.stockQuantity <= (p.reorderPoint || 0);
      } else if (filterStock === "OUT_OF_STOCK") {
        matchesStock = p.stockQuantity === 0;
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });
  }, [products, searchTerm, filterCategory, filterStatus, filterStock]);

  const resetFilters = () => {
    setFilterCategory("ALL");
    setFilterStatus("ALL");
    setFilterStock("ALL");
    setSearchTerm("");
  };

  const formatStockDisplay = (product: Product) => {
    const stock = product.stockQuantity;
    const base = product.baseUnit || "Cái";
    const large = product.largeUnit;
    const rate = product.conversionRate || 1;

    if (!large || rate <= 1 || stock === 0) return `${stock} ${base}`;

    const largeQty = Math.floor(stock / rate); 
    const baseQty = stock % rate;              
    
    let displayStr = [];
    if (largeQty > 0) displayStr.push(`${largeQty} ${large}`);
    if (baseQty > 0) displayStr.push(`${baseQty} ${base}`);
    
    return displayStr.join(" và ");
  };

  const openModal = (type: typeof activeModal, product?: Product) => {
    setSelectedProduct(product || null);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedProduct(null);
  };

  const handleCreateProduct = async (productData: any) => {
    try {
      await createProduct({ ...productData, stockQuantity: 0 }).unwrap();
      toast.success("Tạo sản phẩm mới thành công!");
      closeModal();
    } catch (err) { toast.error("Lỗi khi tạo sản phẩm!"); }
  };

  const handleEditProduct = async (updatedProduct: Product) => {
    try {
      await updateProduct({ productId: updatedProduct.productId, updatedProduct }).unwrap();
      toast.success("Cập nhật thiết lập thành công!");
      closeModal();
    } catch (error) { toast.error("Lỗi khi cập nhật sản phẩm!"); }
  };

  const handleTransaction = async (quantity: number, note: string, unitType: string) => {
    if (!selectedProduct) return;
    const txType = activeModal === "TX_IN" ? "IN" : "OUT";
    const multiplier = unitType === "LARGE" ? (selectedProduct.conversionRate || 1) : 1;
    const finalBaseQuantity = quantity * multiplier;

    if (txType === "OUT" && finalBaseQuantity > selectedProduct.stockQuantity) {
      toast.error(`Kho không đủ! Chỉ còn ${selectedProduct.stockQuantity} ${selectedProduct.baseUnit}.`);
      return;
    }

    try {
      await createTransaction({
        productId: selectedProduct.productId,
        type: txType,
        quantity: finalBaseQuantity,
        note: note || `${txType === "IN" ? "Nhập" : "Xuất"} ${quantity} ${unitType === "LARGE" ? selectedProduct.largeUnit : selectedProduct.baseUnit}`,
      }).unwrap();
      toast.success("Ghi nhận thẻ kho thành công!");
      closeModal();
    } catch (error) { toast.error("Lỗi khi thực hiện giao dịch!"); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("CẢNH BÁO: Xóa sản phẩm sẽ mất toàn bộ lịch sử thẻ kho. Đồng ý?")) {
      try { await deleteProduct(id).unwrap(); toast.success("Đã xóa khỏi hệ thống!"); } 
      catch (e) { toast.error("Lỗi xóa! Dữ liệu đang bị ràng buộc."); }
    }
  };

  const handlePrintQR = () => {
    toast.info("Đã mở lệnh in mã vạch! 🖨️");
  };

  const handleExport = async () => {
    if (!filteredProducts || filteredProducts.length === 0) {
      return toast.warning("Không có dữ liệu để xuất!");
    }
    try {
      await exportInventoryToExcel(filteredProducts);
      toast.success("Đã xuất Báo Cáo ERP Tổng Hợp thành công!");
    } catch (error) {
      toast.error("Có lỗi xảy ra khi xuất file!");
    }
  };

  if (isLoading) return <div className="py-4 text-center text-gray-500 font-medium">Đang tải dữ liệu...</div>;
  if (isError || !products) return <div className="text-center text-red-500 py-4 mt-5">Lỗi kết nối máy chủ!</div>;

  return (
    <div className="flex flex-col w-full pb-10 relative">
      <Header 
        name="Quản trị Kho & Master Data" 
        subtitle="Trung tâm điều phối danh mục, giá trị và biến động hàng hóa"
        icon={Archive}
        action={
          <div className="flex items-center gap-3">
            <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95">
              <Download className="w-5 h-5" /> Báo cáo Excel
            </button>
            <button onClick={() => openModal("CREATE")} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95">
              <PlusCircleIcon className="w-5 h-5" /> Tạo Sản phẩm
            </button>
          </div>
        }
      />
      
      {/* KHU VỰC THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC */}
      <div className="mt-2 mb-6 flex flex-col gap-3">
        {/* Thanh Search + Nút mở bộ lọc */}
        <div className="flex items-center gap-3 w-full lg:w-2/3">
          <div className="flex-1 flex items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 transition-colors shadow-sm focus-within:border-blue-500 overflow-hidden">
            <Search className="w-5 h-5 text-gray-400 ml-4 mr-2" />
            <input 
              className="w-full py-3 px-2 bg-transparent focus:outline-none dark:text-white" 
              placeholder="Tìm kiếm theo Tên hoặc Mã SKU..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="mr-3 text-gray-400 hover:text-red-500 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all shadow-sm border ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <SlidersHorizontal className="w-5 h-5" /> Bộ lọc
          </button>
        </div>

        {/* Khay Bộ Lọc Nâng Cao (Collapse) */}
        {showFilters && (
          <div className="w-full lg:w-2/3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Lọc Ngành Hàng */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Ngành Hàng / Danh Mục</label>
                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
                >
                  <option value="ALL">-- Tất cả danh mục --</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Lọc Trạng Thái */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Trạng Thái Kinh Doanh</label>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
                >
                  <option value="ALL">-- Tất cả trạng thái --</option>
                  <option value="ACTIVE">Đang kinh doanh</option>
                  <option value="OUT_OF_STOCK">Tạm ngưng / Hết hàng</option>
                  <option value="DISCONTINUED">Đã ngừng kinh doanh</option>
                </select>
              </div>

              {/* Lọc Tình Trạng Tồn Kho */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Cảnh Báo Tồn Kho</label>
                <select 
                  value={filterStock} 
                  onChange={(e) => setFilterStock(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
                >
                  <option value="ALL">-- Mọi số lượng --</option>
                  <option value="LOW">Sắp hết hàng (Dưới ngưỡng)</option>
                  <option value="OUT_OF_STOCK">Hết sạch hàng trong kho</option>
                </select>
              </div>
            </div>

            {/* Nút thao tác bộ lọc */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Hiển thị: <strong className="text-blue-600 dark:text-blue-400">{filteredProducts.length}</strong> kết quả
              </span>
              <button 
                onClick={resetFilters}
                className="text-sm font-semibold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                Trở về mặc định
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DANH SÁCH SẢN PHẨM */}
      <div className="flex flex-col gap-5">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <PackageOpen className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
            <span className="text-lg font-medium">Không tìm thấy sản phẩm phù hợp với bộ lọc!</span>
            {(searchTerm || filterCategory !== "ALL" || filterStatus !== "ALL" || filterStock !== "ALL") && (
              <button onClick={resetFilters} className="mt-4 text-sm text-blue-500 font-bold hover:underline">Xóa tất cả bộ lọc</button>
            )}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div key={product.productId} className="flex flex-col xl:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all group overflow-hidden">
              
              {/* CỘT 1: HÌNH ẢNH */}
              <div className="w-full xl:w-48 h-48 xl:h-auto bg-gray-50 dark:bg-gray-700/50 flex-shrink-0 relative overflow-hidden flex items-center justify-center border-b xl:border-b-0 xl:border-r border-gray-100 dark:border-gray-700">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 opacity-60">
                    <ImageOff className="w-10 h-10 mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">No Image</span>
                  </div>
                )}
                {product.status === "DISCONTINUED" && (
                  <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                    <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider transform -rotate-12 shadow-lg">Ngừng bán</span>
                  </div>
                )}
              </div>

              {/* CỘT 2: THÔNG TIN CƠ BẢN */}
              <div className="flex-[2] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors" title={product.name}>{product.name}</h3>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded shadow-sm">
                      {product.productId}
                    </span>
                    {product.category && (
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded flex items-center gap-1">
                        <Tag className="w-3 h-3"/> {product.category}
                      </span>
                    )}
                    {product.location && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded flex items-center gap-1">
                        <MapPin className="w-3 h-3"/> {product.location}
                      </span>
                    )}
                    <Rating rating={product.rating || 0} />
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </div>

                {/* HỆ THỐNG CẢNH BÁO TỒN KHO THÔNG MINH */}
                {product.stockQuantity <= (product.reorderPoint || 0) && product.status !== "DISCONTINUED" && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800/50 animate-pulse w-max">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Cảnh báo: Tồn kho dưới mức an toàn!</span>
                  </div>
                )}
              </div>

              {/* CỘT 3: TÀI CHÍNH & TỒN KHO */}
              <div className="flex-1 flex flex-row xl:flex-col border-t xl:border-t-0 xl:border-l border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex-1 p-4 border-r xl:border-r-0 xl:border-b border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Giá Bán</span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Giá Vốn</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">${product.price.toFixed(2)}</span>
                    <span className="text-sm font-semibold text-gray-500 line-through decoration-gray-300">${(product.purchasePrice || 0).toFixed(2)}</span>
                  </div>
                  {(product.price - (product.purchasePrice || 0)) > 0 && (
                    <div className="mt-1 flex items-center justify-between text-xs font-bold text-green-600">
                      <span>Biên lợi nhuận:</span>
                      <span className="flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/> +${(product.price - (product.purchasePrice || 0)).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 p-4 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tồn Kho Thực Tế</span>
                  <span className={`text-xl font-black text-center ${product.stockQuantity === 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                    {formatStockDisplay(product)}
                  </span>
                  {product.largeUnit && product.conversionRate && product.conversionRate > 1 && product.stockQuantity > 0 && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-semibold bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600">
                      Tổng: {product.stockQuantity} {product.baseUnit}
                    </span>
                  )}
                </div>
              </div>

              {/* CỘT 4: NÚT THAO TÁC */}
              <div className="w-full xl:w-32 flex flex-row xl:flex-col border-t xl:border-t-0 xl:border-l border-gray-100 dark:border-gray-700">
                <button onClick={() => openModal("TX_IN", product)} disabled={product.status === "DISCONTINUED"} className="flex-1 flex justify-center items-center gap-1.5 p-3 xl:p-0 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <ArrowDownToLine className="w-4 h-4"/> <span className="xl:hidden">Nhập</span>
                </button>
                <button onClick={() => openModal("TX_OUT", product)} disabled={product.stockQuantity <= 0} className="flex-1 flex justify-center items-center gap-1.5 p-3 xl:p-0 bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white font-bold border-l xl:border-l-0 xl:border-t xl:border-b border-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <ArrowUpFromLine className="w-4 h-4"/> <span className="xl:hidden">Xuất</span>
                </button>
                <div className="flex-1 flex">
                  <button onClick={() => openModal("QR", product)} className="flex-1 flex items-center justify-center p-3 xl:p-0 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-colors border-l xl:border-l-0 border-gray-100 xl:border-r" title="In Tem QR"><QrCode className="w-4 h-4"/></button>
                  <button onClick={() => openModal("EDIT", product)} className="flex-1 flex items-center justify-center p-3 xl:p-0 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" title="Sửa thông tin"><Edit className="w-4 h-4"/></button>
                  <button onClick={() => handleDelete(product.productId)} className="flex-1 flex items-center justify-center p-3 xl:p-0 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors border-l border-gray-100" title="Xóa Sản Phẩm"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* RENDER CÁC COMPONENT MODALS TỪ CÁC TỆP BÊN NGOÀI */}
      <CreateProductModal isOpen={activeModal === "CREATE"} onClose={closeModal} onCreate={handleCreateProduct} />
      <TransactionModal isOpen={activeModal === "TX_IN" || activeModal === "TX_OUT"} onClose={closeModal} product={selectedProduct} txType={activeModal === "TX_IN" ? "IN" : "OUT"} stockDisplay={selectedProduct ? formatStockDisplay(selectedProduct) : ""} onSubmit={handleTransaction} isSubmitting={isSubmittingTx} />
      <EditProductModal isOpen={activeModal === "EDIT"} onClose={closeModal} product={selectedProduct} onSubmit={handleEditProduct} />
      <QRCodeModal isOpen={activeModal === "QR"} onClose={closeModal} product={selectedProduct} onPrint={handlePrintQR} />

    </div>
  );
};

export default InventoryUnified;