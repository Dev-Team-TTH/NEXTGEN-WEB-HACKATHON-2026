"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  User, ShieldCheck, KeyRound, Smartphone, AlertOctagon, 
  Loader2, LogOut, CheckCircle2, X, QrCode, Lock
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetMeQuery,
  useChangePasswordMutation,
  useGenerate2FASecretMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
  useLogoutAllDevicesMutation,
  useLogoutMutation
} from "@/state/api";

// --- COMPONENTS ---
import Header from "@/app/(components)/Header";

// ==========================================
// COMPONENT CHÍNH: HỒ SƠ & BẢO MẬT
// ==========================================
export default function ProfilePage() {
  const { t } = useTranslation();

  // --- API HOOKS ---
  const { data: user, isLoading: loadingUser, refetch } = useGetMeQuery();
  
  const [changePassword, { isLoading: isChangingPwd }] = useChangePasswordMutation();
  const [generate2FA, { isLoading: isGenerating2FA }] = useGenerate2FASecretMutation();
  const [enable2FA, { isLoading: isEnabling2FA }] = useEnable2FAMutation();
  const [disable2FA, { isLoading: isDisabling2FA }] = useDisable2FAMutation();
  const [logoutAllDevices, { isLoading: isLoggingOutAll }] = useLogoutAllDevicesMutation();
  const [logout] = useLogoutMutation();

  // --- STATE ĐỔI MẬT KHẨU ---
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  // --- STATE 2FA MODAL ---
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [setupKey, setSetupKey] = useState<string | null>(null);
  const [token2FA, setToken2FA] = useState("");

  // TÍNH ĐIỂM BẢO MẬT (DATA VIZ)
  const securityScore = user?.is2FAEnabled ? 100 : 50;

  // --- HANDLERS ---
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (passwords.new.length < 6) {
      toast.error("Mật khẩu mới phải dài ít nhất 6 ký tự!");
      return;
    }

    try {
      await changePassword({ oldPassword: passwords.current, newPassword: passwords.new }).unwrap();
      toast.success("Đổi mật khẩu thành công!");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi khi đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu cũ!");
    }
  };

  const handleStart2FASetup = async () => {
    try {
      const res = await generate2FA().unwrap();
      // API trả về qrCode (base64 image hoặc url) và secret key
      setQrCodeUrl(res.qrCodeUrl || res.qrCode || res.data?.qrCodeUrl);
      setSetupKey(res.secret || res.data?.secret);
      setIs2FAModalOpen(true);
    } catch (err: any) {
      toast.error("Không thể tạo mã QR lúc này. Hãy thử lại!");
    }
  };

  const handleVerifyAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token2FA.length !== 6) {
      toast.error("Mã xác thực phải gồm 6 chữ số!");
      return;
    }
    try {
      await enable2FA({ token: token2FA }).unwrap();
      toast.success("Tuyệt vời! Tài khoản của bạn đã được bảo vệ bằng 2FA.");
      setIs2FAModalOpen(false);
      setToken2FA("");
      refetch(); // Cập nhật lại UI user (is2FAEnabled = true)
    } catch (err: any) {
      toast.error("Mã xác thực không hợp lệ. Vui lòng thử lại!");
    }
  };

  const handleDisable2FA = async () => {
    const code = window.prompt("Để tắt 2FA, vui lòng nhập mã 6 số từ Google Authenticator hiện tại của bạn:");
    if (!code) return;
    
    try {
      await disable2FA({ token: code }).unwrap();
      toast.success("Đã tắt bảo mật 2 lớp.");
      refetch();
    } catch (err: any) {
      toast.error("Mã xác thực sai! Không thể tắt 2FA.");
    }
  };

  const handleLogoutAll = async () => {
    if (window.confirm("Bạn muốn đăng xuất khỏi TẤT CẢ các thiết bị khác (trừ thiết bị này)?")) {
      try {
        await logoutAllDevices().unwrap();
        toast.success("Đã đăng xuất khỏi các phiên đăng nhập khác!");
      } catch (err) {
        toast.error("Có lỗi xảy ra khi đăng xuất thiết bị khác.");
      }
    }
  };

  // --- ANIMATION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="font-medium">Đang tải hồ sơ của bạn...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <AlertOctagon className="w-12 h-12 text-rose-500 mb-4 opacity-50" />
        <p className="font-bold">Lỗi không tìm thấy hồ sơ cá nhân.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10 max-w-6xl mx-auto">
      
      <Header 
        title={t("Hồ sơ & Bảo mật")} 
        subtitle={t("Quản lý thông tin cá nhân, thay đổi mật khẩu và thiết lập bảo mật 2 lớp.")}
      />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CỘT TRÁI: THÔNG TIN CÁ NHÂN & ĐIỂM BẢO MẬT */}
        <div className="flex flex-col gap-6">
          
          {/* Card Avatar */}
          <motion.div variants={itemVariants} className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center shadow-sm">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                {user.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.fullName}</h2>
            <p className="text-sm text-slate-500 font-medium mb-4">{user.email}</p>
            <div className="inline-flex px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
              {user.departmentId ? `Phòng ${user.departmentId}` : "Nhân sự Tổng bộ"}
            </div>
          </motion.div>

          {/* Card Điểm Bảo mật (Data Viz) */}
          <motion.div variants={itemVariants} className="glass p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5"><ShieldCheck className="w-32 h-32 text-slate-500"/></div>
            
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 relative z-10 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" /> Sức khỏe Bảo mật
            </h3>
            
            <div className="flex items-end gap-2 mb-2 relative z-10">
              <span className={`text-4xl font-black ${securityScore === 100 ? 'text-emerald-500' : 'text-amber-500'}`}>{securityScore}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">/ 100 điểm</span>
            </div>

            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative z-10 mb-4">
              <motion.div 
                initial={{ width: 0 }} animate={{ width: `${securityScore}%` }} transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${securityScore === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
            </div>

            <div className="text-xs text-slate-500 relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <span>Mật khẩu mạnh</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="flex items-center justify-between">
                <span>Xác thực 2 Lớp (2FA)</span>
                {user.is2FAEnabled ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertOctagon className="w-3.5 h-3.5 text-amber-500" />}
              </div>
            </div>
          </motion.div>

          {/* Đăng xuất thiết bị khác */}
          <motion.div variants={itemVariants}>
            <button 
              onClick={handleLogoutAll} disabled={isLoggingOutAll}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold text-sm transition-all shadow-sm"
            >
              {isLoggingOutAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Đăng xuất khỏi thiết bị khác
            </button>
          </motion.div>

        </div>

        {/* CỘT PHẢI: SETTINGS */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Card Đổi mật khẩu */}
          <motion.div variants={itemVariants} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-500" /> Đổi Mật Khẩu
            </h3>
            <p className="text-sm text-slate-500 mb-6">Nên thay đổi mật khẩu 3 tháng 1 lần để đảm bảo an toàn.</p>

            <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Mật khẩu hiện tại</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" required value={passwords.current} onChange={(e)=>setPasswords({...passwords, current: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Mật khẩu Mới</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <input type="password" required value={passwords.new} onChange={(e)=>setPasswords({...passwords, new: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Nhập lại Mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <input type="password" required value={passwords.confirm} onChange={(e)=>setPasswords({...passwords, confirm: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <button type="submit" disabled={isChangingPwd || !passwords.current || !passwords.new} className="mt-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center w-full sm:w-auto min-w-[150px]">
                {isChangingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu Thay Đổi"}
              </button>
            </form>
          </motion.div>

          {/* Card 2FA (Authenticator) */}
          <motion.div variants={itemVariants} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-500" /> Xác thực 2 Lớp (2FA)
            </h3>
            <p className="text-sm text-slate-500 mb-6">Tăng cường hàng rào bảo vệ bằng ứng dụng Google Authenticator.</p>

            {user.is2FAEnabled ? (
              <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl gap-4 text-center sm:text-left">
                <div>
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4" /> 2FA đang hoạt động
                  </h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">Tài khoản của bạn đã được mã hóa an toàn.</p>
                </div>
                <button onClick={handleDisable2FA} disabled={isDisabling2FA} className="px-5 py-2.5 bg-white dark:bg-slate-900 text-rose-600 border border-rose-200 dark:border-rose-500/30 rounded-xl text-sm font-bold shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all flex items-center gap-2 whitespace-nowrap">
                  {isDisabling2FA ? <Loader2 className="w-4 h-4 animate-spin"/> : <X className="w-4 h-4"/>} Tắt 2FA
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl gap-4 text-center sm:text-left">
                <div>
                  <h4 className="font-bold text-amber-800 dark:text-amber-400 flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                    <AlertOctagon className="w-4 h-4" /> Rủi ro bảo mật
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-500/80">Tài khoản của bạn dễ bị tấn công nếu lộ mật khẩu.</p>
                </div>
                <button onClick={handleStart2FASetup} disabled={isGenerating2FA} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95">
                  {isGenerating2FA ? <Loader2 className="w-4 h-4 animate-spin"/> : <QrCode className="w-4 h-4"/>} Bật 2FA Ngay
                </button>
              </div>
            )}
          </motion.div>

        </div>
      </motion.div>

      {/* ==========================================
          MODAL: HIỂN THỊ MÃ QR KÍCH HOẠT 2FA
          ========================================== */}
      <AnimatePresence>
        {is2FAModalOpen && qrCodeUrl && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                  <Smartphone className="w-5 h-5 text-indigo-500" /> Thiết lập Authenticator
                </h3>
                <button onClick={() => setIs2FAModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex flex-col items-center text-center">
                <p className="text-sm text-slate-500 mb-6">
                  Sử dụng ứng dụng <b className="text-slate-800 dark:text-slate-200">Google Authenticator</b> hoặc <b className="text-slate-800 dark:text-slate-200">Authy</b> để quét mã QR bên dưới.
                </p>
                
                {/* QR Code Container */}
                <div className="p-4 bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-200 dark:border-slate-700 mb-6">
                  <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48 object-contain" />
                </div>

                <div className="w-full mb-6">
                  <p className="text-xs text-slate-400 mb-2">Không quét được mã? Nhập mã thủ công:</p>
                  <code className="block w-full py-2 bg-slate-100 dark:bg-[#0B0F19] rounded-lg text-sm font-bold text-indigo-500 select-all border border-slate-200 dark:border-white/5">
                    {setupKey || "N/A"}
                  </code>
                </div>

                <form onSubmit={handleVerifyAndEnable2FA} className="w-full space-y-3">
                  <input 
                    type="text" required maxLength={6}
                    value={token2FA} onChange={(e)=>setToken2FA(e.target.value.replace(/\D/g,''))}
                    placeholder="Nhập mã 6 chữ số từ App..." 
                    className="w-full text-center tracking-[0.5em] font-black text-xl py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  />
                  <button type="submit" disabled={isEnabling2FA || token2FA.length !== 6} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isEnabling2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Xác nhận & Bật
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}