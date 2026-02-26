"use client";

import { useState, useMemo } from "react";
import { 
  useGetAssetsQuery, 
  useCreateAssetMutation, 
  useUpdateAssetMutation,
  useDeleteAssetMutation,
  Asset
} from "@/state/api";
import Header from "@/app/(components)/Header";
import AssetCard from "./AssetCard";
import CreateAssetModal from "./CreateAssetModal";
import EditAssetModal from "./EditAssetModal";
import AssetQRCodeModal from "./AssetQRCodeModal";
import AssetHistoryModal from "./AssetHistoryModal";

import { 
  Briefcase, 
  PlusCircleIcon, 
  Search, 
  SlidersHorizontal, 
  XCircle,
  AlertTriangle
} from "lucide-react";
import { toast } from "react-toastify";

const AssetsPage = () => {
  // --- STATE MODAL & DỮ LIỆU ---
  const [activeModal, setActiveModal] = useState<"CREATE" | "EDIT" | "QR" | "HISTORY" | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // --- STATE BỘ LỌC (ĐÃ ĐƯỢC NÂNG CẤP CHUẨN ASSET) ---
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterMaintenance, setFilterMaintenance] = useState("ALL"); // Lọc theo hạn bảo trì
  
  // --- API HOOKS ---
  const { data: assets, isLoading, isError } = useGetAssetsQuery();
  const [createAsset, { isLoading: isCreating }] = useCreateAssetMutation();
  const [updateAsset, { isLoading: isUpdating }] = useUpdateAssetMutation();
  const [deleteAsset] = useDeleteAssetMutation();

  // --- TỰ ĐỘNG TRÍCH XUẤT DANH MỤC ---
  const uniqueCategories = useMemo(() => {
    if (!assets) return [];
    const categories = assets.map(a => a.category).filter(Boolean);
    return Array.from(new Set(categories));
  }, [assets]);

  // --- LOGIC LỌC TÀI SẢN NÂNG CAO ---
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    return assets.filter((a) => {
      // 1. Tìm kiếm đa luồng (Tên, ID, Người giữ, Vị trí)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        a.name.toLowerCase().includes(searchLower) || 
        a.assetId.toLowerCase().includes(searchLower) ||
        (a.assignedTo && a.assignedTo.toLowerCase().includes(searchLower)) ||
        (a.location && a.location.toLowerCase().includes(searchLower));

      // 2. Lọc theo danh mục và trạng thái
      const matchesCategory = filterCategory === "ALL" || a.category === filterCategory;
      const matchesStatus = filterStatus === "ALL" || a.status === filterStatus;
      
      // 3. Lọc theo tình trạng bảo trì
      const matchesMaintenance = filterMaintenance === "ALL" || 
        (filterMaintenance === "OVERDUE" && a.isMaintenanceOverdue) ||
        (filterMaintenance === "OK" && !a.isMaintenanceOverdue);
      
      return matchesSearch && matchesCategory && matchesStatus && matchesMaintenance;
    });
  }, [assets, searchTerm, filterCategory, filterStatus, filterMaintenance]);

  const resetFilters = () => { 
    setFilterCategory("ALL"); 
    setFilterStatus("ALL"); 
    setFilterMaintenance("ALL");
    setSearchTerm(""); 
  };

  // --- ĐIỀU KHIỂN MODAL ---
  const openModal = (type: typeof activeModal, asset?: Asset) => { 
    setSelectedAsset(asset || null); 
    setActiveModal(type); 
  };
  
  const closeModal = () => { 
    setActiveModal(null); 
    setSelectedAsset(null); 
  };

  // --- HÀM XỬ LÝ (HANDLERS) THEO LUỒNG ENTERPRISE ---
  const handleCreate = async (data: any) => {
    try {
      await createAsset({ 
        ...data, 
        purchaseDate: new Date(data.purchaseDate).toISOString() 
      }).unwrap();
      toast.info("Đã gửi phiếu yêu cầu Mua tài sản! Vui lòng chờ duyệt.", { autoClose: 4000 });
      closeModal();
    } catch (e: any) { 
      toast.error("Lỗi khi tạo yêu cầu!"); 
    }
  };

  const handleEdit = async (id: string, data: any) => {
    try {
      await updateAsset({ id, data }).unwrap();
      toast.info("Đã gửi phiếu yêu cầu Bàn giao / Cập nhật! Vui lòng chờ duyệt.", { autoClose: 4000 });
      closeModal();
    } catch (e: any) { 
      toast.error("Lỗi khi tạo yêu cầu cập nhật!"); 
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("CẢNH BÁO: Bạn đang đề xuất thanh lý tài sản này lên cấp Quản lý. Đồng ý?")) {
      try { 
        await deleteAsset(id).unwrap(); 
        toast.info("Đã gửi đề xuất Thanh lý thành công!", { autoClose: 4000 }); 
      } 
      catch (e) { 
        toast.error("Lỗi khi gửi yêu cầu thanh lý!"); 
      }
    }
  };

  if (isLoading) return <div className="py-10 text-center text-gray-500 font-bold text-lg animate-pulse">Đang tải dữ liệu Tài Sản...</div>;
  if (isError || !assets) return <div className="text-center text-red-500 py-10 font-bold bg-red-50 rounded-2xl mt-5">Lỗi kết nối máy chủ! Vui lòng thử lại sau.</div>;

  return (
    <div className="flex flex-col w-full pb-10 relative">
      <Header 
        name="Quản lý Tài Sản & Trang Thiết Bị" 
        subtitle="Quản lý vòng đời, khấu hao, bảo trì và định vị tài sản của chi nhánh"
        icon={Briefcase}
        action={
          <div className="flex items-center gap-3">
            <button 
              onClick={() => openModal("CREATE")} 
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95"
            >
              <PlusCircleIcon className="w-5 h-5" /> Đề Xuất Mua Mới
            </button>
          </div>
        }
      />

      {/* KHU VỰC BỘ LỌC ĐA NĂNG */}
      <div className="mt-2 mb-6 flex flex-col gap-3">
        <div className="flex items-center gap-3 w-full lg:w-3/4">
          <div className="flex-1 flex items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 transition-colors shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden">
            <Search className="w-5 h-5 text-gray-400 ml-4 mr-2" />
            <input 
              className="w-full py-3 px-2 bg-transparent focus:outline-none dark:text-white" 
              placeholder="Tìm theo Tên, ID, Người mượn, Vị trí..." 
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
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all shadow-sm border ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            <SlidersHorizontal className="w-5 h-5" /> Bộ lọc
          </button>
        </div>

        {/* BẢNG MỞ RỘNG BỘ LỌC NÂNG CAO */}
        {showFilters && (
          <div className="w-full lg:w-3/4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 shadow-sm animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Loại Tài Sản</label>
                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">-- Tất cả danh mục --</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tình trạng vật lý</label>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">-- Tất cả trạng thái --</option>
                  <option value="Sẵn sàng">Sẵn sàng (Kho)</option>
                  <option value="Đang sử dụng">Đang sử dụng</option>
                  <option value="Đang bảo trì">Đang bảo trì / Sửa chữa</option>
                  <option value="Hỏng hóc">Hỏng / Chờ thanh lý</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5"/> Lịch bảo trì</label>
                <select 
                  value={filterMaintenance} 
                  onChange={(e) => setFilterMaintenance(e.target.value)} 
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${filterMaintenance === 'OVERDUE' ? 'border-red-300 text-red-700 bg-red-50' : 'border-gray-200'}`}
                >
                  <option value="ALL">-- Tất cả --</option>
                  <option value="OVERDUE">⚠️ Đã quá hạn bảo trì</option>
                  <option value="OK">✅ Đang hoạt động tốt</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-500">
                Tìm thấy: <strong className="text-blue-600 text-lg">{filteredAssets.length}</strong> tài sản phù hợp
              </span>
              <button onClick={resetFilters} className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl">
                Xóa bộ lọc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DANH SÁCH TÀI SẢN */}
      <div className="flex flex-col gap-4">
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 shadow-sm">
            <Briefcase className="w-16 h-16 mb-4 text-gray-300" />
            <span className="text-lg font-bold text-gray-600">Không tìm thấy tài sản nào phù hợp!</span>
            <p className="text-sm mt-1 text-gray-400">Hãy thử thay đổi từ khóa tìm kiếm (Tên, Người mượn, Phòng ban) hoặc xóa bộ lọc.</p>
            <button onClick={resetFilters} className="mt-5 px-5 py-2.5 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors">
              Xóa bộ lọc ngay
            </button>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <AssetCard 
              key={asset.assetId} 
              asset={asset} 
              onOpenModal={openModal}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* RENDER CÁC MODAL */}
      <CreateAssetModal 
        isOpen={activeModal === "CREATE"} 
        onClose={closeModal} 
        onCreate={handleCreate} 
        isSubmitting={isCreating} 
      />

      <EditAssetModal 
        isOpen={activeModal === "EDIT"} 
        onClose={closeModal} 
        asset={selectedAsset}
        onEdit={handleEdit} 
        isSubmitting={isUpdating}
      />

      <AssetQRCodeModal 
        isOpen={activeModal === "QR"} 
        onClose={closeModal} 
        asset={selectedAsset} 
      />

      {/* MODAL MỚI ĐƯỢC THÊM VÀO */}
      <AssetHistoryModal 
        isOpen={activeModal === "HISTORY"} 
        onClose={closeModal} 
        asset={selectedAsset} 
      />
      
    </div>
  );
};

export default AssetsPage;