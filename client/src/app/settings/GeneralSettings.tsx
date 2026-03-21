"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Globe2, Briefcase, CheckCircle2, Lock, ShieldCheck, Key,
  EyeOff, Eye, Timer, ShieldBan, UserCog, Loader2, Save, ShieldAlert
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API THẬT ---
import { 
  useGetCompaniesQuery,
  useUpdateCompanyMutation,
  useCreateCompanyMutation,
  useChangePasswordMutation,
  useGetCurrenciesQuery 
} from "@/state/api";

export default function GeneralSettings() {
  // --- API HOOKS ---
  const { data: companies = [], isLoading: loadingCompanies } = useGetCompaniesQuery();
  const { data: currencies = [], isLoading: loadingCurrencies } = useGetCurrenciesQuery(); 
  
  const [updateCompany, { isLoading: isUpdatingCompany }] = useUpdateCompanyMutation();
  const [createCompany, { isLoading: isCreatingCompany }] = useCreateCompanyMutation();
  const [changePassword, { isLoading: isChangingPin }] = useChangePasswordMutation();

  const currentCompany = companies[0];

  // --- STATES ---
  const [generalData, setGeneralData] = useState({
    companyName: "",
    taxCode: "",
    currencyId: "", 
  });

  const [pinForm, setPinForm] = useState({ accountPassword: "", currentPin: "", newPin: "", confirmPin: "" });
  const [showPins, setShowPins] = useState(false);
  
  // ANTI BRUTE-FORCE STATES
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  // ĐỒNG BỘ DỮ LIỆU TỪ SERVER VÀO FORM
  useEffect(() => {
    if (currentCompany) {
      setGeneralData({
        companyName: currentCompany.name || "",
        taxCode: currentCompany.taxCode || "",
        currencyId: (currentCompany as any).currencyId || "", 
      });
    }
  }, [currentCompany]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockoutTime > 0) {
      interval = setInterval(() => setLockoutTime(prev => prev - 1), 1000);
    } else if (lockoutTime === 0 && failedAttempts >= 3) {
      setFailedAttempts(0);
    }
    return () => clearInterval(interval);
  }, [lockoutTime, failedAttempts]);

  const isWeakPin = (pin: string) => {
    if (!pin) return false;
    if (/^(.)\1+$/.test(pin)) return true;
    if ("01234567890".includes(pin) || "09876543210".includes(pin)) return true;
    return false;
  };

  // HANDLER: LƯU CẤU HÌNH CÔNG TY
  const handleSaveCompany = async () => {
    if (!generalData.companyName) {
      toast.error("Tên công ty không được để trống!"); return;
    }
    if (!generalData.currencyId) {
      toast.error("Vui lòng chọn Đồng tiền hạch toán cơ sở!"); return;
    }
    
    try {
      if (currentCompany?.companyId) {
        await updateCompany({ 
          id: currentCompany.companyId, 
          data: { 
            name: generalData.companyName, 
            taxCode: generalData.taxCode,
            currencyId: generalData.currencyId 
          } as any
        }).unwrap();
      } else {
        await createCompany({ 
          name: generalData.companyName, 
          code: "COMP01", 
          taxCode: generalData.taxCode,
          currencyId: generalData.currencyId
        } as any).unwrap();
      }
      toast.success("Đã cập nhật Thông tin Doanh nghiệp vào Hệ thống!");
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi cập nhật cấu hình công ty!");
    }
  };

  // HANDLER: ĐỔI MÃ PIN
  const handleUpdateAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTime > 0) return;
    
    if (!pinForm.accountPassword || !pinForm.currentPin || !pinForm.newPin || !pinForm.confirmPin) {
      toast.error("Vui lòng điền đầy đủ các lớp bảo mật!"); return;
    }
    if (pinForm.newPin.length < 6) {
      toast.error("Mã PIN mới phải có độ tối thiểu 6 ký tự!"); return;
    }
    if (isWeakPin(pinForm.newPin)) {
      toast.error("Mã PIN quá dễ đoán. Vui lòng chọn mã khó hơn!"); return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      toast.error("Mã PIN xác nhận không khớp!"); return;
    }
    if (pinForm.currentPin === pinForm.newPin) {
      toast.error("Mã PIN mới phải khác Mã PIN hiện tại!"); return;
    }

    try {
      await changePassword({
        currentPassword: pinForm.accountPassword,
        oldPassword: pinForm.currentPin, 
        newPassword: pinForm.newPin      
      }).unwrap();
      
      toast.success("Khóa bảo mật: Thay đổi Mã PIN thành công!");
      setPinForm({ accountPassword: "", currentPin: "", newPin: "", confirmPin: "" }); 
      setFailedAttempts(0);
    } catch (err: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setLockoutTime(30); 
        toast.error("Vượt quá số lần thử! Khóa thao tác 30 giây.");
      } else {
        toast.error(err?.data?.message || "Mật khẩu hoặc Mã PIN hiện tại không chính xác!");
      }
    }
  };

  const isSavingCompany = isUpdatingCompany || isCreatingCompany;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* KHỐI 1: CẤU HÌNH CÔNG TY */}
      <div className="bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400"><Building2 className="w-5 h-5" /></div>
            Định danh Doanh nghiệp
          </h3>
          <button 
            onClick={handleSaveCompany} disabled={isSavingCompany}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSavingCompany ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            Lưu Thông tin
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {loadingCompanies && (
            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center backdrop-blur-sm rounded-xl">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          )}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tên Tổ chức / Công ty *</label>
            <input type="text" value={generalData.companyName} onChange={(e) => setGeneralData({...generalData, companyName: e.target.value})} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-5 py-3.5 text-base font-black text-slate-900 dark:text-white outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5"/> Mã số Thuế (Tax ID)</label>
            <input type="text" value={generalData.taxCode} onChange={(e) => setGeneralData({...generalData, taxCode: e.target.value})} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm" />
          </div>
          <div className="flex flex-col gap-2 group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-emerald-500"><Globe2 className="w-3.5 h-3.5"/> Đồng Tiền Hạch Toán *</label>
            <select 
              value={generalData.currencyId} 
              onChange={(e) => setGeneralData({...generalData, currencyId: e.target.value})} 
              disabled={loadingCurrencies}
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm appearance-none cursor-pointer"
            >
              <option value="">-- Chọn Tiền Tệ từ Master Data --</option>
              {/* 🚀 ĐÃ FIX LỖI KEY BẰNG CÁCH THÊM THAM SỐ INDEX VÀO MAP */}
              {currencies.map((curr: any, index: number) => (
                <option key={curr.currencyId || curr.id || `currency-${index}`} value={curr.currencyId || curr.id}>
                  {curr.name} ({curr.symbol}) - {curr.code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KHỐI 2: ĐỔI MÃ PIN ADMIN ĐA LỚP */}
      <div className="bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border border-rose-200/50 dark:border-rose-500/20 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 relative z-10">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400"><ShieldCheck className="w-5 h-5" /></div>
              Bảo mật & Quản trị Hệ thống
            </h3>
            <p className="text-sm font-medium text-slate-500 mt-2 max-w-xl">
              Đổi <b>Mã PIN Quản trị / Mật khẩu</b>. Yêu cầu xác thực tài khoản và hệ thống chống tấn công Brute-force.
            </p>
          </div>
        </div>
        
        <div className="relative">
          <AnimatePresence>
            {lockoutTime > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-rose-50/90 dark:bg-rose-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border border-rose-200 dark:border-rose-500/30">
                <ShieldBan className="w-12 h-12 text-rose-500 mb-3 animate-pulse" />
                <h4 className="text-lg font-black text-rose-700 dark:text-rose-400">Tạm khóa chức năng</h4>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-300 mt-1 flex items-center gap-2">
                  <Timer className="w-4 h-4" /> Vui lòng thử lại sau: {lockoutTime} giây
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleUpdateAdminPin} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-rose-50/30 dark:bg-rose-900/10 p-6 rounded-2xl border border-rose-100 dark:border-rose-500/10 relative z-10">
            
            <div className="flex flex-col gap-2 md:col-span-2 pb-4 border-b border-rose-200/50 dark:border-rose-500/20">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserCog className="w-3.5 h-3.5 text-slate-400"/> Mật khẩu Tài khoản của bạn <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showPins ? "text" : "password"} required 
                  value={pinForm.accountPassword} onChange={(e) => setPinForm({...pinForm, accountPassword: e.target.value})} 
                  placeholder="Xác thực danh tính trước khi đổi PIN..." 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-5 pr-12 py-3 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 transition-all shadow-sm" 
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400"/> Mã PIN Hiện tại <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showPins ? "text" : "password"} required 
                  value={pinForm.currentPin} onChange={(e) => setPinForm({...pinForm, currentPin: e.target.value})} 
                  placeholder="Nhập mã PIN đang sử dụng..." 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-5 pr-12 py-3 text-sm font-black tracking-widest text-slate-900 dark:text-white outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 transition-all shadow-sm" 
                />
                <button type="button" onClick={() => setShowPins(!showPins)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400"/> Mã PIN Mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showPins ? "text" : "password"} required minLength={6}
                  value={pinForm.newPin} onChange={(e) => setPinForm({...pinForm, newPin: e.target.value})} 
                  placeholder="Ít nhất 6 ký tự..." 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-5 pr-12 py-3 text-sm font-black tracking-widest text-slate-900 dark:text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm" 
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400"/> Xác nhận Mã PIN mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showPins ? "text" : "password"} required minLength={6}
                  value={pinForm.confirmPin} onChange={(e) => setPinForm({...pinForm, confirmPin: e.target.value})} 
                  placeholder="Nhập lại mã PIN mới..." 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-5 py-3 text-sm font-black tracking-widest text-slate-900 dark:text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm" 
                />
              </div>
            </div>

            <div className="md:col-span-2 pt-4 flex items-center justify-between border-t border-rose-200/50 dark:border-rose-500/20">
              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Sau 3 lần nhập sai, hệ thống sẽ khóa thao tác.
              </p>
              <button 
                type="submit" 
                disabled={isChangingPin || !pinForm.accountPassword || !pinForm.currentPin || !pinForm.newPin || !pinForm.confirmPin}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-black rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {isChangingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Cập nhật Mã PIN
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}