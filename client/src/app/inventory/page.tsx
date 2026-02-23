"use client";

import { useState, useMemo } from "react";
import { 
  useGetProductsQuery, 
  useCreateTransactionMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  Product 
} from "@/state/api";
import Header from "@/app/(components)/Header";
import CreateProductModal from "./CreateProductModal";
import TransactionModal from "./TransactionModal";
import EditProductModal from "./EditProductModal";
import QRCodeModal from "./QRCodeModal";
import ProductCard from "./ProductCard"; // Import Component Mới
import { exportInventoryToExcel } from "./exportUtils"; 
import { Archive, Download, Search, PackageOpen, PlusCircleIcon, SlidersHorizontal, XCircle } from "lucide-react";
import { toast } from "react-toastify";

const InventoryUnified = () => {
  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterStock, setFilterStock] = useState("ALL");

  const [activeModal, setActiveModal] = useState<"CREATE" | "TX_IN" | "TX_OUT" | "EDIT" | "QR" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // --- API HOOKS ---
  const { data: products, isError, isLoading } = useGetProductsQuery();
  const [createTransaction, { isLoading: isSubmittingTx }] = useCreateTransactionMutation();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  // --- LOGIC LỌC DỮ LIỆU CHUẨN KHOA HỌC ---
  const uniqueCategories = useMemo(() => {
    if (!products) return [];
    const categories = products.map(p => p.category).filter(Boolean) as string[];
    return Array.from(new Set(categories));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchLower) || p.productId.toLowerCase().includes(searchLower);
      const matchesCategory = filterCategory === "ALL" || p.category === filterCategory;
      const matchesStatus = filterStatus === "ALL" || p.status === filterStatus;
      let matchesStock = true;
      if (filterStock === "LOW") matchesStock = p.stockQuantity > 0 && p.stockQuantity <= (p.reorderPoint || 0);
      else if (filterStock === "OUT_OF_STOCK") matchesStock = p.stockQuantity === 0;

      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });
  }, [products, searchTerm, filterCategory, filterStatus, filterStock]);

  const resetFilters = () => { setFilterCategory("ALL"); setFilterStatus("ALL"); setFilterStock("ALL"); setSearchTerm(""); };

  // --- HÀM TIỆN ÍCH CHO COMPONENT CON ---
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

  const openModal = (type: typeof activeModal, product?: Product) => { setSelectedProduct(product || null); setActiveModal(type); };
  const closeModal = () => { setActiveModal(null); setSelectedProduct(null); };
  const toggleExpand = (productId: string) => { setExpandedProductId(expandedProductId === productId ? null : productId); };

  // --- HÀM GỌI API ---
  const handleCreateProduct = async (productData: any) => {
    try { await createProduct(productData).unwrap(); toast.success("Tạo Master Data thành công!"); closeModal(); } 
    catch (err) { toast.error("Lỗi khi tạo sản phẩm!"); }
  };

  const handleEditProduct = async (updatedProduct: Product) => {
    try { await updateProduct({ productId: updatedProduct.productId, updatedProduct }).unwrap(); toast.success("Cập nhật thiết lập thành công!"); closeModal(); } 
    catch (error) { toast.error("Lỗi khi cập nhật sản phẩm!"); }
  };

  const handleTransaction = async (
    quantity: number, note: string, unitType: string, variantId?: string, batchId?: string, newBatchNumber?: string, expiryDate?: string, location?: string
  ) => {
    if (!selectedProduct) return;
    const txType = activeModal === "TX_IN" ? "IN" : "OUT";
    const multiplier = unitType === "LARGE" ? (selectedProduct.conversionRate || 1) : 1;
    try {
      await createTransaction({
        productId: selectedProduct.productId, type: txType, quantity: quantity * multiplier,
        note: note || `Yêu cầu ${txType === "IN" ? "Nhập" : "Xuất"} ${quantity} ${unitType === "LARGE" ? selectedProduct.largeUnit : selectedProduct.baseUnit}`,
        variantId, batchId, newBatchNumber, expiryDate, location, createdBy: "Thủ Kho" 
      }).unwrap();
      toast.info("Đã gửi Phiếu Yêu Cầu! Chờ duyệt.", { autoClose: 3000 }); closeModal();
    } catch (error) { toast.error("Lỗi khi gửi phiếu giao dịch!"); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("CẢNH BÁO: Xóa sản phẩm sẽ mất toàn bộ lịch sử thẻ kho. Đồng ý?")) {
      try { await deleteProduct(id).unwrap(); toast.success("Đã xóa khỏi hệ thống!"); } 
      catch (e) { toast.error("Lỗi xóa! Dữ liệu đang bị ràng buộc."); }
    }
  };

  const handleExport = async () => {
    if (filteredProducts.length === 0) return toast.warning("Không có dữ liệu để xuất!");
    try { await exportInventoryToExcel(filteredProducts); toast.success("Xuất Báo cáo Excel thành công!"); } 
    catch (error) { toast.error("Lỗi khi xuất file!"); }
  };

  if (isLoading) return <div className="py-4 text-center text-gray-500 font-medium">Đang tải dữ liệu...</div>;
  if (isError || !products) return <div className="text-center text-red-500 py-4 mt-5">Lỗi kết nối máy chủ!</div>;

  return (
    <div className="flex flex-col w-full pb-10 relative">
      <Header 
        name="Quản trị Kho & Master Data" 
        subtitle="Hệ thống WMS thông minh quản lý Biến thể & Lô hàng FEFO"
        icon={Archive}
        action={
          <div className="flex items-center gap-3">
            <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95"><Download className="w-5 h-5" /> Xuất Excel</button>
            <button onClick={() => openModal("CREATE")} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95"><PlusCircleIcon className="w-5 h-5" /> Master Data Mới</button>
          </div>
        }
      />
      
      {/* KHU VỰC BỘ LỌC NÂNG CAO */}
      <div className="mt-2 mb-6 flex flex-col gap-3">
        <div className="flex items-center gap-3 w-full lg:w-2/3">
          <div className="flex-1 flex items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 transition-colors shadow-sm focus-within:border-blue-500 overflow-hidden">
            <Search className="w-5 h-5 text-gray-400 ml-4 mr-2" />
            <input className="w-full py-3 px-2 bg-transparent focus:outline-none dark:text-white" placeholder="Tìm theo Tên hoặc Mã SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && <button onClick={() => setSearchTerm("")} className="mr-3 text-gray-400 hover:text-red-500 transition-colors"><XCircle className="w-5 h-5" /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all shadow-sm border ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}><SlidersHorizontal className="w-5 h-5" /> Bộ lọc</button>
        </div>

        {showFilters && (
          <div className="w-full lg:w-2/3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Danh Mục</label><select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"><option value="ALL">-- Tất cả --</option>{uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Trạng Thái</label><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"><option value="ALL">-- Tất cả --</option><option value="ACTIVE">Đang kinh doanh</option><option value="OUT_OF_STOCK">Tạm ngưng</option><option value="DISCONTINUED">Ngừng KD</option></select></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cảnh Báo Kho</label><select value={filterStock} onChange={(e) => setFilterStock(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"><option value="ALL">-- Mọi số lượng --</option><option value="LOW">Sắp hết hàng</option><option value="OUT_OF_STOCK">Hết sạch hàng</option></select></div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100"><span className="text-sm font-medium text-gray-500">Hiển thị: <strong className="text-blue-600">{filteredProducts.length}</strong> kết quả</span><button onClick={resetFilters} className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors">Trở về mặc định</button></div>
          </div>
        )}
      </div>

      {/* DANH SÁCH SẢN PHẨM RENDER BẰNG COMPONENT ĐÃ TÁCH */}
      <div className="flex flex-col gap-4">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <PackageOpen className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
            <span className="text-lg font-medium">Không tìm thấy sản phẩm!</span>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard 
              key={product.productId} 
              product={product} 
              isExpanded={expandedProductId === product.productId}
              onToggleExpand={toggleExpand}
              onOpenModal={openModal}
              onDelete={handleDelete}
              formatStockDisplay={formatStockDisplay}
            />
          ))
        )}
      </div>

      {/* RENDER CÁC MODAL */}
      <CreateProductModal isOpen={activeModal === "CREATE"} onClose={closeModal} onCreate={handleCreateProduct} />
      <TransactionModal isOpen={activeModal === "TX_IN" || activeModal === "TX_OUT"} onClose={closeModal} product={selectedProduct} txType={activeModal === "TX_IN" ? "IN" : "OUT"} onSubmit={handleTransaction} isSubmitting={isSubmittingTx} />
      <EditProductModal isOpen={activeModal === "EDIT"} onClose={closeModal} product={selectedProduct} onSubmit={handleEditProduct} />
      <QRCodeModal isOpen={activeModal === "QR"} onClose={closeModal} product={selectedProduct} onPrint={() => {toast.info("Gửi lệnh in!"); closeModal();}} />
    </div>
  );
};

export default InventoryUnified;