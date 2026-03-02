"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Sun, Moon, Bell, Settings, LogOut, 
  User, Shield, Command, X, Building2, ChevronDown, Check, Globe,
  FileSignature, Clock
} from "lucide-react";
import toast from "react-hot-toast";

// Import thư viện i18n để đổi ngôn ngữ thực tế
import { useTranslation } from "react-i18next";

// Import Redux & API Hooks
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, logout as logoutAction, setActiveBranchId, setLanguage } from "@/state";
import { useLogoutMutation, useGetBranchesQuery, useGetPendingApprovalsQuery } from "@/state/api";

const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", flag: "🇺🇸" }
];

// ==========================================
// COMPONENT NAVBAR SIÊU CẤP (MESMERIZING UI)
// ==========================================
export default function Navbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { i18n } = useTranslation(); // Lấy hook i18n
  
  // ==========================================
  // HYDRATION MISMATCH FIX (SSR vs CSR)
  // ==========================================
  const [isMounted, setIsMounted] = useState(false);

  // Kéo dữ liệu từ Redux Store
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const currentUser = useAppSelector((state) => state.global.currentUser);
  const activeBranchId = useAppSelector((state) => state.global.activeBranchId);
  const currentLanguage = useAppSelector((state) => state.global.language);
  
  // ==========================================
  // KẾT NỐI API BẢO MẬT & THÔNG MINH
  // ==========================================
  const [logoutApi] = useLogoutMutation();
  
  // 1. API Chi nhánh 
  const { 
    data: branches, 
    isLoading: isLoadingBranches, 
    isError: isBranchesError 
  } = useGetBranchesQuery();

  // 2. API Live Notification (Chuông báo thực tế)
  const canApprove = currentUser?.role === "ADMIN" || currentUser?.permissions?.some(p => ["APPROVE_DOCUMENTS", "VIEW_APPROVALS"].includes(p));
  const { data: pendingApprovals } = useGetPendingApprovalsQuery(undefined, {
    skip: !isMounted || !canApprove,
    pollingInterval: 60000, 
  });
  const pendingCount = pendingApprovals?.length || 0;

  // Local State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false); 
  
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  
  // Refs
  const profileRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // XỬ LÝ EFFECT
  // ==========================================
  useEffect(() => {
    setIsMounted(true); 
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) setIsProfileOpen(false);
      if (branchRef.current && !branchRef.current.contains(target)) setIsBranchMenuOpen(false);
      if (languageRef.current && !languageRef.current.contains(target)) setIsLanguageMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Phím tắt tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (window.innerWidth < 640) {
          setIsMobileSearchOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
          document.getElementById("global-search")?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ==========================================
  // HÀM XỬ LÝ LOGIC UI & API
  // ==========================================
  const toggleTheme = () => dispatch(setIsDarkMode(!isDarkMode));

  const handleBranchSelect = (branchId: string) => {
    dispatch(setActiveBranchId(branchId));
    setIsBranchMenuOpen(false);
    toast.success("Đã chuyển phiên làm việc sang chi nhánh mới!");
  };

  const handleLanguageSelect = (langCode: string) => {
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(langCode);
    }
    dispatch(setLanguage(langCode));
    setIsLanguageMenuOpen(false);
    toast.success(langCode === 'vi' ? "Đã chuyển sang Tiếng Việt" : "Switched to English");
  };

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
      dispatch(logoutAction());
      toast.success("Đã đăng xuất an toàn!");
      router.push("/login");
    } catch (error) {
      dispatch(logoutAction());
      router.push("/login");
    }
  };

  const openMobileSearch = () => {
    setIsMobileSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearchOpen(false); 
      setSearchQuery(""); 
    }
  };

  const navigateTo = (path: string, closeFunc: () => void) => {
    router.push(path);
    closeFunc();
  };

  const activeBranch = branches?.find(b => b.branchId === activeBranchId);
  const displayBranchName = isLoadingBranches 
    ? "Đang tải..." 
    : isBranchesError 
      ? "Lỗi máy chủ" 
      : (activeBranch?.name || "Tất cả chi nhánh");

  // ==========================================
  // ANIMATION VARIANTS (HOẠT ẢNH XẾP TẦNG - STAGGERED)
  // ==========================================
  const dropdownVariants = {
    hidden: { opacity: 0, y: -15, scale: 0.95, filter: "blur(10px)" },
    visible: { 
      opacity: 1, y: 0, scale: 1, filter: "blur(0px)", 
      transition: { type: "spring" as const, stiffness: 400, damping: 25, staggerChildren: 0.05 } 
    },
    exit: { opacity: 0, y: -10, scale: 0.95, filter: "blur(5px)", transition: { duration: 0.2 } }
  };

  // VÁ LỖ HỔNG TS2322: Thêm `as const` vào "spring"
  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 300 } }
  };

  // ==========================================
  // HYDRATION GUARD SKELETON
  // ==========================================
  if (!isMounted) {
    return (
      <header className="sticky top-0 z-30 w-full bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border-b border-gray-200 dark:border-white/10 shadow-sm pt-safe min-h-[64px] flex items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full flex justify-between max-w-[1600px] mx-auto animate-pulse">
          <div className="w-32 sm:w-48 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="flex gap-2 sm:gap-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
          </div>
        </div>
      </header>
    );
  }

  // ==========================================
  // RENDER CHÍNH THỨC CỦA NAVBAR
  // ==========================================
  return (
    <header className="sticky top-0 z-30 w-full bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border-b border-gray-200 dark:border-white/10 shadow-sm transition-colors duration-300 pt-safe min-h-[64px]">
      
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto relative">
        
        {/* ==========================================
            MOBILE SEARCH OVERLAY TỐI ƯU
            ========================================== */}
        <AnimatePresence>
          {isMobileSearchOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10, filter: "blur(10px)" }} 
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} 
              exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
              className="absolute inset-0 z-50 flex items-center bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-3xl px-3 sm:px-4 pt-safe shadow-2xl"
            >
              <div className="flex items-center w-full bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl px-3 py-3 border border-gray-200/50 dark:border-gray-700/50 shadow-inner">
                <Search className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchSubmit} 
                  className="flex-1 bg-transparent text-[15px] font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                  placeholder="Tìm phiếu, tài sản, nhân sự (Enter)..."
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white focus:outline-none bg-gray-200 dark:bg-gray-700 rounded-full transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button 
                onClick={() => setIsMobileSearchOpen(false)}
                className="ml-3 px-3 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap active:scale-95 transition-transform"
              >
                Hủy
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==========================================
            KHU VỰC 1: TRÁI - TÌM KIẾM & CONTEXT SWITCHER
            ========================================== */}
        <div className="flex flex-1 items-center gap-2 lg:gap-4 h-full">
          
          {/* A. BỘ CHUYỂN ĐỔI CHI NHÁNH */}
          <div className="relative h-full flex items-center" ref={branchRef}>
            <button
              onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
              className="group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl transition-all shadow-sm hover:shadow-md focus:outline-none"
            >
              <Building2 className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isBranchesError ? "text-red-500" : "text-blue-600 dark:text-blue-400"}`} />
              
              <div className="flex flex-col items-start">
                <span className="hidden sm:block text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-0.5">Chi nhánh</span>
                <span className={`text-[11px] sm:text-xs font-bold leading-none max-w-[100px] lg:max-w-[200px] truncate ${isBranchesError ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                  {displayBranchName}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-400 transition-transform duration-300 ${isBranchMenuOpen ? "rotate-180 text-blue-500" : ""}`} />
            </button>

            <AnimatePresence>
              {isBranchMenuOpen && (
                <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-14 left-0 w-[280px] sm:w-[320px] bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-[1.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] overflow-hidden z-50">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-white/10 bg-gray-50/80 dark:bg-white/5">
                    <p className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Chọn điểm làm việc</p>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide space-y-1">
                    {isBranchesError && (
                      <motion.div variants={itemVariants} className="p-3 text-xs text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl mb-2">
                        Không thể kết nối máy chủ dữ liệu nhánh.
                      </motion.div>
                    )}

                    <motion.button variants={itemVariants} onClick={() => handleBranchSelect("")} className={`w-full flex items-center justify-between px-3 py-3 text-sm font-semibold rounded-xl transition-all focus:outline-none ${!activeBranchId ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 shadow-sm" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                      <span className="truncate flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${!activeBranchId ? "bg-blue-500 animate-pulse" : "bg-gray-300 dark:bg-gray-600"}`}></div>
                        Tất cả chi nhánh
                      </span>
                      {!activeBranchId && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                    </motion.button>
                    
                    {branches?.map((branch) => (
                      <motion.button variants={itemVariants} key={branch.branchId} onClick={() => handleBranchSelect(branch.branchId)} className={`w-full flex items-center justify-between px-3 py-3 text-sm font-semibold rounded-xl transition-all focus:outline-none ${activeBranchId === branch.branchId ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 shadow-sm" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                        <div className="flex items-center gap-3 w-full pr-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs ${activeBranchId === branch.branchId ? "bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                            {branch.code.substring(0,2)}
                          </div>
                          <div className="flex flex-col items-start truncate text-left w-full">
                            <span className="truncate w-full">{branch.name}</span>
                            <span className="text-[10px] text-gray-400 font-medium mt-0.5">{branch.code}</span>
                          </div>
                        </div>
                        {activeBranchId === branch.branchId && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* B. THANH TÌM KIẾM TOÀN CỤC DESKTOP */}
          <motion.div 
            animate={{ width: isSearchFocused ? "100%" : "280px", maxWidth: "480px" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative hidden sm:flex items-center w-full max-w-[280px]"
          >
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className={`h-4 w-4 transition-colors duration-300 ${isSearchFocused ? "text-blue-500 drop-shadow-sm" : "text-gray-400"}`} />
            </div>
            <input
              id="global-search" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)}
              onKeyDown={handleSearchSubmit} 
              className="block w-full pl-10 pr-14 py-2.5 bg-gray-100/80 dark:bg-white/5 border border-transparent dark:border-white/10 rounded-2xl text-[13px] font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
              placeholder="Tìm kiếm (Ctrl + K)..."
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
              {searchQuery ? (
                <button onClick={() => setSearchQuery("")} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white bg-gray-200/50 dark:bg-gray-700/50 rounded-full transition-colors"><X className="h-3.5 w-3.5" /></button>
              ) : (
                <kbd className="hidden lg:inline-flex items-center px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 font-sans text-[9px] font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 shadow-sm"><Command className="w-3 h-3 mr-0.5" /> K</kbd>
              )}
            </div>
          </motion.div>
        </div>

        {/* ==========================================
            KHU VỰC 2: PHẢI - CÔNG CỤ & PROFILE
            ========================================== */}
        <div className="flex items-center justify-end gap-1 sm:gap-2 ml-2">
          
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openMobileSearch} className="sm:hidden p-2 text-gray-500 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all shadow-sm">
            <Search className="w-5 h-5" />
          </motion.button>

          {/* Đổi ngôn ngữ (Language Switcher) */}
          <div className="relative" ref={languageRef}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)} className="p-2 text-gray-500 hover:bg-white dark:text-gray-400 dark:hover:bg-white/10 rounded-xl transition-all shadow-sm focus:outline-none flex items-center gap-1.5">
              <Globe className="w-5 h-5" />
              <span className="hidden lg:block text-[11px] font-bold uppercase">{currentLanguage}</span>
            </motion.button>
            <AnimatePresence>
              {isLanguageMenuOpen && (
                <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-12 right-0 w-44 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-[1.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] overflow-hidden z-50 p-2 space-y-1">
                  {LANGUAGES.map((lang) => (
                    <motion.button variants={itemVariants} key={lang.code} onClick={() => handleLanguageSelect(lang.code)} className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors focus:outline-none ${currentLanguage === lang.code ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                      <span>{lang.flag} {lang.label}</span>
                      {currentLanguage === lang.code && <Check className="w-4 h-4 flex-shrink-0" />}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleTheme} className="p-2 text-gray-500 hover:bg-white dark:text-gray-400 dark:hover:bg-white/10 rounded-xl transition-all shadow-sm focus:outline-none">
            <AnimatePresence mode="wait" initial={false}>
              {isDarkMode 
                ? <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}><Moon className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" /></motion.div>
                : <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}><Sun className="w-5 h-5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" /></motion.div>
              }
            </AnimatePresence>
          </motion.button>

          {/* TRUNG TÂM THÔNG BÁO (NOTIFICATION CENTER) */}
          <div className="relative" ref={notifRef}>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
              onClick={() => setIsNotifOpen(!isNotifOpen)} 
              className={`relative p-2 rounded-xl transition-all shadow-sm focus:outline-none ${isNotifOpen ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" : "text-gray-500 hover:bg-white dark:text-gray-400 dark:hover:bg-white/10"}`}
            >
              <Bell className="w-5 h-5" />
              {pendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white dark:border-[#0B0F19]"></span>
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {isNotifOpen && (
                <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-12 right-0 w-[320px] sm:w-[380px] bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-2xl border border-gray-100 dark:border-white/10 rounded-[1.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] overflow-hidden z-50 origin-top-right">
                  
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white">Thông báo</p>
                    {pendingCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full">
                        {pendingCount} chờ duyệt
                      </span>
                    )}
                  </div>

                  <div className="max-h-[350px] overflow-y-auto scrollbar-hide">
                    {pendingCount === 0 ? (
                      <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                          <Check className="w-6 h-6 text-green-500" />
                        </div>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Không có thông báo mới</p>
                        <p className="text-xs text-gray-500 mt-1">Bạn đã xử lý hết tất cả công việc.</p>
                      </motion.div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {pendingApprovals?.slice(0, 5).map((approval: any) => (
                          <motion.button 
                            variants={itemVariants} 
                            key={approval.requestId} 
                            onClick={() => navigateTo(`/approvals/${approval.requestId}`, () => setIsNotifOpen(false))}
                            className="w-full text-left flex items-start p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors group focus:outline-none"
                          >
                            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <FileSignature className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="ml-3 flex-1 overflow-hidden">
                              <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {approval.workflow?.name || "Yêu cầu phê duyệt mới"}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                Người trình: {approval.requester?.fullName || "Chưa rõ"}
                              </p>
                              <div className="flex items-center mt-1.5 text-[10px] text-gray-400 font-medium">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(approval.createdAt).toLocaleDateString('vi-VN')}
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>

                  {pendingCount > 0 && (
                    <div className="p-2 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                      <button onClick={() => navigateTo('/approvals', () => setIsNotifOpen(false))} className="w-full py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors text-center focus:outline-none">
                        Xem tất cả {pendingCount} yêu cầu
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

          {/* AVATAR & DROPDOWN CÁ NHÂN */}
          <div className="relative flex h-full items-center" ref={profileRef}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 lg:gap-3 p-1 pl-1.5 pr-2 sm:pl-2 sm:pr-3 bg-gray-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-full hover:shadow-md transition-all focus:outline-none">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-inner flex-shrink-0">
                {currentUser?.fullName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden lg:flex flex-col items-start text-left">
                <span className="text-sm font-bold text-gray-900 dark:text-white leading-none max-w-[120px] truncate">{currentUser?.fullName || "Người dùng"}</span>
                <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1 truncate max-w-[120px]">{currentUser?.role || "GUEST"}</span>
              </div>
            </motion.button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-14 right-0 w-[260px] bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-[1.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] overflow-hidden z-50 origin-top-right p-2 space-y-1">
                  
                  <div className="px-4 py-3 mb-2 border-b border-gray-100 dark:border-white/10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate drop-shadow-sm">{currentUser?.fullName || "Người dùng"}</p>
                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate mt-0.5">{currentUser?.email || "Chưa có email"}</p>
                  </div>

                  <motion.button variants={itemVariants} onClick={() => navigateTo('/profile', () => setIsProfileOpen(false))} className="w-full flex items-center px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors focus:outline-none">
                    <User className="w-4 h-4 mr-3 text-gray-400" /> Hồ sơ cá nhân
                  </motion.button>
                  <motion.button variants={itemVariants} onClick={() => navigateTo('/settings/security', () => setIsProfileOpen(false))} className="w-full flex items-center px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors focus:outline-none">
                    <Shield className="w-4 h-4 mr-3 text-gray-400" /> Bảo mật & 2FA
                  </motion.button>
                  <motion.button variants={itemVariants} onClick={() => navigateTo('/settings', () => setIsProfileOpen(false))} className="w-full flex items-center px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors focus:outline-none mb-2">
                    <Settings className="w-4 h-4 mr-3 text-gray-400" /> Cài đặt hệ thống
                  </motion.button>

                  <div className="pt-2 border-t border-gray-100 dark:border-white/10">
                    <motion.button variants={itemVariants} onClick={handleLogout} className="w-full flex items-center px-3 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors focus:outline-none">
                      <LogOut className="w-4 h-4 mr-3" /> Đăng xuất an toàn
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
        </div>
      </div>
    </header>
  );
}