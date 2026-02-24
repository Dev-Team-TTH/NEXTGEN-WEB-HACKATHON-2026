"use client";
import { useState } from "react";
import { useGetWarehousesQuery, useCreateWarehouseMutation, useDeleteWarehouseMutation } from "@/state/api";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Building2, PlusCircle, Trash2 } from "lucide-react";
import CreateWarehouseModal from "./CreateWarehouseModal";
import { toast } from "react-toastify";

const Warehouses = () => {
  const { data: warehouses, isLoading } = useGetWarehousesQuery();
  const [createWarehouse, { isLoading: isCreating }] = useCreateWarehouseMutation();
  const [deleteWarehouse] = useDeleteWarehouseMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa kho này? (Chỉ xóa được nếu kho rỗng)")) {
      try {
        await deleteWarehouse(id).unwrap();
        toast.success("Đã xóa chi nhánh thành công!");
      } catch (error: any) {
        toast.error(error?.data?.message || "Lỗi khi xóa kho!");
      }
    }
  };

  const columns: GridColDef[] = [
    { field: "warehouseId", headerName: "Mã Kho Hệ Thống", width: 300 },
    { field: "name", headerName: "Tên Chi Nhánh / Kho", width: 250, renderCell: (p) => <span className="font-bold text-blue-700">{p.value}</span> },
    { field: "address", headerName: "Địa chỉ", width: 350 },
    {
      field: "actions", headerName: "Thao tác", width: 100, sortable: false,
      renderCell: (params) => (
        <button onClick={() => handleDelete(params.row.warehouseId)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full mt-1">
          <Trash2 className="w-5 h-5" />
        </button>
      )
    },
  ];

  const handleCreate = async (formData: any) => {
    try {
      await createWarehouse(formData).unwrap();
      toast.success("Mở chi nhánh kho mới thành công!");
      setIsModalOpen(false);
    } catch (error) { toast.error("Lỗi khi tạo kho!"); }
  };

  if (isLoading) return <div className="py-4 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="flex flex-col w-full pb-10">
      <Header 
        name="Quản lý Hệ thống Chi nhánh" 
        subtitle="Mở mới, đóng cửa và quản lý thông tin các điểm kho vật lý" 
        icon={Building2} 
        action={
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95">
            <PlusCircle className="w-5 h-5" /> Mở Chi Nhánh Mới
          </button>
        }
      />
      
      <div className="mt-5 bg-white p-2 rounded-xl border border-gray-200 shadow-sm h-[600px]">
        <DataGrid
          rows={warehouses || []}
          columns={columns}
          getRowId={(row) => row.warehouseId}
          className="bg-white !border-none"
        />
      </div>

      <CreateWarehouseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreate} isLoading={isCreating} />
    </div>
  );
};
export default Warehouses;