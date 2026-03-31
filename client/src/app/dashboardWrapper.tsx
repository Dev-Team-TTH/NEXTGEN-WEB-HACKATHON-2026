"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider, useTheme } from "next-themes"; 
import { motion, AnimatePresence, Variants } from "framer-motion";
import dynamic from "next/dynamic"; 

// --- i18n Tự động hóa Đa ngôn ngữ ---
import "@/i18n"; 
import { useTranslation } from "react-i18next";

// --- Components & Store ---
import Navbar from "@/app/(components)/Navbar";
import Sidebar from "@/app/(components)/Sidebar";
import StoreProvider, { useAppSelector, useAppDispatch } from "@/app/redux";
import SplashScreen from "@/app/(components)/SplashScreen";
import { setIsDarkMode } from "@/state";
import SocketProvider from "@/app/(components)/SocketProvider";

// --- UTILS ---
import { cn } from "@/utils/helpers";
import PageTransition from "./(components)/PageTransition";

// 🚀 TỐI ƯU HÓA BUNDLE SIZE: Lazy Load AI Chatbot
const AIChatbot = dynamic(() => import("@/app/(components)/AiChatbot"), { 
  ssr: false, 
});

// ==========================================
// COMPONENT 1: LÕI ĐIỀU HƯỚNG VÀ GIAO DIỆN
// ==========================================
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  
  const { resolvedTheme } = useTheme(); 
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();

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
    if (isMounted && resolvedTheme) {
      const isDark = resolvedTheme === "dark";
      if (isDark !== isDarkMode) {
        dispatch(setIsDarkMode(isDark));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme, isMounted, dispatch]);

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
    // 🚀 BỔ SUNG transition-colors duration-500 để Dark Mode mượt mà toàn cục
    <div className={cn("transition-all duration-500 w-full min-h-screen flex bg-slate-50 dark:bg-[#0B0F19]", isMounted ? "opacity-100" : "opacity-0")}>
      {!isAuthenticated ? (
        // LUỒNG 1: CHƯA ĐĂNG NHẬP
        <div className="w-full flex bg-transparent">
          {children}
        </div>
      ) : (
        // LUỒNG 2: ĐÃ ĐĂNG NHẬP
        <div className="flex h-screen w-full overflow-hidden bg-transparent relative selection:bg-blue-500/30">
          
          {/* --- IMMERSIVE BACKGROUND --- */}
          <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.04] pointer-events-none mix-blend-overlay bg-[url('/noise.png')] z-0 transition-opacity duration-500"></div>
          <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-blue-500/5 dark:bg-blue-600/10 blur-[100px] pointer-events-none z-0 transition-colors duration-500"></div>

          {/* SPLASH SCREEN */}
          <AnimatePresence>
            {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
          </AnimatePresence>

          {/* SIDEBAR */}
          <Sidebar />

          {/* KHU VỰC NỘI DUNG CHÍNH */}
          <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10 transition-all duration-500 pb-20 md:pb-0 scrollbar-hide">
            <Navbar />
            
            <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex-1 flex flex-col w-full h-full origin-top"
                >
                  <SocketProvider>
                    <PageTransition>
                      {children}
                    </PageTransition>
                  </SocketProvider>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* TÍCH HỢP AI CHATBOT */}
          <AIChatbot />

        </div>
      )}
    </div>
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