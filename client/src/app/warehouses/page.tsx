"use client";

import { useState } from "react";
import { 
  useGetWarehousesQuery, 
  useCreateWarehouseMutation, 
  useUpdateWarehouseMutation, 
  useDeleteWarehouseMutation 
} from "@/state/api";
import Header from "@/app/(components)/Header";
import { 
  Building2, PlusCircle, Pencil, Trash2, Users, Briefcase, MapPin, Package, ArrowRight, MoreVertical 
} from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import CreateWarehouseModal from "./CreateWarehouseModal";
import EditWarehouseModal from "./EditWarehouseModal";

const Warehouses = () => {
  const { t } = useTranslation();
  const { data: warehouses, isError, isLoading } = useGetWarehousesQuery();
  const [createWarehouse, { isLoading: isCreating }] = useCreateWarehouseMutation();
  const [updateWarehouse, { isLoading: isUpdating }] = useUpdateWarehouseMutation();
  const [deleteWarehouse] = useDeleteWarehouseMutation();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);

  const handleDelete = async (id: string) => {
    if (window.confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa chi nhánh này? Mọi dữ liệu nhân sự, tài sản liên quan có thể bị ảnh hưởng!")) {
      try {
        await deleteWarehouse(id).unwrap();
        toast.success("Đã xóa chi nhánh khỏi hệ thống!");
      } catch (error) {
        toast.error("Lỗi khi xóa chi nhánh! Vui lòng kiểm tra ràng buộc dữ liệu.");
      }
    }
  };

  const handleCreate = async (formData: any) => {
    try {
      await createWarehouse(formData).unwrap();
      toast.success("Tạo chi nhánh thành công!");
      setIsCreateModalOpen(false);
    } catch (error: any) { toast.error("Lỗi khi tạo chi nhánh!"); }
  };

  const handleUpdate = async ({ id, data }: any) => {
    try {
      await updateWarehouse({ id, data }).unwrap();
      toast.success("Cập nhật chi nhánh thành công!");
      setIsEditModalOpen(false);
    } catch (error: any) { toast.error("Lỗi khi cập nhật!"); }
  };

  if (isLoading) return <div className="py-10 text-center font-bold text-gray-500 animate-pulse">Đang tải dữ liệu hệ thống...</div>;
  if (isError || !warehouses) return <div className="text-center text-red-500 py-10 mt-5 bg-red-50 rounded-2xl">Lỗi kết nối máy chủ! Không thể tải danh sách chi nhánh.</div>;

  return (
    <div className="flex flex-col w-full pb-10">
      {/* HEADER CAO CẤP */}
      <Header 
        name={t('sidebar.warehouses', 'Hệ Thống Chi Nhánh')} 
        subtitle="Quản lý mạng lưới cơ sở, kho bãi và thống kê tổng quan nguồn lực" 
        icon={Building2} 
        action={
          <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md shadow-blue-500/30 transition-all active:scale-95">
            <PlusCircle className="w-5 h-5" /> Thêm Chi Nhánh
          </button>
        }
      />
      
      {/* GRID CARDS: Hiển thị dạng Thẻ hiện đại */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {warehouses.map((warehouse: any) => (
          <div 
            key={warehouse.warehouseId} 
            className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
          >
            {/* Dải màu trang trí phía trên thẻ */}
            <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            
            <div className="p-5 flex-grow">
              {/* Header Thẻ */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-gray-800 dark:text-gray-100 line-clamp-1" title={warehouse.name}>
                      {warehouse.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-gray-500 dark:text-gray-400 text-xs font-medium">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="line-clamp-1" title={warehouse.address || "Chưa cập nhật địa chỉ"}>
                        {warehouse.address || "Chưa cập nhật địa chỉ"}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Nút thao tác (Sửa/Xóa) */}
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button 
                    onClick={() => { setSelectedWarehouse(warehouse); setIsEditModalOpen(true); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 bg-transparent hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Sửa thông tin"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(warehouse.warehouseId)}
                    className="p-1.5 text-gray-400 hover:text-red-600 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Xóa chi nhánh"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Đường kẻ mờ */}
              <div className="w-full h-px bg-gray-100 dark:bg-gray-700 my-4"></div>

              {/* Các chỉ số thống kê (KPIs) */}
              <div className="grid grid-cols-2 gap-3 mb-2">
                {/* Chỉ số Nhân sự */}
                <div className="flex flex-col gap-1 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5" /> Nhân sự
                  </div>
                  <div className="text-xl font-black text-gray-800 dark:text-gray-100">
                    {warehouse._count?.users || 0}
                  </div>
                </div>

                {/* Chỉ số Tài sản */}
                <div className="flex flex-col gap-1 p-3 bg-teal-50/50 dark:bg-teal-900/10 rounded-xl border border-teal-100/50 dark:border-teal-800/30">
                  <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
                    <Briefcase className="w-3.5 h-3.5" /> Tài sản
                  </div>
                  <div className="text-xl font-black text-gray-800 dark:text-gray-100">
                    {warehouse._count?.assets || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Thẻ: Nút Xem chi tiết */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
              {/* Lưu ý: Link này sẽ hướng đến trang chi tiết của chi nhánh (ta sẽ làm sau) */}
              <Link href={`/warehouses/${warehouse.warehouseId}`} className="flex justify-between items-center w-full group/btn">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover/btn:text-blue-600 dark:group-hover/btn:text-blue-400 transition-colors">
                  Vào không gian chi nhánh
                </span>
                <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-colors border border-gray-200 dark:border-gray-600">
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover/btn:text-white transition-colors" />
                </div>
              </Link>
            </div>
            
          </div>
        ))}

        {/* Thẻ "Thêm mới nhanh" */}
        <div 
          onClick={() => setIsCreateModalOpen(true)}
          className="group flex flex-col items-center justify-center gap-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 cursor-pointer transition-all duration-300 min-h-[220px]"
        >
          <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white text-gray-400 transition-all duration-300">
            <PlusCircle className="w-8 h-8" />
          </div>
          <span className="font-bold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
            Mở rộng Chi nhánh mới
          </span>
        </div>
      </div>

      <CreateWarehouseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreate={handleCreate} isLoading={isCreating} />
      
      {isEditModalOpen && (
        <EditWarehouseModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onUpdate={handleUpdate} isLoading={isUpdating} currentWarehouse={selectedWarehouse} />
      )}
    </div>
  );
};

export default Warehouses;