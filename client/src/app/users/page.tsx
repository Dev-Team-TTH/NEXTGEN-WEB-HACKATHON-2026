"use client";

import { useState } from "react";
import { useGetUsersQuery, useRegisterUserMutation } from "@/state/api";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { User, PlusCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import CreateUserModal from "./CreateUserModal";
import { toast } from "react-toastify";

const Users = () => {
  const { t } = useTranslation();
  const { data: users, isError, isLoading } = useGetUsersQuery();
  const [registerUser, { isLoading: isCreating }] = useRegisterUserMutation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Nâng cấp cột DataGrid để hiển thị thông tin Role và Kho
  const columns: GridColDef[] = [
    { field: "userId", headerName: "ID", width: 100 },
    { field: "name", headerName: "Họ và Tên", width: 200 },
    { field: "email", headerName: "Email Đăng Nhập", width: 220 },
    { field: "phone", headerName: "SĐT", width: 130 },
    { 
      field: "role", 
      headerName: "Quyền hạn", 
      width: 150,
      renderCell: (params) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          params.value === "ADMIN" ? "bg-purple-100 text-purple-700" : 
          params.value === "MANAGER" ? "bg-blue-100 text-blue-700" : 
          "bg-gray-100 text-gray-700"
        }`}>
          {params.value}
        </span>
      )
    },
    { 
      field: "warehouseId", 
      headerName: "Chi nhánh / Kho", 
      width: 200,
      renderCell: (params) => {
        if (!params.value) return <span className="text-gray-400 italic">Tổng Công ty</span>;
        return <span className="font-semibold text-indigo-700">{params.row.warehouse?.name || params.value}</span>;
      }
    },
  ];

  const handleCreateUser = async (formData: any) => {
    try {
      await registerUser(formData).unwrap();
      toast.success("Tạo tài khoản nhân viên thành công!");
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi khi tạo tài khoản!");
    }
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
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95"
          >
            <PlusCircle className="w-5 h-5" /> Thêm Nhân Viên
          </button>
        }
      />
      
      <div className="mt-5 bg-white p-2 rounded-xl border border-gray-200 shadow-sm h-[600px]">
        <DataGrid
          rows={users}
          columns={columns}
          getRowId={(row) => row.userId}
          checkboxSelection
          disableRowSelectionOnClick
          className="bg-white !border-none !text-gray-700"
        />
      </div>

      <CreateUserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreate={handleCreateUser}
        isLoading={isCreating}
      />
    </div>
  );
};

export default Users;