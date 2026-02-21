"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/app/redux";
import { setIsAuthenticated } from "@/state";
import { toast } from "react-toastify";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";


const Login = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  
  const [email, setEmail] = useState("admin@team-tth.com");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "admin@team-tth.com" && password === "123456") {
      toast.success(t("login.success"));
      dispatch(setIsAuthenticated(true));
    } else {
      toast.error(t("login.error"));
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md transition-colors duration-300">
        {/* LOGO & TIÊU ĐỀ */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo.png"
            alt="Logo"
            width={70}
            height={70}
            className="rounded-xl mb-4 shadow-sm"
          />
          <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
            {t("login.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-center text-sm">
            {t("login.subtitle")}
          </p>
        </div>

        {/* FORM ĐĂNG NHẬP */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t("login.email")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("login.password")}
              </label>
              <a href="#" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                {t("login.forgot")}
              </a>
            </div>
            <div className="relative">
              {/* Icon Ổ khóa bên trái */}
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              
              {/* Ô nhập liệu (Đổi type linh hoạt) */}
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {/* Nút Ẩn/Hiện bên phải */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-300"
          >
            {t("login.btn")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;