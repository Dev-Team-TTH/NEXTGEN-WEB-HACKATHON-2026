"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  UserCircle, Shield, Key, Smartphone, 
  Monitor, Lock, CheckCircle2, AlertTriangle, 
  Fingerprint, QrCode, Loader2, Save, EyeOff
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector, useAppDispatch } from "@/app/redux";
import { setCurrentUser } from "@/state/index";
import { 
  useChangePasswordMutation,
  useGenerate2FASecretMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
  useGetMyLoginHistoryQuery,
  useLogoutAllDevicesMutation
} from "@/state/api";

// --- UTILS ---
import { formatDateTime } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

export default function SecurityPage() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.global.currentUser);
  
  const [isMounted, setIsMounted] = useState(false);
  
  // --- API HOOKS ---
  const [changePassword, { isLoading: isChangingPwd }] = useChangePasswordMutation();
  const [generate2FA, { isLoading: isGenerating2FA }] = useGenerate2FASecretMutation();
  const [enable2FA, { isLoading: isEnabling2FA }] = useEnable2FAMutation();
  const [disable2FA, { isLoading: isDisabling2FA }] = useDisable2FAMutation();
  const [logoutAllDevices, { isLoading: isLoggingOutAll }] = useLogoutAllDevicesMutation();
  
  const { data: loginHistory = [], isLoading: loadingHistory } = useGetMyLoginHistoryQuery();

  // --- STATE FORMS ---
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  
  // --- STATE 2FA ---
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setup2FAMode, setSetup2FAMode] = useState(false); 
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    setIsMounted(true);
    if (currentUser) {
      setIs2FAEnabled(currentUser.is2FAEnabled || false);
    }
  }, [currentUser]);

  if (!isMounted) return null;

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!"); return;
    }
    if (pwdForm.newPassword.length < 8) {
      toast.error("Mật khẩu mới phải dài ít nhất 8 ký tự!"); return;
    }
    
    try {
      await changePassword({ 
        currentPassword: pwdForm.currentPassword, 
        newPassword: pwdForm.newPassword 
      }).unwrap();
      
      toast.success("Đổi mật khẩu thành công!");
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi khi đổi mật khẩu!");
    }
  };

  const handleToggle2FA = async () => {
    if (is2FAEnabled) {
      setSetup2FAMode(false);
      const promptOTP = window.prompt("Để TẮT bảo mật 2 lớp, vui lòng nhập mã OTP hiện tại từ ứng dụng:");
      if (promptOTP && promptOTP.length === 6) {
        try {
          await disable2FA({ token: promptOTP }).unwrap();
          setIs2FAEnabled(false);
          dispatch(setCurrentUser({ ...currentUser, is2FAEnabled: false } as any));
          toast.success("Đã tắt bảo mật 2 lớp (2FA)!");
        } catch (err: any) {
          toast.error(err?.data?.message || "Mã OTP không hợp lệ!");
        }
      }
    } else {
      try {
        const res = await generate2FA().unwrap();
        setQrCodeUrl(res.qrCodeUrl || res.data?.qrCodeUrl); 
        setSetup2FAMode(true);
        toast.success("Vui lòng quét mã QR và nhập OTP để hoàn tất.");
      } catch (err: any) {
        toast.error("Không thể khởi tạo 2FA. Thử lại sau!");
      }
    }
  };

  const handleConfirmEnable2FA = async () => {
    if (otpCode.length !== 6) {
      toast.error("Mã OTP phải gồm 6 chữ số!"); return;
    }
    try {
      await enable2FA({ token: otpCode }).unwrap();
      setIs2FAEnabled(true);
      setSetup2FAMode(false);
      setOtpCode("");
      dispatch(setCurrentUser({ ...currentUser, is2FAEnabled: true } as any));
      toast.success("Bật bảo mật 2 lớp (2FA) thành công!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Mã OTP không chính xác!");
    }
  };

  const handleLogoutAllDevices = async () => {
    if (window.confirm("Hành động này sẽ đăng xuất tất cả các thiết bị khác ngoại trừ thiết bị hiện tại. Tiếp tục?")) {
      try {
        await logoutAllDevices().unwrap();
        toast.success("Đã đăng xuất khỏi các thiết bị khác!");
      } catch (err) {
        toast.error("Lỗi khi đăng xuất thiết bị!");
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8 mt-6">
      
      {/* 1. HEADER & SUB-NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Bảo mật <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">Hệ thống</span>
            <Shield className="w-6 h-6 text-emerald-500 animate-pulse" />
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Quản lý mật khẩu, thiết bị và xác thực hai bước (2FA).</p>
        </div>
        
        {/* Sub-Nav */}
        <div className="flex items-center p-1.5 bg-slate-200/50 dark:bg-black/40 rounded-full backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-inner w-fit">
          <Link href="/profile" className="relative px-6 py-2.5 rounded-full text-sm font-semibold transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 group">
            <span className="relative z-10 flex items-center gap-2 group-hover:scale-105 transition-transform"><UserCircle className="w-4.5 h-4.5" /> Hồ sơ</span>
          </Link>
          <Link href="/profile/security" className="relative px-6 py-2.5 rounded-full text-sm font-bold transition-colors text-emerald-700 dark:text-emerald-400">
            <motion.div layoutId="profileTab" className="absolute inset-0 bg-white dark:bg-white/10 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-slate-200/50 dark:border-white/5 z-0" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
            <span className="relative z-10 flex items-center gap-2"><Shield className="w-4.5 h-4.5" /> Bảo mật</span>
          </Link>
        </div>
      </div>

      {/* 2. BENTO GRID SECURITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* CỘT TRÁI: ĐỔI MẬT KHẨU */}
        <div className="lg:col-span-5 flex flex-col gap-6 sm:gap-8">
          
          <form onSubmit={handleChangePassword} className="bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 sm:p-8 h-full flex flex-col">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400"><Key className="w-5 h-5" /></div>
              Đổi Mật khẩu
            </h3>
            <p className="text-sm font-medium text-slate-500 mb-8">Bảo vệ tài khoản với mật khẩu dài ít nhất 8 ký tự, bao gồm số và ký tự đặc biệt.</p>
            
            <div className="flex flex-col gap-5 flex-1 justify-center">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mật khẩu hiện tại</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="w-4.5 h-4.5 text-slate-400" /></div>
                  <input 
                    type="password" required value={pwdForm.currentPassword} onChange={e => setPwdForm({...pwdForm, currentPassword: e.target.value})}
                    placeholder="••••••••" 
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm" 
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mật khẩu mới</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Key className="w-4.5 h-4.5 text-indigo-400" /></div>
                  <input 
                    type="password" required minLength={8} value={pwdForm.newPassword} onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})}
                    placeholder="••••••••" 
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm" 
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><CheckCircle2 className="w-4.5 h-4.5 text-slate-400" /></div>
                  <input 
                    type="password" required minLength={8} value={pwdForm.confirmPassword} onChange={e => setPwdForm({...pwdForm, confirmPassword: e.target.value})}
                    placeholder="••••••••" 
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0B0F19] focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm" 
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-white/5">
              <button disabled={isChangingPwd} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-sm shadow-[0_8px_20px_rgba(0,0,0,0.1)] transition-all duration-300 active:scale-95 disabled:opacity-70 disabled:scale-100 transform-gpu">
                {isChangingPwd ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Cập nhật Mật khẩu
              </button>
            </div>
          </form>

        </div>

        {/* CỘT PHẢI: 2FA & THIẾT BỊ HOẠT ĐỘNG */}
        <div className="lg:col-span-7 flex flex-col gap-6 sm:gap-8">
          
          {/* CỤM 1: BỨC TƯỜNG LỬA 2FA */}
          <div className="relative bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 sm:p-8 transform-gpu overflow-hidden">
            
            {/* Overlay Gradient Xanh Lá Khi Bật 2FA */}
            <div className={cn("absolute inset-0 bg-gradient-to-br transition-opacity duration-700 pointer-events-none z-0", is2FAEnabled ? "from-emerald-500/10 via-transparent to-transparent opacity-100" : "opacity-0")} />

            <div className="flex justify-between items-start relative z-10 mb-2">
              <div className="flex items-start gap-4">
                <div className={cn("p-3 rounded-2xl shrink-0 transition-colors duration-500", is2FAEnabled ? "bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.4)]" : "bg-slate-100 dark:bg-white/5 text-slate-400")}>
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">Xác thực 2 Bước (2FA)</h3>
                  <p className="text-sm font-medium text-slate-500 max-w-sm leading-relaxed">Yêu cầu mã số ngẫu nhiên từ ứng dụng Authenticator mỗi khi đăng nhập trên thiết bị lạ.</p>
                </div>
              </div>
              
              {/* iOS Switch */}
              <button 
                onClick={handleToggle2FA}
                disabled={isGenerating2FA || isDisabling2FA}
                className={cn("relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none shadow-inner disabled:opacity-50", is2FAEnabled || setup2FAMode ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700')}
              >
                <span className={cn("pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out", is2FAEnabled || setup2FAMode ? 'translate-x-7' : 'translate-x-0.5')} />
              </button>
            </div>

            {/* Khung Hướng dẫn SETUP 2FA (Khi nhấn Bật) */}
            <div className={cn("transition-all duration-500 overflow-hidden relative z-10", setup2FAMode && !is2FAEnabled ? "max-h-[500px] opacity-100 mt-8" : "max-h-0 opacity-0 mt-0")}>
              <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-500/20 rounded-3xl flex flex-col sm:flex-row gap-8 items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none" />

                {/* Khung Render Mã QR thật từ API */}
                <div className="w-40 h-40 bg-white rounded-2xl shadow-[0_8px_32px_rgba(16,185,129,0.2)] border-2 border-emerald-100 flex items-center justify-center shrink-0 relative p-2 overflow-hidden">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-xs font-bold">Đang tạo...</span></div>
                  )}
                </div>

                <div className="relative z-10 flex-1">
                  <h4 className="text-lg font-black text-emerald-800 dark:text-emerald-400 mb-2">Liên kết ứng dụng</h4>
                  <p className="text-sm font-medium text-emerald-700/80 dark:text-emerald-400/80 mb-5 leading-relaxed">Sử dụng Google Authenticator hoặc Authy để quét mã QR bên cạnh. Sau đó nhập mã 6 số được tạo ra để kích hoạt.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" placeholder="000 000" maxLength={6} 
                      value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full sm:w-40 px-5 py-3.5 bg-white dark:bg-black/40 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-center font-black text-xl tracking-[0.3em] text-emerald-900 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner" 
                    />
                    <button onClick={handleConfirmEnable2FA} disabled={isEnabling2FA || otpCode.length !== 6} className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-[0_8px_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50">
                      {isEnabling2FA ? "Đang xử lý..." : "Xác minh mã"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cảnh báo Nguy cơ khi tắt 2FA */}
            {!is2FAEnabled && !setup2FAMode && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex items-start gap-3 text-sm font-bold text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-500/20">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Tài khoản của bạn đang có mức độ bảo vệ cơ bản. Khuyến nghị bật 2FA để ngăn chặn rủi ro rò rỉ mật khẩu do Phishing.</p>
              </motion.div>
            )}
          </div>

          {/* CỤM 2: QUẢN LÝ THIẾT BỊ HOẠT ĐỘNG */}
          <div className="bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 sm:p-8 transform-gpu flex-1 flex flex-col">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400"><Monitor className="w-5 h-5" /></div>
              Lịch sử Đăng nhập
            </h3>

            <div className="flex flex-col gap-4 overflow-y-auto max-h-[300px] custom-scrollbar pr-2 flex-1">
              {loadingHistory ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>
              ) : loginHistory.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10">Chưa ghi nhận lịch sử nào.</p>
              ) : (
                loginHistory.map((history: any, index: number) => {
                  const isCurrent = index === 0; 
                  const isMobile = history.userAgent?.toLowerCase().includes("mobile");
                  const Icon = isMobile ? Smartphone : Monitor;

                  return (
                    <div key={history.id} className={cn("flex items-center gap-5 p-4 sm:p-5 rounded-3xl relative overflow-hidden transition-colors", isCurrent ? 'bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20' : 'border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]')}>
                      {isCurrent && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 rounded-l-3xl" />}
                      
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", isCurrent ? 'bg-white dark:bg-black/20 shadow-sm border border-slate-100 dark:border-white/5 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-white/5 text-slate-500')}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                          {history.userAgent ? history.userAgent.split(' ')[0] : "Thiết bị không xác định"}
                          {isCurrent && <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 uppercase tracking-widest shrink-0">Hiện tại</span>}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-1 truncate">
                          IP: {history.ipAddress || "N/A"} • {formatDateTime(history.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <button 
              onClick={handleLogoutAllDevices} disabled={isLoggingOutAll}
              className="mt-6 w-full py-4 border border-rose-200 dark:border-rose-500/20 rounded-2xl text-sm font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-50"
            >
              {isLoggingOutAll ? "Đang xử lý..." : "Đăng xuất khỏi tất cả các thiết bị khác"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}