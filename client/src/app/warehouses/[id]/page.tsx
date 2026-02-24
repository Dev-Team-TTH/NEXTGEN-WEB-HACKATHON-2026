"use client";

import React from "react";
import { useGetWarehouseByIdQuery } from "@/state/api";
import Header from "@/app/(components)/Header";
// ĐÃ FIX: Bổ sung icon Package vào danh sách import
import { Building2, MapPin, Users, Briefcase, ArrowLeft, Shield, Tag, Package } from "lucide-react";
import Link from "next/link";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useTranslation } from "react-i18next";

const WarehouseDetail = ({ params }: { params: { id: string } }) => {
  const { t } = useTranslation();
  const { data: warehouse, isLoading, isError } = useGetWarehouseByIdQuery(params.id);

  if (isLoading) return <div className="py-10 text-center font-bold text-gray-500 animate-pulse">{t('common.loading', 'Đang tải không gian chi nhánh...')}</div>;
  if (isError || !warehouse) return <div className="text-center text-red-500 py-10 bg-red-50 rounded-2xl">{t('common.error', 'Không tìm thấy dữ liệu chi nhánh!')}</div>;

  // --- CẤU HÌNH CỘT BẢNG NHÂN SỰ ---
  const userColumns: GridColDef[] = [
    { field: "name", headerName: "Họ Tên", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    { field: "phone", headerName: "Số Điện Thoại", width: 150 },
    { 
      field: "role", headerName: "Chức vụ", width: 150,
      renderCell: (params) => (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 mt-2">
          <Shield className="w-3.5 h-3.5" /> {params.value}
        </span>
      )
    },
  ];

  // --- CẤU HÌNH CỘT BẢNG TÀI SẢN ---
  const assetColumns: GridColDef[] = [
    { field: "name", headerName: "Tên Tài Sản", flex: 1 },
    { 
      field: "category", headerName: "Danh mục", width: 150,
      renderCell: (params) => (
        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mt-2.5">
          <Tag className="w-3.5 h-3.5" /> {params.value}
        </span>
      )
    },
    { field: "purchasePrice", headerName: "Giá trị (VNĐ)", width: 150, 
      renderCell: (params) => <span className="font-semibold text-green-600 mt-2.5 inline-block">{params.value?.toLocaleString()} đ</span> 
    },
    { 
      field: "status", headerName: "Trạng thái", width: 130,
      renderCell: (params) => (
        <span className={`px-2 py-1 rounded-md text-xs font-bold mt-2 inline-block ${params.value === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {params.value === "ACTIVE" ? "Đang sử dụng" : "Bảo trì/Hỏng"}
        </span>
      )
    },
  ];

  // --- CẤU HÌNH CỘT BẢNG TỒN KHO/HÀNG HÓA ---
  const stockColumns: GridColDef[] = [
    { field: "productId", headerName: "Mã SP", width: 130, renderCell: (p) => p.row.product?.productId },
    { field: "name", headerName: "Tên Sản Phẩm", flex: 1, renderCell: (p) => <span className="font-bold text-gray-800 dark:text-gray-100">{p.row.product?.name}</span> },
    { field: "quantity", headerName: "Tồn kho thực tế", width: 150, renderCell: (p) => (
      <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg mt-1.5 inline-block">{p.value}</span>
    )},
    { field: "price", headerName: "Đơn giá", width: 150, renderCell: (p) => (
      <span className="font-semibold text-gray-600 dark:text-gray-400 mt-2.5 inline-block">
        {p.row.product?.price ? `${p.row.product.price.toLocaleString()} đ` : 'N/A'}
      </span> 
    )},
  ];

  return (
    <div className="flex flex-col w-full pb-10 space-y-6">
      
      {/* KHU VỰC ĐIỀU HƯỚNG & HEADER */}
      <div>
        <Link href="/warehouses" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> {t('warehouses.back', 'Quay lại danh sách Chi nhánh')}
        </Link>
        <Header 
          name={warehouse.name} 
          subtitle={t('warehouses.workspaceSubtitle', 'Không gian quản trị độc lập dành cho Chi nhánh')} 
          icon={Building2} 
        />
        <div className="flex items-center gap-2 mt-2 text-gray-500 font-medium">
          <MapPin className="w-4 h-4 text-red-500" /> {warehouse.address || t('warehouses.noAddress', 'Chưa cập nhật địa chỉ')}
        </div>
      </div>

      {/* KHỐI 1: BẢNG NHÂN SỰ & TÀI SẢN (Chia 2 cột ngang nhau) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bảng Nhân Sự */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-indigo-50/50 dark:bg-indigo-900/10">
            <h3 className="font-extrabold text-lg text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
              <Users className="w-5 h-5" /> {t('warehouses.staffList', 'Nhân sự trực thuộc')}
            </h3>
            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 font-bold text-xs rounded-full">
              {warehouse.users?.length || 0} {t('common.people', 'người')}
            </span>
          </div>
          <div className="flex-grow p-2">
            <DataGrid 
              rows={warehouse.users || []} 
              columns={userColumns} 
              getRowId={(row) => row.userId} 
              disableRowSelectionOnClick 
              hideFooter
              className="!border-none"
            />
          </div>
        </div>

        {/* Bảng Tài Sản */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-teal-50/50 dark:bg-teal-900/10">
            <h3 className="font-extrabold text-lg text-teal-800 dark:text-teal-300 flex items-center gap-2">
              <Briefcase className="w-5 h-5" /> {t('warehouses.assetList', 'Tài sản cấp phát')}
            </h3>
            <span className="px-3 py-1 bg-teal-100 dark:bg-teal-800 text-teal-700 dark:text-teal-200 font-bold text-xs rounded-full">
              {warehouse.assets?.length || 0} {t('common.items', 'thiết bị')}
            </span>
          </div>
          <div className="flex-grow p-2">
            <DataGrid 
              rows={warehouse.assets || []} 
              columns={assetColumns} 
              getRowId={(row) => row.assetId} 
              disableRowSelectionOnClick 
              hideFooter
              className="!border-none"
            />
          </div>
        </div>
      </div>

      {/* KHỐI 2: BẢNG HÀNG HÓA & TỒN KHO (Chiếm 1 hàng riêng biệt, rộng 100%) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[500px]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/10">
          <h3 className="font-extrabold text-lg text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <Package className="w-5 h-5" /> {t('warehouses.inventoryList', 'Hàng Hóa & Tồn Kho Thực Tế')}
          </h3>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 font-bold text-xs rounded-full">
            {warehouse.stocks?.length || 0} {t('common.productCodes', 'mã sản phẩm')}
          </span>
        </div>
        <div className="flex-grow p-2">
          <DataGrid 
            // Fallback nếu không có dữ liệu để tránh crash
            rows={warehouse.stocks || []} 
            columns={stockColumns} 
            // Đảm bảo getRowId không bị lỗi nếu bảng thiết kế có tên id khác (VD: stockId)
            getRowId={(row) => row.stockId || Math.random().toString()} 
            disableRowSelectionOnClick 
            className="!border-none"
          />
        </div>
      </div>

    </div>
  );
};

export default WarehouseDetail;