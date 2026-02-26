"use client";

import React, { useState } from "react";
import Header from "@/app/(components)/Header";
import { ClipboardCheck, Package, ArrowRightLeft, Briefcase } from "lucide-react";
import MasterDataApprovals from "./MasterDataApprovals";
import InventoryApprovals from "./InventoryApprovals";
import AssetApprovals from "./AssetApprovals";
import { 
  useGetMasterDataRequestsQuery, 
  useGetTransactionsQuery, 
  useGetAssetRequestsQuery 
} from "@/state/api";

const ApprovalsPage = () => {
  const [activeTab, setActiveTab] = useState<"MASTER_DATA" | "INVENTORY" | "ASSETS">("INVENTORY");
  const [filter, setFilter] = useState("PENDING");

  // Fetch dữ liệu để đếm số lượng phiếu PENDING cho các cục thông báo đỏ (Badges)
  const { data: mdRequests } = useGetMasterDataRequestsQuery();
  const { data: invResponse } = useGetTransactionsQuery();
  const { data: assetRequests } = useGetAssetRequestsQuery();

  // Đếm số lượng chờ duyệt
  const pendingMdCount = mdRequests?.filter((r: any) => r.status === "PENDING").length || 0;
  
  // ĐÃ FIX LỖI Ở ĐÂY: Dùng invResponse?.data thay vì invRequests
  const pendingInvCount = invResponse?.data?.filter((r: any) => r.status === "PENDING").length || 0;
  
  const pendingAssetCount = assetRequests?.filter((r: any) => r.status === "PENDING").length || 0;

  return (
    <div className="flex flex-col w-full pb-10">
      <Header 
        name="Trung Tâm Phê Duyệt" 
        subtitle="Quản lý và phê duyệt các yêu cầu thay đổi từ nhân viên"
        icon={ClipboardCheck}
      />

      {/* THANH CHỌN TAB (MODULE) */}
      <div className="flex flex-wrap items-center gap-3 mt-4 mb-6 border-b border-gray-200 pb-4">
        <button 
          onClick={() => setActiveTab("INVENTORY")}
          className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === "INVENTORY" ? "bg-blue-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}
        >
          <ArrowRightLeft className="w-5 h-5" /> Phiếu Kho
          {pendingInvCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full shadow-sm animate-pulse">
              {pendingInvCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("ASSETS")}
          className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === "ASSETS" ? "bg-emerald-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}
        >
          <Briefcase className="w-5 h-5" /> Tài Sản
          {pendingAssetCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full shadow-sm animate-pulse">
              {pendingAssetCount}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("MASTER_DATA")}
          className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === "MASTER_DATA" ? "bg-purple-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}
        >
          <Package className="w-5 h-5" /> Danh Mục
          {pendingMdCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full shadow-sm animate-pulse">
              {pendingMdCount}
            </span>
          )}
        </button>
      </div>

      {/* BỘ LỌC TRẠNG THÁI (STATUS FILTER) */}
      <div className="flex items-center gap-2 mb-6 bg-white p-1.5 rounded-xl border border-gray-200 w-max shadow-sm">
        <button 
          onClick={() => setFilter("PENDING")}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${filter === "PENDING" ? "bg-amber-100 text-amber-700 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
        >
          ⏳ Chờ duyệt
        </button>
        <button 
          onClick={() => setFilter("APPROVED")}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${filter === "APPROVED" ? "bg-green-100 text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
        >
          ✅ Đã duyệt
        </button>
        <button 
          onClick={() => setFilter("REJECTED")}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${filter === "REJECTED" ? "bg-red-100 text-red-700 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
        >
          ❌ Đã hủy
        </button>
        <button 
          onClick={() => setFilter("ALL")}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${filter === "ALL" ? "bg-slate-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
        >
          Tất cả
        </button>
      </div>

      {/* KHU VỰC HIỂN THỊ NỘI DUNG TƯƠNG ỨNG VỚI TAB */}
      <div className="animate-in fade-in duration-300">
        {activeTab === "INVENTORY" && <InventoryApprovals filter={filter} />}
        {activeTab === "ASSETS" && <AssetApprovals filter={filter} />}
        {activeTab === "MASTER_DATA" && <MasterDataApprovals filter={filter} />}
      </div>
    </div>
  );
};

export default ApprovalsPage;