"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Users, ShieldCheck, ShieldAlert, KeyRound, 
  Activity, Plus, Trash2, Edit, AlertOctagon, RefreshCcw, 
  UserCheck, UserX, UserCog, History, Network, Mail, Briefcase, Loader2, Save, X, ChevronRight, CheckCircle2,
  Phone, CalendarDays, Clock, MapPin, Lock, Fingerprint, EyeOff, Key
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetUsersQuery, 
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useDeleteRoleMutation,
  useResetUserPasswordMutation,
  User 
} from "@/state/api";

// --- COMPONENTS & UTILS ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import Modal from "@/app/(components)/Modal";
import RolePermissionModal from "./RolePermissionModal";
import SystemAuditLog from "./SystemAuditLog";
import OrganizationChart from "./OrganizationChart";

import { formatDate, formatDateTime, getInitials } from "@/utils/formatters";
import { cn, generateAvatarColor } from "@/utils/helpers";

// ==========================================
// 1. THUẬT TOÁN BÓC TÁCH DỮ LIỆU ĐA NĂNG
// ==========================================
const extractUserRoleId = (u: any): string => {
  if (!u) return "";
  let foundId = "";
  if (typeof u.roleId === "string" && u.roleId) foundId = u.roleId;
  else if (Array.isArray(u.roles) && u.roles.length > 0) foundId = u.roles[0].id || u.roles[0].roleId;
  else if (Array.isArray(u.userRoles) && u.userRoles.length > 0) foundId = u.userRoles[0].roleId || u.userRoles[0].role?.id || u.userRoles[0].role?.roleId;
  else if (u.role && typeof u.role === "object") foundId = u.role.id || u.role.roleId;
  else if (Array.isArray(u.roleIds) && u.roleIds.length > 0) foundId = String(u.roleIds[0]);
  return foundId ? String(foundId) : "";
};

const getStatusUI = (status: string) => {
  switch (status) {
    case "ACTIVE": return { label: "Hoạt động", icon: UserCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20" };
    case "INACTIVE": return { label: "Bị khóa", icon: UserX, color: "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20" };
    case "SUSPENDED": return { label: "Đình chỉ", icon: AlertOctagon, color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20" };
    default: return { label: status || "N/A", icon: Activity, color: "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20" };
  }
};

type TabType = "USERS" | "ROLES" | "ORG_CHART" | "AUDIT_LOGS";

const UsersSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-3xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-white/5"></div>)}
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
  const [activeTab, setActiveTab] = useState<TabType>("USERS");
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ fullName: "", email: "", phone: "", address: "", roleId: "", status: "ACTIVE" });

  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  // APIs
  const { data: rawUsers, isLoading: loadingUsers, isError, refetch } = useGetUsersQuery({});
  const { data: rawRoles, isLoading: loadingRoles } = useGetRolesQuery();
  
  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeletingUser }] = useDeleteUserMutation();
  const [deleteRole, { isLoading: isDeletingRole }] = useDeleteRoleMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetUserPasswordMutation();

  const isLoading = loadingUsers || loadingRoles;
  const isSubmittingUser = isCreatingUser || isUpdatingUser;

  const usersList: User[] = useMemo(() => Array.isArray(rawUsers) ? rawUsers : (rawUsers as any)?.data || [], [rawUsers]);
  const rolesList: any[] = useMemo(() => Array.isArray(rawRoles) ? rawRoles : (rawRoles as any)?.data || (rawRoles as any)?.roles || [], [rawRoles]);

  const summary = useMemo(() => {
    let activeCount = 0, twoFactorEnabledCount = 0;
    usersList.forEach(u => {
      if (u.status === "ACTIVE") activeCount++;
      if (u.is2FAEnabled) twoFactorEnabledCount++;
    });
    const twoFactorRate = usersList.length > 0 ? Math.round((twoFactorEnabledCount / usersList.length) * 100) : 0;
    return { totalUsers: usersList.length, activeCount, twoFactorRate, totalRoles: rolesList.length };
  }, [usersList, rolesList]);

  // Handlers
  const openUserModal = (user?: User) => {
    setShowPasswordAuth(false);
    setAdminPin("");
    setRevealedPassword(null);
    if (user) {
      setEditingUser(user);
      const currentRoleId = extractUserRoleId(user);
      setUserForm({ fullName: user.fullName || "", email: user.email || "", phone: user.phone || (user as any).phoneNumber || "", address: user.address || (user as any).address || "", roleId: currentRoleId, status: user.status || "ACTIVE" });
    } else {
      setEditingUser(null);
      setUserForm({ fullName: "", email: "", phone: "", address: "", roleId: "", status: "ACTIVE" });
    }
    setIsUserModalOpen(true);
  };

  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const response = await resetPassword({ userId: editingUser.userId, adminPin }).unwrap();
      setRevealedPassword(response.newPassword);
      setShowPasswordAuth(false);
      toast.success("Xác thực thành công. Mật khẩu đã được cấp lại!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Mã PIN Không hợp lệ. Đã ghi log bảo mật!");
      setAdminPin("");
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.fullName || !userForm.email || !userForm.roleId) {
      toast.error("Vui lòng điền đủ Tên, Email và Vai trò!"); return;
    }
    try {
      const payloadData = { fullName: userForm.fullName, email: userForm.email, phone: userForm.phone, address: userForm.address, status: userForm.status, roleIds: [userForm.roleId] };
      if (editingUser) {
        await updateUser({ id: editingUser.userId, data: payloadData as any }).unwrap();
        toast.success("Cập nhật hồ sơ định danh thành công!");
      } else {
        await createUser({ ...payloadData, password: "Password@123" } as any).unwrap(); 
        toast.success("Đã cấp phát tài khoản mới thành công!");
      }
      setIsUserModalOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi hệ thống khi lưu thông tin!");
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (window.confirm(`Thu hồi quyền truy cập của "${name}"?`)) {
      try {
        await deleteUser(id).unwrap();
        toast.success(`Đã thu hồi tài khoản ${name}!`);
      } catch (err: any) {
        toast.error("Không thể xóa cứng tài khoản đang có dữ liệu!");
      }
    }
  };

  const openRoleModal = (role?: any) => {
    setEditingRole(role || null);
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (window.confirm(`Gỡ bỏ Vai trò "${name}" khỏi hệ thống?`)) {
      try {
        await deleteRole(id).unwrap();
        toast.success(`Đã gỡ bỏ vai trò ${name}!`);
      } catch (err: any) {
        toast.error("Không thể gỡ bỏ vai trò đang có tài khoản sử dụng!");
      }
    }
  };

  const userColumns: ColumnDef<User>[] = [
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
      header: "Thông tin Liên hệ",
      accessorKey: "email",
      cell: (row) => (
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0"/> <span className="truncate">{row.email}</span></span>
          {(row.phone || row.address) && (
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              {row.phone && <span className="flex items-center gap-1 shrink-0"><Phone className="w-3 h-3 text-slate-400"/> {row.phone}</span>}
              {row.address && <span className="flex items-center gap-1 truncate" title={row.address}><MapPin className="w-3 h-3 text-slate-400 shrink-0"/> <span className="truncate max-w-[120px]">{row.address}</span></span>}
            </div>
          )}
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
          <button onClick={() => openUserModal(row)} title="Chỉnh sửa Hồ sơ" className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-xl transition-colors active:scale-95"><Edit className="w-4 h-4" /></button>
          <button onClick={() => handleDeleteUser(row.userId, row.fullName)} disabled={isDeletingUser} title="Thu hồi tài khoản" className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-colors active:scale-95 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

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
              <motion.button key="btn-users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onClick={() => openUserModal()} className="px-5 py-2.5 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95"><Plus className="w-5 h-5" /> <span className="hidden sm:inline">Cấp phát Tài khoản</span></motion.button>
            ) : activeTab === "ROLES" ? (
              <motion.button key="btn-roles" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onClick={() => openRoleModal()} className="px-5 py-2.5 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all active:scale-95"><Plus className="w-5 h-5" /> <span className="hidden sm:inline">Định nghĩa Vai trò</span></motion.button>
            ) : null}
          </AnimatePresence>
        }
      />

      {isLoading ? <UsersSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
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
                    <DataTable data={usersList} columns={userColumns} searchKey="fullName" searchPlaceholder="Tìm định danh, email, số điện thoại..." itemsPerPage={10} />
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
                            <button onClick={() => openRoleModal(r)} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-900/30 text-slate-700 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-400 text-sm font-bold rounded-xl transition-colors">
                              <Edit className="w-4 h-4"/> Cấu hình Policy
                            </button>
                            <button onClick={() => handleDeleteRole(roleId, roleNameStr)} disabled={isDeletingRole || usersWithRole > 0} title={usersWithRole > 0 ? "Không thể xóa Role đang có người dùng" : "Xóa Role"} className="p-2.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <Trash2 className="w-4 h-4"/>
                            </button>
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

      {/* PORTAL MODAL */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? "Quản trị Hồ sơ Định danh" : "Cấp phát Định danh mới"}
        subtitle="Hệ thống Identity & Access Management (IAM)"
        icon={<UserCheck className="w-6 h-6" />}
        maxWidth="max-w-4xl"
        disableOutsideClick={isSubmittingUser || isResettingPassword}
        footer={
          <>
            <button type="button" onClick={() => setIsUserModalOpen(false)} disabled={isSubmittingUser || isResettingPassword} className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
              Hủy bỏ thao tác
            </button>
            <button form="user-form" type="submit" disabled={isSubmittingUser || isResettingPassword} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100">
              {isSubmittingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {editingUser ? "Lưu Cập nhật" : "Khởi tạo Định danh"}
            </button>
          </>
        }
      >
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <form id="user-form" onSubmit={handleSaveUser} className="flex flex-col gap-6">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-white/10 pb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-500" /> Dữ liệu Cá nhân
            </h3>
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">Họ và Tên <span className="text-rose-500">*</span></label>
              <input type="text" required value={userForm.fullName} onChange={(e) => setUserForm({...userForm, fullName: e.target.value})} placeholder="VD: Nguyễn Văn A" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm" />
            </div>
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors"><Mail className="w-3.5 h-3.5"/> Email Đăng nhập <span className="text-rose-500">*</span></label>
              <input type="email" required value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} placeholder="nguyenvana@company.com" disabled={!!editingUser} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm" />
            </div>
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors"><Phone className="w-3.5 h-3.5"/> Số điện thoại</label>
              <input type="tel" value={userForm.phone} onChange={(e) => setUserForm({...userForm, phone: e.target.value})} placeholder="0912..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm" />
            </div>
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors"><MapPin className="w-3.5 h-3.5"/> Địa chỉ Liên hệ</label>
              <textarea rows={2} value={userForm.address} onChange={(e) => setUserForm({...userForm, address: e.target.value})} placeholder="Số nhà, đường, quận/huyện..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-all resize-none shadow-sm" />
            </div>
          </form>

          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-white/10 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-500" /> Truy cập & Bảo mật
            </h3>
            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-purple-500 transition-colors"><KeyRound className="w-3.5 h-3.5"/> Chính sách Vai trò (IAM Role) <span className="text-rose-500">*</span></label>
              <select form="user-form" required value={userForm.roleId} onChange={(e) => setUserForm({...userForm, roleId: e.target.value})} className="w-full px-4 py-3.5 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/30 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none text-purple-800 dark:text-purple-300 transition-all cursor-pointer shadow-inner">
                <option value="" className="text-slate-500">-- Chọn Vai trò Cốt lõi --</option>
                {rolesList.map((r, idx) => {
                  const rId = String(r.roleId || r.id || `role-${idx}`);
                  if (!rId || rId.includes('fallback')) return null;
                  const rName = r.roleName || r.name || r.title || `Vai trò ${idx + 1}`;
                  return (<option key={rId} value={rId} className="text-slate-900 dark:text-slate-100 font-medium">{rName}</option>);
                })}
              </select>
            </div>
            {editingUser && (
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors"><Activity className="w-3.5 h-3.5"/> Trạng thái Hoạt động</label>
                <select form="user-form" value={userForm.status} onChange={(e) => setUserForm({...userForm, status: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-all cursor-pointer">
                  <option value="ACTIVE">🟢 Hoạt động bình thường</option>
                  <option value="SUSPENDED">🟠 Đình chỉ tạm thời</option>
                  <option value="INACTIVE">🔴 Khóa vĩnh viễn (Thu hồi)</option>
                </select>
              </div>
            )}
            
            <div className="mt-2 p-5 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-slate-500" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Mật khẩu Hệ thống</h4>
              </div>
              {!editingUser ? (
                <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Mặc định cấp: <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-indigo-600 dark:text-indigo-400 font-black tracking-wider shadow-sm ml-1">Password@123</code></p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {revealedPassword ? (
                    <div className="flex flex-col gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl relative overflow-hidden">
                      <div className="absolute -right-2 -top-2 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase relative z-10">Mật khẩu mới (Copy gửi User):</span>
                      <div className="flex items-center justify-between relative z-10">
                        <span className="text-xl font-mono font-black text-emerald-800 dark:text-emerald-300 tracking-widest">{revealedPassword}</span>
                        <button type="button" onClick={() => setRevealedPassword(null)} className="text-emerald-600 hover:text-rose-500 transition-colors"><EyeOff className="w-5 h-5"/></button>
                      </div>
                    </div>
                  ) : showPasswordAuth ? (
                    <form onSubmit={handleExecutePasswordReset} className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-500/50 rounded-xl shadow-inner">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="w-5 h-5 text-rose-500 ml-2 animate-pulse shrink-0" />
                        <input type="password" placeholder="Nhập mã PIN xác thực Quản trị viên..." value={adminPin} onChange={e => setAdminPin(e.target.value)} required className="flex-1 bg-transparent text-sm outline-none px-2 font-bold tracking-widest text-slate-900 dark:text-white" autoFocus />
                        <button type="submit" disabled={isResettingPassword} className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 disabled:opacity-50">{isResettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận"}</button>
                      </div>
                      <p className="text-[10px] text-rose-500 font-medium px-2">Hành động này sẽ cấp lại mật khẩu và ghi log bảo mật.</p>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl shadow-sm">
                      <span className="text-sm font-mono font-bold text-slate-400 tracking-widest">••••••••••••</span>
                      <button type="button" onClick={() => setShowPasswordAuth(true)} className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"><Key className="w-3.5 h-3.5"/> Yêu cầu cấp lại mật khẩu</button>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 leading-tight">Admin chỉ có quyền cấp lại mật khẩu thông qua xác thực bảo mật hệ thống.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <RolePermissionModal 
        isOpen={isRoleModalOpen} 
        onClose={() => { setIsRoleModalOpen(false); setEditingRole(null); refetch(); }} 
        existingRole={editingRole} 
      />

    </div>
  );
}