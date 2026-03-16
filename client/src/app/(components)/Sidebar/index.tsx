"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Package, ShoppingCart, WalletCards,
  MonitorSmartphone, ClipboardCheck, Database, Users,
  Settings, ChevronLeft, ChevronRight, Menu as MenuIcon, X,
  Receipt, 
  LucideIcon
} from "lucide-react";

// --- REDUX & API ---
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { useGetPendingApprovalsQuery, useGetMeQuery } from "@/state/api";

// --- IMPORT HÀM PHÂN QUYỀN LÕI TỪ REQUIRE_PERMISSION ---
import { checkUniversalPermission } from "@/app/(components)/RequirePermission";
import { cn } from "@/utils/helpers";

interface MenuItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  href: string;
  permissions: string[];
}

interface MenuGroup {
  groupLabel: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    groupLabel: "Trực quan hóa",
    items: [
      { id: "dashboard", label: "Bảng điều khiển", shortLabel: "Tổng quan", icon: LayoutDashboard, href: "/dashboard", permissions: ["ALL", "DASHBOARD"] }
    ]
  },
  {
    groupLabel: "Vận hành Lõi",
    items: [
      { id: "inventory", label: "Kho bãi & Vật tư", shortLabel: "Kho bãi", icon: Package, href: "/inventory", permissions: ["VIEW_INVENTORY", "MANAGE_INVENTORY", "INVENTORY"] },
      { id: "transactions", label: "Mua bán & Giao dịch", shortLabel: "Giao dịch", icon: ShoppingCart, href: "/transactions", permissions: ["VIEW_TRANSACTION", "MANAGE_TRANSACTION", "TRANSACTION", "ORDER"] },
      { id: "accounting", label: "Kế toán Tài chính", shortLabel: "Kế toán", icon: WalletCards, href: "/accounting", permissions: ["VIEW_ACCOUNTING", "VIEW_FINANCE", "MANAGE_FINANCE", "ACCOUNTING", "FINANCE"] },
      { id: "expenses", label: "Quản lý Chi phí", shortLabel: "Chi phí", icon: Receipt, href: "/expenses", permissions: ["VIEW_EXPENSES", "MANAGE_EXPENSES", "EXPENSE"] }, 
      { id: "assets", label: "Tài sản Cố định", shortLabel: "Tài sản", icon: MonitorSmartphone, href: "/assets", permissions: ["VIEW_ASSET", "VIEW_ASSETS", "MANAGE_ASSETS", "ASSET"] },
    ]
  },
  {
    groupLabel: "Trung tâm",
    items: [
      { id: "approvals", label: "Phê duyệt", shortLabel: "Duyệt", icon: ClipboardCheck, href: "/approvals", permissions: ["APPROVE_DOCUMENTS", "VIEW_APPROVALS", "ACTION_APPROVALS", "MANAGE_APPROVALS", "APPROVAL"] }
    ]
  },
  {
    groupLabel: "Hệ thống",
    items: [
      { id: "master-data", label: "Dữ liệu Nền tảng", shortLabel: "Dữ liệu", icon: Database, href: "/master-data", permissions: ["MANAGE_MASTER_DATA", "MASTER", "DATA"] },
      { id: "users", label: "Nhân sự & Phân quyền", shortLabel: "Nhân sự", icon: Users, href: "/users", permissions: ["MANAGE_USERS", "VIEW_USERS", "MANAGE_ROLES", "USER", "ROLE"] },
      { id: "settings", label: "Cài đặt chung", shortLabel: "Cài đặt", icon: Settings, href: "/settings", permissions: ["MANAGE_SETTINGS", "SETTING", "CONFIG"] },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [isMounted, setIsMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSidebarCollapsed = useAppSelector((state: any) => state.global.isSidebarCollapsed);
  const currentUser = useAppSelector((state: any) => state.global.currentUser);

  const { data: pendingApprovals } = useGetPendingApprovalsQuery();

  // ==========================================
  // KHẮC PHỤC LỖI KHÔNG ĐỒNG BỘ: DÙNG RTK QUERY THAY VÌ FETCH TAY
  // Tự động kéo quyền mới nhất và Inject vào Redux
  // ==========================================
  const { data: meData } = useGetMeQuery(undefined, {
    skip: !isMounted, // Chỉ gọi khi Client đã load xong
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cập nhật Redux ngay khi RTK Query lấy được thông tin User mới nhất
  useEffect(() => {
    if (meData) {
      dispatch({ type: "global/setCurrentUser", payload: meData });
    }
  }, [meData, dispatch]);

  // Khóa cuộn trang (Scroll Lock) khi mở menu trên Mobile
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [mobileMenuOpen]);

  const getDynamicBadge = (itemId: string): number => {
    switch(itemId) {
      case 'approvals': 
        return pendingApprovals?.length || 0; 
      default: 
        return 0;
    }
  };

  const flatMenuItems = useMemo(() => {
    return MENU_GROUPS.flatMap(g => g.items).filter(item => 
      checkUniversalPermission(currentUser, [], item.permissions)
    );
  }, [currentUser]); 

  const mainMobileItems = useMemo(() => {
    return flatMenuItems.slice(0, 4);
  }, [flatMenuItems]);

  const sidebarContainerVariants: Variants = {
    expanded: { width: "17rem", transition: { type: "spring" as const, stiffness: 400, damping: 35 } },
    collapsed: { width: "5rem", transition: { type: "spring" as const, stiffness: 400, damping: 35 } } 
  };

  if (!isMounted) {
    return <aside className="hidden lg:flex w-[17rem] h-screen border-r border-slate-200 dark:border-white/5 bg-white/70 dark:bg-[#0B0F19]/70 shrink-0" />;
  }

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[50] h-[72px] pb-[env(safe-area-inset-bottom)] bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-2xl border-t border-slate-200/60 dark:border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] flex items-center justify-between px-2 sm:px-4 transform-gpu">
        {mainMobileItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const badgeCount = getDynamicBadge(item.id);

          return (
            <Link key={item.id} href={item.href} className="relative flex flex-col items-center justify-center flex-1 h-full group">
              <div className="relative z-10 flex flex-col items-center mt-1 transition-transform duration-200 active:scale-90">
                <Icon className={cn("w-6 h-6 mb-1 transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500")} />
                <span className={cn("text-[10px] font-semibold transition-colors line-clamp-1 text-center", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500")}>
                  {t(item.shortLabel || item.label)}
                </span>
                
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#0B0F19] shadow-[0_0_8px_rgba(225,29,72,0.8)] animate-pulse" />
                )}
              </div>
              {isActive && (
                <motion.div layoutId="mobileActiveTab" transition={{ type: "spring" as const, stiffness: 500, damping: 35 }} className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-blue-600 rounded-b-full transform-gpu" />
              )}
            </Link>
          );
        })}

        <button onClick={() => setMobileMenuOpen(true)} className="relative flex flex-col items-center justify-center flex-1 h-full group mt-1">
          <div className="flex flex-col items-center transition-transform duration-200 active:scale-90">
            <MenuIcon className="w-6 h-6 mb-1 text-slate-500" />
            <span className="text-[10px] font-semibold text-slate-500">Thêm</span>
          </div>
          {getDynamicBadge('approvals') > 0 && (
            <span className="absolute top-2 right-[25%] w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#0B0F19] animate-pulse" />
          )}
        </button>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: "100%" }} 
            transition={{ duration: 0.3, type: "spring" as const, damping: 28, stiffness: 300 }}
            className="lg:hidden fixed inset-0 z-[60] bg-slate-50 dark:bg-[#0B0F19] flex flex-col transform-gpu will-change-transform"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl sticky top-0 z-10">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">Tất cả Phân hệ</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full active:scale-90 transition-transform"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 pb-32">
              {flatMenuItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const badgeCount = getDynamicBadge(item.id);
                return (
                  <Link 
                    key={item.id} 
                    href={item.href} 
                    onClick={() => setMobileMenuOpen(false)} 
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl shadow-sm active:scale-95 transition-all duration-200 border",
                      isActive ? "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-500/20" : "bg-white dark:bg-white/5 border-transparent dark:border-white/5"
                    )}
                  >
                    <div className={cn("p-2.5 rounded-xl relative", isActive ? "bg-blue-600 text-white" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400")}>
                      <item.icon className="w-6 h-6" />
                      {badgeCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#0B0F19]" />}
                    </div>
                    <span className={cn("font-bold text-base flex-1", isActive ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-200")}>
                      {t(item.label)}
                    </span>
                    {badgeCount > 0 && (
                      <span className="px-2.5 py-1 bg-rose-500 text-white rounded-lg text-xs font-black shadow-md animate-pulse">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.aside
        variants={sidebarContainerVariants}
        initial={isSidebarCollapsed ? "collapsed" : "expanded"}
        animate={isSidebarCollapsed ? "collapsed" : "expanded"}
        className="hidden lg:flex sticky top-0 z-[50] h-screen shrink-0 border-r border-slate-200/70 dark:border-white/10 
                   bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.04)]
                   flex-col overflow-hidden transform-gpu will-change-[width]"
      >
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay z-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/[0.01] dark:to-white/[0.02] pointer-events-none z-0" />

        <div className="relative z-10 flex items-center h-16 mt-2 mb-4 px-2">
          <div className="w-16 h-full shrink-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center shadow-sm border border-slate-100 dark:border-white/10 p-1.5 hover:scale-105 transition-transform duration-300">
              <Image src="/logo.png" alt="TTH ERP" width={32} height={32} className="object-contain" priority />
            </div>
          </div>
          
          <AnimatePresence initial={false}>
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden whitespace-nowrap"
              >
                <span className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400">
                  TTH ERP
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden scrollbar-none flex flex-col gap-6 pb-20">
          {MENU_GROUPS.map((group, groupIdx) => {
            const visibleItems = group.items.filter(item => checkUniversalPermission(currentUser, [], item.permissions));
            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="flex flex-col gap-1.5">
                <div className="h-6 flex items-center px-2">
                  <div className="w-16 shrink-0 flex justify-center">
                    {isSidebarCollapsed ? (
                      <div className="w-6 h-px bg-slate-200 dark:bg-white/10" />
                    ) : null}
                  </div>
                  <AnimatePresence>
                    {!isSidebarCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 whitespace-nowrap"
                      >
                        {t(group.groupLabel)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  const badgeCount = getDynamicBadge(item.id); 

                  return (
                    <Link href={item.href} key={item.id} title={t(item.label)} className="block px-2">
                      <div
                        className={cn(
                          "relative flex items-center h-[46px] rounded-2xl group transition-all duration-200 hover:scale-[1.015] active:scale-[0.98]",
                          isActive ? "text-blue-700 dark:text-blue-300 font-bold" : "text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100/80 dark:hover:bg-white/5"
                        )}
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="desktopActiveTab" 
                            transition={{ type: "spring" as const, stiffness: 500, damping: 35 }} 
                            className="absolute inset-0 bg-white dark:bg-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-200/80 dark:border-white/10 rounded-2xl z-0 transform-gpu" 
                          />
                        )}

                        <div className="relative z-10 w-16 h-full shrink-0 flex items-center justify-center">
                          <Icon className={cn("w-5 h-5 transition-colors duration-200", isActive ? "text-blue-600 dark:text-blue-400" : "group-hover:text-blue-500")} />
                          
                          {isSidebarCollapsed && badgeCount > 0 && (
                            <span className="absolute top-2.5 right-4 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#0B0F19] shadow-[0_0_8px_rgba(225,29,72,0.8)] animate-pulse" />
                          )}
                        </div>
                        
                        <AnimatePresence initial={false}>
                          {!isSidebarCollapsed && (
                            <motion.div 
                              initial={{ opacity: 0, width: 0 }} 
                              animate={{ opacity: 1, width: "auto" }} 
                              exit={{ opacity: 0, width: 0 }}
                              className="flex-1 h-full flex items-center pr-3 overflow-hidden whitespace-nowrap z-10"
                            >
                              <span className="text-[13.5px] truncate pr-2">{t(item.label)}</span>
                              
                              {badgeCount > 0 && (
                                <span className="ml-auto px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white shadow-[0_0_10px_rgba(225,29,72,0.4)] shrink-0 animate-pulse">
                                  {badgeCount > 99 ? '99+' : badgeCount}
                                </span>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#0B0F19] dark:via-[#0B0F19]/95 dark:to-transparent">
          <button
            onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
            className="w-full flex items-center justify-center h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-sm transition-all duration-200 hover:scale-[1.03] active:scale-95"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5 transition-transform" /> : <ChevronLeft className="w-5 h-5 transition-transform" />}
          </button>
        </div>
      </motion.aside>
    </>
  );
}