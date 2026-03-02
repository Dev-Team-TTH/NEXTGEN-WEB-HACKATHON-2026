"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, PackageSearch, MonitorDot, WalletCards, 
  ClipboardCheck, UsersRound, Settings, ChevronLeft, Menu, LifeBuoy, X
} from "lucide-react";

// Import Redux & RTK Query
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { useGetPendingApprovalsQuery } from "@/state/api";

// ==========================================
// 1. CẤU TRÚC DỮ LIỆU MENU CÓ TÍCH HỢP RBAC & MOBILE CONFIG
// ==========================================
// - permissions: Mảng quyền yêu cầu. Nếu để trống [] nghĩa là ai đã login cũng xem được.
// - isMobileMain: Cờ đánh dấu hiển thị nhanh trên thanh Bottom Bar của Mobile (Tối đa 4 cái)
const MENU_GROUPS = [
  {
    groupLabel: "Tổng quan",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", permissions: [], isMobileMain: true },
    ]
  },
  {
    groupLabel: "Quản lý nghiệp vụ",
    items: [
      { id: "inventory", label: "Kho bãi & Vật tư", icon: PackageSearch, href: "/inventory", permissions: ["VIEW_INVENTORY", "MANAGE_INVENTORY"], isMobileMain: true },
      { id: "assets", label: "Tài sản cố định", icon: MonitorDot, href: "/assets", permissions: ["VIEW_ASSETS", "MANAGE_ASSETS"], isMobileMain: false },
      { id: "expenses", label: "Kế toán chi phí", icon: WalletCards, href: "/expenses", permissions: ["VIEW_FINANCE", "MANAGE_FINANCE"], isMobileMain: false },
      // Trung tâm phê duyệt cực kỳ quan trọng, luôn ghim ở Mobile Bottom Bar
      { id: "approvals", label: "Trung tâm Phê duyệt", icon: ClipboardCheck, href: "/approvals", permissions: ["APPROVE_DOCUMENTS", "VIEW_APPROVALS"], isMobileMain: true },
    ]
  },
  {
    groupLabel: "Hệ thống",
    items: [
      { id: "users", label: "Nhân sự & Phân quyền", icon: UsersRound, href: "/users", permissions: ["MANAGE_USERS", "MANAGE_ROLES"], isMobileMain: false },
      { id: "settings", label: "Cài đặt chung", icon: Settings, href: "/settings", permissions: ["MANAGE_SYSTEM"], isMobileMain: false },
    ]
  }
];

// ==========================================
// COMPONENT ĐIỀU HƯỚNG CHUẨN ENTERPRISE (SIDEBAR + BOTTOM NAV)
// ==========================================
export default function Sidebar() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  
  // State từ Redux
  const isSidebarCollapsed = useAppSelector((state) => state.global.isSidebarCollapsed);
  const currentUser = useAppSelector((state) => state.global.currentUser);

  // Hydration fix & Window resize logic
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ==========================================
  // LẤY DỮ LIỆU LIVE BADGE (SỐ LƯỢNG CHỜ DUYỆT)
  // Chỉ gọi API nếu user có quyền duyệt để tránh spam server
  // ==========================================
  const canApprove = currentUser?.role === "ADMIN" || currentUser?.permissions?.some(p => ["APPROVE_DOCUMENTS", "VIEW_APPROVALS"].includes(p));
  
  const { data: pendingApprovals } = useGetPendingApprovalsQuery(undefined, {
    skip: !canApprove,
    pollingInterval: 60000, // Tự động refetch mỗi 60 giây (Live ngầm)
  });

  const pendingCount = pendingApprovals?.length || 0;

  // ==========================================
  // EFFECT: PHÁT HIỆN GIAO DIỆN DI ĐỘNG & AUTO-COLLAPSE
  // ==========================================
  useEffect(() => {
    setIsMounted(true);
    
    const handleResize = () => {
      const mobileView = window.innerWidth < 768;
      setIsMobile(mobileView);
      
      // Auto-collapse Sidebar trên Desktop màn nhỏ (Ví dụ iPad dọc 768px - 1024px)
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        dispatch(setIsSidebarCollapsed(true));
      }
    };

    handleResize(); // Chạy lần đầu
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  // ==========================================
  // LOGIC RBAC: LỌC MENU THEO QUYỀN (PERMISSIONS)
  // ==========================================
  const filteredMenuGroups = useMemo(() => {
    if (!currentUser) return [];
    const userRole = currentUser.role || "";
    const userPerms = currentUser.permissions || [];

    return MENU_GROUPS.map(group => {
      const filteredItems = group.items.filter(item => {
        // Mở khóa nếu không yêu cầu quyền, HOẶC là Admin, HOẶC có chứa quyền tương ứng
        if (item.permissions.length === 0) return true;
        if (userRole === "ADMIN") return true;
        return item.permissions.some(perm => userPerms.includes(perm));
      });
      return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0); // Loại bỏ các nhóm trống
  }, [currentUser]);

  if (!isMounted) return null;

  // Lấy các item chính để hiển thị ra Bottom Nav (Chỉ lấy tối đa 4 cái đầu tiên)
  const mobileMainItems = filteredMenuGroups
    .flatMap(g => g.items)
    .filter(item => item.isMobileMain)
    .slice(0, 4);

  // ==========================================
  // RENDER 1: GIAO DIỆN DESKTOP / TABLET (SIDEBAR TRÁI)
  // ==========================================
  const renderDesktopSidebar = () => (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarCollapsed ? "84px" : "280px" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden md:flex relative z-40 h-screen flex-col bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-2xl border-r border-gray-200 dark:border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]"
    >
      {/* HEADER LOGO */}
      <div className="flex items-center justify-between h-20 px-4 mt-2 mb-2">
        <div className="flex items-center justify-center w-full">
          <Link href="/dashboard" className="flex items-center gap-3 w-full cursor-pointer focus:outline-none">
            <motion.div layout className="relative flex-shrink-0 w-11 h-11 drop-shadow-md">
              <Image src="/logo.png" alt="Logo" fill sizes="44px" style={{ objectFit: "contain" }} priority />
            </motion.div>
            <AnimatePresence mode="wait">
              {!isSidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10, display: "none" }}
                  animate={{ opacity: 1, x: 0, display: "block" }}
                  exit={{ opacity: 0, x: -10, display: "none" }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col whitespace-nowrap overflow-hidden"
                >
                  <span className="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400">
                    TTH ERP
                  </span>
                  <span className="text-[10px] font-semibold tracking-widest text-gray-500 dark:text-gray-400 uppercase mt-[-2px]">
                    Enterprise
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>
        
        {/* Nút Toggle */}
        <button
          onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
          className="absolute -right-4 top-7 w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-md text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:scale-110 transition-all focus:outline-none z-50"
        >
          {isSidebarCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <div className="px-6 mb-4"><div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div></div>

      {/* DANH SÁCH MENU (ĐÃ LỌC RBAC) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-3 py-2 space-y-6">
        {filteredMenuGroups.map((group, groupIndex) => (
          <div key={`desktop-group-${groupIndex}`} className="flex flex-col gap-1.5">
            <AnimatePresence>
              {!isSidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 mb-1 text-[11px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase whitespace-nowrap"
                >
                  {group.groupLabel}
                </motion.div>
              )}
            </AnimatePresence>

            {group.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              const hasBadge = item.id === "approvals" && pendingCount > 0;

              return (
                <Link key={`desktop-${item.id}`} href={item.href} className="focus:outline-none outline-none">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      relative flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer transition-all duration-300
                      ${isActive 
                        ? "bg-blue-50/80 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold shadow-sm" 
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 font-medium"
                      }
                      ${isSidebarCollapsed ? "justify-center" : "justify-start"}
                    `}
                    title={isSidebarCollapsed ? item.label : ""}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="desktop-active-pill"
                        className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    
                    <div className="relative">
                      <Icon className={`w-5.5 h-5.5 flex-shrink-0 transition-colors ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
                      {/* LIVE BADGE SIÊU CẤP CHO DESKTOP (CHẤM ĐỎ GÓC ICON KHI COLLAPSE) */}
                      {hasBadge && isSidebarCollapsed && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                      )}
                    </div>

                    <AnimatePresence>
                      {!isSidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10, display: "none" }}
                          animate={{ opacity: 1, x: 0, display: "block" }}
                          exit={{ opacity: 0, x: -10, display: "none" }}
                          transition={{ duration: 0.2 }}
                          className="whitespace-nowrap text-[14px] flex-1 flex items-center justify-between"
                        >
                          {item.label}
                          {/* LIVE BADGE (HIỆN SỐ) KHI EXPAND */}
                          {hasBadge && (
                            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-gradient-to-r from-red-500 to-rose-600 rounded-full shadow-sm animate-pulse">
                              {pendingCount > 99 ? '99+' : pendingCount}
                            </span>
                          )}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="p-4 mt-auto">
        <div className={`flex items-center gap-3 p-3 rounded-2xl transition-all bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-400 ${isSidebarCollapsed ? "justify-center" : "justify-start"}`}>
          <LifeBuoy className="w-5 h-5 flex-shrink-0" />
          {!isSidebarCollapsed && <span className="whitespace-nowrap text-sm font-semibold">Trung tâm trợ giúp</span>}
        </div>
      </div>
    </motion.aside>
  );

  // ==========================================
  // RENDER 2: GIAO DIỆN DI ĐỘNG (BOTTOM NAV + DRAWER)
  // ==========================================
  const renderMobileUI = () => (
    <>
      {/* KHÔNG GIAN ĐỆM BOTTOM TRÁNH ĐÈ NỘI DUNG CHÍNH (Chỉ hiện trên Mobile) */}
      <div className="md:hidden h-20 w-full flex-shrink-0"></div>

      {/* THANH ĐIỀU HƯỚNG ĐÁY (BOTTOM NAVIGATION BAR) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0B0F19]/90 backdrop-blur-2xl border-t border-gray-200 dark:border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          
          {/* CÁC NÚT MAIN MENU */}
          {mobileMainItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            const hasBadge = item.id === "approvals" && pendingCount > 0;

            return (
              <Link key={`bottom-${item.id}`} href={item.href} className="flex-1 flex flex-col items-center justify-center focus:outline-none">
                <div className="relative flex flex-col items-center justify-center w-full h-full p-1 transition-transform active:scale-95">
                  <div className={`relative p-1.5 rounded-xl transition-colors ${isActive ? "bg-blue-100 dark:bg-blue-500/20" : ""}`}>
                    <Icon className={`w-6 h-6 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`} />
                    {/* LIVE BADGE MOBILE */}
                    {hasBadge && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white dark:border-[#0B0F19]"></span>
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-semibold ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}>
                    {item.label.split(" ")[0]} {/* Rút gọn tên trên Mobile */}
                  </span>
                </div>
              </Link>
            );
          })}

          {/* NÚT "MỞ RỘNG" (MENU KHÁC) */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center focus:outline-none transition-transform active:scale-95"
          >
            <div className="relative p-1.5 rounded-xl">
              <Menu className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
            <span className="text-[10px] mt-1 font-semibold text-gray-500 dark:text-gray-400">
              Mở rộng
            </span>
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER (MENU TRƯỢT TỪ DƯỚI LÊN KIỂU IOS) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Lớp phủ đen làm mờ nền (Overlay) */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            
            {/* Khung Menu trượt lên */}
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[70] h-[85vh] bg-white dark:bg-gray-900 rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header Drawer */}
              <div className="flex items-center justify-between p-6 pb-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Logo" width={32} height={32} />
                  <span className="font-bold text-lg text-gray-900 dark:text-white">Tất cả Menu</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 active:scale-90 transition-transform">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Danh sách toàn bộ Menu */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
                {filteredMenuGroups.map((group, idx) => (
                  <div key={`mobile-group-${idx}`}>
                    <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">{group.groupLabel}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {group.items.map(item => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        const hasBadge = item.id === "approvals" && pendingCount > 0;

                        return (
                          <Link key={`mobile-item-${item.id}`} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                            <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-colors active:scale-95 ${isActive ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50" : "bg-gray-50 border-transparent dark:bg-white/5 dark:border-white/5"}`}>
                              <div className="relative mb-2">
                                <Icon className={`w-7 h-7 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-300"}`} />
                                {hasBadge && (
                                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-pulse">
                                    {pendingCount}
                                  </span>
                                )}
                              </div>
                              <span className={`text-[11px] font-semibold text-center leading-tight ${isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                                {item.label}
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      {renderDesktopSidebar()}
      {renderMobileUI()}
    </>
  );
}