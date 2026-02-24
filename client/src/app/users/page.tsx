"use client";

import { useState } from "react";
import { useGetUsersQuery, useRegisterUserMutation, useUpdateUserMutation, useDeleteUserMutation } from "@/state/api";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { User, PlusCircle, Pencil, Trash2 } from "lucide-react";
import CreateUserModal from "./CreateUserModal";
import EditUserModal from "./EditUserModal"; // <-- Import Modal mới
import { toast } from "react-toastify";

const Users = () => {
  const { data: users, isError, isLoading } = useGetUsersQuery();
  const [registerUser, { isLoading: isCreating }] = useRegisterUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // State quản lý việc Sửa nhân viên
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const handleDelete = async (id: string, email: string) => {
    if (email === "admin@team-tth.com") {
      toast.error("Không thể xóa tài khoản Root Admin!");
      return;
    }
    if (window.confirm("Bạn có chắc chắn muốn xóa tài khoản nhân viên này?")) {
      try {
        await deleteUser(id).unwrap();
        toast.success("Đã xóa tài khoản nhân viên!");
      } catch (error) {
        toast.error("Lỗi khi xóa tài khoản!");
      }
    }
  };

  const columns: GridColDef[] = [
    { field: "name", headerName: "Họ và Tên", width: 200 },
    { field: "email", headerName: "Email Đăng Nhập", width: 220 },
    { field: "phone", headerName: "SĐT", width: 130 },
    { 
      field: "role", headerName: "Quyền hạn", width: 150,
      renderCell: (params) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          params.value === "ADMIN" ? "bg-purple-100 text-purple-700" : 
          params.value === "MANAGER" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
        }`}>
          {params.value}
        </span>
      )
    },
    { 
      field: "warehouseId", headerName: "Chi nhánh / Kho", width: 200,
      renderCell: (params) => {
        if (!params.value) return <span className="text-gray-400 italic">Tổng Công ty</span>;
        return <span className="font-semibold text-indigo-700">{params.row.warehouse?.name || "Đã phân kho"}</span>;
      }
    },
    {
      field: "actions", headerName: "Thao tác", width: 120, sortable: false,
      renderCell: (params) => (
        <div className="flex items-center gap-2 mt-2">
          <button 
            onClick={() => { setSelectedUser(params.row); setIsEditModalOpen(true); }}
            className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-full"
            title="Sửa thông tin"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button 
            onClick={() => handleDelete(params.row.userId, params.row.email)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
            title="Xóa tài khoản"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )
    },
  ];

  const handleCreateUser = async (formData: any) => {
    try {
      await registerUser(formData).unwrap();
      toast.success("Tạo tài khoản nhân viên thành công!");
      setIsCreateModalOpen(false);
    } catch (error: any) { toast.error(error?.data?.message || "Lỗi khi tạo tài khoản!"); }
  };

  const handleUpdateUser = async ({ id, data }: any) => {
    try {
      await updateUser({ id, data }).unwrap();
      toast.success("Cập nhật thông tin thành công!");
      setIsEditModalOpen(false);
    } catch (error: any) { toast.error(error?.data?.message || "Lỗi khi cập nhật!"); }
  };

  if (isLoading) return <div className="py-4 text-center font-bold text-gray-500">Đang tải dữ liệu...</div>;
  if (isError || !users) return <div className="text-center text-red-500 py-4 mt-5">Lỗi kết nối máy chủ!</div>;

  return (
    <div className="flex flex-col w-full pb-10">
      <Header 
        name="Quản trị Nhân sự" 
        subtitle="Quản lý danh sách tài khoản, phân quyền Admin/Thủ kho" 
        icon={User} 
        action={
          <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95">
            <PlusCircle className="w-5 h-5" /> Thêm Nhân Viên
          </button>
        }
      />
      
      <div className="mt-5 bg-white p-2 rounded-xl border border-gray-200 shadow-sm h-[600px]">
        <DataGrid rows={users} columns={columns} getRowId={(row) => row.userId} disableRowSelectionOnClick className="bg-white !border-none !text-gray-700" />
      </div>

      <CreateUserModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreate={handleCreateUser} isLoading={isCreating} />
      <EditUserModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onUpdate={handleUpdateUser} isLoading={isUpdating} currentUser={selectedUser} />
    </div>
  );
};

export default Users;