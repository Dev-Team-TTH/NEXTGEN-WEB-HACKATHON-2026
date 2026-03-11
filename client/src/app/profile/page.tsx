"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  UserCircle, Shield, Mail, Phone, 
  MapPin, CalendarDays, Camera, Edit, 
  Save, Loader2, Briefcase, Activity
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector, useAppDispatch } from "@/app/redux";
import { setCurrentUser } from "@/state/index";
import { useUpdateUserMutation } from "@/state/api";

// --- UTILS (SIÊU VŨ KHÍ) ---
import { formatDate, getInitials } from "@/utils/formatters";
import { cn, generateAvatarColor } from "@/utils/helpers";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.global.currentUser);
  
  const [isMounted, setIsMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    fullName: "", phone: "", address: ""
  });

  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  useEffect(() => {
    setIsMounted(true);
    if (currentUser) {
      setFormData({
        fullName: currentUser.fullName || "",
        // FIX LỖI TS2339 BẰNG CÁCH ÉP KIỂU ANY
        phone: (currentUser as any).phone || (currentUser as any).phoneNumber || "",
        address: (currentUser as any).address || ""
      });
    }
  }, [currentUser]);

  if (!isMounted || !currentUser) return null;

  // --- HANDLERS ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      toast.error("Họ và tên không được để trống!"); return;
    }

    try {
      await updateUser({
        id: currentUser.userId,
        data: formData as any
      }).unwrap();
      
      // Cập nhật Redux State ngay lập tức (Optimistic UI)
      dispatch(setCurrentUser({ ...currentUser, ...formData } as any));
      setIsEditing(false);
      toast.success("Cập nhật thông tin cá nhân thành công!");
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi khi cập nhật hồ sơ!");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8 mt-6">
      
      {/* 1. HEADER & SUB-NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Hồ sơ <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Cá nhân</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Quản lý thông tin định danh và liên hệ của bạn trên hệ thống.</p>
        </div>
        
        {/* Sub-Nav sử dụng CN làm sạch CSS */}
        <div className="flex items-center p-1.5 bg-slate-200/50 dark:bg-black/40 rounded-full backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-inner w-fit">
          <Link href="/profile" className="relative px-6 py-2.5 rounded-full text-sm font-bold transition-colors text-blue-700 dark:text-blue-400">
            <motion.div layoutId="profileTab" className="absolute inset-0 bg-white dark:bg-white/10 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-slate-200/50 dark:border-white/5 z-0" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
            <span className="relative z-10 flex items-center gap-2"><UserCircle className="w-4.5 h-4.5" /> Hồ sơ</span>
          </Link>
          <Link href="/profile/security" className="relative px-6 py-2.5 rounded-full text-sm font-semibold transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 group">
            <span className="relative z-10 flex items-center gap-2 group-hover:scale-105 transition-transform"><Shield className="w-4.5 h-4.5" /> Bảo mật</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* CỘT TRÁI: AVATAR & TÓM TẮT */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-sm p-8 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/20 to-transparent dark:from-blue-600/20"></div>
            
            {/* AVATAR TỰ ĐỘNG BẰNG UTILS */}
            <div className="relative z-10 mb-5 group cursor-pointer">
              <div className={cn(
                "w-28 h-28 rounded-full flex items-center justify-center font-black text-4xl shadow-xl border-4 border-white dark:border-[#0B0F19] transition-transform duration-300 group-hover:scale-105",
                generateAvatarColor(currentUser.fullName)
              )}>
                {getInitials(currentUser.fullName)}
              </div>
              <div className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full border-2 border-white dark:border-[#0B0F19] shadow-md hover:bg-indigo-700 transition-colors">
                <Camera className="w-4 h-4" />
              </div>
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white relative z-10">{currentUser.fullName}</h2>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1 mb-4 relative z-10">{currentUser.role || "Nhân viên"}</p>
            
            <div className="w-full flex flex-col gap-3 mt-4 relative z-10">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-left border border-slate-100 dark:border-white/5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0"><Activity className="w-4 h-4"/></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Trạng thái</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">Đang hoạt động</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-left border border-slate-100 dark:border-white/5">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400 shrink-0"><CalendarDays className="w-4 h-4"/></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Ngày tham gia</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{formatDate((currentUser as any).createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: FORM CHỈNH SỬA CHI TIẾT */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden flex-1 flex flex-col">
            
            <div className="flex justify-between items-center px-6 sm:px-8 py-5 border-b border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" /> Thông tin Định danh
              </h3>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 text-sm font-bold rounded-xl transition-colors">
                  <Edit className="w-4 h-4" /> Chỉnh sửa
                </button>
              ) : (
                <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors">
                  Hủy
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 flex-1 flex flex-col gap-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5 group">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">Họ và Tên <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input 
                      type="text" required disabled={!isEditing}
                      value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className={cn("w-full pl-10 pr-4 py-3 border rounded-xl text-sm font-bold outline-none transition-all shadow-sm", isEditing ? "bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-500 cursor-not-allowed")}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">Email (Không thể sửa)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input 
                      type="email" disabled value={currentUser.email}
                      className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold text-slate-500 outline-none cursor-not-allowed opacity-70"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input 
                      type="tel" disabled={!isEditing}
                      value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="Chưa cập nhật"
                      className={cn("w-full pl-10 pr-4 py-3 border rounded-xl text-sm font-bold outline-none transition-all shadow-sm", isEditing ? "bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-500 cursor-not-allowed")}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">Địa chỉ liên hệ</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 w-4.5 h-4.5 text-slate-400" />
                  <textarea 
                    rows={3} disabled={!isEditing}
                    value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Chưa cập nhật"
                    className={cn("w-full pl-10 pr-4 py-3 border rounded-xl text-sm font-bold outline-none transition-all resize-none shadow-sm", isEditing ? "bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-500 cursor-not-allowed")}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="mt-auto pt-6 border-t border-slate-200/50 dark:border-white/5 flex justify-end">
                  <button type="submit" disabled={isUpdating} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70">
                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Lưu Hồ sơ
                  </button>
                </div>
              )}

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}