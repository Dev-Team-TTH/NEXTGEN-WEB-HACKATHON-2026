"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Users, ShieldCheck, ShieldAlert, KeyRound, 
  Activity, Plus, Trash2, Edit, AlertOctagon, RefreshCcw, 
  UserCheck, UserX, UserCog, History, Network, Mail, Briefcase, Loader2, Save, X, ChevronRight
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
  User 
} from "@/state/api";

// --- COMPONENTS GIAO DIỆN LÕI ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

// --- SIÊU COMPONENTS VỆ TINH ---
import RolePermissionModal from "./RolePermissionModal";
import SystemAuditLog from "./SystemAuditLog";
import OrganizationChart from "./OrganizationChart";

// ==========================================
// 1. HELPERS & FORMATTERS (DATA VIZ)
// ==========================================
const getStatusUI = (status: string) => {
  switch (status) {
    case "ACTIVE": return { label: "Hoạt động", icon: UserCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20" };
    case "INACTIVE": return { label: "Bị khóa", icon: UserX, color: "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20" };
    case "SUSPENDED": return { label: "Đình chỉ", icon: AlertOctagon, color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20" };
    default: return { label: status || "N/A", icon: Activity, color: "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20" };
  }
};

type TabType = "USERS" | "ROLES" | "ORG_CHART" | "AUDIT_LOGS";

// ==========================================
// 2. SKELETON LOADING
// ==========================================
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
// COMPONENT CHÍNH: TRẠM CHỈ HUY NHÂN SỰ & RBAC
// ==========================================
export default function UsersPage() {
  const { t } = useTranslation();

  // --- STATE TABS ---
  const [activeTab, setActiveTab] = useState<TabType>("USERS");
  
  // --- STATE USER MODAL ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ fullName: "", email: "", roleId: "", status: "ACTIVE" });

  // --- STATE ROLE MODAL ---
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  // 👉 FETCH DATA TỪ API
  const { data: users = [], isLoading: loadingUsers, isError, refetch } = useGetUsersQuery({});
  const { data: roles = [], isLoading: loadingRoles } = useGetRolesQuery();
  
  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeletingUser }] = useDeleteUserMutation();
  const [deleteRole, { isLoading: isDeletingRole }] = useDeleteRoleMutation();

  const isLoading = loadingUsers || loadingRoles;
  const isSubmittingUser = isCreatingUser || isUpdatingUser;

  // --- TÍNH TOÁN KPI (DATA VIZ) ---
  const summary = useMemo(() => {
    let activeCount = 0, twoFactorEnabledCount = 0;
    users.forEach(u => {
      if (u.status === "ACTIVE") activeCount++;
      if (u.is2FAEnabled) twoFactorEnabledCount++;
    });
    const twoFactorRate = users.length > 0 ? Math.round((twoFactorEnabledCount / users.length) * 100) : 0;

    return { totalUsers: users.length, activeCount, twoFactorRate, totalRoles: roles.length };
  }, [users, roles]);

  // --- HANDLERS (USERS) ---
  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      // ✅ CÁCH FIX TYPESCRIPT: Truy xuất roleId an toàn qua (user as any)
      const currentRoleId = (user as any).roleId || (user as any).role?.id || (user as any).role?.roleId || "";
      setUserForm({ fullName: user.fullName, email: user.email, roleId: currentRoleId, status: user.status });
    } else {
      setEditingUser(null);
      setUserForm({ fullName: "", email: "", roleId: "", status: "ACTIVE" });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.fullName || !userForm.email || !userForm.roleId) {
      toast.error("Vui lòng điền đủ Tên, Email và Vai trò!"); return;
    }
    try {
      if (editingUser) {
        // ✅ CÁCH FIX TYPESCRIPT: Ép kiểu payload thành `any` để vượt qua `Partial<User>`
        await updateUser({ id: editingUser.userId, data: userForm as any }).unwrap();
        toast.success("Cập nhật thông tin nhân viên thành công!");
      } else {
        // Tạo mới cần nhồi thêm password mặc định
        await createUser({ ...userForm, password: "Password@123" } as any).unwrap(); 
        toast.success("Đã tạo tài khoản nhân viên mới!");
      }
      setIsUserModalOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi khi lưu người dùng!");
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (window.confirm(`Thu hồi tài khoản "${name}"?\nNgười này sẽ bị đăng xuất ngay lập tức.`)) {
      try {
        await deleteUser(id).unwrap();
        toast.success(`Đã xóa tài khoản ${name}!`);
      } catch (err: any) {
        toast.error("Tài khoản đang dính dữ liệu (Phiếu thu/chi), không thể xóa cứng!");
      }
    }
  };

  // --- HANDLERS (ROLES) ---
  const openRoleModal = (role?: any) => {
    setEditingRole(role || null);
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (window.confirm(`Xóa Vai trò "${name}"?\nCác nhân viên đang giữ vai trò này sẽ bị mất quyền.`)) {
      try {
        await deleteRole(id).unwrap();
        toast.success(`Đã xóa vai trò ${name}!`);
      } catch (err: any) {
        toast.error("Không thể xóa vai trò đang có nhân viên sử dụng!");
      }
    }
  };

  // --- CỘT DATATABLE USERS ---
  const userColumns: ColumnDef<User>[] = [
    {
      header: "Nhân viên",
      accessorKey: "fullName",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-md shrink-0 border border-white/20">
            {row.fullName?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">
              {row.fullName}
            </span>
            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3"/> {row.email}</span>
          </div>
        </div>
      )
    },
    {
      header: "Quyền hạn (Role)",
      // ✅ Đổi accessorKey để không bị lỗi, xử lý map thẳng ở cell
      accessorKey: "role", 
      cell: (row) => {
        const currentRoleId = (row as any).roleId || (row as any).role?.id || (row as any).role?.roleId;
        const roleName = roles.find(r => r.id === currentRoleId || r.roleId === currentRoleId)?.name || "Chưa phân quyền";
        return (
          <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/30 flex items-center gap-1.5 w-fit">
            <KeyRound className="w-3.5 h-3.5" /> {roleName}
          </span>
        );
      }
    },
    {
      header: "Mức độ Bảo mật",
      accessorKey: "is2FAEnabled",
      align: "center",
      cell: (row) => (
        <div className="flex justify-center">
          {row.is2FAEnabled ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> An toàn (2FA)
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-200 dark:border-rose-500/20">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> Rủi ro
            </div>
          )}
        </div>
      )
    },
    {
      header: "Trạng thái",
      accessorKey: "status",
      cell: (row) => {
        const { label, icon: Icon, color } = getStatusUI(row.status);
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${color}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </span>
        );
      }
    },
    {
      header: "Thao tác",
      accessorKey: "userId",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openUserModal(row)} title="Chỉnh sửa & Cấp quyền" className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-xl transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDeleteUser(row.userId, row.fullName)} disabled={isDeletingUser} title="Thu hồi tài khoản" className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // --- CẤU HÌNH MOTION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };
  const modalVariants: Variants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 } };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Lỗi truy xuất hệ thống</h2>
        <button onClick={() => refetch()} className="px-6 py-3 mt-4 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95 flex items-center gap-2"><RefreshCcw className="w-5 h-5" /> Kết nối lại</button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      {/* 1. HEADER */}
      <Header 
        title={t("Trung tâm An ninh & Nhân sự")} 
        subtitle={t("Giám sát vòng đời tài khoản, thiết lập ma trận quyền lực và kiểm toán dấu vết.")}
        rightNode={
          activeTab === "USERS" ? (
            <button onClick={() => openUserModal()} className="px-5 py-2.5 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
              <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Cấp tài khoản</span>
            </button>
          ) : activeTab === "ROLES" ? (
            <button onClick={() => openRoleModal()} className="px-5 py-2.5 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all active:scale-95">
              <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Tạo Vai trò mới</span>
            </button>
          ) : null
        }
      />

      {isLoading ? <UsersSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          
          {/* 2. KHỐI THỐNG KÊ (KPI CARDS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-indigo-400 transition-colors">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><Users className="w-20 h-20 text-indigo-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10">Tổng Tài Khoản</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white relative z-10">{summary.totalUsers}</h3>
              <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-2 relative z-10 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5"/> {summary.activeCount} đang hoạt động
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className={`glass p-5 rounded-3xl border shadow-sm relative overflow-hidden group transition-colors ${summary.twoFactorRate >= 80 ? 'border-emerald-200 dark:border-emerald-900/30' : 'border-rose-300 bg-rose-50/30 dark:border-rose-500/30 dark:bg-rose-900/10'}`}>
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><ShieldCheck className={`w-20 h-20 ${summary.twoFactorRate >= 80 ? 'text-emerald-500' : 'text-rose-500'}`}/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10">Độ phủ 2FA (Bảo mật)</p>
              <div className="flex items-end gap-2 relative z-10">
                <h3 className={`text-3xl font-black ${summary.twoFactorRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {summary.twoFactorRate}%
                </h3>
                {summary.twoFactorRate < 80 && <ShieldAlert className="w-5 h-5 text-rose-500 mb-1 animate-pulse" />}
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2 relative z-10">
                <motion.div initial={{ width: 0 }} animate={{ width: `${summary.twoFactorRate}%` }} transition={{ duration: 1 }} className={`h-full rounded-full ${summary.twoFactorRate >= 80 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-purple-400 transition-colors">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><KeyRound className="w-20 h-20 text-purple-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10">Cấu trúc Phân quyền</p>
              <h3 className="text-3xl font-black text-purple-600 dark:text-purple-400 relative z-10">{summary.totalRoles}</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-2 relative z-10 flex items-center gap-1">
                <UserCog className="w-3.5 h-3.5"/> Role có sẵn
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-colors">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><History className="w-20 h-20 text-blue-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 relative z-10">Server Audit Log</p>
              <div className="flex items-center gap-2 mt-1 relative z-10">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500"></span>
                </span>
                <span className="font-black text-lg text-slate-800 dark:text-slate-200">Recording</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-2 relative z-10">Giám sát dấu vết 24/7</p>
            </motion.div>

          </div>

          {/* 3. THANH ĐIỀU HƯỚNG TABS (STICKY GLASSMORPHISM) */}
          <div className="w-full overflow-x-auto scrollbar-hide sticky top-4 z-30">
            <div className="flex items-center gap-2 p-1.5 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl rounded-2xl w-fit border border-slate-200/50 dark:border-white/10 shadow-md">
              
              <button onClick={() => setActiveTab("USERS")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeTab === "USERS" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {activeTab === "USERS" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl shadow-sm -z-10" />}
                <Users className="w-4 h-4" /> Danh sách Nhân viên
              </button>

              <button onClick={() => setActiveTab("ROLES")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeTab === "ROLES" ? "text-purple-600 dark:text-purple-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {activeTab === "ROLES" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-xl shadow-sm -z-10" />}
                <KeyRound className="w-4 h-4" /> Vai trò (Roles)
              </button>

              <button onClick={() => setActiveTab("ORG_CHART")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeTab === "ORG_CHART" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {activeTab === "ORG_CHART" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl shadow-sm -z-10" />}
                <Network className="w-4 h-4" /> Sơ đồ Tổ chức
              </button>

              <button onClick={() => setActiveTab("AUDIT_LOGS")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeTab === "AUDIT_LOGS" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {activeTab === "AUDIT_LOGS" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl shadow-sm -z-10" />}
                <History className="w-4 h-4" /> Nhật ký (Audit)
              </button>

            </div>
          </div>

          {/* 4. RENDER NỘI DUNG TABS */}
          <div className="w-full relative min-h-[400px]">
            <AnimatePresence mode="wait">
              
              {/* --- TAB 1: USERS --- */}
              {activeTab === "USERS" && (
                <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10">
                    <DataTable 
                      data={users} 
                      columns={userColumns} 
                      searchKey="fullName" 
                      searchPlaceholder="Tìm kiếm tên, email nhân viên..." 
                      itemsPerPage={10} 
                    />
                  </div>
                </motion.div>
              )}

              {/* --- TAB 2: ROLES (THẺ CARD ĐỘNG) --- */}
              {activeTab === "ROLES" && (
                <motion.div key="roles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {roles.map(role => (
                      <motion.div key={role.id || role.roleId} variants={itemVariants} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-900/50 transition-all group flex flex-col cursor-pointer" onClick={() => openRoleModal(role)}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <KeyRound className="w-6 h-6" />
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); openRoleModal(role); }} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"><Edit className="w-4 h-4"/></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id || role.roleId, role.name); }} disabled={isDeletingRole} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{role.name}</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-6 flex-1 line-clamp-2">{role.description || "Quyền hạn của vai trò này đang được áp dụng."}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-purple-500" /> Sỡ hữu {(role.permissions || []).length} Quyền
                          </span>
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Cấu hình <ChevronRight className="w-3.5 h-3.5"/>
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* --- TAB 3: ORG CHART (SƠ ĐỒ TỔ CHỨC) --- */}
              {activeTab === "ORG_CHART" && (
                <motion.div key="org_chart" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <OrganizationChart />
                </motion.div>
              )}

              {/* --- TAB 4: AUDIT LOGS (LỊCH SỬ THAO TÁC) --- */}
              {activeTab === "AUDIT_LOGS" && (
                <motion.div key="audit_logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <SystemAuditLog />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </motion.div>
      )}

      {/* ==========================================
          5. INLINE MODAL TẠO/SỬA NHÂN VIÊN
          ========================================== */}
      <AnimatePresence>
        {isUserModalOpen && (
          <motion.div 
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} initial="hidden" animate="visible" exit="hidden"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <div className="absolute inset-0" onClick={!isSubmittingUser ? () => setIsUserModalOpen(false) : undefined} />
            
            <motion.div 
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-indigo-500/20 overflow-hidden z-10"
            >
              <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-indigo-50/50 dark:bg-indigo-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {editingUser ? "Cập nhật Hồ sơ" : "Tạo Tài khoản mới"}
                    </h2>
                  </div>
                </div>
                <button onClick={() => setIsUserModalOpen(false)} disabled={isSubmittingUser} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5"/> Họ và Tên *</label>
                  <input 
                    type="text" required value={userForm.fullName} onChange={(e) => setUserForm({...userForm, fullName: e.target.value})}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> Email đăng nhập *</label>
                  <input 
                    type="email" required value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    placeholder="nguyenvana@company.com" disabled={!!editingUser}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white disabled:opacity-50"
                  />
                  {!editingUser && <p className="text-[10px] text-slate-400 mt-1">Mật khẩu khởi tạo: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-500 font-bold">Password@123</code></p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5"/> Phân quyền Vai trò *</label>
                  <select 
                    required value={userForm.roleId} onChange={(e) => setUserForm({...userForm, roleId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-purple-700 dark:text-purple-400"
                  >
                    <option value="">-- Cấp quyền (Role) --</option>
                    {roles.map(r => <option key={r.id || r.roleId} value={r.id || r.roleId}>{r.name}</option>)}
                  </select>
                </div>

                {editingUser && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Trạng thái</label>
                    <select 
                      value={userForm.status} onChange={(e) => setUserForm({...userForm, status: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                    >
                      <option value="ACTIVE">Hoạt động bình thường</option>
                      <option value="SUSPENDED">Đình chỉ tạm thời</option>
                      <option value="INACTIVE">Khóa vĩnh viễn</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
                  <button type="button" onClick={() => setIsUserModalOpen(false)} disabled={isSubmittingUser} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    Hủy
                  </button>
                  <button type="submit" disabled={isSubmittingUser} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50">
                    {isSubmittingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingUser ? "Cập nhật" : "Khởi tạo"}
                  </button>
                </div>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TÍCH HỢP MODAL TẠO ROLES/PERMISSIONS */}
      <RolePermissionModal 
        isOpen={isRoleModalOpen} 
        onClose={() => { setIsRoleModalOpen(false); setEditingRole(null); }} 
        existingRole={editingRole} 
      />

    </div>
  );
}