"use client"; // Thêm dòng này để chạy được i18n

import Image from "next/image";
import React from "react";
import { useTranslation } from "react-i18next"; // Import máy dịch

const Loading = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 w-full z-50 transition-colors">
      {/* HIỆU ỨNG NHỊP ĐẬP (PULSE) CHO LOGO */}
      <div className="relative animate-pulse flex flex-col items-center">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-3xl shadow-xl mb-6">
          <Image
            src="/logo.png"
            alt="Team TTH Logo"
            width={80}
            height={80}
            className="rounded-2xl"
          />
        </div>
        <h1 className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 tracking-wider">
          TEAM TTH
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium mt-3 text-lg">
          {t("splash.loading")} {/* <--- GẮN CHỮ DỊCH VÀO ĐÂY */}
        </p>
      </div>

      {/* HIỆU ỨNG DẤU CHẤM NHẢY (BOUNCE) */}
      <div className="mt-10 flex gap-3">
        <div 
          className="w-4 h-4 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" 
          style={{ animationDelay: "0s" }}
        ></div>
        <div 
          className="w-4 h-4 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" 
          style={{ animationDelay: "0.2s" }}
        ></div>
        <div 
          className="w-4 h-4 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" 
          style={{ animationDelay: "0.4s" }}
        ></div>
      </div>
    </div>
  );
};

export default Loading;