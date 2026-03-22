"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import { 
  Search, Bell, Sun, Moon, Globe, 
  LogOut, QrCode, CheckCircle2, AlertCircle, Info,
  Shield, UserCircle, Check, Menu
} from "lucide-react";
import { toast } from "react-hot-toast";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { logout as clearReduxAuth, setIsSidebarCollapsed } from "@/state";
import { 
  useLogoutMutation, 
  useGetPendingApprovalsQuery, 
  useGetRecentActivitiesQuery
} from "@/state/api";

import GlobalSearch from "@/app/(components)/GlobalSearch";
const UniversalScanner = dynamic(() => import("@/app/(components)/UniversalScanner"), { ssr: false });

import { timeAgo, getInitials } from "@/utils/formatters";
import { cn, generateAvatarColor } from "@/utils/helpers";

export default function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();

  const currentUser = useAppSelector((state: any) => state.global?.currentUser);
  const refreshToken = useAppSelector((state: any) => state.global?.refreshToken);
  const isSidebarCollapsed = useAppSelector((state: any) => state.global?.isSidebarCollapsed);
  
  const [logoutApi] = useLogoutMutation();

  const { data: rawPendingApprovals } = useGetPendingApprovalsQuery();
  const { data: rawRecentLogs } = useGetRecentActivitiesQuery(5); 

  const pendingApprovals = useMemo(() => {
    if (!rawPendingApprovals) return [];
    return Array.isArray(rawPendingApprovals) ? rawPendingApprovals : (rawPendingApprovals as any).data || [];
  }, [rawPendingApprovals]);

  const recentLogs = useMemo(() => {
    if (!rawRecentLogs) return [];
    return Array.isArray(rawRecentLogs) ? rawRecentLogs : (rawRecentLogs as any).data || [];
  }, [rawRecentLogs]);

  const [isMounted, setIsMounted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false); 
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false); 
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsMounted(true);
    const storedReadIds = sessionStorage.getItem("read_notifications");
    if (storedReadIds) {
      setReadIds(new Set(JSON.parse(storedReadIds)));
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      sessionStorage.setItem("read_notifications", JSON.stringify(Array.from(readIds)));
    }
  }, [readIds, isMounted]);

  const notifications = useMemo(() => {
    const notifs: any[] = [];
    pendingApprovals.forEach((req: any) => {
      notifs.push({
        id: `approval_${req.requestId}`,
        type: 'warning',
        content: (<span>Có yêu cầu phê duyệt chứng từ <span className="text-blue-600 dark:text-blue-400 font-bold">#{req.document?.documentNumber || req.documentId}</span>.</span>),
        time: timeAgo(req.createdAt), 
        rawDate: new Date(req.createdAt).getTime(),
        isRead: readIds.has(`approval_${req.requestId}`),
        href: `/approvals`, 
        icon: AlertCircle,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10'
      });
    });
    
    recentLogs.forEach((log: any) => {
      notifs.push({
        id: `log_${log.logId}`,
        type: 'info',
        content: (<span>{log.user?.fullName || 'Hệ thống'} đã thực hiện <span className="font-bold">{log.action}</span> trên {log.tableName || 'hệ thống'}.</span>),
        time: timeAgo(log.timestamp || log.createdAt), 
        rawDate: new Date(log.timestamp || log.createdAt || new Date()).getTime(),
        isRead: readIds.has(`log_${log.logId}`),
        href: `/users`, 
        icon: Info,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-500/10'
      });
    });
    
    return notifs.sort((a, b) => b.rawDate - a.rawDate);
  }, [pendingApprovals, recentLogs, readIds]);

  useEffect(() => {
    const latestNotif = notifications[0];
    if (isMounted && latestNotif && !latestNotif.isRead && latestNotif.rawDate > Date.now() - 5000) {
      toast.custom((t) => (
        <div className={cn("max-w-md w-full glass-panel shadow-2xl rounded-2xl pointer-events-auto flex", t.visible ? 'animate-enter' : 'animate-leave')}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5"><latestNotif.icon className={cn("h-10 w-10 p-2 rounded-full", latestNotif.iconColor, latestNotif.iconBg)} /></div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-slate-900 dark:text-white">Có thông báo mới!</p>
                <p className="mt-1 text-[13px] text-slate-500 font-medium">{latestNotif.content}</p>
              </div>
            </div>
          </div>
        </div>
      ), { id: latestNotif.id });
    }
  }, [notifications, isMounted]);

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
      if (refreshToken) await logoutApi({ refreshToken }).unwrap(); 
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
      {/* 🚀 ĐỒNG BỘ: Chuyển toàn bộ Header thành .glass để tự động map màu với Semantic Theme */}
      <div className="sticky top-0 lg:top-4 z-[40] w-full lg:w-[calc(100%-2rem)] lg:mx-auto px-0 lg:px-4 transition-all duration-300">
        <header className="relative w-full h-16 rounded-none lg:rounded-2xl flex justify-between items-center px-3 sm:px-4 overflow-visible glass z-50">
          
          <div className="relative z-10 flex items-center gap-2 sm:gap-3 flex-1">
            <button onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 active:scale-95 transition-all lg:hidden">
              <Menu className="w-5 h-5" />
            </button>

            <button onClick={() => setIsGlobalSearchOpen(true)} className="hidden lg:flex w-full max-w-sm items-center justify-between pl-3.5 pr-2 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-500/50 rounded-xl transition-all group shadow-sm">
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-[13px] font-medium text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300">Tìm kiếm hóa đơn, hỏi AI...</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 shadow-sm">Ctrl K</span>
            </button>
            
            <button onClick={() => setIsGlobalSearchOpen(true)} className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 active:scale-95 transition-all">
              <Search className="w-5 h-5" />
            </button>
          </div>

          <div className="relative z-10 flex items-center gap-1 sm:gap-2">
            
            <button onClick={() => setIsScannerOpen(true)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-sm">
              <QrCode className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
              <span className="hidden xl:block text-sm font-bold tracking-wide">Quét mã</span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-0.5 sm:gap-1.5">
              
              {/* LANGUAGE DROPDOWN */}
              <div className="relative" ref={langRef}>
                <button onClick={() => setIsLangOpen(!isLangOpen)} className="flex items-center gap-2 px-2 py-1.5 xl:px-3 xl:py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200 active:scale-95">
                  <Globe className="w-5 h-5" />
                  <span className="hidden xl:block text-[13px] font-semibold">Ngôn ngữ</span>
                </button>
                <AnimatePresence>
                  {isLangOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="absolute right-0 mt-3 w-40 glass-panel rounded-2xl shadow-xl overflow-hidden z-50">
                      <button onClick={() => changeLanguage('vi')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80 transition-colors"><span className="text-lg leading-none">🇻🇳</span> Tiếng Việt</button>
                      <button onClick={() => changeLanguage('en')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80 transition-colors"><span className="text-lg leading-none">🇺🇸</span> English</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* THEME TOGGLE */}
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex items-center gap-2 px-2 py-1.5 xl:px-3 xl:py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200 active:scale-95">
                {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
                <span className="hidden xl:block text-[13px] font-semibold">Giao diện</span>
              </button>

              {/* NOTIFICATION DROPDOWN - 🚀 ĐÃ FIX RESPONSIVE MOBILE TRÀN VIỀN */}
              <div className="relative" ref={notifRef}>
                <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative flex items-center gap-2 px-2 py-1.5 xl:px-3 xl:py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200 active:scale-95 group">
                  <Bell className={`w-5 h-5 transition-transform ${unreadCount > 0 ? 'group-hover:rotate-12 text-blue-500 dark:text-blue-400' : ''}`} />
                  <span className="hidden xl:block text-[13px] font-semibold">Thông báo</span>
                  {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 xl:top-2 xl:right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_8px_rgba(225,29,72,0.8)] animate-pulse" />}
                </button>

                <AnimatePresence>
                  {isNotifOpen && (
                    <motion.div initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} 
                      // 🚀 KỸ THUẬT FIXED MOBILE: Ép dropdown hiển thị giữa màn hình trên Mobile, và trả về dạng absolute bình thường trên Desktop
                      className="fixed left-4 right-4 top-20 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-3 sm:w-[420px] glass-panel rounded-3xl shadow-2xl overflow-hidden z-[100] flex flex-col max-h-[80vh] sm:max-h-[60vh]"
                    >
                      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                        <h3 className="font-extrabold text-slate-900 dark:text-white">Thông báo mới</h3>
                        {unreadCount > 0 ? (
                          <button onClick={markAllAsRead} className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg active:scale-95 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40"><Check className="w-3.5 h-3.5" /> Đánh dấu đã đọc</button>
                        ) : (<span className="text-[11px] font-semibold text-slate-500 px-2 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">Trống</span>)}
                      </div>
                      <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 flex flex-col">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center gap-3"><CheckCircle2 className="w-10 h-10 text-emerald-400 opacity-50" /> <span className="text-sm font-semibold text-slate-500">Đã xử lý xong mọi việc.</span></div>
                        ) : (
                          notifications.map(notif => (
                            <div key={notif.id} onClick={() => handleNotificationClick(notif.id, notif.href)} className={cn(
                              "px-5 py-4 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 flex gap-3.5 relative transition-colors",
                              notif.isRead ? 'opacity-60 hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-blue-50/80 hover:bg-blue-100/50 dark:bg-blue-900/20 dark:hover:bg-blue-900/40'
                            )}>
                              {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                              <div className={cn("mt-0.5 shrink-0 w-9 h-9 rounded-full flex items-center justify-center", notif.iconBg)}><notif.icon className={cn("w-4.5 h-4.5", notif.iconColor)} /></div>
                              <div className="flex-1">
                                <p className={cn("text-[13px] leading-relaxed", notif.isRead ? 'text-slate-600 font-medium dark:text-slate-300' : 'text-slate-900 dark:text-slate-100 font-semibold')}>{notif.content}</p>
                                <span className={cn("text-[11px] font-bold mt-1.5 block", notif.isRead ? 'text-slate-400' : 'text-blue-500 dark:text-blue-400')}>{notif.time}</span>
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

            {/* USER PROFILE DROPDOWN */}
            <div className="relative ml-1 sm:ml-2" ref={profileRef}>
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 p-1 pl-1 pr-1 sm:pr-3 rounded-full bg-slate-50 border border-slate-200/50 hover:border-indigo-300 dark:bg-slate-800/50 dark:border-slate-700/50 dark:hover:border-indigo-500/50 transition-all duration-200 active:scale-95 group">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-black shadow-sm text-sm group-hover:scale-105 transition-transform",
                  generateAvatarColor(currentUser?.fullName)
                )}>
                  {getInitials(currentUser?.fullName)}
                </div>
                <div className="hidden md:flex flex-col items-start leading-none pr-1">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white max-w-[120px] truncate">{currentUser?.fullName || "Người dùng"}</span>
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{currentUser?.role?.roleName || "STAFF"}</span>
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} 
                    // 🚀 FIXED MOBILE PROFILE DROPDOWN
                    className="fixed left-4 right-4 top-20 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-3 sm:w-72 glass-panel rounded-3xl shadow-2xl overflow-hidden z-[100]"
                  >
                    <div className="p-2">
                      <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-blue-600 to-purple-700 shadow-lg border border-white/10">
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="relative shrink-0">
                            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2 border-white/30 shadow-inner", generateAvatarColor(currentUser?.fullName))}>
                              {getInitials(currentUser?.fullName)}
                            </div>
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
                      <Link href="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/80 transition-colors"><UserCircle className="w-4.5 h-4.5 text-slate-400" /> Hồ sơ cá nhân</Link>
                      <Link href="/profile/security" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/80 transition-colors"><Shield className="w-4.5 h-4.5 text-slate-400" /> Bảo mật & 2FA</Link>
                    </div>

                    <div className="p-2 border-t border-slate-100 dark:border-slate-700/50">
                      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-[13px] font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-95"><LogOut className="w-4 h-4" /> Đăng xuất</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>
      </div>

      <UniversalScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
      
      <AnimatePresence>
        {isGlobalSearchOpen && (
          <GlobalSearch onClose={() => setIsGlobalSearchOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}