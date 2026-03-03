"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { 
  Menu, Search, Bell, Sun, Moon, Globe, 
  User, Settings, LogOut, ShieldCheck, QrCode
} from "lucide-react";

// --- REDUX & API ---
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed, logout as clearReduxAuth } from "@/state";
import { useLogoutMutation } from "@/state/api";

// --- COMPONENTS ---
import UniversalScanner from "@/app/(components)/UniversalScanner";

// ==========================================
// COMPONENT: NAVBAR SIÊU CẤP (ENTERPRISE HEADER)
// ==========================================
export default function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();

  // Redux State
  const isSidebarCollapsed = useAppSelector((state) => state.global.isSidebarCollapsed);
  const currentUser = useAppSelector((state) => state.global.currentUser);

  // RTK Query API
  const [logoutApi] = useLogoutMutation();

  // Local State
  const [isMounted, setIsMounted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Click outside refs để đóng dropdown
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Hydration Safe cho Next-Themes
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Xử lý Click Outside cho các Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Bắt sự kiện bàn phím Ctrl+K / Cmd+K để focus thanh tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- LOGIC: ĐĂNG XUẤT ---
  const handleLogout = async () => {
    try {
      await logoutApi().unwrap(); // Gọi API hủy Refresh Token dưới Backend
    } catch (error) {
      console.error("Lỗi API đăng xuất, nhưng vẫn ép thoát Client", error);
    } finally {
      dispatch(clearReduxAuth()); // Xóa RAM & LocalStorage
      router.push("/login");
    }
  };

  // --- LOGIC: ĐỔI NGÔN NGỮ ---
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("app_lang", lng);
    setIsLangOpen(false);
  };

  if (!isMounted) return null; // Chống lỗi Hydration mismatch

  return (
    <>
      {/* KHUNG NAVBAR DÍNH CHẶT (STICKY GLASSMORPHISM) */}
      <header className="sticky top-0 z-[40] w-full glass-panel border-b-0 shadow-sm px-4 py-3 flex justify-between items-center transition-all duration-300">
        
        {/* =========================================
            BÊN TRÁI: NÚT MENU & TÌM KIẾM
            ========================================= */}
        <div className="flex items-center gap-4 flex-1">
          {/* Nút Hamburger (Dành cho Mobile / Toggle Sidebar) */}
          <button
            onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
            className="md:hidden p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Thanh tìm kiếm toàn cầu (Chỉ hiện form dài trên màn hình to) */}
          <div className="relative group hidden sm:block w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              id="global-search"
              type="text"
              placeholder={t('navbar.search', 'Tìm kiếm hóa đơn, vật tư, tài sản...')}
              className="w-full pl-10 pr-16 py-2 bg-gray-100/80 dark:bg-black/20 border border-transparent dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
            {/* Phím tắt ảo (Chỉ hiện trên Desktop) - ĐÃ FIX LỖI CONFLICT CSS */}
            <div className="absolute inset-y-0 right-0 pr-2 hidden lg:flex items-center pointer-events-none">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                Ctrl K
              </span>
            </div>
          </div>
          
          {/* Nút tìm kiếm icon cho Mobile */}
          <button className="sm:hidden p-2 text-gray-500 dark:text-gray-400">
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================
            BÊN PHẢI: CÔNG CỤ & HỒ SƠ
            ========================================= */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* 1. NÚT MỞ MÁY QUÉT QR/BARCODE (UNIVERSAL SCANNER) */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsScannerOpen(true)}
            className="p-2 sm:px-3 sm:py-2 flex items-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
            title="Quét Mã Vạch / QR"
          >
            <QrCode className="w-5 h-5" />
            <span className="hidden lg:block text-sm font-bold">Quét mã</span>
          </motion.button>

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block mx-1"></div>

          {/* 2. CHUYỂN ĐỔI NGÔN NGỮ (i18n) */}
          <div className="relative" ref={langRef}>
            <button 
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <Globe className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden"
                >
                  <button onClick={() => changeLanguage('vi')} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${i18n.language === 'vi' ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>🇻🇳 Tiếng Việt</button>
                  <button onClick={() => changeLanguage('en')} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${i18n.language === 'en' ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>🇺🇸 English</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. CHUYỂN ĐỔI THEME (SÁNG/TỐI) */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* 4. CHUÔNG THÔNG BÁO */}
          <button className="relative p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#0B0F19]"></span>
          </button>

          {/* 5. HỒ SƠ NGƯỜI DÙNG (USER PROFILE DROPDOWN) */}
          <div className="relative ml-1 sm:ml-2" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 pl-1 pr-2 sm:pr-3 rounded-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                {currentUser?.fullName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden md:flex flex-col items-start leading-none">
                <span className="text-sm font-bold text-gray-900 dark:text-white max-w-[100px] truncate">
                  {currentUser?.fullName || "Người dùng"}
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  {currentUser?.role || "STAFF"}
                </span>
              </div>
            </button>

            {/* Khung Dropdown Hồ sơ */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute right-0 mt-3 w-64 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-transparent">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{currentUser?.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser?.email}</p>
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3" /> {currentUser?.role}
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <Link 
                      href="/profile" 
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-500" /> Hồ sơ & Bảo mật (2FA)
                    </Link>
                    <Link 
                      href="/settings" 
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-500" /> Cài đặt hệ thống
                    </Link>
                  </div>

                  <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors active:scale-95"
                    >
                      <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </header>

      {/* COMPONENT QUÉT MÃ QR */}
      <UniversalScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    </>
  );
}