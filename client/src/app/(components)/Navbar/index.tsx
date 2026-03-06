"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { 
  Search, Bell, Sun, Moon, Globe, 
  LogOut, ShieldCheck, QrCode,
  X, CheckCircle2, AlertCircle, Info,
  Sparkles, Shield, Command, UserCircle, Check
} from "lucide-react";

// --- REDUX & API ---
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { logout as clearReduxAuth } from "@/state";
import { 
  useLogoutMutation, 
  useGetPendingApprovalsQuery, 
  useGetRecentActivitiesQuery 
} from "@/state/api";

// --- COMPONENTS ---
import UniversalScanner from "@/app/(components)/UniversalScanner";
import GlobalSearch from "@/app/(components)/GlobalSearch"; // IMPORT COMPONENT MỚI

// --- HELPER: HÀM TÍNH THỜI GIAN THỰC TẾ ---
const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days === 1) return "Hôm qua";
  return `${days} ngày trước`;
};

// ==========================================
// COMPONENT: NAVBAR ĐÃ TÁCH SEARCH
// ==========================================
export default function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const currentUser = useAppSelector((state) => state.global.currentUser);
  const [logoutApi] = useLogoutMutation();

  const { data: pendingApprovals = [] } = useGetPendingApprovalsQuery();
  const { data: recentLogs = [] } = useGetRecentActivitiesQuery(5); 

  const [isMounted, setIsMounted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false); 
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // STATE MỚI QUẢN LÝ GLOBAL SEARCH
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false); 

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const notifications = useMemo(() => {
    const notifs: any[] = [];
    pendingApprovals.forEach((req) => {
      notifs.push({
        id: `approval_${req.requestId}`,
        type: 'warning',
        content: (<span>Có yêu cầu phê duyệt chứng từ <span className="text-blue-600 dark:text-blue-400 font-bold">#{req.document?.documentNumber || req.documentId}</span> từ {req.requester?.fullName || 'Nhân viên'}.</span>),
        time: timeAgo(req.createdAt),
        rawDate: new Date(req.createdAt).getTime(),
        isRead: readIds.has(`approval_${req.requestId}`),
        href: `/approvals`, 
        icon: AlertCircle,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10'
      });
    });
    recentLogs.forEach((log) => {
      notifs.push({
        id: `log_${log.logId}`,
        type: 'info',
        content: (<span>{log.user?.fullName || 'Hệ thống'} đã thực hiện thao tác <span className="font-bold">{log.action}</span> trên {log.entityName}.</span>),
        time: timeAgo(log.timestamp),
        rawDate: new Date(log.timestamp).getTime(),
        isRead: readIds.has(`log_${log.logId}`),
        href: `/users`, 
        icon: Info,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-500/10'
      });
    });
    return notifs.sort((a, b) => b.rawDate - a.rawDate);
  }, [pendingApprovals, recentLogs, readIds]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (id: string, href: string | null) => {
    setReadIds(prev => { const newSet = new Set(prev); newSet.add(id); return newSet; });
    setIsNotifOpen(false);
    if (href) router.push(href);
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(new Set([...Array.from(readIds), ...allIds]));
  };

  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) setIsProfileOpen(false);
      if (langRef.current && !langRef.current.contains(target)) setIsLangOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lắng nghe Phím tắt Ctrl+K ĐỂ MỞ GLOBAL SEARCH
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap(); 
    } catch (error) {
      console.error("Lỗi đăng xuất", error);
    } finally {
      dispatch(clearReduxAuth()); 
      router.push("/login");
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("app_lang", lng);
    setIsLangOpen(false);
  };

  if (!isMounted) return null;

  return (
    <>
      <div className="sticky top-0 lg:top-4 z-[40] w-full lg:w-[calc(100%-2rem)] lg:mx-auto px-0 lg:px-4 transition-all duration-300">
        <header className="relative w-full h-16 rounded-none lg:rounded-2xl border-b lg:border border-slate-200/50 dark:border-white/10 
                           bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] 
                           flex justify-between items-center px-4 overflow-visible transform-gpu">
          
          <div style={{ transform: 'translateZ(0)' }} className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay rounded-none lg:rounded-2xl z-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-none lg:rounded-2xl z-0" />

          {/* =========================================
              BÊN TRÁI: NÚT GỌI TÌM KIẾM TOÀN CỤC
              ========================================= */}
          <div className="relative z-10 flex items-center gap-3 flex-1">
            
            {/* Thanh Tìm kiếm giả (Fake Input) cho PC */}
            <button 
              onClick={() => setIsGlobalSearchOpen(true)}
              className="hidden lg:flex w-full max-w-sm items-center justify-between pl-3.5 pr-2 py-2.5 bg-slate-100/50 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/50 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4.5 h-4.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-[13px] font-medium text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300">Tìm kiếm hóa đơn, vật tư, hỏi AI...</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-black/40 text-slate-400 shadow-sm">
                Ctrl K
              </span>
            </button>
            
            {/* Nút Tìm kiếm Mobile */}
            <button 
              onClick={() => setIsGlobalSearchOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* =========================================
              BÊN PHẢI: CÔNG CỤ VÀ HỒ SƠ (Giữ nguyên)
              ========================================= */}
          <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
            
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all duration-200 hover:scale-[1.03] active:scale-95 transform-gpu shadow-sm"
            >
              <QrCode className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
              <span className="hidden xl:block text-sm font-bold tracking-wide">Quét mã</span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-1.5">
              <div className="relative" ref={langRef}>
                <button onClick={() => setIsLangOpen(!isLangOpen)} className="flex items-center gap-2 px-2 py-1.5 xl:px-3 xl:py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-200 active:scale-95 transform-gpu">
                  <Globe className="w-5 h-5" />
                  <span className="hidden xl:block text-[13px] font-semibold">Ngôn ngữ</span>
                </button>
                <AnimatePresence>
                  {isLangOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="absolute right-0 mt-3 w-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden z-50">
                      <button onClick={() => changeLanguage('vi')} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-white/5"><span className="text-lg leading-none">🇻🇳</span> Tiếng Việt</button>
                      <button onClick={() => changeLanguage('en')} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-white/5"><span className="text-lg leading-none">🇺🇸</span> English</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex items-center gap-2 px-2 py-1.5 xl:px-3 xl:py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-200 active:scale-95 transform-gpu">
                {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
                <span className="hidden xl:block text-[13px] font-semibold">Giao diện</span>
              </button>

              <div className="relative" ref={notifRef}>
                <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative flex items-center gap-2 px-2 py-1.5 xl:px-3 xl:py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-200 active:scale-95 transform-gpu group">
                  <Bell className={`w-5 h-5 transition-transform ${unreadCount > 0 ? 'group-hover:rotate-12' : ''}`} />
                  <span className="hidden xl:block text-[13px] font-semibold">Thông báo</span>
                  {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 xl:top-2 xl:right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#0B0F19] shadow-[0_0_8px_rgba(225,29,72,0.8)] animate-pulse" />}
                </button>

                <AnimatePresence>
                  {isNotifOpen && (
                    <motion.div initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="absolute right-0 mt-3 w-80 sm:w-[420px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] overflow-hidden z-50 flex flex-col">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5">
                        <h3 className="font-extrabold text-slate-900 dark:text-white">Thông báo mới</h3>
                        {unreadCount > 0 ? (
                          <button onClick={markAllAsRead} className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg active:scale-95"><Check className="w-3.5 h-3.5" /> Đánh dấu đã đọc</button>
                        ) : (<span className="text-[11px] font-semibold text-slate-500 px-2 py-1.5 bg-slate-100 dark:bg-white/5 rounded-lg">Trống</span>)}
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 flex flex-col">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center gap-3"><CheckCircle2 className="w-10 h-10 text-emerald-400 opacity-50" /> Đã xử lý xong mọi việc.</div>
                        ) : (
                          notifications.map(notif => (
                            <div key={notif.id} onClick={() => handleNotificationClick(notif.id, notif.href)} className={`px-5 py-4 cursor-pointer border-b border-slate-50 dark:border-white/5 flex gap-3.5 relative ${notif.isRead ? 'opacity-60 hover:bg-slate-50 dark:hover:bg-white/5' : 'bg-blue-50/30 hover:bg-blue-50 dark:bg-blue-500/5'}`}>
                              {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                              <div className={`mt-0.5 shrink-0 w-9 h-9 rounded-full ${notif.iconBg} flex items-center justify-center`}><notif.icon className={`w-4.5 h-4.5 ${notif.iconColor}`} /></div>
                              <div className="flex-1">
                                <p className={`text-[13px] leading-relaxed ${notif.isRead ? 'text-slate-600 font-medium' : 'text-slate-800 font-semibold'}`}>{notif.content}</p>
                                <span className={`text-[11px] font-bold mt-1.5 block ${notif.isRead ? 'text-slate-400' : 'text-blue-500'}`}>{notif.time}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="relative ml-1" ref={profileRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 p-1 pl-1 pr-1 sm:pr-3 rounded-full bg-slate-50 dark:bg-black/20 border border-slate-200/50 hover:border-indigo-300 transition-all duration-200 active:scale-95 group">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-black shadow-[0_2px_8px_rgba(99,102,241,0.4)] text-sm group-hover:scale-105 transition-transform">{currentUser?.fullName?.charAt(0).toUpperCase() || "U"}</div>
                <div className="hidden md:flex flex-col items-start leading-none pr-1">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white max-w-[120px] truncate">{currentUser?.fullName || "Người dùng"}</span>
                  <span className="text-[10px] font-extrabold text-indigo-600 mt-0.5">{currentUser?.role || "STAFF"}</span>
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="absolute right-0 mt-3 w-72 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-3xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-[0_16px_60px_rgba(0,0,0,0.2)] overflow-hidden z-50">
                    <div className="p-2">
                      <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-blue-600 to-purple-700 shadow-lg border border-white/10">
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-xl border-2 border-white/30">{currentUser?.fullName?.charAt(0).toUpperCase() || "U"}</div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-indigo-700 rounded-full shadow-sm"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-base text-white truncate">{currentUser?.fullName}</p>
                            <p className="text-xs text-indigo-100 truncate mt-0.5">{currentUser?.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-2 pb-1 mt-1">
                      <Link href="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] font-bold text-slate-700 hover:bg-blue-50 transition-colors"><UserCircle className="w-4.5 h-4.5 text-slate-400" /> Hồ sơ cá nhân</Link>
                      <Link href="/profile/security" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] font-bold text-slate-700 hover:bg-blue-50 transition-colors"><Shield className="w-4.5 h-4.5 text-slate-400" /> Bảo mật & 2FA</Link>
                    </div>

                    <div className="p-2 border-t border-slate-100 dark:border-white/5">
                      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-[13px] font-black text-rose-600 hover:bg-rose-50 transition-all active:scale-95"><LogOut className="w-4 h-4" /> Đăng xuất</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>
      </div>

      {/* RENDER CÁC COMPONENT OVERLAY */}
      <UniversalScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
      <GlobalSearch isOpen={isGlobalSearchOpen} onClose={() => setIsGlobalSearchOpen(false)} />
    </>
  );
}