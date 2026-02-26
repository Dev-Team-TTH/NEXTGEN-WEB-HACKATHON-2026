"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import {
  Archive,
  Briefcase,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  Layout,
  LucideIcon,
  Menu,
  ChevronRight,
  User // Đã import đầy đủ
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
// (1) Import thư viện
import { useTranslation } from "react-i18next";

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
}

const SidebarLink = ({ href, icon: Icon, label, isCollapsed }: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href || (pathname === "/" && href === "/dashboard");

  return (
    <Link href={href}>
      <div className={`relative flex items-center py-3.5 px-4 my-1.5 rounded-xl transition-all duration-300 ease-out group overflow-hidden ${isActive ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-700 dark:hover:text-blue-400"}`}>
        <div className={`flex justify-center items-center shrink-0 ${isCollapsed ? "w-full" : "w-6"}`}>
          <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-white" : "text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"}`} />
        </div>
        <span className={`font-semibold text-sm whitespace-nowrap transition-all duration-300 ease-out ${isCollapsed ? "opacity-0 max-w-0 ml-0" : "opacity-100 max-w-[200px] ml-4"}`}>
          {label}
        </span>
         {!isCollapsed && (
          <ChevronRight className={`w-4 h-4 ml-auto opacity-0 -translate-x-3 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 ${isActive ? "text-white opacity-100 translate-x-0" : ""}`} />
        )}
      </div>
    </Link>
  );
};

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector((state) => state.global.isSidebarCollapsed);
  
  // (2) Khai báo hàm t
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    setCurrentUser(user);
  }, []);

  const isEffectivelyExpanded = !isSidebarCollapsed || isHovered;

  if (!currentUser) return null;
  const role = currentUser.role;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width] z-40 shrink-0 ${isEffectivelyExpanded ? "w-[280px]" : "w-[88px]"}`}
    >
      <div className={`flex items-center pt-8 pb-6 transition-all duration-300 ${!isEffectivelyExpanded ? "justify-center px-0" : "justify-between px-6"}`}>
        <div className={`flex items-center overflow-hidden transition-all duration-300 ${!isEffectivelyExpanded ? "gap-0" : "gap-3"}`}>
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/30 shrink-0 flex items-center justify-center">
            <Image src="/logo.png" alt="logo" width={24} height={24} className="brightness-0 invert" style={{ width: "auto", height: "auto" }} />
          </div>
          <h1 className={`font-black text-xl tracking-tight text-gray-800 dark:text-gray-100 transition-all duration-300 whitespace-nowrap ${!isEffectivelyExpanded ? "opacity-0 w-0" : "opacity-100 w-auto"}`}>
            TEAM TTH
          </h1>
        </div>
        <button
          className={`p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0 ${!isEffectivelyExpanded ? "hidden" : "block"}`}
          onClick={() => {
            dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
            setIsHovered(false);
          }}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 mb-4">
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
      </div>

      <div className={`flex-grow flex flex-col overflow-y-auto scrollbar-hide transition-all duration-300 pb-8 ${!isEffectivelyExpanded ? "px-3" : "px-5"}`}>
        {/* (3) Dùng {t('từ_khóa')} tuyệt đối */}
        <SidebarLink href="/dashboard" icon={Layout} label={t('sidebar.dashboard')} isCollapsed={!isEffectivelyExpanded} />
        
        {(role === "ADMIN" || role === "MANAGER") && (
          <SidebarLink href="/approvals" icon={ClipboardCheck} label={t('sidebar.approvals')} isCollapsed={!isEffectivelyExpanded} />
        )}

        <SidebarLink href="/inventory" icon={Archive} label={t('sidebar.inventory')} isCollapsed={!isEffectivelyExpanded} />
        
        {(role === "ADMIN" || role === "MANAGER") && (
          <SidebarLink href="/assets" icon={Briefcase} label={t('sidebar.assets')} isCollapsed={!isEffectivelyExpanded} />
        )}

        {(role === "ADMIN" || role === "MANAGER") && (
          <SidebarLink href="/users" icon={User} label={t('sidebar.users')} isCollapsed={!isEffectivelyExpanded} />
        )}

        {role === "ADMIN" && (
          <SidebarLink href="/expenses" icon={CircleDollarSign} label={t('sidebar.expenses')} isCollapsed={!isEffectivelyExpanded} />
        )}
      </div>
    </div>
  );
};

export default Sidebar;