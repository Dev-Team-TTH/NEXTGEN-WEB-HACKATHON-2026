"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsSidebarCollapsed, setIsAuthenticated, setIsNotificationsEnabled } from "@/state";
import { Bell, Menu, Moon, Settings, Sun, User, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const isNotificationsEnabled = useAppSelector((state) => state.global.isNotificationsEnabled);
  
  const { t } = useTranslation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  const toggleDarkMode = () => {
    dispatch(setIsDarkMode(!isDarkMode));
    if (!isDarkMode) toast.dark("🌙 Đã bật chế độ Ban đêm");
    else toast.info("☀️ Đã bật chế độ Ban ngày");
  };

  return (
    <div className="flex justify-between items-center w-full mb-7">
      {/* TRÁI: SEARCH & MENU */}
      <div className="flex justify-between items-center gap-5">
        <button
          className="px-3 py-3 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
          onClick={toggleSidebar}
        >
          <Menu className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* PHẢI: ICONS & AVATAR */}
      <div className="flex justify-between items-center gap-5">
        <div className="hidden md:flex justify-between items-center gap-5">
          {/* NÚT DARK MODE */}
          <div>
            <button onClick={toggleDarkMode}>
              {isDarkMode ? (
                <Sun className="cursor-pointer text-gray-500 dark:text-gray-300 hover:text-blue-500 transition-colors" size={24} />
              ) : (
                <Moon className="cursor-pointer text-gray-500 hover:text-blue-500 transition-colors" size={24} />
              )}
            </button>
          </div>
          
          {/* KHU VỰC THÔNG BÁO TƯƠNG TÁC */}
          <div 
            className="relative cursor-pointer"
            onClick={() => {
              if (isNotificationsEnabled) {
                toast.info("🔔 Bạn có 3 phiếu nhập kho cần duyệt!");
              } else {
                toast.warning("🔕 Thông báo đang bị tắt. Hãy bật trong Cài đặt.");
              }
            }}
          >
            <Bell className={`w-6 h-6 transition-colors ${isNotificationsEnabled ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600'}`} />
            {isNotificationsEnabled && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-[0.4rem] py-1 text-xs font-semibold leading-none text-red-100 bg-red-400 rounded-full animate-bounce">
                3
              </span>
            )}
          </div>
          
          <hr className="w-0 h-7 border border-solid border-l border-gray-300 dark:border-gray-600 mx-3" />
          
          {/* KHU VỰC AVATAR ĐƯỢC NÂNG CẤP */}
          <div className="relative flex items-center gap-3 cursor-pointer">
            <div 
              className="flex items-center gap-3"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <Image
                src="/profile.jpg"
                alt="Profile"
                width={40}
                height={40}
                className="rounded-full h-10 w-10 border-2 border-transparent hover:border-blue-500 transition-all object-cover"
              />
              <span className="font-semibold text-gray-700 dark:text-gray-200 hover:text-blue-500">
                Leader Tâm
              </span>
            </div>

            {/* DROPDOWN MENU */}
            {isProfileMenuOpen && (
              <div className="absolute top-14 right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                <div className="flex flex-col">
                  {/* Hồ sơ */}
                  <Link href="/profile" onClick={() => setIsProfileMenuOpen(false)}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('navbar.profile')}</span>
                    </div>
                  </Link>
                  
                  {/* Cài đặt */}
                  <Link href="/settings" onClick={() => setIsProfileMenuOpen(false)}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                      <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('navbar.settings')}</span>
                    </div>
                  </Link>

                  <hr className="border-gray-100 dark:border-gray-700" />
                  
                  {/* Đăng xuất */}
                  <div 
                    className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400 cursor-pointer"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      dispatch(setIsAuthenticated(false)); // Văng ra màn Login
                      toast.info("Bạn đã đăng xuất khỏi hệ thống!");
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('navbar.logout')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;