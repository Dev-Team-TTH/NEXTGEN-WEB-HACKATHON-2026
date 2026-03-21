"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { GitMerge, Settings } from "lucide-react";

// --- COMPONENTS ---
import Header from "@/app/(components)/Header";
import WorkflowManager from "./WorkflowManager";
import GeneralSettings from "./GeneralSettings";

export default function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("WORKFLOWS");

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-24 flex flex-col gap-6 sm:gap-8 mt-2">
      
      <Header 
        title={t("Trung tâm Cấu hình")} 
        subtitle={t("Quản trị luồng nghiệp vụ, tham số vận hành và thông tin lõi của doanh nghiệp.")}
      />

      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
        
        {/* SIDEBAR ĐIỀU HƯỚNG (STICKY) */}
        <div className="w-full lg:w-72 shrink-0 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl p-4 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] sticky top-24 transform-gpu z-10">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-4 py-3">Danh mục Quản trị</p>
          
          <div className="flex flex-col gap-1.5">
            <button 
              onClick={() => setActiveTab("WORKFLOWS")}
              className={`relative px-5 py-3.5 text-[13.5px] font-bold rounded-2xl transition-all text-left flex items-center gap-3.5 group
                ${activeTab === "WORKFLOWS" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5"}`}
            >
              {activeTab === "WORKFLOWS" && (
                <motion.div layoutId="settingsNav" className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm z-0" />
              )}
              <GitMerge className={`w-5 h-5 relative z-10 transition-transform ${activeTab === "WORKFLOWS" ? "scale-110" : "group-hover:scale-110"}`} /> 
              <span className="relative z-10">Luồng Phê duyệt</span>
            </button>

            <button 
              onClick={() => setActiveTab("GENERAL")}
              className={`relative px-5 py-3.5 text-[13.5px] font-bold rounded-2xl transition-all text-left flex items-center gap-3.5 group
                ${activeTab === "GENERAL" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5"}`}
            >
              {activeTab === "GENERAL" && (
                <motion.div layoutId="settingsNav" className="absolute inset-0 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm z-0" />
              )}
              <Settings className={`w-5 h-5 relative z-10 transition-transform ${activeTab === "GENERAL" ? "scale-110 rotate-90" : "group-hover:rotate-90 group-hover:scale-110"}`} /> 
              <span className="relative z-10">Cấu hình Chung & Bảo mật</span>
            </button>
          </div>
        </div>

        {/* NỘI DUNG CHÍNH */}
        <div className="flex-1 w-full min-w-0">
          {activeTab === "WORKFLOWS" && <WorkflowManager />}
          {activeTab === "GENERAL" && <GeneralSettings />}
        </div>
        
      </div>
    </div>
  );
}