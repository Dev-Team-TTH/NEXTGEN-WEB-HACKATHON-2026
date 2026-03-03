"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider, useTheme } from "next-themes"; 
import { motion, AnimatePresence, Variants } from "framer-motion";

// --- i18n Tự động hóa Đa ngôn ngữ ---
import "@/i18n"; 
import { useTranslation } from "react-i18next";

// --- Components & Store ---
import Navbar from "@/app/(components)/Navbar";
import Sidebar from "@/app/(components)/Sidebar";
import StoreProvider, { useAppSelector } from "@/app/redux";
import SplashScreen from "@/app/(components)/SplashScreen";

// ==========================================
// COMPONENT 1: LÕI ĐIỀU HƯỚNG VÀ GIAO DIỆN (ĐÃ CÓ STORE)
// ==========================================
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  
  // Kích hoạt hook dịch thuật
  const { t, i18n } = useTranslation();

  // Redux State
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const isAuthenticated = useAppSelector((state) => state.global.isAuthenticated);

  // Local State
  const [isMounted, setIsMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // 1. HYDRATION SAFE (Ngăn lỗi Server/Client mismatch)
  useEffect(() => {
    setIsMounted(true);
    // Tự động detect ngôn ngữ từ LocalStorage (Nếu có)
    const savedLang = localStorage.getItem("app_lang");
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  // 2. ĐỒNG BỘ THEME
  useEffect(() => {
    if (isMounted) {
      setTheme(isDarkMode ? "dark" : "light");
    }
  }, [isDarkMode, setTheme, isMounted]);

  // 3. ROUTE GUARD (Bảo vệ luồng đăng nhập)
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
  // LOADING STATE (SKELETON TỔNG)
  // ==========================================
  if (!isMounted) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-[#0B0F19]">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
          <div className="w-12 h-12 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin-slow"></div>
        </div>
        <span className="mt-4 text-slate-500 dark:text-slate-400 font-medium tracking-widest text-xs uppercase animate-pulse">
          Đang khởi tạo không gian làm việc...
        </span>
      </div>
    );
  }

  // ==========================================
  // CẤU HÌNH MOTION TRANSITION (CHUYỂN TRANG MƯỢT MÀ)
  // FIX LỖI TYPE: Thêm 'as const' để TS nhận diện đúng literal type của thư viện
  // ==========================================
  const pageVariants: Variants = {
    initial: { opacity: 0, y: 15, filter: "blur(4px)" },
    animate: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)", 
      transition: { type: "spring" as const, stiffness: 260, damping: 20 } 
    },
    exit: { 
      opacity: 0, 
      y: -15, 
      filter: "blur(4px)", 
      transition: { duration: 0.2 } 
    }
  };

  return (
    <>
      {!isAuthenticated ? (
        // LUỒNG 1: CHƯA ĐĂNG NHẬP (Màn hình Login)
        <div className="w-full min-h-screen flex bg-slate-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white transition-colors duration-500">
          {children}
        </div>
      ) : (
        // LUỒNG 2: ĐÃ ĐĂNG NHẬP (Không gian ERP)
        <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white relative selection:bg-blue-500/30">
          
          {/* --- IMMERSIVE BACKGROUND --- */}
          <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('/noise.png')] z-0"></div>
          <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-blue-500/5 dark:bg-blue-600/10 blur-[100px] pointer-events-none z-0"></div>

          {/* SPLASH SCREEN CHÀO MỪNG */}
          <AnimatePresence>
            {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
          </AnimatePresence>

          {/* SIDEBAR */}
          <Sidebar />

          {/* KHU VỰC NỘI DUNG CHÍNH */}
          <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10 transition-all duration-300 pb-20 md:pb-0 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
            <Navbar />
            
            <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
              {/* PAGE TRANSITION WRAPPER */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex-1 flex flex-col w-full h-full"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      )}
    </>
  );
};

// ==========================================
// COMPONENT 2: WRAPPER GỐC (PROVIDER)
// ==========================================
export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
      <StoreProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </StoreProvider>
    </ThemeProvider>
  );
}