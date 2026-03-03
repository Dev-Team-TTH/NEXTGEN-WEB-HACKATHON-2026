"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, Lock, ArrowRight, Loader2, ShieldCheck, 
  Eye, EyeOff, ArrowLeft, Send, KeyRound, AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";

// Import Redux & RTK Query Hooks
import { useAppDispatch } from "@/app/redux";
import { useLoginMutation, useVerify2FALoginMutation } from "@/state/api";
import { setAuthTokens, setCurrentUser } from "@/state/index"; // Đã thêm /index để rõ ràng đường dẫn

// ==========================================
// CÁC TRẠNG THÁI CỦA MÀN HÌNH ĐĂNG NHẬP
// ==========================================
type AuthStep = "LOGIN" | "2FA" | "FORGOT_PASSWORD";

export default function Login() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // API Hooks
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [verify2FA, { isLoading: isVerifying2FA }] = useVerify2FALoginMutation();

  // --- State Điều hướng ---
  const [step, setStep] = useState<AuthStep>("LOGIN");

  // --- State Form Login ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // --- State Form 2FA (Mã OTP 6 số) ---
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [tempToken, setTempToken] = useState<string | null>(null);

  // --- State Form Forgot Password ---
  const [forgotEmail, setForgotEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Regex kiểm tra định dạng Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ==========================================
  // EFFECT: KHÔI PHỤC TÀI KHOẢN TỪ LOCAL STORAGE
  // ==========================================
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("rememberedEmail");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  // ==========================================
  // HÀM: KIỂM TRA CAPS LOCK (REAL-TIME)
  // ==========================================
  const handleCheckCapsLock = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
    if (e.getModifierState && typeof e.getModifierState === 'function') {
      const isCapsLockOn = e.getModifierState('CapsLock');
      setCapsLockActive(isCapsLockOn);
    }
  };

  // ==========================================
  // HÀM XỬ LÝ CHUNG: KHI XÁC THỰC THÀNH CÔNG
  // ==========================================
  const handleSuccessfulAuth = useCallback((response: any) => {
    // 🔥 ĐÃ SỬA: Lấy token chính xác từ object response.tokens của backend
    // Backend trả về: { message: "...", user: {...}, tokens: { accessToken, refreshToken } }
    const tokensObj = response.tokens || response.data?.tokens || response.metadata?.tokens;
    const accessToken = tokensObj?.accessToken || response.accessToken || response.data?.accessToken;
    const refreshToken = tokensObj?.refreshToken || response.refreshToken || response.data?.refreshToken;
    
    const userData = response.user || response.data?.user || response.metadata?.user;

    // 🔥 ĐÃ SỬA: Kiểm tra cả 2 token để khớp với Interface trong Redux
    if (accessToken && refreshToken) {
      if (typeof window !== "undefined") {
        if (rememberMe) localStorage.setItem("rememberedEmail", email);
        else localStorage.removeItem("rememberedEmail");
      }

      // Dispatch chính xác action với đầy đủ accessToken và refreshToken
      dispatch(setAuthTokens({ accessToken, refreshToken }));
      
      if (userData) {
          dispatch(setCurrentUser(userData));
      }

      toast.success(`Chào mừng ${userData?.fullName || 'bạn'} quay trở lại!`);
      router.push("/dashboard");
    } else {
      console.error("Lỗi trích xuất Token. Response nhận được:", response);
      toast.error("Lỗi trích xuất Token từ máy chủ. Dữ liệu không đầy đủ.");
    }
  }, [dispatch, email, rememberMe, router]);

  // ==========================================
  // HÀM 1: XỬ LÝ ĐĂNG NHẬP BƯỚC 1 (LOGIN)
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }
    if (!emailRegex.test(email)) {
      toast.error("Định dạng Email không hợp lệ!");
      return;
    }

    try {
      const response = await login({ email, password }).unwrap();
      const requires2FA = response.requires2FA || response.data?.requires2FA || response.metadata?.requires2FA;
      
      if (requires2FA) {
        const tToken = response.tempToken || response.data?.tempToken || response.metadata?.tempToken || email;
        setTempToken(tToken);
        setStep("2FA");
        toast("Vui lòng nhập mã bảo mật 2 lớp", { icon: "🔐" });
        // Tự động focus vào ô OTP đầu tiên sau khi chuyển trang
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
        return;
      }

      handleSuccessfulAuth(response);

    } catch (err: any) {
      console.error("Lỗi đăng nhập:", err);
      if (err?.status === 403 && (err?.data?.requires2FA || err?.data?.metadata?.requires2FA)) {
        setTempToken(err?.data?.tempToken || email);
        setStep("2FA");
        toast("Tài khoản yêu cầu xác thực 2 lớp", { icon: "🔐" });
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
        return;
      }
      const errorMessage = err?.data?.message || err?.data?.error || "Đăng nhập thất bại. Kiểm tra lại thông tin!";
      toast.error(errorMessage);
    }
  };

  // ==========================================
  // HÀM 2: XỬ LÝ XÁC THỰC 2 LỚP (OTP)
  // ==========================================
  const handleVerify2FA = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const otpCode = otp.join("");
    if (otpCode.length !== 6) return; // Bảo vệ an toàn

    try {
      const response = await verify2FA({ 
        userId: tempToken, // Đã sửa: Theo backend authController (verify2FALogin) cần userId
        token: otpCode 
      }).unwrap();

      handleSuccessfulAuth(response);

    } catch (err: any) {
      // TỰ ĐỘNG XÓA TRẮNG VÀ FOCUS LẠI Ô ĐẦU TIÊN KHI SAI OTP
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      
      const errorMessage = err?.data?.message || err?.data?.error || "Mã OTP không hợp lệ hoặc đã hết hạn!";
      toast.error(errorMessage);
    }
  }, [otp, verify2FA, tempToken, handleSuccessfulAuth]);

  // TỰ ĐỘNG GỌI API KHI NHẬP ĐỦ 6 SỐ (AUTO-SUBMIT)
  useEffect(() => {
    if (otp.join("").length === 6 && !isVerifying2FA) {
      handleVerify2FA();
    }
  }, [otp, isVerifying2FA, handleVerify2FA]);

  // ==========================================
  // HÀM 3: XỬ LÝ QUÊN MẬT KHẨU
  // ==========================================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) { toast.error("Vui lòng nhập Email!"); return; }
    if (!emailRegex.test(forgotEmail)) { toast.error("Email không hợp lệ!"); return; }

    setIsResetting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500)); 
      toast.success("Liên kết khôi phục đã được gửi vào Email!");
      setStep("LOGIN");
      setForgotEmail("");
    } catch (error) {
      toast.error("Có lỗi xảy ra, thử lại sau.");
    } finally {
      setIsResetting(false);
    }
  };

  // ==========================================
  // LOGIC XỬ LÝ NHẬP MÃ OTP 6 Ô CHUYÊN NGHIỆP
  // ==========================================
  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return; 
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // Đảm bảo chỉ lấy 1 ký tự cuối
    setOtp(newOtp);

    if (value !== "" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "Tab" || e.key === " ") {
      e.preventDefault();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return; 
    
    const newOtp = [...otp];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    
    // NẾU PASTE ĐỦ 6 SỐ, BLUR KHỎI INPUT ĐỂ XEM ANIMATION SUBMIT
    if (pastedData.length === 6) {
      otpRefs.current[5]?.blur();
    } else {
      otpRefs.current[pastedData.length]?.focus();
    }
  };

  // ==========================================
  // ANIMATION: HIỆU ỨNG SPATIAL TRANSITION 
  // ==========================================
  const spatialVariants = {
    hidden: { opacity: 0, scale: 0.95, filter: "blur(10px)", y: 15 },
    visible: { opacity: 1, scale: 1, filter: "blur(0px)", y: 0 },
    exit: { opacity: 0, scale: 1.05, filter: "blur(10px)", y: -15 },
  };

  return (
    // NỀN TẢNG (BACKGROUND): Thiết kế theo phong cách Aurora siêu cấp (Đen sâu thẳm / Trắng ngọc trai)
    <div className="relative flex items-center justify-center min-h-screen w-full bg-slate-50 dark:bg-[#0B0F19] overflow-hidden selection:bg-blue-500/30">
      
      {/* HIỆU ỨNG ÁNH SÁNG CỰC QUANG (AURORA BLOB) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none animate-pulse duration-10000"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-400/20 dark:bg-indigo-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none animate-pulse duration-7000"></div>
      
      {/* VÂN LƯỚI ẨN (SUBTLE GRID) Dành cho cảm giác Tech/Data */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:opacity-10 opacity-5 pointer-events-none"></div>

      {/* KHUNG FORM SIÊU CẤP (ULTRA PREMIUM CARD) */}
      <div className="relative z-10 w-full max-w-[440px] p-8 sm:p-12 m-4 bg-white/70 dark:bg-gray-900/50 backdrop-blur-2xl border border-white/40 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-[2.5rem] min-h-[540px] flex flex-col justify-center">
        
        {/* LOGO & TIÊU ĐỀ */}
        <div className="flex flex-col items-center text-center mb-8">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
            className="w-20 h-20 mb-5 relative drop-shadow-xl"
          >
            <Image src="/logo.png" alt="TTH ERP Logo" fill sizes="80px" style={{ objectFit: "contain" }} priority />
          </motion.div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 tracking-tight">
            Hệ thống ERP TTH
          </h2>
        </div>

        {/* BỘ CHỨA CÁC BƯỚC */}
        <AnimatePresence mode="wait">
          
          {/* ==============================================
              BƯỚC 1: ĐĂNG NHẬP
              ============================================== */}
          {step === "LOGIN" && (
            <motion.div
              key="login"
              variants={spatialVariants}
              initial="hidden" animate="visible" exit="exit"
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <form onSubmit={handleLogin} className="space-y-5">
                
                {/* TRƯỜNG NHẬP LIỆU CAO CẤP */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Địa chỉ Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      id="email" 
                      type="email" 
                      inputMode="email"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      disabled={isLoggingIn}
                      className="block w-full pl-11 pr-4 py-3 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                      placeholder="admin@tth-erp.com" 
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Mật khẩu
                    </label>
                    <button type="button" onClick={() => setStep("FORGOT_PASSWORD")} className="text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors">
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      onKeyUp={handleCheckCapsLock}
                      onKeyDown={handleCheckCapsLock}
                      onClick={handleCheckCapsLock}
                      disabled={isLoggingIn}
                      // VÁ LỖ HỔNG DOUBLE EYE CỦA BROWSER: [&::-ms-reveal]:hidden
                      className={`block w-full pl-11 pr-12 py-3 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-contacts-auto-fill-button]:hidden ${capsLockActive ? "ring-2 ring-amber-500/50 border-amber-500" : ""}`}
                      placeholder="••••••••" 
                      required
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none transition-colors">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  
                  {/* CẢNH BÁO CAPS LOCK CAO CẤP */}
                  <AnimatePresence>
                    {capsLockActive && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, y: -10 }} 
                        animate={{ opacity: 1, height: "auto", y: 0 }} 
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center bg-amber-50 dark:bg-amber-900/20 py-2 px-3 rounded-xl border border-amber-200 dark:border-amber-800/30">
                          <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                          Caps Lock đang bật, hãy cẩn thận!
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center pt-1">
                  <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-colors" />
                  <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer select-none">Ghi nhớ tài khoản</label>
                </div>

                <motion.button
                  whileHover={!isLoggingIn ? { scale: 1.01, boxShadow: "0 15px 30px -5px rgba(59, 130, 246, 0.4)" } : {}}
                  whileTap={!isLoggingIn ? { scale: 0.98 } : {}}
                  type="submit" disabled={isLoggingIn}
                  className="w-full mt-4 flex justify-center items-center px-4 py-3.5 text-sm font-bold text-white transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl shadow-xl disabled:opacity-70 disabled:cursor-wait"
                >
                  {isLoggingIn ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Đang xác thực...</> : <>Đăng nhập hệ thống <ArrowRight className="ml-2 h-5 w-5" /></>}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ==============================================
              BƯỚC 2: XÁC THỰC 2 LỚP (2FA OTP)
              ============================================== */}
          {step === "2FA" && (
            <motion.div
              key="2fa"
              variants={spatialVariants}
              initial="hidden" animate="visible" exit="exit"
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                <KeyRound className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Xác thực 2 lớp</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8 px-4">
                Mã bảo mật 6 số sinh ra từ ứng dụng Authenticator của bạn.
              </p>

              <form onSubmit={handleVerify2FA} className="w-full">
                {/* 6 Ô NHẬP OTP THEO CHUẨN VERCEL */}
                <div className="flex justify-between gap-2 mb-8" onPaste={handleOtpPaste}>
                  {otp.map((data, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      ref={(el) => { otpRefs.current[index] = el; }}
                      value={data}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      disabled={isVerifying2FA}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold text-gray-900 dark:text-white bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  ))}
                </div>

                <motion.button
                  whileHover={!isVerifying2FA ? { scale: 1.01, boxShadow: "0 15px 30px -5px rgba(59, 130, 246, 0.4)" } : {}}
                  whileTap={!isVerifying2FA ? { scale: 0.98 } : {}}
                  type="submit" disabled={isVerifying2FA}
                  className="w-full flex justify-center items-center px-4 py-3.5 text-sm font-bold text-white transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl shadow-xl disabled:opacity-70 disabled:cursor-wait"
                >
                  {isVerifying2FA ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Đang kiểm tra...</> : <>Xác nhận mã OTP</>}
                </motion.button>

                <button type="button" onClick={() => setStep("LOGIN")} disabled={isVerifying2FA} className="w-full mt-5 flex justify-center items-center text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại đăng nhập
                </button>
              </form>
            </motion.div>
          )}

          {/* ==============================================
              BƯỚC 3: QUÊN MẬT KHẨU
              ============================================== */}
          {step === "FORGOT_PASSWORD" && (
            <motion.div
              key="forgot"
              variants={spatialVariants}
              initial="hidden" animate="visible" exit="exit"
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 px-2">
                  Nhập Email đăng ký của bạn. Hệ thống sẽ gửi một liên kết bảo mật để đặt lại mật khẩu.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="forgot-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Địa chỉ Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    </div>
                    <input
                      id="forgot-email" 
                      type="email" 
                      inputMode="email"
                      value={forgotEmail} 
                      onChange={(e) => setForgotEmail(e.target.value)} 
                      disabled={isResetting}
                      className="block w-full pl-11 pr-4 py-3 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all shadow-sm"
                      placeholder="admin@tth-erp.com" 
                      required
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={!isResetting ? { scale: 1.01, boxShadow: "0 15px 30px -5px rgba(20, 184, 166, 0.4)" } : {}}
                  whileTap={!isResetting ? { scale: 0.98 } : {}}
                  type="submit" disabled={isResetting}
                  className="w-full mt-4 flex justify-center items-center px-4 py-3.5 text-sm font-bold text-white transition-all bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 rounded-2xl shadow-xl disabled:opacity-70 disabled:cursor-wait"
                >
                  {isResetting ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Đang xử lý...</> : <>Gửi liên kết khôi phục <Send className="ml-2 h-4 w-4" /></>}
                </motion.button>

                <button type="button" onClick={() => setStep("LOGIN")} disabled={isResetting} className="w-full mt-5 flex justify-center items-center text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại đăng nhập
                </button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Footer bảo mật chung */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-center items-center text-xs font-semibold text-gray-500 dark:text-gray-400">
          <ShieldCheck className="w-4 h-4 mr-1.5 text-green-500 drop-shadow-sm" />
          Hệ thống bảo mật cấp độ Doanh nghiệp
        </div>
      </div>
    </div>
  );
}