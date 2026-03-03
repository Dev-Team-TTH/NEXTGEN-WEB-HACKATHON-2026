"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  WalletCards,
  MonitorSmartphone,
  ClipboardCheck,
  Database,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LucideIcon // Thêm Type này từ Lucide để định nghĩa cho Icon
} from "lucide-react";

// --- REDUX ---
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";

// ==========================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU CHUẨN (TYPESCRIPT INTERFACES)
// ==========================================
interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  permissions: string[];
  badge?: number; // Dấu "?" nghĩa là thuộc tính này có thể có hoặc không
}

interface MenuGroup {
  groupLabel: string;
  items: MenuItem[];
}

// ==========================================
// 2. CẤU HÌNH MENU & QUYỀN (RBAC ROUTING)
// Áp dụng Interface MenuGroup[] để khóa chặt kiểu dữ liệu
// ==========================================
const MENU_GROUPS: MenuGroup[] = [
  {
    groupLabel: "Trực quan hóa",
    items: [
      { id: "dashboard", label: "Bảng điều khiển", icon: LayoutDashboard, href: "/dashboard", permissions: ["ALL"] },
    ]
  },
  {
    groupLabel: "Vận hành Lõi",
    items: [
      { id: "inventory", label: "Kho bãi & Vật tư", icon: Package, href: "/inventory", permissions: ["VIEW_INVENTORY", "SYSTEM_ADMIN"] },
      { id: "transactions", label: "Mua bán & Giao dịch", icon: ShoppingCart, href: "/transactions", permissions: ["VIEW_TRANSACTION", "SYSTEM_ADMIN"] },
      { id: "accounting", label: "Kế toán Tài chính", icon: WalletCards, href: "/accounting", permissions: ["VIEW_ACCOUNTING", "SYSTEM_ADMIN"] },
      { id: "assets", label: "Tài sản Cố định", icon: MonitorSmartphone, href: "/assets", permissions: ["VIEW_ASSET", "SYSTEM_ADMIN"] },
    ]
  },
  {
    groupLabel: "Trung tâm",
    items: [
      { id: "approvals", label: "Phê duyệt", icon: ClipboardCheck, href: "/approvals", permissions: ["APPROVE_DOCUMENTS", "SYSTEM_ADMIN"], badge: 3 }, // KHÔNG CÒN BÁO LỖI NỮA
    ]
  },
  {
    groupLabel: "Hệ thống",
    items: [
      { id: "master-data", label: "Dữ liệu Nền tảng", icon: Database, href: "/master-data", permissions: ["MANAGE_MASTER_DATA", "SYSTEM_ADMIN"] },
      { id: "users", label: "Nhân sự & Phân quyền", icon: Users, href: "/users", permissions: ["MANAGE_USERS", "SYSTEM_ADMIN"] },
      { id: "settings", label: "Cài đặt chung", icon: Settings, href: "/settings", permissions: ["MANAGE_SETTINGS", "SYSTEM_ADMIN"] },
    ]
  }
];

// ==========================================
// COMPONENT: SIDEBAR ĐIỀU HƯỚNG THÔNG MINH
// ==========================================
export default function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const isSidebarCollapsed = useAppSelector((state) => state.global.isSidebarCollapsed);
  const currentUser = useAppSelector((state) => state.global.currentUser);

  // Responsive logic: Tự động gập menu nếu chuyển sang màn hình nhỏ (Tablet/Mobile)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        dispatch(setIsSidebarCollapsed(true));
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  // Hàm kiểm tra Quyền
  const checkPermission = (requiredPerms: string[]) => {
    if (!currentUser) return false;
    if (currentUser.role === "SYSTEM_ADMIN" || requiredPerms.includes("ALL")) return true;
    return true; // Tạm thời return true để test UI
  };

  // Cấu hình Animation
  const sidebarVariants: Variants = {
    expanded: { width: "16rem", transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
    collapsed: { width: "5rem", transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <>
      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {!isSidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch(setIsSidebarCollapsed(true))}
            className="fixed inset-0 z-[45] bg-slate-900/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR CONTAINER */}
      <motion.aside
        variants={sidebarVariants}
        initial={isSidebarCollapsed ? "collapsed" : "expanded"}
        animate={isSidebarCollapsed ? "collapsed" : "expanded"}
        className={`fixed lg:relative top-0 left-0 z-[50] h-screen bg-white dark:bg-[#0B0F19] border-r border-slate-200 dark:border-white/5 flex flex-col shadow-2xl lg:shadow-none transition-transform duration-300 ${
          isSidebarCollapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0"
        }`}
      >
        {/* Lớp nền nhám (Noise) */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('/noise.png')] z-0"></div>

        {/* --- 1. HEADER LOGO --- */}
        <div className="relative z-10 flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-white/5">
          <div className={`flex items-center gap-3 overflow-hidden transition-all ${isSidebarCollapsed ? "w-0 lg:w-auto justify-center" : "w-auto"}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
              <span className="text-white font-black text-lg leading-none">T</span>
            </div>
            {!isSidebarCollapsed && (
              <span className="font-extrabold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 whitespace-nowrap">
                TTH ERP
              </span>
            )}
          </div>

          <button 
            onClick={() => dispatch(setIsSidebarCollapsed(true))}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- 2. DANH SÁCH MENU --- */}
        <div className="relative z-10 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 py-4 px-3 flex flex-col gap-6">
          {MENU_GROUPS.map((group, groupIdx) => {
            const visibleItems = group.items.filter(item => checkPermission(item.permissions));
            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="flex flex-col gap-1">
                {!isSidebarCollapsed && (
                  <span className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t(group.groupLabel)}
                  </span>
                )}
                {isSidebarCollapsed && (
                  <div className="h-4 border-b border-slate-200/50 dark:border-white/5 mb-2 mx-4"></div>
                )}

                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link href={item.href} key={item.id} title={isSidebarCollapsed ? t(item.label) : ""}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                          isActive
                            ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 font-medium"
                        }`}
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="activeSidebarTab"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 dark:bg-blue-500 rounded-r-full"
                          />
                        )}

                        <Icon className={`shrink-0 ${isSidebarCollapsed ? "w-6 h-6 mx-auto" : "w-5 h-5"} ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"} transition-colors`} />
                        
                        {!isSidebarCollapsed && (
                          <span className="truncate">{t(item.label)}</span>
                        )}

                        {item.badge && (
                          <span className={`absolute right-3 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                            isActive ? "bg-blue-600 text-white" : "bg-rose-500 text-white"
                          } ${isSidebarCollapsed ? "top-1 right-1" : ""}`}>
                            {item.badge}
                          </span>
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* --- 3. FOOTER NÚT GẬP MỞ --- */}
        <div className="relative z-10 p-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-center">
          <button
            onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
            className="hidden lg:flex w-full items-center justify-center p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </motion.aside>
    </>
  );
}