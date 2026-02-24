"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { Bell, Menu, Moon, Sun, Settings, LogOut, User as UserIcon } from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
// (1) Import thư viện
import { useTranslation } from "react-i18next";
import Link from "next/link";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector((state) => state.global.isSidebarCollapsed);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  
  // (2) Khai báo hàm t
  const { t } = useTranslation();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSidebar = () => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  const toggleDarkMode = () => dispatch(setIsDarkMode(!isDarkMode));
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className="flex justify-between items-center w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 md:px-8 py-3 transition-colors duration-300 z-30 relative">
      <div className="flex items-center gap-2 md:gap-5">
        <button
          className="md:hidden p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={toggleSidebar}
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="hidden sm:block ml-2">
           <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">
             {/* (3) Dùng {t('từ_khóa')} */}
             {t('navbar.welcome')} 👋
           </span>
        </div>
      </div>

      <div className="flex justify-end items-center gap-1 sm:gap-2 md:gap-4">
        <button onClick={toggleDarkMode} className="flex items-center gap-2.5 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500 dark:text-gray-400">
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {/* (3) Dùng {t('từ_khóa')} */}
          <span className="hidden md:block text-sm font-bold">{isDarkMode ? t('navbar.lightMode') : t('navbar.darkMode')}</span>
        </button>
        
        <button className="flex items-center gap-2.5 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500 dark:text-gray-400">
          <div className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
              3
            </span>
          </div>
          {/* (3) Dùng {t('từ_khóa')} */}
          <span className="hidden md:block text-sm font-bold">{t('navbar.notifications')}</span>
        </button>

        <Link href="/settings" className="hidden sm:flex items-center gap-2.5 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500 dark:text-gray-400">
          <Settings className="w-5 h-5" />
          {/* (3) Dùng {t('từ_khóa')} */}
          <span className="hidden lg:block text-sm font-bold">{t('navbar.settings')}</span>
        </Link>
        
        <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>
        
        {currentUser && (
          <div className="relative" ref={dropdownRef}>
            <div 
              className="flex items-center gap-3 cursor-pointer p-1.5 pl-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden md:flex flex-col pr-2">
                <span className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                  {currentUser.role}
                </span>
              </div>
            </div>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                  <p className="font-bold text-gray-800 dark:text-gray-100">{currentUser.name}</p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 truncate">{currentUser.email}</p>
                </div>
                
                <div className="p-2 space-y-1">
                  <Link href="/profile" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold transition-colors">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    {/* (3) Dùng {t('từ_khóa')} */}
                    {t('navbar.profile')}
                  </Link>
                  <Link href="/settings" onClick={() => setIsDropdownOpen(false)} className="flex sm:hidden items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold transition-colors">
                    <Settings className="w-4 h-4 text-gray-400" />
                    {/* (3) Dùng {t('từ_khóa')} */}
                    {t('navbar.settings')}
                  </Link>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-bold transition-colors">
                    <LogOut className="w-4 h-4" />
                    {/* (3) Dùng {t('từ_khóa')} */}
                    {t('navbar.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;