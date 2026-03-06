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
import AIChatbot from "@/app/(components)/AiChatbot"; 
import StoreProvider, { useAppSelector } from "@/app/redux";
import SplashScreen from "@/app/(components)/SplashScreen";

// ==========================================
// COMPONENT 1: LÕI ĐIỀU HƯỚNG VÀ GIAO DIỆN
// Kiến trúc Native Scroll: Không ép chiều cao ảo, 
// nhường quyền cuộn mượt mà lại cho Trình duyệt
// ==========================================
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  
  const { t, i18n } = useTranslation();

  // Redux State
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const isAuthenticated = useAppSelector((state) => state.global.isAuthenticated);

  // Local State
  const [isMounted, setIsMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // 1. HYDRATION SAFE
  useEffect(() => {
    setIsMounted(true);
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

  // 3. ROUTE GUARD
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
  // LOADING STATE
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
  // CẤU HÌNH MOTION TRANSITION
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
        // LUỒNG 1: CHƯA ĐĂNG NHẬP
        <div className="w-full min-h-screen flex bg-slate-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white transition-colors duration-500">
          {children}
        </div>
      ) : (
        // LUỒNG 2: ĐÃ ĐĂNG NHẬP (NATIVE SCROLL)
        // overflow-x-hidden ở đây diệt trừ triệt để lỗi "lệch giao diện" ngang
        <div className="flex items-start min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-[#0B0F19] text-gray-900 dark:text-white relative selection:bg-blue-500/30">
          
          {/* Background Ambient (Dùng fixed để luôn giữ nguyên khi cuộn trang) */}
          <div className="fixed inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('/noise.png')] z-0"></div>
          <div className="fixed top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-blue-500/5 dark:bg-blue-600/10 blur-[100px] pointer-events-none z-0"></div>

          <AnimatePresence>
            {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
          </AnimatePresence>

          {/* SIDEBAR TỰ QUẢN LÝ 2 GIAO DIỆN BẰNG CSS MEDIA QUERIES */}
          <Sidebar />

          {/* MAIN CONTENT: Loại bỏ hoàn toàn thanh cuộn ảo, trả lại quyền Scroll Native */}
          <main className="flex-1 flex flex-col min-w-0 min-h-screen w-full relative z-10 transition-all duration-300 pb-24 lg:pb-8">
            <Navbar />
            
            <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
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

          {/* TRỢ LÝ AI (WIDGET ĐỘC LẬP) */}
          <AIChatbot />
          
        </div>
      )}
    </>
  );
};

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
      <StoreProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </StoreProvider>
    </ThemeProvider>
  );
}