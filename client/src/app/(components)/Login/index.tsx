"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/app/redux";
import { setIsAuthenticated } from "@/state";
import { useLoginMutation } from "@/state/api"; // <-- Import API Đăng nhập mới
import { toast } from "react-toastify";
import { Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";

const Login = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Khai báo Hook gọi API
  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.warning("Vui lòng nhập đầy đủ thông tin!");

    try {
      // Gọi API gửi Email và Mật khẩu xuống Backend
      const response = await login({ email, password }).unwrap();
      
      // Thành công: Lưu Token và Thông tin User vào LocalStorage
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      
      toast.success(response.message || t("login.success"));
      
      // Mở khóa Giao diện Admin
      dispatch(setIsAuthenticated(true));

    } catch (error: any) {
      // Thất bại: Lấy câu thông báo lỗi từ Backend (VD: Sai mật khẩu)
      const errorMessage = error?.data?.message || t("login.error");
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md transition-colors duration-300">
        
        {/* LOGO & TIÊU ĐỀ */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Logo" width={70} height={70} className="rounded-xl mb-4 shadow-sm" />
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
                placeholder="Nhập email của bạn..."
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
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-500 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 ${
              isLoading ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700 hover:shadow-xl"
            }`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("login.btn")}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;