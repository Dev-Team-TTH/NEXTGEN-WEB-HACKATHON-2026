"use client";

import React, { useState } from "react";
import Header from "@/app/(components)/Header";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode } from "@/state";
import { 
  Settings as SettingsIcon, Moon, Sun, 
  Bell, Lock, User, Palette, Globe, ShieldCheck, Mail
} from "lucide-react";
import { toast } from "react-toastify";

const SettingsPage = () => {
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  
  const [activeTab, setActiveTab] = useState("APPEARANCE");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weeklyReport: false,
  });

  const handleSave = () => {
    toast.success("Đã lưu cài đặt hệ thống thành công!");
  };

  return (
    <div className="flex flex-col w-full pb-10">
      <Header 
        name="Cài Đặt Hệ Thống" 
        subtitle="Quản lý giao diện, bảo mật và tùy chọn cá nhân hóa"
        icon={SettingsIcon}
      />

      <div className="mt-6 flex flex-col md:flex-row gap-6">
        {/* SIDEBAR TABS (Danh mục Cài đặt) */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          <button 
            onClick={() => setActiveTab("APPEARANCE")} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === "APPEARANCE" ? "bg-blue-600 text-white shadow-md" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent dark:border-gray-700"}`}
          >
            <Palette className="w-5 h-5" /> Giao diện
          </button>
          <button 
            onClick={() => setActiveTab("NOTIFICATIONS")} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === "NOTIFICATIONS" ? "bg-blue-600 text-white shadow-md" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent dark:border-gray-700"}`}
          >
            <Bell className="w-5 h-5" /> Thông báo
          </button>
          <button 
            onClick={() => setActiveTab("ACCOUNT")} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === "ACCOUNT" ? "bg-blue-600 text-white shadow-md" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent dark:border-gray-700"}`}
          >
            <User className="w-5 h-5" /> Tài khoản
          </button>
          <button 
            onClick={() => setActiveTab("SECURITY")} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === "SECURITY" ? "bg-blue-600 text-white shadow-md" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent dark:border-gray-700"}`}
          >
            <ShieldCheck className="w-5 h-5" /> Bảo mật
          </button>
        </div>

        {/* CONTENT AREA (Nội dung chi tiết bên phải) */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 shadow-sm min-h-[500px]">
          
          {/* ========================================================= */}
          {/* TAB: GIAO DIỆN (APPEARANCE) - NƠI CHUYỂN ĐỔI LIGHT/DARK */}
          {/* ========================================================= */}
          {activeTab === "APPEARANCE" && (
            <div className="animate-in fade-in duration-300 space-y-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Chủ đề hiển thị</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Tùy chỉnh giao diện Sáng/Tối cho hệ thống WMS của bạn.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  {/* Nút Light Mode */}
                  <button 
                    onClick={() => dispatch(setIsDarkMode(false))}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all ${!isDarkMode ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
                  >
                    <Sun className={`w-10 h-10 ${!isDarkMode ? "text-blue-500" : "text-gray-400 dark:text-gray-500"}`} />
                    <span className="font-bold">Chế độ Sáng</span>
                  </button>

                  {/* Nút Dark Mode */}
                  <button 
                    onClick={() => dispatch(setIsDarkMode(true))}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all ${isDarkMode ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
                  >
                    <Moon className={`w-10 h-10 ${isDarkMode ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`} />
                    <span className="font-bold">Chế độ Tối (Dark)</span>
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Ngôn ngữ hệ thống</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Hỗ trợ đa ngôn ngữ cho doanh nghiệp quốc tế.</p>
                <div className="max-w-xs relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors">
                    <option value="vi">🇻🇳 Tiếng Việt (Mặc định)</option>
                    <option value="en">🇺🇸 English</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: THÔNG BÁO (NOTIFICATIONS) */}
          {/* ========================================================= */}
          {activeTab === "NOTIFICATIONS" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Cài đặt Thông báo</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Kiểm soát cách hệ thống báo cáo biến động tồn kho cho bạn.</p>

              <div className="space-y-4 max-w-2xl">
                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg"><Mail className="w-5 h-5" /></div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Email nhắc nhở</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Gửi email khi có phiếu kho chờ duyệt.</p>
                    </div>
                  </div>
                  <input type="checkbox" checked={notifications.email} onChange={(e) => setNotifications({...notifications, email: e.target.checked})} className="w-5 h-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer" />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg"><Bell className="w-5 h-5" /></div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Thông báo hệ thống (Push)</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Đẩy thông báo trực tiếp trên góc màn hình.</p>
                    </div>
                  </div>
                  <input type="checkbox" checked={notifications.push} onChange={(e) => setNotifications({...notifications, push: e.target.checked})} className="w-5 h-5 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer" />
                </label>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: TÀI KHOẢN & BẢO MẬT (Placeholder) */}
          {/* ========================================================= */}
          {(activeTab === "ACCOUNT" || activeTab === "SECURITY") && (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in">
              <Lock className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Tính năng đang phát triển</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                Mô-đun Đổi Mật Khẩu và Phân Quyền đang được đội ngũ tích hợp. Vui lòng quay lại sau!
              </p>
            </div>
          )}

          {/* FOOTER NÚT LƯU */}
          {activeTab !== "ACCOUNT" && activeTab !== "SECURITY" && (
            <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button 
                onClick={handleSave} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                Lưu Thay Đổi
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;