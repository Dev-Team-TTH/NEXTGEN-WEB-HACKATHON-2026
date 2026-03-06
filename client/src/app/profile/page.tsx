"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  UserCircle, Shield, Camera, Save, 
  Mail, Phone, MapPin, Building, 
  Briefcase, Calendar, Fingerprint, Globe, 
  Activity, Users, Sparkles, CheckCircle2
} from "lucide-react";

import { useAppSelector } from "@/app/redux";

export default function ProfilePage() {
  const pathname = usePathname();
  const currentUser = useAppSelector((state) => state.global.currentUser);

  const [isMounted, setIsMounted] = useState(false);
  
  // State quản lý Form
  const [formData, setFormData] = useState({
    fullName: "",
    gender: "Male",
    dob: "1995-08-15",
    jobTitle: "Chuyên viên Kế toán",
    empId: "EMP-202601",
    department: "Tài chính - Kế toán",
    nationality: "Việt Nam",
    email: "",
    phone: "0987.654.321",
    address: "Tòa nhà Bitexco, Quận 1, TP. Hồ Chí Minh"
  });

  useEffect(() => {
    setIsMounted(true);
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        fullName: currentUser.fullName || "",
        email: currentUser.email || "",
      }));
    }
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isMounted) return null;

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8 mt-6">
      
      {/* 1. HEADER & SUB-NAVIGATION TỐI ƯU */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Hồ sơ <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Cá nhân</span>
            <Sparkles className="w-6 h-6 text-purple-500 animate-pulse" />
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Quản lý thông tin định danh và liên hệ của bạn.</p>
        </div>
        
        {/* Sub-Nav Tabs Dạng Viên Thuốc (Pill) */}
        <div className="flex items-center p-1.5 bg-slate-200/50 dark:bg-black/40 rounded-full backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-inner w-fit">
          <Link href="/profile" className="relative px-6 py-2.5 rounded-full text-sm font-bold transition-colors text-blue-700 dark:text-blue-300">
            <motion.div layoutId="profileTab" className="absolute inset-0 bg-white dark:bg-white/10 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-slate-200/50 dark:border-white/5 z-0" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
            <span className="relative z-10 flex items-center gap-2"><UserCircle className="w-4.5 h-4.5" /> Hồ sơ</span>
          </Link>
          <Link href="/profile/security" className="relative px-6 py-2.5 rounded-full text-sm font-semibold transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 group">
            <span className="relative z-10 flex items-center gap-2 group-hover:scale-105 transition-transform"><Shield className="w-4.5 h-4.5" /> Bảo mật</span>
          </Link>
        </div>
      </div>

      {/* 2. HERO BANNER & AVATAR (THIẾT KẾ ĐỘT PHÁ) */}
      <div className="relative w-full rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/50 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.04)] mb-8 overflow-hidden">
        {/* Cover Photo Gradient Mesh */}
        <div className="absolute top-0 left-0 right-0 h-48 sm:h-64 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 overflow-hidden z-0">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
          {/* Vòng tròn trang trí mờ ảo */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Nội dung đè lên Cover */}
        <div className="relative z-10 pt-32 sm:pt-44 px-6 sm:px-12 pb-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
          
          {/* Avatar Lồi Cực Quang */}
          <div className="relative group cursor-pointer shrink-0">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-slate-900/50 backdrop-blur-2xl border-4 sm:border-8 border-white dark:border-[#0B0F19] shadow-[0_12px_40px_rgba(0,0,0,0.2)] flex items-center justify-center text-5xl font-black text-white overflow-hidden relative z-10">
              {formData.fullName.charAt(0).toUpperCase() || "U"}
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white backdrop-blur-md">
                <Camera className="w-8 h-8 sm:w-10 sm:h-10 mb-2" />
                <span className="text-xs font-bold uppercase tracking-widest">Đổi ảnh</span>
              </div>
            </div>
            
            {/* Huy hiệu Online */}
            <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500 border-4 border-white dark:border-[#0B0F19] rounded-full flex items-center justify-center shadow-lg z-20" title="Đang hoạt động">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse" />
            </div>
          </div>

          {/* Thông tin Tóm tắt */}
          <div className="flex-1 text-center sm:text-left pb-2 sm:pb-4">
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-3">
              {formData.fullName} 
              {/* ĐÃ FIX: Bọc Icon trong thẻ span chứa title để tương thích TS */}
              <span title="Tài khoản đã xác thực" className="flex items-center">
                <CheckCircle2 className="w-6 h-6 text-blue-500" />
              </span>
            </h2>
            <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1 sm:mt-2">{formData.jobTitle} <span className="text-slate-400 mx-2">•</span> {formData.department}</p>
          </div>

          {/* Nút Hành động */}
          <div className="pb-2 sm:pb-4 flex w-full sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_12px_24px_rgba(37,99,235,0.4)] transition-all duration-300 hover:-translate-y-1 active:translate-y-0 transform-gpu">
              <Save className="w-5 h-5" /> Lưu Thay Đổi
            </button>
          </div>
        </div>
      </div>

      {/* 3. BENTO GRID FORM (THIẾT KẾ PHÂN LUỒNG MỚI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* KHỐI 1: THÔNG TIN LIÊN HỆ (CỘT NHỎ) */}
        <div className="lg:col-span-1 flex flex-col gap-6 sm:gap-8">
          <div className="bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 sm:p-8">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400"><MapPin className="w-5 h-5" /></div>
              Liên hệ
            </h3>
            
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> Email Công ty</label>
                <input type="email" name="email" value={formData.email} disabled className="w-full bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 cursor-not-allowed" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> Số điện thoại</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Địa chỉ hiện tại</label>
                <textarea name="address" value={formData.address} onChange={handleInputChange} rows={4} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI 2 & 3: CÁ NHÂN & CÔNG VIỆC (CỘT LỚN) */}
        <div className="lg:col-span-2 flex flex-col gap-6 sm:gap-8">
          
          {/* CÁ NHÂN */}
          <div className="bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 sm:p-8">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400"><UserCircle className="w-5 h-5" /></div>
              Thông tin Cơ bản
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Họ và Tên đầy đủ</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-3.5 text-base font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm" />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Giới tính</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm appearance-none cursor-pointer">
                  <option value="Male">Nam giới</option>
                  <option value="Female">Nữ giới</option>
                  <option value="Other">Khác</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Ngày sinh</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm" />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Globe className="w-3.5 h-3.5"/> Quốc tịch</label>
                <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm" />
              </div>
            </div>
          </div>

          {/* CÔNG VIỆC */}
          <div className="bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 sm:p-8">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400"><Briefcase className="w-5 h-5" /></div>
              Hồ sơ Công việc
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5" /> Mã nhân viên</label>
                <input type="text" name="empId" value={formData.empId} disabled className="w-full bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-500 cursor-not-allowed" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Vị trí làm việc</label>
                <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm" />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Building className="w-3.5 h-3.5"/> Trực thuộc Phòng ban</label>
                <input type="text" name="department" value={formData.department} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}