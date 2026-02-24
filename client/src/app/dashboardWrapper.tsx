"use client";

import React, { useEffect } from "react";
import Navbar from "@/app/(components)/Navbar";
import Sidebar from "@/app/(components)/Sidebar";
import StoreProvider, { useAppSelector } from "@/app/redux";
import "@/i18n";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  // Xử lý chuyển đổi chế độ Sáng / Tối an toàn, không bị kẹt class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    // 1. CONTAINER NGOÀI CÙNG: 
    // - Khóa chặt chiều cao bằng đúng màn hình (h-screen).
    // - Cắt bỏ thanh cuộn thừa (overflow-hidden) để tránh trang web bị giật nảy.
    <div className={`${isDarkMode ? "dark bg-gray-900" : "light bg-gray-50"} flex h-screen w-full overflow-hidden text-gray-900 transition-colors duration-300`}>
      
      {/* 2. SIDEBAR CỦA HỆ THỐNG */}
      <Sidebar />

      {/* 3. KHU VỰC NỘI DUNG CHÍNH (MAIN CONTENT): 
          - Tự lấp đầy phần chiều ngang còn lại (flex-1).
          - Có thanh cuộn dọc độc lập (overflow-y-auto).
      */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#f8fafc] dark:bg-gray-900 transition-all duration-300 relative">
        
        {/* THANH ĐIỀU HƯỚNG TRÊN CÙNG */}
        <Navbar />
        
        {/* 4. WORKSPACE (Không gian làm việc hiển thị nội dung các trang): 
            - Giới hạn độ rộng tối đa (max-w-[1600px]) để không bị loãng trên màn hình Ultrawide.
            - Căn giữa tự động (mx-auto).
            - Responsive padding: Tự động rộng ra khi màn hình to hơn.
        */}
        <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 2xl:p-10 flex-grow flex flex-col">
          {children}
        </div>

      </main>

    </div>
  );
};

// COMPONENT BỌC NGOÀI CÙNG ĐỂ CUNG CẤP STATE REDUX CHO TOÀN BỘ APP
const DashboardWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </StoreProvider>
  );
};

export default DashboardWrapper;