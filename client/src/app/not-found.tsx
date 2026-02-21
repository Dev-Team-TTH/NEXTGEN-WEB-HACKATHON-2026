"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full px-4">
      {/* ICON BÁO LỖI */}
      <div className="bg-blue-100 dark:bg-gray-800 p-6 rounded-full mb-6 shadow-sm">
        <FileQuestion className="w-20 h-20 text-blue-600 dark:text-blue-400 animate-bounce" />
      </div>

      {/* NỘI DUNG THÔNG BÁO */}
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-gray-100 mb-4 text-center tracking-tight">
        {t("notFound.title")}
      </h1>
      <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
        {t("notFound.subtitle")}
      </p>

      {/* NÚT QUAY VỀ TRANG CHỦ */}
      <Link 
        href="/dashboard"
        className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {t("notFound.backHome")}
      </Link>
    </div>
  );
}