"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Settings, Database } from "lucide-react";

// --- COMPONENTS ---
import Header from "@/app/(components)/Header";
import GeneralSettings from "./GeneralSettings";

export default function SettingsPage() {
  const { t } = useTranslation();
  
  // 🚀 Đã đổi Default Tab thành GENERAL sau khi chuyển Workflow đi
  const [activeTab, setActiveTab] = useState("GENERAL");

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-24 flex flex-col gap-6 sm:gap-8 mt-2 transition-colors duration-500">
      
      <Header 
        title={t("Trung tâm Cấu hình")} 
        subtitle={t("Quản trị tham số vận hành, định danh doanh nghiệp và an ninh bảo mật lõi.")}
      />

      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start transition-colors duration-500">
        
        {/* SIDEBAR ĐIỀU HƯỚNG (STICKY) */}
        <div className="w-full lg:w-72 shrink-0 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl p-4 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] sticky top-24 transform-gpu z-10 transition-colors duration-500">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-4 py-3 transition-colors duration-500">Danh mục Quản trị</p>
          
          <div className="flex flex-col gap-1.5 transition-colors duration-500">
            
            <button 
              onClick={() => setActiveTab("GENERAL")}
              className={`relative px-5 py-3.5 text-[13.5px] font-bold rounded-2xl transition-all duration-500 text-left flex items-center gap-3.5 group
                ${activeTab === "GENERAL" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5"}`}
            >
              {activeTab === "GENERAL" && (
                <motion.div layoutId="settingsNav" className="absolute inset-0 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm z-0 transition-colors duration-500" />
              )}
              <Settings className={`w-5 h-5 relative z-10 transition-transform duration-500 ${activeTab === "GENERAL" ? "scale-110 rotate-90" : "group-hover:rotate-90 group-hover:scale-110"}`} /> 
              <span className="relative z-10 transition-colors duration-500">Cấu hình Chung & Bảo mật</span>
            </button>

            {/* 🚀 TAB DỰ PHÒNG CHO TƯƠNG LAI ĐỂ CÂN BẰNG UI */}
            <button 
              onClick={() => setActiveTab("SYSTEM_DATA")}
              className={`relative px-5 py-3.5 text-[13.5px] font-bold rounded-2xl transition-all duration-500 text-left flex items-center gap-3.5 group
                ${activeTab === "SYSTEM_DATA" ? "text-blue-700 dark:text-blue-400" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5"}`}
            >
              {activeTab === "SYSTEM_DATA" && (
                <motion.div layoutId="settingsNav" className="absolute inset-0 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 shadow-sm z-0 transition-colors duration-500" />
              )}
              <Database className={`w-5 h-5 relative z-10 transition-transform duration-500 ${activeTab === "SYSTEM_DATA" ? "scale-110" : "group-hover:scale-110"}`} /> 
              <span className="relative z-10 transition-colors duration-500">Dữ liệu Hệ thống (Sắp ra mắt)</span>
            </button>

          </div>
        </div>

        {/* NỘI DUNG CHÍNH CÓ HIỆU ỨNG CHUYỂN TAB */}
        <div className="flex-1 w-full min-w-0 transition-colors duration-500">
          <AnimatePresence mode="wait">
            {activeTab === "GENERAL" && (
              <motion.div 
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <GeneralSettings />
              </motion.div>
            )}

            {activeTab === "SYSTEM_DATA" && (
              <motion.div 
                key="system_data"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-32 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-sm transition-colors duration-500"
              >
                <Database className="w-16 h-16 text-blue-500/50 mb-4 animate-pulse transition-colors duration-500" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-white transition-colors duration-500">Dữ liệu Hệ thống</h3>
                <p className="text-sm font-medium text-slate-500 mt-2 transition-colors duration-500">Phân hệ quản lý sao lưu (Backup) và dọn dẹp dữ liệu đang được phát triển.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
      </div>
    </div>
  );
}