"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider, useTheme } from "next-themes"; 
import Navbar from "@/app/(components)/Navbar";
import Sidebar from "@/app/(components)/Sidebar";
import StoreProvider, { useAppSelector } from "@/app/redux";
import "@/i18n";
import SplashScreen from "@/app/(components)/SplashScreen";

// ==========================================
// COMPONENT LÕI ĐIỀU HƯỚNG VÀ GIAO DIỆN
// ==========================================
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();

  // Lấy dữ liệu từ Redux (StoreProvider đã đồng bộ ngầm trước đó)
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const isAuthenticated = useAppSelector((state) => state.global.isAuthenticated);

  // Trạng thái cục bộ
  const [isMounted, setIsMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // 1. KÍCH HOẠT CLIENT-SIDE (Hydration Safe)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 2. ĐỒNG BỘ THEME
  useEffect(() => {
    setTheme(isDarkMode ? "dark" : "light");
  }, [isDarkMode, setTheme]);

  // 3. BẢO VỆ ĐƯỜNG DẪN (ROUTE GUARD)
  useEffect(() => {
    if (isMounted) {
      if (!isAuthenticated && pathname !== "/login") {
        router.push("/login");
      } else if (isAuthenticated && pathname === "/login") {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, pathname, isMounted, router]);

  // ==========================================
  // KIẾN TRÚC RENDER CHỐNG CHUNKLOAD & HYDRATION ERROR
  // Luôn giữ {children} trong DOM, dùng CSS Overlay để che màn hình khi đang tải
  // ==========================================
  return (
    <>
      {/* LỚP MÀN CHẮN OVERLAY: Chờ hệ thống khởi tạo */}
      {!isMounted && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <span className="loader">Đang khởi tạo hệ thống...</span>
        </div>
      )}

      {/* GIAO DIỆN CHÍNH: Ẩn đi khi chưa Mount xong để tránh nháy hình */}
      <div className={!isMounted ? "invisible opacity-0 h-0 overflow-hidden" : "visible opacity-100 transition-opacity duration-500"}>
        
        {!isAuthenticated ? (
          // LUỒNG 1: DÀNH CHO TRANG ĐĂNG NHẬP
          <div className="w-full min-h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            {children}
          </div>
        ) : (
          // LUỒNG 2: DÀNH CHO HỆ THỐNG ERP
          <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#f8fafc] dark:bg-gray-900 relative transition-all duration-300">
              <Navbar />
              <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 2xl:p-10 flex-grow flex flex-col">
                {children}
              </div>
            </main>
          </div>
        )}

      </div>
    </>
  );
};

// ==========================================
// COMPONENT GỐC BỌC NGOÀI CÙNG DỰ ÁN
// ==========================================
const DashboardWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <StoreProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </StoreProvider>
    </ThemeProvider>
  );
};

export default DashboardWrapper;