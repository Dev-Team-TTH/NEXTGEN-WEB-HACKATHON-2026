"use client";

import { useState, useMemo } from "react";
import { 
  useGetProductsQuery, 
  useGetTransactionsQuery, // IMPORT THÊM API LỊCH SỬ
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
import ProductCard from "./ProductCard"; 
import { exportInventoryToExcel } from "./exportUtils"; 
import { 
  Archive, Download, Search, PackageOpen, PlusCircleIcon, 
  SlidersHorizontal, XCircle, ArrowRightLeft, History, 
  ChevronLeft, ChevronRight, ArrowDownToLine, ArrowUpFromLine, Package
} from "lucide-react";
import { toast } from "react-toastify";

const InventoryUnified = () => {
  // --- STATE TABS ---
  const [activeTab, setActiveTab] = useState<"PRODUCTS" | "HISTORY">("PRODUCTS");

  // ==========================================
  // STATE & LOGIC CHO TAB 1: SẢN PHẨM (PRODUCTS)
  // ==========================================
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterStock, setFilterStock] = useState("ALL");

  const [activeModal, setActiveModal] = useState<"CREATE" | "TRANSACTION" | "EDIT" | "QR" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const { data: products, isError: isProductsError, isLoading: isProductsLoading } = useGetProductsQuery();
  const [createTransaction, { isLoading: isSubmittingTx }] = useCreateTransactionMutation();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

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
      if (filterStock === "LOW") {
        let actualReorderPoint = p.reorderPoint || 0;
        if (p.reorderUnit && p.reorderUnit === p.largeUnit && p.conversionRate) {
          actualReorderPoint = actualReorderPoint * p.conversionRate;
        }
        matchesStock = p.stockQuantity > 0 && p.stockQuantity <= actualReorderPoint;
      }
      else if (filterStock === "OUT_OF_STOCK") matchesStock = p.stockQuantity === 0;

      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });
  }, [products, searchTerm, filterCategory, filterStatus, filterStock]);

  const resetFilters = () => { setFilterCategory("ALL"); setFilterStatus("ALL"); setFilterStock("ALL"); setSearchTerm(""); };

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

  const handleCreateProduct = async (productData: any) => {
    try { await createProduct(productData).unwrap(); toast.success("Tạo Master Data thành công!"); closeModal(); } 
    catch (err) { toast.error("Lỗi khi tạo sản phẩm!"); }
  };

  const handleEditProduct = async (updatedProduct: Product) => {
    try { await updateProduct({ productId: updatedProduct.productId, updatedProduct }).unwrap(); toast.success("Cập nhật thiết lập thành công!"); closeModal(); } 
    catch (error) { toast.error("Lỗi khi cập nhật sản phẩm!"); }
  };

  const handleTransaction = async (
    quantity: number, note: string, unitType: string, variantId?: string, batchId?: string, newBatchNumber?: string, expiryDate?: string, location?: string, txCategory?: string
  ) => {
    if (!selectedProduct) return;
    const multiplier = unitType === "LARGE" ? (selectedProduct.conversionRate || 1) : 1;
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    try {
      await createTransaction({
        productId: selectedProduct.productId, 
        type: txCategory || "NHAP_HANG", 
        quantity: quantity * multiplier,
        note: note || `Tạo phiếu ${txCategory} - SL: ${quantity} ${unitType === "LARGE" ? selectedProduct.largeUnit : selectedProduct.baseUnit}`,
        variantId, batchId, newBatchNumber, expiryDate, location, 
        createdBy: currentUser.name || "Thủ Kho",
      }).unwrap();
      toast.info("Đã gửi Phiếu Yêu Cầu! Chờ duyệt.", { autoClose: 3000 }); closeModal();
    } catch (error: any) { 
      toast.error(error?.data?.message || "Lỗi khi gửi phiếu giao dịch!"); 
    }
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


  // ==========================================
  // STATE & LOGIC CHO TAB 2: LỊCH SỬ GIAO DỊCH (HISTORY)
  // ==========================================
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(15);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyFilterType, setHistoryFilterType] = useState("ALL");
  const [showHistoryFilters, setShowHistoryFilters] = useState(false);

  const { data: responseData, isLoading: isHistoryLoading, isError: isHistoryError } = useGetTransactionsQuery({
    page: historyPage, limit: historyLimit, search: historySearchTerm, type: historyFilterType === "ALL" ? undefined : historyFilterType,
  });

  const transactions = responseData?.data || [];
  const pagination = responseData?.pagination;

  const getTypeDisplay = (type: string) => {
    switch(type) {
      case "NHAP_HANG": return { color: "text-emerald-700 bg-emerald-100", label: "Nhập Kho", icon: <ArrowDownToLine className="w-4 h-4 mr-1"/> };
      case "XUAT_BAN": case "XUAT_NOI_BO": return { color: "text-blue-700 bg-blue-100", label: "Xuất Kho", icon: <ArrowUpFromLine className="w-4 h-4 mr-1"/> };
      case "DIEU_CHINH": return { color: "text-amber-700 bg-amber-100", label: "Điều Chỉnh", icon: <ArrowRightLeft className="w-4 h-4 mr-1"/> };
      default: return { color: "text-gray-700 bg-gray-100", label: type, icon: <Package className="w-4 h-4 mr-1"/> };
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "COMPLETED") return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">Đã duyệt</span>;
    if (status === "PENDING") return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg animate-pulse">Chờ duyệt</span>;
    return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg">Đã Hủy</span>;
  };

  return (
    <div className="flex flex-col w-full pb-10 relative">
      <Header 
        name="Quản trị Kho & Lịch sử" 
        subtitle="Hệ thống WMS thông minh quản lý Biến thể & Lô hàng FEFO"
        icon={Archive}
        action={
          activeTab === "PRODUCTS" && (
            <div className="flex items-center gap-3">
              <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95 text-sm">
                <Download className="w-4 h-4" /> Xuất Excel
              </button>
              <button onClick={() => openModal("CREATE")} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95 text-sm">
                <PlusCircleIcon className="w-4 h-4" /> Master Data
              </button>
            </div>
          )
        }
      />

      {/* THANH CHỌN TAB */}
      <div className="flex items-center gap-3 mt-4 mb-6 border-b border-gray-200 pb-4">
        <button 
          onClick={() => setActiveTab("PRODUCTS")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === "PRODUCTS" ? "bg-blue-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}
        >
          <Package className="w-5 h-5" /> Danh sách Sản phẩm
        </button>
        <button 
          onClick={() => setActiveTab("HISTORY")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === "HISTORY" ? "bg-purple-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}
        >
          <History className="w-5 h-5" /> Lịch sử Nhập/Xuất
        </button>
      </div>

      {/* ========================================================== */}
      {/* KHU VỰC RENDER TAB SẢN PHẨM */}
      {/* ========================================================== */}
      {activeTab === "PRODUCTS" && (
        <div className="animate-in fade-in duration-300">
          <div className="mb-6 flex flex-col gap-3">
            <div className="flex items-center gap-3 w-full lg:w-2/3">
              <div className="flex-1 flex items-center border border-gray-200 rounded-xl bg-white shadow-sm focus-within:border-blue-500 overflow-hidden">
                <Search className="w-5 h-5 text-gray-400 ml-4 mr-2" />
                <input className="w-full py-3 px-2 bg-transparent focus:outline-none" placeholder="Tìm theo Tên hoặc Mã SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {searchTerm && <button onClick={() => setSearchTerm("")} className="mr-3 text-gray-400 hover:text-red-500 transition-colors"><XCircle className="w-5 h-5" /></button>}
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all shadow-sm border ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}><SlidersHorizontal className="w-5 h-5" /> Bộ lọc</button>
            </div>

            {showFilters && (
              <div className="w-full lg:w-2/3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Danh Mục</label><select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none"><option value="ALL">-- Tất cả --</option>{uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Trạng Thái</label><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none"><option value="ALL">-- Tất cả --</option><option value="ACTIVE">Đang kinh doanh</option><option value="OUT_OF_STOCK">Tạm ngưng</option><option value="DISCONTINUED">Ngừng KD</option></select></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cảnh Báo Kho</label><select value={filterStock} onChange={(e) => setFilterStock(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none"><option value="ALL">-- Mọi số lượng --</option><option value="LOW">Sắp hết hàng</option><option value="OUT_OF_STOCK">Hết sạch hàng</option></select></div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100"><span className="text-sm font-medium text-gray-500">Hiển thị: <strong className="text-blue-600">{filteredProducts.length}</strong> kết quả</span><button onClick={resetFilters} className="text-sm font-semibold text-red-500 hover:text-red-600">Trở về mặc định</button></div>
              </div>
            )}
          </div>

          {isProductsLoading ? (
            <div className="py-10 text-center font-bold text-gray-500 animate-pulse">Đang tải dữ liệu sản phẩm...</div>
          ) : isProductsError || !products ? (
            <div className="py-10 text-center font-bold text-red-500 bg-red-50 rounded-xl">Lỗi tải dữ liệu máy chủ!</div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
              <PackageOpen className="w-16 h-16 mb-4 text-gray-300" />
              <span className="text-lg font-medium">Không tìm thấy sản phẩm!</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.productId} product={product} isExpanded={expandedProductId === product.productId}
                  onToggleExpand={toggleExpand} onOpenModal={openModal} onDelete={handleDelete} formatStockDisplay={formatStockDisplay}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* KHU VỰC RENDER TAB LỊCH SỬ GIAO DỊCH */}
      {/* ========================================================== */}
      {activeTab === "HISTORY" && (
        <div className="animate-in fade-in duration-300">
          <div className="mb-6 flex flex-col gap-3">
            <div className="flex items-center gap-3 w-full lg:w-3/4">
              <div className="flex-1 flex items-center border border-gray-200 bg-white rounded-xl shadow-sm px-4 py-2.5 focus-within:border-purple-500">
                <Search className="w-5 h-5 text-gray-400 mr-2" />
                <input className="w-full bg-transparent focus:outline-none text-gray-700" placeholder="Tìm theo tên sản phẩm..." value={historySearchTerm} onChange={(e) => { setHistorySearchTerm(e.target.value); setHistoryPage(1); }} />
              </div>
              <button onClick={() => setShowHistoryFilters(!showHistoryFilters)} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold border ${showHistoryFilters ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200'}`}><SlidersHorizontal className="w-5 h-5" /> Lọc</button>
            </div>

            {showHistoryFilters && (
              <div className="w-full lg:w-3/4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Loại Giao Dịch</label>
                <select value={historyFilterType} onChange={(e) => { setHistoryFilterType(e.target.value); setHistoryPage(1); }} className="w-full sm:w-1/2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none">
                  <option value="ALL">Tất cả</option><option value="NHAP_HANG">Nhập Kho</option><option value="XUAT_BAN">Xuất Bán / Nội Bộ</option><option value="DIEU_CHINH">Điều Chỉnh</option>
                </select>
              </div>
            )}
          </div>

          {isHistoryLoading ? (
            <div className="py-10 text-center font-bold text-gray-500 animate-pulse">Đang tải lịch sử...</div>
          ) : isHistoryError ? (
            <div className="py-10 text-center font-bold text-red-500 bg-red-50 rounded-xl">Lỗi kết nối máy chủ!</div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Mã Phiếu</th><th className="px-6 py-4">Sản Phẩm</th><th className="px-6 py-4">Loại GD</th><th className="px-6 py-4 text-right">Số Lượng</th><th className="px-6 py-4 text-center">Trạng Thái</th><th className="px-6 py-4 text-right">Ngày Tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500 font-medium">Không tìm thấy giao dịch.</td></tr>
                    ) : (
                      transactions.map((tx: any) => {
                        const typeInfo = getTypeDisplay(tx.type);
                        return (
                          <tr key={tx.transactionId} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 text-xs font-mono font-bold text-gray-500">{tx.transactionId.substring(0,8).toUpperCase()}</td>
                            <td className="px-6 py-4"><div className="font-bold text-gray-900 line-clamp-1">{tx.product?.name || "N/A"}</div>{tx.variant && <div className="text-xs text-gray-500">Biến thể: {tx.variant.sku}</div>}</td>
                            <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${typeInfo.color}`}>{typeInfo.icon} {typeInfo.label}</span></td>
                            <td className={`px-6 py-4 text-right font-black ${tx.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.quantity > 0 ? '+' : ''}{tx.quantity}</td>
                            <td className="px-6 py-4 text-center">{getStatusBadge(tx.status)}</td>
                            <td className="px-6 py-4 text-right text-sm text-gray-600">{new Date(tx.timestamp).toLocaleString("vi-VN")}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.totalPages > 0 && (
                <div className="px-6 py-4 border-t border-gray-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Hiển thị <strong className="text-slate-900">{(pagination.page - 1) * pagination.pageSize + 1}</strong> - <strong className="text-slate-900">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</strong> trong <strong className="text-blue-600">{pagination.total}</strong>
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={pagination.page === 1} className="p-2 border rounded-lg bg-white disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="px-4 py-2 text-sm font-bold text-slate-700">Trang {pagination.page} / {pagination.totalPages}</span>
                    <button onClick={() => setHistoryPage(p => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page === pagination.totalPages} className="p-2 border rounded-lg bg-white disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RENDER CÁC MODAL CỦA PHẦN SẢN PHẨM */}
      <CreateProductModal isOpen={activeModal === "CREATE"} onClose={closeModal} onCreate={handleCreateProduct} />
      <TransactionModal isOpen={activeModal === "TRANSACTION"} onClose={closeModal} product={selectedProduct} onSubmit={handleTransaction} isSubmitting={isSubmittingTx} />
      <EditProductModal isOpen={activeModal === "EDIT"} onClose={closeModal} product={selectedProduct} onSubmit={handleEditProduct} />
      <QRCodeModal isOpen={activeModal === "QR"} onClose={closeModal} product={selectedProduct} onPrint={() => {toast.info("Gửi lệnh in!"); closeModal();}} />
    </div>
  );
};

export default InventoryUnified;