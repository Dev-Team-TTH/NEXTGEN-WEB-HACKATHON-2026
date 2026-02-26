"use client";

import Header from "@/app/(components)/Header";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Mail, Phone, MapPin, Briefcase, 
  User, Key, ShieldCheck, Clock, Shield, CheckCircle2, Save, Camera, Globe, Smartphone, LogOut
} from "lucide-react";
import { toast } from "react-toastify";

const Profile = () => {
  // GIỮ NGUYÊN HOÀN TOÀN HOOK DỊCH THUẬT CỦA BẠN
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState("INFO");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Ưu tiên lấy user từ LocalStorage nếu có đăng nhập
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    
    if (storedUser) {
      setCurrentUser({
        ...storedUser,
        phone: storedUser.phone || "+84 987 654 321",
        location: storedUser.location || "Kho Tổng - Chi nhánh Miền Nam"
      });
    } else {
      // GIỮ NGUYÊN HOÀN TOÀN DATA CỨNG CỦA BẠN (Fallback an toàn)
      setCurrentUser({
        name: "Leader Tâm",
        email: "tam.leader@team-tth.com",
        role: "ADMIN",
        phone: "+84 987 654 321",
        location: "Kho Tổng - Chi nhánh Miền Nam"
      });
    }
  }, []);

  if (!currentUser) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="font-bold text-gray-500 dark:text-gray-400 animate-pulse">Đang đồng bộ dữ liệu...</p>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Đã cập nhật hồ sơ cá nhân thành công!");
    }, 1000);
  };

  const getRoleDisplay = (role: string) => {
    switch(role) {
      case "ADMIN": return { label: "Quản trị viên (Admin)", color: "text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400" };
      case "MANAGER": return { label: "Quản lý (Manager)", color: "text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400" };
      default: return { label: "Nhân viên (Staff)", color: "text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" };
    }
  };

  const roleInfo = getRoleDisplay(currentUser.role);

  return (
    <div className="flex flex-col w-full pb-10">
      {/* GIỮ NGUYÊN HEADER SỬ DỤNG i18n CỦA BẠN */}
      <Header name={t("navbar.profile")} subtitle="Quản lý thông tin định danh và bảo mật tài khoản" icon={User} />
      
      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        
        {/* ========================================= */}
        {/* CỘT TRÁI: THẺ ĐỊNH DANH AVATAR */}
        {/* ========================================= */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 opacity-90"></div>
            
            {/* GIỮ NGUYÊN THẺ <Image> CỦA NEXT.JS VÀ ẢNH /profile.jpg CỦA BẠN */}
            <div className="relative mt-8 mb-4 group cursor-pointer">
              <Image
                src="/profile.jpg"
                alt="Profile Avatar"
                width={150}
                height={150}
                className="rounded-full border-4 border-blue-100 dark:border-gray-700 shadow-sm object-cover w-32 h-32 md:w-40 md:h-40 relative z-10"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{currentUser.name}</h2>
            <p className="text-blue-600 dark:text-blue-400 font-medium mt-1 flex items-center justify-center gap-2 mb-4">
              <Briefcase className="w-4 h-4" /> {roleInfo.label}
            </p>

            <div className="w-full mt-4 pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3 text-left">
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300 font-medium">Trạng thái:</span>
                <span className="ml-auto text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Đang hoạt động
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300 font-medium">Gia nhập:</span>
                <span className="ml-auto text-gray-900 dark:text-white font-bold">Tháng 10, 2023</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* CỘT PHẢI: TABS THÔNG TIN */}
        {/* ========================================= */}
        <div className="w-full lg:w-2/3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          
          <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <button onClick={() => setActiveTab("INFO")} className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === "INFO" ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              <User className="w-4 h-4" /> Thông Tin Chung
            </button>
            <button onClick={() => setActiveTab("SECURITY")} className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === "SECURITY" ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              <Key className="w-4 h-4" /> Bảo mật
            </button>
            <button onClick={() => setActiveTab("SESSIONS")} className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === "SESSIONS" ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              <ShieldCheck className="w-4 h-4" /> Thiết bị
            </button>
          </div>

          <div className="p-6 md:p-8 flex-1">
            
            {/* TAB 1: THÔNG TIN (Gắn lại đúng UI của bạn) */}
            {activeTab === "INFO" && (
              <form onSubmit={handleSave} className="animate-in fade-in duration-300 h-full flex flex-col">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Họ và Tên</label>
                      <input type="text" defaultValue={currentUser.name} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Email liên hệ</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="email" defaultValue={currentUser.email} disabled className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Số điện thoại</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" defaultValue={currentUser.phone} className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Khu vực làm việc</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" defaultValue={currentUser.location} disabled className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                  <button type="submit" disabled={isSaving} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                    {isSaving ? "Đang lưu..." : "Cập nhật hồ sơ"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: BẢO MẬT */}
            {activeTab === "SECURITY" && (
              <form onSubmit={(e) => { e.preventDefault(); toast.info("Đã gửi mã xác nhận đổi mật khẩu qua Email!"); }} className="animate-in fade-in duration-300">
                <div className="max-w-md space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Mật khẩu hiện tại</label>
                    <input type="password" placeholder="••••••••" required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Mật khẩu mới</label>
                    <input type="password" placeholder="Nhập mật khẩu mới" required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <button type="submit" className="mt-4 px-6 py-3 bg-gray-900 dark:bg-gray-100 hover:bg-black dark:hover:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-md transition-all active:scale-95 w-full">
                    Đổi Mật Khẩu
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: THIẾT BỊ ĐĂNG NHẬP */}
            {activeTab === "SESSIONS" && (
              <div className="animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                        <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Trình duyệt Web hiện tại</h4>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Địa chỉ IP: Đang tải...</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded">ĐANG TRUY CẬP</span>
                  </div>
                  <div className="flex items-start justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
                        <Smartphone className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">App TTH TEAM (Mobile)</h4>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Đăng nhập cách đây 2 ngày</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Đăng xuất"><LogOut className="w-4 h-4" /></button>
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

export default Profile;