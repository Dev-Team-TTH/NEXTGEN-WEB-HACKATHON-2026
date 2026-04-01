"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Users, ShieldCheck, ShieldAlert, KeyRound, 
  Activity, Plus, Trash2, Edit, AlertOctagon, RefreshCcw, 
  UserCheck, UserX, UserCog, History, Network, Mail,
  Phone, CalendarDays, Clock, MapPin, Lock,
  AlertTriangle, Building2, GitMerge, UserPlus, Search, Download, Filter, Fingerprint
} from "lucide-react";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; 
import { 
  useGetUsersQuery, 
  useDeleteUserMutation,
  useGetRolesQuery,
  useDeleteRoleMutation,
  useUpdateUserMutation, 
  User 
} from "@/state/api";

// --- COMPONENTS & UTILS ---
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import RolePermissionModal from "./RolePermissionModal";
import SystemAuditLog from "./SystemAuditLog";
import OrganizationChart from "./OrganizationChart";
import UserModal from "./UserModal"; 
import WorkflowManager from "./WorkflowManager"; 
import RequirePermission from "@/app/(components)/RequirePermission";

import { formatDate, formatDateTime, getInitials } from "@/utils/formatters";
import { exportTableToExcel } from "@/utils/exportUtils"; 
import { cn, generateAvatarColor } from "@/utils/helpers";

// ==========================================
// 1. THUẬT TOÁN BÓC TÁCH DỮ LIỆU & ĐỊNH DẠNG ĐỈNH CAO
// ==========================================
const extractUserRoleId = (u: any): string => {
  if (!u) return "";
  if (u.roleId) return String(u.roleId);
  if (u.role && typeof u.role === "string") return u.role;
  if (u.role && typeof u.role === "object") {
    if (u.role.roleId) return String(u.role.roleId);
    if (u.role.id) return String(u.role.id);
  }
  return "";
};

const getRoleUI = (roleInput: string) => {
  const roleCode = roleInput?.toUpperCase() || "UNKNOWN";
  switch (roleCode) {
    case "ADMIN": return { label: "Quản trị tối cao", color: "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/30" };
    case "MANAGER": return { label: "Quản lý cấp cao", color: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-500/30" };
    case "ACCOUNTANT": return { label: "Kế toán trưởng", color: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/30" };
    case "STAFF": return { label: "Nhân viên vận hành", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30" };
    default: return { label: roleInput !== "UNKNOWN" ? roleInput : "Chưa phân quyền", color: "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/30" };
  }
};

const getStatusUI = (status: string) => {
  switch (status) {
    case "ACTIVE": return { label: "Hoạt động", icon: UserCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30" };
    case "INACTIVE": return { label: "Bị khóa", icon: UserX, color: "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/30" };
    case "SUSPENDED": return { label: "Đình chỉ", icon: AlertOctagon, color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30" };
    case "LOCKED": return { label: "Khóa bảo mật", icon: Lock, color: "text-slate-600 bg-slate-100 border-slate-300 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-600" };
    default: return { label: status || "N/A", icon: Activity, color: "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/30" };
  }
};

type TabType = "USERS" | "ROLES" | "ORG_CHART" | "WORKFLOWS" | "AUDIT_LOGS";

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const UsersSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6 transition-all duration-500 ease-in-out">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/50 transition-all duration-500 ease-in-out"></div>)}
    </div>
    <div className="h-16 w-full rounded-2xl bg-slate-200 dark:bg-slate-800/50 transition-all duration-500 ease-in-out"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2 transition-all duration-500 ease-in-out"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export default function UsersPage() {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("USERS");
  
  // 🚀 BỐI CẢNH REDUX
  const { activeBranchId, currentUser: sessionUser } = useAppSelector((state: any) => state.global);

  // States Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  // BỘ LỌC
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // 👉 FETCH DATA: 🚀 Ép API lấy Limit 9999 để chống chìm data mới tạo
  const { data: rawUsers, isLoading: loadingUsers, isError, refetch, isFetching } = useGetUsersQuery(
    { branchId: activeBranchId, limit: 9999, page: 1 } as any, 
    { 
      skip: !activeBranchId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true 
    }
  );
  
  const { data: rawRoles, isLoading: loadingRoles } = useGetRolesQuery(
    { branchId: activeBranchId, limit: 9999 } as any, 
    { skip: !activeBranchId }
  );
  
  const [deleteUser, { isLoading: isDeletingUser }] = useDeleteUserMutation();
  const [deleteRole, { isLoading: isDeletingRole }] = useDeleteRoleMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation(); 

  useEffect(() => { setIsMounted(true); }, []);

  const isLoading = loadingUsers || loadingRoles;
  
  // Lấy danh sách Roles
  const rolesList: any[] = useMemo(() => Array.isArray(rawRoles) ? rawRoles : (rawRoles as any)?.data || (rawRoles as any)?.roles || [], [rawRoles]);

  // 🚀 THUẬT TOÁN KHOAN DUNG (TOLERANT DATA MAPPING): Chống thất thoát mọi tài khoản
  const usersList: any[] = useMemo(() => {
    let arr = Array.isArray(rawUsers) ? rawUsers : (rawUsers as any)?.data || (rawUsers as any)?.users || [];
    
    let processedArr = arr.map((u: any, index: number) => {
      // 1. Chống lỗi mất ID khiến React DataTable loại bỏ ngầm
      const safeId = u.userId || u.id || u._id || `user-fallback-${index}-${Date.now()}`;

      // 2. Trích xuất Role an toàn
      const currentRoleId = extractUserRoleId(u);
      const matchedRole = rolesList.find(r => String(r.roleId || r.id) === String(currentRoleId));
      
      let roleNameDisplay = "Chưa phân quyền";
      let roleCode = "UNKNOWN";

      if (matchedRole) {
        const mData = matchedRole.role || matchedRole;
        roleNameDisplay = typeof mData === 'string' ? mData : (mData.roleName || mData.name || mData.code || mData.title || "Chưa phân quyền");
        roleCode = typeof mData === 'string' ? mData : (mData.roleName || mData.name || mData.code || "UNKNOWN");
      } else if (u.role && typeof u.role === 'string') {
        roleNameDisplay = u.role;
        roleCode = u.role;
      } else if (u.role && typeof u.role === 'object') {
        roleNameDisplay = u.role.roleName || u.role.name || u.role.code || "Chưa phân quyền";
        roleCode = u.role.roleName || u.role.name || u.role.code || "UNKNOWN";
      }

      // 3. Nội suy thuộc tính AN TOÀN TUYỆT ĐỐI (Fallback mọi trường hợp null/undefined)
      const safeCreatedAt = u.createdAt || u.createdDate || new Date().toISOString();
      const safeStatusValue = u.status || "ACTIVE"; 
      
      // 🚀 CHỐNG TÀNG HÌNH: Nếu không có phòng ban, ép thành "Chưa phân ban"
      const safeDeptName = u.department?.name || u.departmentName || "Chưa phân ban";
      const safeFullName = u.fullName || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Nhân sự mới";

      return {
        ...u,
        id: safeId,
        userId: safeId, // Đảm bảo luôn có userId cho các Action
        fullName: safeFullName, 
        email: u.email || "---",
        phone: u.phone || "---",
        roleDisplay: roleNameDisplay,
        roleCode: roleCode,
        safeStatus: safeStatusValue, 
        safeDepartmentName: safeDeptName, 
        safeCreatedAt: safeCreatedAt,
        searchField: `${safeFullName} ${u.username || ""} ${u.email || ""} ${u.phone || ""} ${roleNameDisplay} ${safeDeptName}`.toLowerCase()
      };
    });

    // 4. Thực thi Bộ lọc
    processedArr = processedArr.filter((u: any) => {
      const matchSearch = u.searchField.includes(searchQuery.toLowerCase());
      const matchRole = filterRole === "ALL" || String(u.roleCode) === filterRole || String(u.roleDisplay) === filterRole;
      const matchStatus = filterStatus === "ALL" || String(u.safeStatus) === filterStatus;
      
      return matchSearch && matchRole && matchStatus;
    });

    // 5. 🚀 SẮP XẾP: TÀI KHOẢN MỚI NHẤT LÊN ĐẦU TIÊN (Chống chìm trang)
    return processedArr.sort((a: any, b: any) => {
      const timeA = dayjs(a.safeCreatedAt).valueOf() || 0;
      const timeB = dayjs(b.safeCreatedAt).valueOf() || 0;
      return timeB - timeA; 
    });
  }, [rawUsers, rolesList, searchQuery, filterRole, filterStatus]);

  // Tổng hợp thống kê
  const summary = useMemo(() => {
    let activeCount = 0, twoFactorEnabledCount = 0, adminCount = 0, lockedCount = 0;
    
    usersList.forEach((u: any) => {
      if (u.roleCode === "ADMIN" || u.roleDisplay === "ADMIN") adminCount++;
      if (u.safeStatus === "ACTIVE") activeCount++;
      if (u.safeStatus === "INACTIVE" || u.safeStatus === "LOCKED") lockedCount++;
      if (u.is2FAEnabled) twoFactorEnabledCount++;
    });
    
    const twoFactorRate = usersList.length > 0 ? Math.round((twoFactorEnabledCount / usersList.length) * 100) : 0;
    return { totalUsers: usersList.length, adminCount, activeCount, lockedCount, twoFactorRate, totalRoles: rolesList.length };
  }, [usersList, rolesList]);

  // --- HANDLERS MODAL: DOUBLE REFETCH BẮT DỮ LIỆU ---
  const closeUserModalAndRefresh = useCallback(() => {
    setIsUserModalOpen(false);
    setEditingUser(null);
    refetch(); // Cập nhật ngay lập tức
    setTimeout(() => refetch(), 800); // Fetch lại lần 2 sau khi DB đã chốt
    setTimeout(() => refetch(), 2000); // Lần 3 an toàn tối đa
  }, [refetch]);

  const closeRoleModalAndRefresh = useCallback(() => {
    setIsRoleModalOpen(false);
    setEditingRole(null);
    refetch(); 
    setTimeout(() => refetch(), 1000); 
  }, [refetch]);

  const openUserModal = useCallback((user?: any) => {
    setEditingUser(user || null);
    setIsUserModalOpen(true);
  }, []);

  const openRoleModal = useCallback((role?: any) => {
    setEditingRole(role || null);
    setIsRoleModalOpen(true);
  }, []);

  // --- HANDLERS API NGHIỆP VỤ ---
  const handleToggleStatus = async (id: string, currentStatus: string, name: string) => {
    if (id === sessionUser?.userId) {
      toast.error("Hành động bị chặn: Bạn không thể tự khóa tài khoản của chính mình!");
      return;
    }
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const actionName = newStatus === "ACTIVE" ? "Mở khóa" : "Khóa";
    
    if (window.confirm(`XÁC NHẬN: Bạn muốn ${actionName} quyền truy cập của [${name}]?`)) {
      try {
        await updateUser({ id: id, data: { status: newStatus } }).unwrap(); 
        toast.success(`Đã cập nhật trạng thái tài khoản ${name} thành ${newStatus}`);
        refetch(); 
      } catch (err: any) {
        toast.error(err?.data?.message || `Lỗi hệ thống khi ${actionName}!`);
      }
    }
  };

  const handleDeleteUser = useCallback((id: string, name: string) => {
    if (id === sessionUser?.userId) {
      toast.error("Hành động bị chặn: Bạn không thể xóa tài khoản đang đăng nhập!");
      return;
    }

    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 border border-slate-200 dark:border-slate-800 transition-all duration-500 ease-in-out`}>
        <div className="flex items-start gap-4 transition-all duration-500 ease-in-out">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0 transition-all duration-500 ease-in-out">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 transition-all duration-500 ease-in-out" />
          </div>
          <div className="transition-all duration-500 ease-in-out">
            <h3 className="text-base font-bold text-slate-900 dark:text-white transition-all duration-500 ease-in-out">Thu hồi Tài khoản?</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 transition-all duration-500 ease-in-out">Xóa vĩnh viễn tài khoản <b>{name}</b>? Hành động này không thể hoàn tác.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5 transition-all duration-500 ease-in-out">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-all duration-500 ease-in-out">Hủy bỏ</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            try { 
              await deleteUser(id).unwrap(); 
              toast.success(`Đã thu hồi tài khoản ${name}!`); 
              refetch(); 
            } 
            catch { toast.error("Không thể xóa cứng tài khoản đang chứa dữ liệu giao dịch!"); }
          }} className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl shadow-lg transition-all duration-500 ease-in-out">Xác nhận Xóa</button>
        </div>
      </div>
    ), { duration: 5000, id: `del-user-${id}` });
  }, [deleteUser, sessionUser, refetch]);

  const handleDeleteRole = useCallback((id: string, name: string) => {
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 border border-slate-200 dark:border-slate-800 transition-all duration-500 ease-in-out`}>
        <div className="flex items-start gap-4 transition-all duration-500 ease-in-out">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0 transition-all duration-500 ease-in-out">
            <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400 transition-all duration-500 ease-in-out" />
          </div>
          <div className="transition-all duration-500 ease-in-out">
            <h3 className="text-base font-bold text-slate-900 dark:text-white transition-all duration-500 ease-in-out">Gỡ bỏ Vai trò?</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 transition-all duration-500 ease-in-out">Bạn muốn xóa vai trò <b>{name}</b> khỏi hệ thống?</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5 transition-all duration-500 ease-in-out">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-all duration-500 ease-in-out">Hủy bỏ</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            try { 
              await deleteRole(id).unwrap(); 
              toast.success(`Đã gỡ bỏ vai trò ${name}!`); 
              refetch(); 
            } 
            catch { toast.error("Không thể gỡ bỏ vai trò đang được gán cho người dùng!"); }
          }} className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl shadow-lg transition-all duration-500 ease-in-out">Đồng ý</button>
        </div>
      </div>
    ), { duration: 5000, id: `del-role-${id}` });
  }, [deleteRole, refetch]);

  const handleExportData = () => {
    if (usersList.length === 0) {
      toast.error("Không có dữ liệu nhân sự để xuất!"); return;
    }
    exportTableToExcel("smart-users-report", `Danh_Sach_Nhan_Su_${dayjs().format('DDMMYYYY')}`);
    toast.success("Xuất danh sách nhân sự thành công!");
  };

  // 🚀 CẤU HÌNH CỘT BẢNG - BỌC THÉP HIỂN THỊ PHÒNG BAN "MỒ CÔI"
  const userColumns: ColumnDef<any>[] = useMemo(() => [
    {
      header: "Định danh (Tài khoản)",
      accessorKey: "fullName",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3 transition-all duration-500 ease-in-out">
          <div className="relative">
            <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center font-black shadow-lg shrink-0 border border-white/20 transition-all duration-500 ease-in-out", generateAvatarColor(row.fullName))}>
              <span className="text-white text-base transition-all duration-500 ease-in-out">{getInitials(row.fullName)}</span>
            </div>
            <div className={cn(
              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 transition-all duration-500 ease-in-out",
              row.safeStatus === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"
            )} />
          </div>
          <div className="flex flex-col transition-all duration-500 ease-in-out">
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px] transition-all duration-500 ease-in-out" title={row.fullName}>{row.fullName}</span>
            <div className="flex items-center gap-1.5 mt-0.5 transition-all duration-500 ease-in-out">
              <Fingerprint className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider transition-all duration-500 ease-in-out">ID: {row.userId?.substring(0, 8)}...</span>
            </div>
          </div>
        </div>
      )
    },
    {
      header: "Thông tin & Phòng ban",
      accessorKey: "email",
      cell: (row) => (
        <div className="flex flex-col gap-1.5 min-w-[200px] transition-all duration-500 ease-in-out">
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all duration-500 ease-in-out">
            <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0"/> 
            <span className="truncate">{row.email}</span>
          </span>
          
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 transition-all duration-500 ease-in-out">
            {/* 🚀 VÁ LỖI: LUÔN HIỂN THỊ PHÒNG BAN KỂ CẢ KHI MỒ CÔI VỚI NỀN XÁM */}
            <span className={cn(
              "flex items-center gap-1 shrink-0 font-medium px-1.5 py-0.5 rounded transition-all duration-500 ease-in-out",
              row.safeDepartmentName !== "Chưa phân ban" 
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20" 
                : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            )}>
              <Building2 className="w-3 h-3 transition-all duration-500 ease-in-out"/> 
              {row.safeDepartmentName}
            </span>
            
            {row.phone !== "---" && (
               <span className="flex items-center gap-1 shrink-0 transition-all duration-500 ease-in-out"><Phone className="w-3 h-3 text-slate-400 dark:text-slate-500 transition-all duration-500 ease-in-out"/> {row.phone}</span>
            )}
            
            {row.address && <span className="flex items-center gap-1 truncate transition-all duration-500 ease-in-out" title={row.address}><MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0 transition-all duration-500 ease-in-out"/> <span className="truncate max-w-[120px] transition-all duration-500 ease-in-out">{row.address}</span></span>}
          </div>
        </div>
      )
    },
    {
      header: "Chức vụ / Quyền hạn",
      accessorKey: "roleDisplay", 
      cell: (row) => {
        const { color } = getRoleUI(row.roleDisplay);
        return (
          <span className={cn(
            "text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 w-fit shadow-sm transition-all duration-500 ease-in-out",
            color
          )}>
            <KeyRound className="w-3.5 h-3.5 transition-all duration-500 ease-in-out" /> 
            {row.roleDisplay}
          </span>
        );
      }
    },
    {
      header: "Trạng thái & Bảo mật",
      accessorKey: "safeStatus",
      cell: (row) => {
        const { label, icon: Icon, color } = getStatusUI(row.safeStatus);
        return (
          <div className="flex flex-col gap-1.5 items-start transition-all duration-500 ease-in-out">
            <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-all duration-500 ease-in-out", color)}>
              <Icon className="w-3 h-3 transition-all duration-500 ease-in-out" /> {label}
            </span>
            {row.is2FAEnabled ? (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 transition-all duration-500 ease-in-out"><ShieldCheck className="w-3 h-3 transition-all duration-500 ease-in-out"/> Đã bật 2FA</span>
            ) : (
              <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1 transition-all duration-500 ease-in-out"><ShieldAlert className="w-3 h-3 transition-all duration-500 ease-in-out"/> Chưa bật 2FA</span>
            )}
          </div>
        );
      }
    },
    {
      header: "Nhật ký Hoạt động",
      accessorKey: "safeCreatedAt",
      cell: (row) => {
        const lastLoginAt = row.lastLoginAt;
        return (
          <div className="flex flex-col gap-1.5 transition-all duration-500 ease-in-out">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 transition-all duration-500 ease-in-out"><CalendarDays className="w-3.5 h-3.5 transition-all duration-500 ease-in-out"/> Tham gia: {formatDate(row.safeCreatedAt)}</span>
            {lastLoginAt && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5 transition-all duration-500 ease-in-out"><Clock className="w-3.5 h-3.5 transition-all duration-500 ease-in-out"/> Auth: {formatDateTime(lastLoginAt)}</span>}
          </div>
        )
      }
    },
    {
      header: "Tác vụ",
      accessorKey: "userId",
      align: "right",
      cell: (row) => {
        const isActive = row.safeStatus === "ACTIVE";
        const isMe = row.userId === sessionUser?.userId;
        return (
          <div className="flex items-center justify-end gap-1.5 transition-all duration-500 ease-in-out">
            <RequirePermission permissions={["MANAGE_USERS"]}>
              <button onClick={() => openUserModal(row)} title="Chỉnh sửa Hồ sơ" className="p-2.5 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white rounded-xl transition-all shadow-sm active:scale-95 duration-500 ease-in-out"><Edit className="w-4.5 h-4.5 transition-all duration-500 ease-in-out" /></button>
            </RequirePermission>
            
            <RequirePermission permissions={["MANAGE_USERS"]}>
              <button 
                onClick={() => handleToggleStatus(row.userId, row.safeStatus, row.fullName)} 
                disabled={isUpdatingUser || isMe} 
                className={cn(
                  "p-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed duration-500 ease-in-out",
                  isActive 
                    ? "text-amber-600 hover:text-white bg-amber-50 hover:bg-amber-500 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-600" 
                    : "text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-600"
                )}
                title={isActive ? "Khóa tài khoản" : "Kích hoạt lại"}
              >
                {isActive ? <UserX className="w-4.5 h-4.5 transition-all duration-500 ease-in-out" /> : <UserCheck className="w-4.5 h-4.5 transition-all duration-500 ease-in-out" />}
              </button>
            </RequirePermission>

            <RequirePermission permissions={["MANAGE_USERS"]}>
              <button onClick={() => handleDeleteUser(row.userId, row.fullName)} disabled={isDeletingUser || isMe} title="Xóa vĩnh viễn" className="p-2.5 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed duration-500 ease-in-out"><Trash2 className="w-4.5 h-4.5 transition-all duration-500 ease-in-out" /></button>
            </RequirePermission>
          </div>
        );
      }
    }
  ], [isDeletingUser, isUpdatingUser, openUserModal, handleDeleteUser, sessionUser, handleToggleStatus]);

  // 🚀 BỘ LỌC NÂNG CAO - ĐÃ TÁCH RA KHỎI DATATABLE ĐỂ KHÔNG BỊ BAY MÀU KHI RỖNG
  const userFiltersNode = (
    <div className="flex flex-wrap items-center gap-5 w-full transition-all duration-500 ease-in-out pt-4 border-t border-slate-100 dark:border-slate-800">
      <div className="w-full sm:w-72 transition-all duration-500 ease-in-out">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block transition-all duration-500 ease-in-out">Phân loại Quyền truy cập</label>
        <div className="relative group transition-all duration-500 ease-in-out">
          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-all duration-500 ease-in-out" />
          <select 
            value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white duration-500 ease-in-out"
          >
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="ALL">Tất cả Chức vụ (Global)</option>
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="ADMIN">Quản trị tối cao (Admin)</option>
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="MANAGER">Quản lý khu vực (Manager)</option>
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="ACCOUNTANT">Kế toán chuyên trách</option>
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="STAFF">Nhân viên vận hành</option>
          </select>
        </div>
      </div>

      <div className="w-full sm:w-72 transition-all duration-500 ease-in-out">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block transition-all duration-500 ease-in-out">Tình trạng Tài khoản</label>
        <div className="relative group transition-all duration-500 ease-in-out">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-all duration-500 ease-in-out" />
          <select 
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white duration-500 ease-in-out"
          >
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="ALL">Tất cả Trạng thái</option>
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="ACTIVE">🔓 Đang hoạt động</option>
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100" value="INACTIVE">🔒 Đang bị khóa</option>
          </select>
        </div>
      </div>
    </div>
  );

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // 🚀 ĐIỀU KIỆN RENDER TIÊN QUYẾT
  if (!isMounted) return <UsersSkeleton />;

  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
        <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse transition-all duration-500 ease-in-out">
          <AlertOctagon className="w-12 h-12 text-amber-500 transition-all duration-500 ease-in-out" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-50 mb-3 transition-all duration-500 ease-in-out uppercase tracking-tighter">Chưa xác định Chi nhánh</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md transition-all duration-500 ease-in-out font-medium">Hệ thống phân quyền yêu cầu bạn chọn một Chi nhánh làm việc cụ thể từ menu thanh điều hướng.</p>
      </div>
    );
  }

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
      <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse transition-all duration-500 ease-in-out" />
      <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 transition-all duration-500 ease-in-out">Lỗi truy xuất Cơ sở dữ liệu Nhân sự</h2>
      <button onClick={() => refetch()} className="px-8 py-3.5 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/40 active:scale-95 flex items-center gap-3 transition-all duration-500 ease-in-out">
        <RefreshCcw className={cn("w-5 h-5 transition-all duration-500 ease-in-out", isFetching && "animate-spin")} /> Thử tải lại dữ liệu
      </button>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-8 pb-16 transition-all duration-500 ease-in-out">
      
      {/* 🚀 ĐẠI TU HEADER: BỌC THÉP FLEXBOX & CHỐNG TRÀN */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }} 
        className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 transform-gpu will-change-transform w-full transition-all duration-500 ease-in-out"
      >
        <div className="absolute -top-6 -left-6 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none z-0 transition-all duration-500 ease-in-out" />
        
        {/* Khối Title: Flex-1 min-w-0 chống tràn */}
        <div className="relative z-10 flex items-stretch gap-4 flex-1 min-w-0 transition-all duration-500 ease-in-out">
          <div className="w-1.5 shrink-0 rounded-full bg-gradient-to-b from-indigo-600 via-purple-600 to-rose-600 shadow-[0_0_12px_rgba(79,70,229,0.5)] transition-all duration-500 ease-in-out" />
          <div className="flex flex-col justify-center py-0.5 min-w-0 w-full transition-all duration-500 ease-in-out">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-slate-800 dark:text-slate-50 leading-none truncate break-words transition-all duration-500 ease-in-out">
              {t("Nhân sự & Phân quyền")}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-full md:max-w-2xl leading-relaxed transition-all duration-500 ease-in-out">
              {t("Hệ thống quản lý danh tính (IAM), phân tầng bảo mật và kiểm soát truy cập tập trung.")}
            </p>
          </div>
        </div>

        {/* Khối Buttons: Shrink-0 bảo vệ Layout */}
        <div className="relative z-10 w-full md:w-auto shrink-0 flex flex-row items-center justify-start md:justify-end gap-3 overflow-x-auto scrollbar-hide pb-1 md:pb-0 transition-all duration-500 ease-in-out">
          <AnimatePresence mode="wait">
            {activeTab === "USERS" ? (
              <motion.div className="flex items-center gap-2 transition-all duration-500 ease-in-out" key="btn-users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <button 
                  onClick={handleExportData}
                  className="px-5 py-3 flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-black rounded-2xl border-2 border-slate-100 dark:border-slate-700 transition-all active:scale-95 shadow-sm whitespace-nowrap duration-500 ease-in-out"
                >
                  <Download className="w-5 h-5 transition-all duration-500 ease-in-out" /> <span className="hidden sm:inline transition-all duration-500 ease-in-out">Xuất File Excel</span>
                </button>
                <RequirePermission permissions={["MANAGE_USERS"]}>
                  <button onClick={() => openUserModal()} className="px-6 py-3 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm font-black rounded-2xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 duration-500 ease-in-out whitespace-nowrap"><UserPlus className="w-5 h-5 transition-all duration-500 ease-in-out" /> <span className="hidden sm:inline transition-all duration-500 ease-in-out">Thêm Nhân sự</span></button>
                </RequirePermission>
              </motion.div>
            ) : activeTab === "ROLES" ? (
              <motion.div key="btn-roles" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="transition-all duration-500 ease-in-out">
                <RequirePermission permissions={["MANAGE_USERS"]}>
                  <button onClick={() => openRoleModal()} className="px-6 py-3 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black rounded-2xl shadow-xl shadow-purple-500/30 transition-all active:scale-95 duration-500 ease-in-out whitespace-nowrap"><Plus className="w-5 h-5 transition-all duration-500 ease-in-out" /> <span className="hidden sm:inline transition-all duration-500 ease-in-out">Định nghĩa Vai trò</span></button>
                </RequirePermission>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      {isLoading ? <UsersSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full transition-all duration-500 ease-in-out">
          {/* STATISTIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 transition-all duration-500 ease-in-out">
            <motion.div variants={itemVariants} className="glass p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all duration-500 ease-in-out cursor-default">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><Users className="w-24 h-24 text-indigo-500 transition-all duration-500 ease-in-out"/></div>
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 relative z-10 transition-all duration-500 ease-in-out">Tổng quân số hệ thống</p>
              <h3 className="text-4xl font-black text-slate-800 dark:text-slate-50 relative z-10 tracking-tighter transition-all duration-500 ease-in-out">{summary.totalUsers}</h3>
              <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-2 relative z-10 flex items-center gap-1 transition-all duration-500 ease-in-out"><UserCheck className="w-3.5 h-3.5 transition-all duration-500 ease-in-out"/> {summary.activeCount} account active</p>
            </motion.div>
            
            <motion.div variants={itemVariants} className={cn("glass p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group transition-all duration-500 ease-in-out cursor-default", summary.twoFactorRate >= 80 ? "border-emerald-200 dark:border-emerald-900/30 hover:shadow-emerald-500/10 dark:hover:border-emerald-500/50" : "border-rose-300 bg-rose-50/30 dark:border-rose-500/30 dark:bg-rose-900/10 hover:shadow-rose-500/10 dark:hover:border-rose-500/50")}>
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><ShieldCheck className={cn("w-24 h-24 transition-all duration-500 ease-in-out", summary.twoFactorRate >= 80 ? "text-emerald-500" : "text-rose-500")} /></div>
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 relative z-10 transition-all duration-500 ease-in-out">Sức khỏe Bảo mật (2FA)</p>
              <div className="flex items-end gap-2 relative z-10 transition-all duration-500 ease-in-out">
                <h3 className={cn("text-4xl font-black tracking-tight transition-all duration-500 ease-in-out", summary.twoFactorRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{summary.twoFactorRate}%</h3>
                {summary.twoFactorRate < 80 && <ShieldAlert className="w-5 h-5 text-rose-500 mb-1.5 animate-pulse transition-all duration-500 ease-in-out" />}
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2 relative z-10 shadow-inner transition-all duration-500 ease-in-out">
                <motion.div initial={{ width: 0 }} animate={{ width: `${summary.twoFactorRate}%` }} transition={{ duration: 1, ease: "easeOut" }} className={cn("h-full rounded-full transition-all duration-500 ease-in-out", summary.twoFactorRate >= 80 ? "bg-emerald-500" : "bg-rose-500")} />
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-purple-400 dark:hover:border-purple-500/50 transition-all duration-500 ease-in-out cursor-default">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><KeyRound className="w-24 h-24 text-purple-500 transition-all duration-500 ease-in-out"/></div>
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 relative z-10 transition-all duration-500 ease-in-out">Core Roles (Vai trò)</p>
              <h3 className="text-4xl font-black text-purple-600 dark:text-purple-400 relative z-10 tracking-tight transition-all duration-500 ease-in-out">{summary.totalRoles}</h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 relative z-10 flex items-center gap-1 transition-all duration-500 ease-in-out"><UserCog className="w-3.5 h-3.5 transition-all duration-500 ease-in-out"/> Nhóm quyền đang quản lý</p>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-500 ease-in-out cursor-default">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><History className="w-24 h-24 text-blue-500 transition-all duration-500 ease-in-out"/></div>
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 relative z-10 transition-all duration-500 ease-in-out">Audit Log Status</p>
              <div className="flex items-center gap-2 mt-1 relative z-10 transition-all duration-500 ease-in-out">
                <span className="relative flex h-3.5 w-3.5 transition-all duration-500 ease-in-out"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 transition-all duration-500 ease-in-out"></span><span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all duration-500 ease-in-out"></span></span>
                <span className="font-black text-xl text-slate-800 dark:text-slate-200 tracking-tight transition-all duration-500 ease-in-out">Active</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 relative z-10 transition-all duration-500 ease-in-out">Ghi log mọi thao tác CRUD</p>
            </motion.div>
          </div>

          {/* TABS NAVIGATION */}
          <div className="w-full overflow-x-auto scrollbar-hide sticky top-4 z-30 transition-all duration-500 ease-in-out">
            <div className="flex items-center gap-2 p-1.5 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-xl rounded-2xl w-fit border border-slate-200/50 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-black/50 transition-all duration-500 ease-in-out">
              <button onClick={() => setActiveTab("USERS")} className={cn("relative px-5 py-2.5 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out", activeTab === "USERS" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400")}>
                {activeTab === "USERS" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 rounded-xl shadow-sm -z-10 transition-all duration-500 ease-in-out" />}
                <Users className="w-4 h-4 transition-all duration-500 ease-in-out" /> Quản trị Người dùng
              </button>
              <button onClick={() => setActiveTab("ROLES")} className={cn("relative px-5 py-2.5 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out", activeTab === "ROLES" ? "text-purple-600 dark:text-purple-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400")}>
                {activeTab === "ROLES" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 rounded-xl shadow-sm -z-10 transition-all duration-500 ease-in-out" />}
                <KeyRound className="w-4 h-4 transition-all duration-500 ease-in-out" /> Quản trị Vai trò (Roles)
              </button>
              <button onClick={() => setActiveTab("ORG_CHART")} className={cn("relative px-5 py-2.5 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out", activeTab === "ORG_CHART" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400")}>
                {activeTab === "ORG_CHART" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 rounded-xl shadow-sm -z-10 transition-all duration-500 ease-in-out" />}
                <Network className="w-4 h-4 transition-all duration-500 ease-in-out" /> Sơ đồ Tổ chức
              </button>
              
              <button onClick={() => setActiveTab("WORKFLOWS")} className={cn("relative px-5 py-2.5 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out", activeTab === "WORKFLOWS" ? "text-rose-600 dark:text-rose-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400")}>
                {activeTab === "WORKFLOWS" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 rounded-xl shadow-sm -z-10 transition-all duration-500 ease-in-out" />}
                <GitMerge className="w-4 h-4 transition-all duration-500 ease-in-out" /> Quy trình Phê duyệt
              </button>

              <button onClick={() => setActiveTab("AUDIT_LOGS")} className={cn("relative px-5 py-2.5 text-sm font-bold rounded-xl transition-all z-10 flex items-center gap-2 whitespace-nowrap duration-500 ease-in-out", activeTab === "AUDIT_LOGS" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400")}>
                {activeTab === "AUDIT_LOGS" && <motion.div layoutId="rbacTab" className="absolute inset-0 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 rounded-xl shadow-sm -z-10 transition-all duration-500 ease-in-out" />}
                <History className="w-4 h-4 transition-all duration-500 ease-in-out" /> Audit Logs
              </button>
            </div>
          </div>

          <div className="w-full relative min-h-[500px] transition-all duration-500 ease-in-out">
            <AnimatePresence mode="wait">
              {activeTab === "USERS" && (
                <motion.div key="users" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="transition-all duration-500 ease-in-out">
                  <div className="glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200/60 dark:border-slate-700/50 transition-all duration-500 ease-in-out bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 transition-all duration-500 ease-in-out">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-500 ease-in-out">
                        <div className="relative w-full md:w-96 transition-all duration-500 ease-in-out group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-all duration-500 ease-in-out" />
                          <input 
                            type="text" placeholder="Tìm tên, email, hoặc SĐT..." 
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 dark:text-white duration-500 ease-in-out"
                          />
                        </div>
                        <div className="flex items-center gap-2 transition-all duration-500 ease-in-out">
                           <button onClick={() => refetch()} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all active:scale-90 duration-500 ease-in-out">
                              <RefreshCcw className={cn("w-5 h-5 transition-all duration-500 ease-in-out", isFetching && "animate-spin")} />
                           </button>
                        </div>
                      </div>
                      
                      {/* 🚀 BỘ LỌC ĐƯỢC TÁCH RA ĐỂ LUÔN HIỂN THỊ */}
                      {userFiltersNode}
                    </div>

                    {usersList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-32 text-slate-400 dark:text-slate-500 transition-all duration-500 ease-in-out">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ease-in-out">
                          <Users className="w-12 h-12 opacity-30 transition-all duration-500 ease-in-out" />
                        </div>
                        <p className="font-black text-slate-700 dark:text-slate-300 text-xl transition-all duration-500 ease-in-out">Không tìm thấy nhân sự</p>
                        <p className="text-sm mt-2 transition-all duration-500 ease-in-out font-medium">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
                      </div>
                    ) : (
                      // 🚀 LOẠI BỎ advancedFilterNode khỏi DataTable vì đã gắn thủ công ở trên
                      <DataTable 
                        data={usersList} 
                        columns={userColumns} 
                        itemsPerPage={12} 
                      />
                    )}
                  </div>
                </motion.div>
              )}
              
              {activeTab === "ROLES" && (
                <motion.div key="roles" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="transition-all duration-500 ease-in-out">
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 transition-all duration-500 ease-in-out">
                    {rolesList.map((r, idx) => {
                      const roleId = r.roleId || r.id || `fallback-${idx}`;
                      const roleNameStr = r.roleName || r.name || r.title || `Vai trò ${idx + 1}`;
                      const roleDesc = r.description || "Tập hợp các quyền hạn cho phép truy cập và thao tác trên phân hệ.";
                      const permsCount = r.permissions?.length || 0;
                      const usersWithRole = r._count?.users || usersList.filter((u: any) => extractUserRoleId(u) === roleId).length;

                      return (
                        <motion.div key={roleId} variants={itemVariants} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-500/50 transition-all duration-500 ease-in-out group flex flex-col relative overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"></div>
                          <div className="flex justify-between items-start mb-5 relative z-10 transition-all duration-500 ease-in-out">
                            <div className="flex items-center gap-3 transition-all duration-500 ease-in-out">
                              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-600 dark:group-hover:bg-purple-900/40 dark:group-hover:text-purple-400 transition-all duration-500 ease-in-out">
                                <KeyRound className="w-6 h-6 transition-all duration-500 ease-in-out" />
                              </div>
                              <div className="transition-all duration-500 ease-in-out">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-all leading-tight duration-500 ease-in-out">{roleNameStr}</h3>
                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase transition-all duration-500 ease-in-out">ID: {roleId.substring(0, 8)}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-6 flex-1 line-clamp-2 leading-relaxed transition-all duration-500 ease-in-out">{roleDesc}</p>
                          <div className="grid grid-cols-2 gap-3 mb-5 transition-all duration-500 ease-in-out">
                            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-700/30 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center text-center transition-all duration-500 ease-in-out">
                              <span className="text-xl font-black text-slate-800 dark:text-slate-200 transition-all duration-500 ease-in-out">{usersWithRole}</span>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5 transition-all duration-500 ease-in-out">Tài khoản gán</span>
                            </div>
                            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-700/30 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center text-center transition-all duration-500 ease-in-out">
                              <span className="text-xl font-black text-purple-600 dark:text-purple-400 transition-all duration-500 ease-in-out">{permsCount}</span>
                              <span className="text-[10px] font-bold text-purple-600/80 dark:text-purple-400/80 uppercase mt-0.5 transition-all duration-500 ease-in-out">Chính sách quyền</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50 transition-all duration-500 ease-in-out">
                            <RequirePermission permissions={["MANAGE_USERS"]}>
                              <button onClick={() => openRoleModal(r)} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-900/30 text-slate-700 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-400 text-sm font-bold rounded-xl transition-all duration-500 ease-in-out">
                                <Edit className="w-4 h-4 transition-all duration-500 ease-in-out"/> Cấu hình Policy
                              </button>
                            </RequirePermission>
                            <RequirePermission permissions={["MANAGE_USERS"]}>
                              <button onClick={() => handleDeleteRole(roleId, roleNameStr)} disabled={isDeletingRole || usersWithRole > 0} title={usersWithRole > 0 ? "Không thể xóa Role đang có người dùng" : "Xóa Role"} className="p-2.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed duration-500 ease-in-out">
                                <Trash2 className="w-4 h-4 transition-all duration-500 ease-in-out"/>
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
                <motion.div key="org_chart" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="transition-all duration-500 ease-in-out">
                  <OrganizationChart />
                </motion.div>
              )}
              
              {activeTab === "WORKFLOWS" && (
                <motion.div key="workflows" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="transition-all duration-500 ease-in-out">
                  <WorkflowManager />
                </motion.div>
              )}

              {activeTab === "AUDIT_LOGS" && (
                <motion.div key="audit_logs" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="transition-all duration-500 ease-in-out">
                  <SystemAuditLog />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* COMPONENT MODAL THÊM/SỬA NGƯỜI DÙNG ĐƯỢC GỌI TỪ NGOÀI */}
      <UserModal 
        isOpen={isUserModalOpen} 
        onClose={closeUserModalAndRefresh} 
        editingUser={editingUser} 
        rolesList={rolesList} 
      />

      <RolePermissionModal 
        isOpen={isRoleModalOpen} 
        onClose={closeRoleModalAndRefresh} 
        existingRole={editingRole} 
      />

      {/* ==========================================
          BẢNG ẨN DÙNG ĐỂ XUẤT BÁO CÁO SMART EXCEL
          ========================================== */}
      <div className="hidden transition-all duration-500 ease-in-out">
        <table id="smart-users-report">
          <thead>
            <tr>
              <th colSpan={7} style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#1e293b', color: '#ffffff', padding: '15px' }}>
                DANH SÁCH NHÂN SỰ & QUYỀN TRUY CẬP IAM
              </th>
            </tr>
            <tr>
              <th colSpan={7} style={{ textAlign: 'center', fontStyle: 'italic', padding: '10px' }}>
                Chi nhánh: {activeBranchId === "ALL" ? "Toàn Hệ Thống" : activeBranchId} | Ngày xuất: {dayjs().format('DD/MM/YYYY HH:mm')}
              </th>
            </tr>
            <tr>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Họ và Tên</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Email Liên hệ</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Số điện thoại</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Phân quyền (Role)</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Trạng thái Tài khoản</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Bảo mật 2FA</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Ngày gia nhập</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map((u: any, idx: number) => {
              return (
                <tr key={`usr-${idx}`}>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{u.fullName}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{u.email}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', msoNumberFormat: '\@' } as any}>{u.phone || "---"}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{getRoleUI(u.roleCode).label}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: u.safeStatus === "ACTIVE" ? '#10b981' : '#f43f5e' }}>
                    {u.safeStatus === "ACTIVE" ? "Hoạt động" : "Bị khóa"}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: u.is2FAEnabled ? '#10b981' : '#f59e0b' }}>
                    {u.is2FAEnabled ? "Đã bật" : "Chưa bật"}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{formatDateTime(u.safeCreatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}