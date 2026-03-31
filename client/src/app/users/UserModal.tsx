"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  UserCheck, Briefcase, Mail, Phone, MapPin, 
  ShieldCheck, KeyRound, Activity, Lock, CheckCircle2, 
  Fingerprint, EyeOff, Key, Loader2, Save, Building2
} from "lucide-react";
import { toast } from "react-hot-toast";

import { 
  User, 
  useCreateUserMutation, 
  useUpdateUserMutation, 
  useResetUserPasswordMutation,
  useGetOrganizationStructureQuery
} from "@/state/api";

import Modal from "@/app/(components)/Modal";
import { cn } from "@/utils/helpers";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser: User | null;
  rolesList: any[];
}

export default function UserModal({ isOpen, onClose, editingUser, rolesList }: UserModalProps) {
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetUserPasswordMutation();
  
  // API lấy Cấu trúc Tổ chức (Phòng ban)
  const { data: orgData } = useGetOrganizationStructureQuery();

  const isSubmitting = isCreating || isUpdating;

  // -- States --
  const [userForm, setUserForm] = useState({ 
    fullName: "", email: "", phone: "", address: "", 
    departmentId: "", roleId: "", status: "ACTIVE" 
  });
  
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);

  // -- Xử lý danh sách Phòng ban từ Cây Tổ chức --
  const departmentsList = useMemo(() => {
    if (!orgData) return [];
    let deps: { id: string, name: string, branchName: string }[] = [];
    orgData.forEach((company: any) => {
      company.branches?.forEach((branch: any) => {
        branch.departments?.forEach((dept: any) => {
          deps.push({ id: dept.departmentId, name: dept.name, branchName: branch.name });
        });
      });
    });
    return deps;
  }, [orgData]);

  // -- Khởi tạo dữ liệu khi mở Modal --
  useEffect(() => {
    if (isOpen) {
      setShowPasswordAuth(false);
      setAdminPin("");
      setRevealedPassword(null);

      if (editingUser) {
        // 🚀 FIX LOGIC: Bóc tách roleId chuẩn theo Backend mới (Quan hệ 1-1)
        let currentRoleId = "";
        const userAny = editingUser as any;
        
        if (typeof userAny.roleId === "string" && userAny.roleId) currentRoleId = userAny.roleId;
        else if (userAny.role && userAny.role.roleId) currentRoleId = userAny.role.roleId;

        setUserForm({ 
          fullName: userAny.fullName || "", 
          email: userAny.email || "", 
          phone: userAny.phone || userAny.phoneNumber || "", 
          address: userAny.address || "", 
          departmentId: userAny.departmentId || "",
          roleId: currentRoleId || "", 
          status: userAny.status || "ACTIVE" 
        });
      } else {
        setUserForm({ fullName: "", email: "", phone: "", address: "", departmentId: "", roleId: "", status: "ACTIVE" });
      }
    }
  }, [isOpen, editingUser]);

  const handleExecutePasswordReset = async () => {
    if (!editingUser) return;
    if (!adminPin) { toast.error("Vui lòng nhập Mã PIN Quản trị!"); return; }
    
    try {
      const response = await resetPassword({ userId: editingUser.userId, adminPin }).unwrap();
      setRevealedPassword(response.newPassword);
      setShowPasswordAuth(false);
      toast.success("Xác thực thành công. Mật khẩu đã được cấp lại!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Mã PIN Không hợp lệ. Hệ thống đã khóa và ghi nhận nhật ký an ninh!");
      setAdminPin("");
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.fullName || !userForm.email || !userForm.roleId) {
      toast.error("Vui lòng điền đủ Tên, Email và Vai trò!"); return;
    }
    
    try {
      // 🚀 FIX LỖI CRASH API & "NHÂN SỰ VÔ GIA CƯ": 
      // Ép chặt departmentId thành null nếu rỗng, tránh lỗi Foreign Key Constraint của Prisma
      const safeDeptId = userForm.departmentId && userForm.departmentId.trim() !== "" ? userForm.departmentId : null;

      const payloadData = { 
        fullName: userForm.fullName, 
        email: userForm.email, 
        phone: userForm.phone, 
        address: userForm.address, 
        departmentId: safeDeptId, // 🚀 Sử dụng safe data
        status: userForm.status, 
        roleId: userForm.roleId 
      };
      
      if (editingUser) {
        await updateUser({ id: editingUser.userId, data: payloadData as any }).unwrap();
        toast.success("Cập nhật hồ sơ định danh thành công!");
      } else {
        await createUser({ ...payloadData, password: "Password@123" } as any).unwrap(); 
        toast.success("Đã cấp phát tài khoản mới thành công!");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi hệ thống khi lưu thông tin!");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingUser ? "Quản trị Hồ sơ Định danh" : "Cấp phát Định danh mới"}
      subtitle="Hệ thống Identity & Access Management (IAM)"
      icon={<UserCheck className="w-6 h-6 text-indigo-500" />}
      maxWidth="max-w-4xl"
      disableOutsideClick={isSubmitting || isResettingPassword}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isSubmitting || isResettingPassword} className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors duration-500">
            Hủy bỏ thao tác
          </button>
          <button form="user-form" type="submit" disabled={isSubmitting || isResettingPassword} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xl shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {editingUser ? "Lưu Cập nhật" : "Khởi tạo Định danh"}
          </button>
        </>
      }
    >
      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10 transition-colors duration-500">
        
        {/* ========================================== */}
        {/* CỘT TRÁI: THÔNG TIN CÁ NHÂN & PHÒNG BAN     */}
        {/* ========================================== */}
        <form id="user-form" onSubmit={handleSaveUser} className="flex flex-col gap-6">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 transition-colors duration-500">
            <Briefcase className="w-4 h-4 text-indigo-500" /> Dữ liệu Cá nhân & Tổ chức
          </h3>
          
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500">Họ và Tên <span className="text-rose-500">*</span></label>
            <input type="text" required value={userForm.fullName} onChange={(e) => setUserForm({...userForm, fullName: e.target.value})} placeholder="VD: Nguyễn Văn A" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-colors duration-500 shadow-sm" />
          </div>
          
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500"><Mail className="w-3.5 h-3.5"/> Email Đăng nhập <span className="text-rose-500">*</span></label>
            <input type="email" required value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} placeholder="nguyenvana@company.com" disabled={!!editingUser} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-colors duration-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm" />
          </div>

          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500"><Building2 className="w-3.5 h-3.5"/> Đơn vị / Phòng ban</label>
            <select value={userForm.departmentId} onChange={(e) => setUserForm({...userForm, departmentId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-colors duration-500 cursor-pointer shadow-sm">
              <option value="">-- Không phân bổ (Nhân viên tự do) --</option>
              {departmentsList.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name} (Chi nhánh: {dep.branchName})</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500"><Phone className="w-3.5 h-3.5"/> Số điện thoại</label>
            <input type="tel" value={userForm.phone} onChange={(e) => setUserForm({...userForm, phone: e.target.value})} placeholder="0912..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-colors duration-500 shadow-sm" />
          </div>
          
        </form>

        {/* ========================================== */}
        {/* CỘT PHẢI: BẢO MẬT & PHÂN QUYỀN             */}
        {/* ========================================== */}
        <div className="flex flex-col gap-6">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 transition-colors duration-500">
            <ShieldCheck className="w-4 h-4 text-purple-500" /> Truy cập & Bảo mật
          </h3>
          
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-purple-500 transition-colors duration-500"><KeyRound className="w-3.5 h-3.5"/> Chính sách Vai trò (IAM Role) <span className="text-rose-500">*</span></label>
            <select form="user-form" required value={userForm.roleId} onChange={(e) => setUserForm({...userForm, roleId: e.target.value})} className="w-full px-4 py-3.5 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/30 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none text-purple-800 dark:text-purple-300 transition-colors duration-500 cursor-pointer shadow-inner">
              <option value="" className="text-slate-500" disabled>-- Cấp phát Vai trò cho Nhân viên --</option>
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
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors duration-500"><Activity className="w-3.5 h-3.5"/> Trạng thái Hoạt động</label>
              <select form="user-form" value={userForm.status} onChange={(e) => setUserForm({...userForm, status: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-colors duration-500 cursor-pointer shadow-sm">
                <option value="ACTIVE" className="font-bold text-emerald-600">🟢 Hoạt động bình thường</option>
                <option value="SUSPENDED" className="font-bold text-amber-600">🟠 Đình chỉ tạm thời</option>
                <option value="LOCKED" className="font-bold text-slate-600 dark:text-slate-400">🔒 Khóa Bảo mật (Locked)</option>
                <option value="INACTIVE" className="font-bold text-rose-600">🔴 Vô hiệu hóa (Nghỉ việc)</option>
              </select>
            </div>
          )}
          
          <div className="mt-2 p-5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl transition-colors duration-500">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-slate-500" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 transition-colors duration-500">Mật khẩu Hệ thống</h4>
            </div>
            
            {!editingUser ? (
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors duration-500">Hệ thống sẽ cấp tự động: <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-indigo-600 dark:text-indigo-400 font-black tracking-wider shadow-sm ml-1 transition-colors duration-500">Password@123</code></p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {revealedPassword ? (
                  <div className="flex flex-col gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl relative overflow-hidden transition-colors duration-500">
                    <div className="absolute -right-2 -top-2 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase relative z-10 transition-colors duration-500">Mật khẩu mới (Copy gửi User):</span>
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-xl font-mono font-black text-emerald-800 dark:text-emerald-300 tracking-widest transition-colors duration-500">{revealedPassword}</span>
                      <button type="button" onClick={() => setRevealedPassword(null)} className="text-emerald-600 hover:text-rose-500 transition-colors"><EyeOff className="w-5 h-5"/></button>
                    </div>
                  </div>
                ) : showPasswordAuth ? (
                  <div 
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleExecutePasswordReset(); } }} 
                    className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-500/50 rounded-xl shadow-inner transition-colors duration-500"
                  >
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-5 h-5 text-rose-500 ml-2 animate-pulse shrink-0" />
                      <input 
                        type="password" 
                        placeholder="Nhập mã PIN Quản trị viên..." 
                        value={adminPin} 
                        onChange={e => setAdminPin(e.target.value)} 
                        className="flex-1 bg-transparent text-sm outline-none px-2 font-bold tracking-widest text-slate-900 dark:text-white transition-colors duration-500" 
                        autoFocus 
                      />
                      <button 
                        type="button" 
                        onClick={handleExecutePasswordReset} 
                        disabled={isResettingPassword} 
                        className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors duration-500"
                      >
                        {isResettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận"}
                      </button>
                    </div>
                    <div className="px-2 mt-1">
                      <p className="text-[10px] text-slate-500 font-medium leading-tight transition-colors duration-500">Mã PIN Quản trị cao cấp được thiết lập riêng tại phân hệ <strong className="text-slate-700 dark:text-slate-300">Cài đặt chung</strong>.</p>
                      <p className="text-[10px] text-rose-500 font-bold mt-1 transition-colors duration-500">⚠️ Cảnh báo: Nhập sai nhiều lần sẽ kích hoạt giao thức khóa bảo mật.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-colors duration-500">
                    <span className="text-sm font-mono font-bold text-slate-400 tracking-widest">••••••••••••</span>
                    <button type="button" onClick={() => setShowPasswordAuth(true)} className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline transition-colors duration-500"><Key className="w-3.5 h-3.5"/> Yêu cầu cấp lại mật khẩu</button>
                  </div>
                )}
                <p className="text-[10px] text-slate-500 leading-tight transition-colors duration-500">Chỉ Admin hệ thống mới có quyền thao tác thông qua xác thực bảo mật PIN.</p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </Modal>
  );
}