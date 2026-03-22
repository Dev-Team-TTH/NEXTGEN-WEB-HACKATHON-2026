"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Users, ShieldCheck, ShieldAlert, KeyRound, 
  Activity, Plus, Trash2, Edit, AlertOctagon, RefreshCcw, 
  UserCheck, UserX, UserCog, History, Network, Mail,
  Phone, CalendarDays, Clock, MapPin, Lock,
  AlertTriangle, Building2
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetUsersQuery, 
  useDeleteUserMutation,
  useGetRolesQuery,
  useDeleteRoleMutation,
  User 
} from "@/state/api";

// --- COMPONENTS & UTILS ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import RolePermissionModal from "./RolePermissionModal";
import SystemAuditLog from "./SystemAuditLog";
import OrganizationChart from "./OrganizationChart";
import UserModal from "./UserModal"; 
import RequirePermission from "@/app/(components)/RequirePermission";

import { formatDate, formatDateTime, getInitials } from "@/utils/formatters";
import { cn, generateAvatarColor } from "@/utils/helpers";

// ==========================================
// THUẬT TOÁN BÓC TÁCH DỮ LIỆU
// ==========================================
// 🚀 FIX LỖI: Đã cập nhật logic để tìm roleId chuẩn xác theo cấu trúc 1-1 mới
const extractUserRoleId = (u: any): string => {
  if (!u) return "";
  if (typeof u.roleId === "string" && u.roleId) return u.roleId;
  if (u.role && typeof u.role === "object" && u.role.roleId) return u.role.roleId;
  return "";
};

const getStatusUI = (status: string) => {
  switch (status) {
    case "ACTIVE": return { label: "Hoạt động", icon: UserCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20" };
    case "INACTIVE": return { label: "Bị khóa (Thu hồi)", icon: UserX, color: "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20" };
    case "SUSPENDED": return { label: "Đình chỉ", icon: AlertOctagon, color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20" };
    case "LOCKED": return { label: "Khóa bảo mật", icon: Lock, color: "text-slate-600 bg-slate-100 border-slate-300 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-600" };
    default: return { label: status || "N/A", icon: Activity, color: "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20" };
  }
};

type TabType = "USERS" | "ROLES" | "ORG_CHART" | "AUDIT_LOGS";

const UsersSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/50"></div>)}
    </div>
    <div className="h-16 w-full rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export default function UsersPage() {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("USERS");
  
  // States Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  // BỘ LỌC
  const [filterStatus, setFilterStatus] = useState("ALL");

  // APIs
  const { data: rawUsers, isLoading: loadingUsers, isError, refetch } = useGetUsersQuery({});
  const { data: rawRoles, isLoading: loadingRoles } = useGetRolesQuery();
  
  const [deleteUser, { isLoading: isDeletingUser }] = useDeleteUserMutation();
  const [deleteRole, { isLoading: isDeletingRole }] = useDeleteRoleMutation();

  useEffect(() => { setIsMounted(true); }, []);

  const isLoading = loadingUsers || loadingRoles;
  
  // Lấy danh sách Roles
  const rolesList: any[] = useMemo(() => Array.isArray(rawRoles) ? rawRoles : (rawRoles as any)?.data || (rawRoles as any)?.roles || [], [rawRoles]);

  const usersList: User[] = useMemo(() => {
    let arr = Array.isArray(rawUsers) ? rawUsers : (rawUsers as any)?.data || [];
    if (filterStatus !== "ALL") {
      arr = arr.filter((u: any) => u.status === filterStatus);
    }
    return arr;
  }, [rawUsers, filterStatus]);

  // Tổng hợp thống kê
  const summary = useMemo(() => {
    let activeCount = 0, twoFactorEnabledCount = 0;
    const fullArr = Array.isArray(rawUsers) ? rawUsers : (rawUsers as any)?.data || [];
    
    fullArr.forEach((u: any) => {
      if (u.status === "ACTIVE") activeCount++;
      if (u.is2FAEnabled) twoFactorEnabledCount++;
    });
    const twoFactorRate = fullArr.length > 0 ? Math.round((twoFactorEnabledCount / fullArr.length) * 100) : 0;
    return { totalUsers: fullArr.length, activeCount, twoFactorRate, totalRoles: rolesList.length };
  }, [rawUsers, rolesList]);

  // Handlers
  const openUserModal = useCallback((user?: User) => {
    setEditingUser(user || null);
    setIsUserModalOpen(true);
  }, []);

  const openRoleModal = useCallback((role?: any) => {
    setEditingRole(role || null);
    setIsRoleModalOpen(true);
  }, []);

  const handleDeleteUser = useCallback((id: string, name: string) => {
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 border border-slate-200 dark:border-white/10`}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Thu hồi Tài khoản?</h3>
            <p className="mt-1 text-sm text-slate-500">Xóa vĩnh viễn tài khoản <b>{name}</b>? Hành động này không thể hoàn tác.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl">Hủy bỏ</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            try { await deleteUser(id).unwrap(); toast.success(`Đã thu hồi tài khoản ${name}!`); } 
            catch { toast.error("Không thể xóa cứng tài khoản đang chứa dữ liệu giao dịch!"); }
          }} className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl shadow-lg">Xác nhận Xóa</button>
        </div>
      </div>
    ), { duration: 5000, id: `del-user-${id}` });
  }, [deleteUser]);

  const handleDeleteRole = useCallback((id: string, name: string) => {
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 border border-slate-200 dark:border-white/10`}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Gỡ bỏ Vai trò?</h3>
            <p className="mt-1 text-sm text-slate-500">Bạn muốn xóa vai trò <b>{name}</b> khỏi hệ thống?</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl">Hủy bỏ</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            try { await deleteRole(id).unwrap(); toast.success(`Đã gỡ bỏ vai trò ${name}!`); } 
            catch { toast.error("Không thể gỡ bỏ vai trò đang được gán cho người dùng!"); }
          }} className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl shadow-lg">Đồng ý</button>
        </div>
      </div>
    ), { duration: 5000, id: `del-role-${id}` });
  }, [deleteRole]);

  // CẤU HÌNH CỘT BẢNG
  const userColumns: ColumnDef<User>[] = useMemo(() => [
    {
      header: "Định danh (Tài khoản)",
      accessorKey: "fullName",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black shadow-md shrink-0 border border-white/20", generateAvatarColor(row.fullName))}>
            {getInitials(row.fullName)}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">{row.fullName}</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">ID: {row.userId.substring(0, 8)}...</span>
          </div>
        </div>
      )
    },
    {
      header: "Thông tin & Phòng ban",
      accessorKey: "email",
      cell: (row) => (
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0"/> <span className="truncate">{row.email}</span></span>
          
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            {((row as any).department || row.departmentId) ? (
               <span className="flex items-center gap-1 shrink-0 text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">
                 <Building2 className="w-3 h-3"/> {((row as any).department)?.name || "Đã phân bổ bộ phận"}
               </span>
            ) : row.phone ? (
               <span className="flex items-center gap-1 shrink-0"><Phone className="w-3 h-3 text-slate-400"/> {row.phone}</span>
            ) : null}
            
            {row.address && <span className="flex items-center gap-1 truncate" title={row.address}><MapPin className="w-3 h-3 text-slate-400 shrink-0"/> <span className="truncate max-w-[120px]">{row.address}</span></span>}
          </div>
        </div>
      )
    },
    {
      header: "Chức vụ / Quyền hạn",
      accessorKey: "role", 
      cell: (row) => {
        const currentRoleId = extractUserRoleId(row);
        const matchedRole = rolesList.find(r => String(r.roleId || r.id) === String(currentRoleId));
        const mData = matchedRole?.role || matchedRole;
        const roleNameDisplay = mData ? (typeof mData === 'string' ? mData : (mData.roleName || mData.name || mData.title || "Vai trò ẩn")) : "Chưa phân quyền";
        
        return (
          <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/30 flex items-center gap-1.5 w-fit shadow-sm">
            <KeyRound className="w-3.5 h-3.5" /> {roleNameDisplay}
          </span>
        );
      }
    },
    {
      header: "Trạng thái & Bảo mật",
      accessorKey: "status",
      cell: (row) => {
        const { label, icon: Icon, color } = getStatusUI(row.status);
        return (
          <div className="flex flex-col gap-1.5 items-start">
            <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm", color)}>
              <Icon className="w-3 h-3" /> {label}
            </span>
            {row.is2FAEnabled ? (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Đã bật 2FA</span>
            ) : (
              <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Chưa bật 2FA</span>
            )}
          </div>
        );
      }
    },
    {
      header: "Nhật ký Hoạt động",
      accessorKey: "createdAt",
      cell: (row) => {
        const createdAt = (row as any).createdAt;
        const lastLoginAt = (row as any).lastLoginAt;
        return (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5"/> Tham gia: {formatDate(createdAt)}</span>
            {lastLoginAt && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Auth: {formatDateTime(lastLoginAt)}</span>}
          </div>
        )
      }
    },
    {
      header: "Tác vụ",
      accessorKey: "userId",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <RequirePermission permissions={["MANAGE_USERS"]}>
            <button onClick={() => openUserModal(row)} title="Chỉnh sửa Hồ sơ" className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-xl transition-colors active:scale-95"><Edit className="w-4 h-4" /></button>
          </RequirePermission>
          
          <RequirePermission permissions={["MANAGE_USERS"]}>
            <button onClick={() => handleDeleteUser(row.userId, row.fullName)} disabled={isDeletingUser} title="Thu hồi tài khoản" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-colors active:scale-95 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
          </RequirePermission>
        </div>
      )
    }
  ], [rolesList, isDeletingUser, openUserModal, handleDeleteUser]);

  const userFiltersNode = (
    <div className="flex flex-wrap items-center gap-4 w-full">
      <div className="w-full sm:w-64">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Lọc theo Trạng thái</label>
        <div className="relative group">
          <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <select 
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
          >
            <option value="ALL">Tất cả tài khoản</option>
            <option value="ACTIVE">Hoạt động bình thường</option>
            <option value="SUSPENDED">Đình chỉ tạm thời</option>
            <option value="LOCKED">Khóa bảo mật</option>
            <option value="INACTIVE">Vô hiệu hóa (Nghỉ việc)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (!isMounted) return null;

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center">
      <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Lỗi kết nối IAM Database</h2>
      <button onClick={() => refetch()} className="px-6 py-3 mt-4 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95 flex items-center gap-2"><RefreshCcw className="w-5 h-5" /> Thử lại</button>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      <Header 
        title={t("Identity & Access Management")} 
        subtitle={t("Trung tâm kiểm soát định danh, phân quyền và giám sát an ninh toàn hệ thống.")}
        rightNode={
          <AnimatePresence mode="wait">
            {activeTab === "USERS" ? (
              <motion.div key="btn-users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <RequirePermission permissions={["MANAGE_USERS"]}>
                  <button onClick={() => openUserModal()} className="px-5 py-2.5 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95"><Plus className="w-5 h-5" /> <span className="hidden sm:inline">Cấp phát Tài khoản</span></button>
                </RequirePermission>
              </motion.div>
            ) : activeTab === "ROLES" ? (
              <motion.div key="btn-roles" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <RequirePermission permissions={["MANAGE_USERS"]}>
                  <button onClick={() => openRoleModal()} className="px-5 py-2.5 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all active:scale-95"><Plus className="w-5 h-5" /> <span className="hidden sm:inline">Định nghĩa Vai trò</span></button>
                </RequirePermission>
              </motion.div>
            ) : null}
          </AnimatePresence>
        }
      />

      {isLoading ? <UsersSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          {/* STATISTIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:shadow-indigo-500/10 hover:border-indigo-400/50 transition-all duration-300">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><Users className="w-24 h-24 text-indigo-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1"><Users className="w-3.5 h-3.5"/> Tổng Định danh</p>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white relative z-10 tracking-tight">{summary.totalUsers}</h3>
              <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-2 relative z-10 flex items-center gap-1"><UserCheck className="w-3.5 h-3.5"/> {summary.activeCount} account active</p>
            </motion.div>
            
            <motion.div variants={itemVariants} className={cn("glass p-5 rounded-3xl border shadow-sm relative overflow-hidden group transition-all duration-300", summary.twoFactorRate >= 80 ? "border-emerald-200 dark:border-emerald-900/30 hover:shadow-emerald-500/10" : "border-rose-300 bg-rose-50/30 dark:border-rose-500/30 dark:bg-rose-900/10 hover:shadow-rose-500/10")}>
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><ShieldCheck className={cn("w-24 h-24", summary.twoFactorRate >= 80 ? "text-emerald-500" : "text-rose-500")} /></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5"/> Sức khỏe Bảo mật (2FA)</p>
              <div className="flex items-end gap-2 relative z-10">
                <h3 className={cn("text-4xl font-black tracking-tight", summary.twoFactorRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{summary.twoFactorRate}%</h3>
                {summary.twoFactorRate < 80 && <ShieldAlert className="w-5 h-5 text-rose-500 mb-1.5 animate-pulse" />}
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2 relative z-10 shadow-inner">
                <motion.div initial={{ width: 0 }} animate={{ width: `${summary.twoFactorRate}%` }} transition={{ duration: 1, ease: "easeOut" }} className={cn("h-full rounded-full", summary.twoFactorRate >= 80 ? "bg-emerald-500" : "bg-rose-500")} />
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:shadow-purple-500/10 hover:border-purple-400/50 transition-all duration-300">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><KeyRound className="w-24 h-24 text-purple-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1"><KeyRound className="w-3.5 h-3.5"/> Core Roles (Vai trò)</p>
              <h3 className="text-4xl font-black text-purple-600 dark:text-purple-400 relative z-10 tracking-tight">{summary.totalRoles}</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-2 relative z-10 flex items-center gap-1"><UserCog className="w-3.5 h-3.5"/> Nhóm quyền đang quản lý</p>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:shadow-blue-500/10 hover:border-blue-400/50 transition-all duration-300">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500"><History className="w-24 h-24 text-blue-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1"><History className="w-3.5 h-3.5"/> Audit Log Status</p>
              <div className="flex items-center gap-2 mt-1 relative z-10">
                <span className="relative flex h-3.5 w-3.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span></span>
                <span className="font-black text-xl text-slate-800 dark:text-slate-200 tracking-tight">Active</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-2 relative z-10">Ghi log mọi thao tác CRUD</p>
            </motion.div>
          </div>

          {/* TABS NAVIGATION */}
          <div className="w-full overflow-x-auto scrollbar-hide sticky top-4 z-30">
            <div className="flex items-center gap-2 p-1.5 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-xl rounded-2xl w-fit border border-slate-200/50 dark:border-white/10 shadow-lg shadow-slate-200/20 dark:shadow-black/50">
              <button onClick={() => setActiveTab("USERS")} className={cn("relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap", activeTab === "USERS" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                {activeTab === "USERS" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 rounded-xl shadow-sm -z-10" />}
                <Users className="w-4 h-4" /> Quản trị Người dùng
              </button>
              <button onClick={() => setActiveTab("ROLES")} className={cn("relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap", activeTab === "ROLES" ? "text-purple-600 dark:text-purple-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                {activeTab === "ROLES" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 rounded-xl shadow-sm -z-10" />}
                <KeyRound className="w-4 h-4" /> Quản trị Vai trò (Roles)
              </button>
              <button onClick={() => setActiveTab("ORG_CHART")} className={cn("relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap", activeTab === "ORG_CHART" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                {activeTab === "ORG_CHART" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 rounded-xl shadow-sm -z-10" />}
                <Network className="w-4 h-4" /> Sơ đồ Tổ chức
              </button>
              <button onClick={() => setActiveTab("AUDIT_LOGS")} className={cn("relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap", activeTab === "AUDIT_LOGS" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                {activeTab === "AUDIT_LOGS" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/5 rounded-xl shadow-sm -z-10" />}
                <History className="w-4 h-4" /> Audit Logs
              </button>
            </div>
          </div>

          <div className="w-full relative min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeTab === "USERS" && (
                <motion.div key="users" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
                  <div className="glass-panel rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-white/10">
                    <DataTable 
                      data={usersList} 
                      columns={userColumns} 
                      searchKey="fullName" 
                      searchPlaceholder="Tìm định danh, email, số điện thoại..." 
                      itemsPerPage={10} 
                      advancedFilterNode={userFiltersNode}
                    />
                  </div>
                </motion.div>
              )}
              {activeTab === "ROLES" && (
                <motion.div key="roles" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {rolesList.map((r, idx) => {
                      const roleId = r.roleId || r.id || `fallback-${idx}`;
                      const roleNameStr = r.roleName || r.name || r.title || `Vai trò ${idx + 1}`;
                      const roleDesc = r.description || "Tập hợp các quyền hạn cho phép truy cập và thao tác trên phân hệ.";
                      const permsCount = r.permissions?.length || 0;
                      // 🚀 FIX BUG ĐẾM TÀI KHOẢN: Sử dụng hàm extractUserRoleId đã cập nhật
                      const usersWithRole = r._count?.users || usersList.filter((u: any) => extractUserRoleId(u) === roleId).length;

                      return (
                        <motion.div key={roleId} variants={itemVariants} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-500/50 transition-all duration-300 group flex flex-col relative overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="flex justify-between items-start mb-5 relative z-10">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-600 dark:group-hover:bg-purple-900/40 dark:group-hover:text-purple-400 transition-colors">
                                <KeyRound className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-tight">{roleNameStr}</h3>
                                <span className="text-[10px] font-mono text-slate-400 uppercase">ID: {roleId.substring(0, 8)}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-6 flex-1 line-clamp-2 leading-relaxed">{roleDesc}</p>
                          <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className="p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center text-center">
                              <span className="text-xl font-black text-slate-800 dark:text-slate-200">{usersWithRole}</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Tài khoản gán</span>
                            </div>
                            <div className="p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center text-center">
                              <span className="text-xl font-black text-purple-600 dark:text-purple-400">{permsCount}</span>
                              <span className="text-[10px] font-bold text-purple-400/80 uppercase mt-0.5">Chính sách quyền</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                            <RequirePermission permissions={["MANAGE_USERS"]}>
                              <button onClick={() => openRoleModal(r)} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-900/30 text-slate-700 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-400 text-sm font-bold rounded-xl transition-colors">
                                <Edit className="w-4 h-4"/> Cấu hình Policy
                              </button>
                            </RequirePermission>
                            <RequirePermission permissions={["MANAGE_USERS"]}>
                              <button onClick={() => handleDeleteRole(roleId, roleNameStr)} disabled={isDeletingRole || usersWithRole > 0} title={usersWithRole > 0 ? "Không thể xóa Role đang có người dùng" : "Xóa Role"} className="p-2.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </RequirePermission>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </motion.div>
              )}
              {activeTab === "ORG_CHART" && (
                <motion.div key="org_chart" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}><OrganizationChart /></motion.div>
              )}
              {activeTab === "AUDIT_LOGS" && (
                <motion.div key="audit_logs" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}><SystemAuditLog /></motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* COMPONENT MODAL THÊM/SỬA NGƯỜI DÙNG ĐƯỢC GỌI TỪ NGOÀI */}
      <UserModal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
        editingUser={editingUser} 
        rolesList={rolesList} 
      />

      <RolePermissionModal 
        isOpen={isRoleModalOpen} 
        onClose={() => { setIsRoleModalOpen(false); setEditingRole(null); refetch(); }} 
        existingRole={editingRole} 
      />

    </div>
  );
}