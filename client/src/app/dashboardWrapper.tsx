"use client";

import React, { useEffect } from "react";
import Navbar from "@/app/(components)/Navbar";
import Sidebar from "@/app/(components)/Sidebar";
import StoreProvider, { useAppSelector } from "./redux";
import '../i18n';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
import Login from "@/app/(components)/Login";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [isDarkMode]);

  useEffect(() => {
    // Mỗi khi i18n.language thay đổi, nó sẽ lôi từ điển ra dịch và gắn lên tab trình duyệt
    document.title = t("app.documentTitle");
  }, [i18n.language, t]);

  return (
    <div
      className={`${
        isDarkMode ? "dark" : "light"
      } flex bg-gray-50 text-gray-900 w-full min-h-screen`}
    >
      <Sidebar />
      <main
        className={`flex flex-col w-full h-full py-7 px-9 bg-gray-50 ${
          isSidebarCollapsed ? "md:pl-24" : "md:pl-72"
        }`}
      >
        <Navbar />
        {children}
        <ToastContainer position="bottom-right" autoClose={3000} />
      </main>
    </div>
  );
};

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAppSelector((state) => state.global.isAuthenticated);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  // Ép trình duyệt đổi màu ngay từ ngoài cổng
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Nếu chưa đăng nhập -> Trả về giao diện Login
  if (!isAuthenticated) {
    return (
      <div className={`${isDarkMode ? "dark" : "light"} w-full min-h-screen bg-gray-50 dark:bg-gray-900`}>
        {/* Toast cũng đổi màu theo Dark Mode luôn */}
        <ToastContainer position="bottom-right" autoClose={3000} theme={isDarkMode ? "dark" : "light"} />
        <Login />
      </div>
    );
  }

  // Nếu đăng nhập rồi -> Trả về giao diện Hệ thống
  return <DashboardLayout>{children}</DashboardLayout>;
};

// COMPONENT GỐC
const DashboardWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <AuthGuard>{children}</AuthGuard>
    </StoreProvider>
  );
};

export default DashboardWrapper;