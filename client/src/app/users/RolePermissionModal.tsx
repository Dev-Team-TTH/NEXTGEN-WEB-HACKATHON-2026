"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, KeyRound, Loader2, CheckCircle2, 
  Layers, Info, Circle, CheckCircle, Database
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

// --- REDUX & API ---
import { 
  useGetPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation
} from "@/state/api";

import Modal from "@/app/(components)/Modal"; // Sử dụng Modal Portal thống nhất

interface RolePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRole?: any | null; 
}

export default function RolePermissionModal({ isOpen, onClose, existingRole }: RolePermissionModalProps) {
  const { data: rawPermissionsData, isLoading: isLoadingPerms } = useGetPermissionsQuery(undefined, { skip: !isOpen });
  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();

  const isSubmitting = isCreating || isUpdating;
  const isEditMode = !!existingRole;

  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (existingRole) {
        setRoleName(existingRole.roleName || existingRole.name || "");
        setDescription(existingRole.description || "");
        let initialPerms: string[] = [];
        if (Array.isArray(existingRole.permissions)) {
          // Trích xuất mã quyền (code) từ dữ liệu role hiện tại
          initialPerms = existingRole.permissions.map((p: any) => typeof p === 'string' ? p : (p.permission?.code || p.code || p.id)).filter(Boolean);
        }
        setSelectedPerms(initialPerms);
      } else {
        setRoleName(""); setDescription(""); setSelectedPerms([]);
      }
    }
  }, [isOpen, existingRole]);

  // Phân nhóm quyền theo module (Dựa vào prefix của mã code, ví dụ: INVENTORY_READ -> INVENTORY)
  const { groupedPermissions, totalPermsCount } = useMemo(() => {
    const groups: Record<string, any[]> = {};
    let safeArray: any[] = [];
    
    // Đảm bảo lấy đúng mảng dữ liệu quyền từ Response
    if (Array.isArray(rawPermissionsData)) safeArray = rawPermissionsData;
    else if (rawPermissionsData && typeof rawPermissionsData === 'object') {
        safeArray = (rawPermissionsData as any).data || (rawPermissionsData as any).flat || Object.values(rawPermissionsData).find(Array.isArray) || [];
    }

    safeArray.forEach((p: any) => {
      const code = typeof p === 'string' ? p : (p.code || p.id || "");
      if (!code) return; 
      const desc = typeof p === 'string' ? code : (p.description || p.name || code);
      const forcedModule = p.module || null; 
      
      // Tự động phân nhóm dựa trên prefix của mã (Ví dụ: USER_CREATE -> USER)
      const parts = code.split(/[:_]/);
      const moduleName = forcedModule || (parts.length > 1 ? parts[0].toUpperCase() : "HỆ THỐNG LÕI");
      
      if (!groups[moduleName]) groups[moduleName] = [];
      groups[moduleName].push({ code, desc });
    });
    return { groupedPermissions: groups, totalPermsCount: safeArray.length || 1 };
  }, [rawPermissionsData]);

  const selectedCount = selectedPerms.length;
  const powerPercentage = Math.round((selectedCount / totalPermsCount) * 100);

  const togglePermission = (code: string) => setSelectedPerms(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]);
  
  const toggleModuleGroup = (moduleCodes: string[]) => {
    const isAllSelected = moduleCodes.every(code => selectedPerms.includes(code));
    if (isAllSelected) setSelectedPerms(prev => prev.filter(p => !moduleCodes.includes(p)));
    else setSelectedPerms(prev => Array.from(new Set([...prev, ...moduleCodes])));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) { toast.error("Vui lòng nhập Tên Vai trò (Role Name)!"); return; }
    if (selectedPerms.length === 0) { toast.error("Vai trò phải được cấp ít nhất 1 quyền!"); return; }

    let actualPermissionIds: string[] = [];
    let safeArray: any[] = [];
    if (Array.isArray(rawPermissionsData)) safeArray = rawPermissionsData;
    else if (rawPermissionsData && typeof rawPermissionsData === 'object') safeArray = (rawPermissionsData as any).data || [];

    // Map mã quyền (code) ngược lại thành ID (UUID) để gửi lên API
    if (safeArray.length > 0) {
       actualPermissionIds = selectedPerms.map(code => {
           const match = safeArray.find((p: any) => p.code === code);
           return match ? (match.permissionId || match.id) : null;
       }).filter(Boolean) as string[];
    }

    if (actualPermissionIds.length === 0) { toast.error("Lỗi đồng bộ: Không tìm thấy UUID của quyền."); return; }

    const payload = { roleName, name: roleName, description, permissionIds: actualPermissionIds };

    try {
      if (isEditMode) {
        await updateRole({ id: existingRole.id || existingRole.roleId, data: payload }).unwrap();
        toast.success("Đã cập nhật Vai trò và Cấu trúc Quyền hạn!");
      } else {
        await createRole(payload).unwrap();
        toast.success("Phát hành Vai trò mới (Role) thành công!");
      }
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi hệ thống khi lưu Vai trò!");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Chỉnh sửa Policy Vai trò" : "Khởi tạo Policy Mới (Role)"}
      subtitle="Thiết lập cấu trúc JSON Quyền hạn (IAM Policies)"
      icon={<KeyRound className="w-6 h-6" />}
      maxWidth="max-w-6xl"
      disableOutsideClick={isSubmitting}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
            Hủy thay đổi
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting || selectedPerms.length === 0} className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-xl shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />} 
            {isEditMode ? "Lưu Cấu hình Policy" : "Phát hành Vai trò mới"}
          </button>
        </>
      }
    >
      <div className="p-8 flex flex-col gap-8">
        {/* Khối Cấu hình Định danh & Thước đo rủi ro */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-5 p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-white/5">
            <div className="space-y-2 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-purple-500 transition-colors"><Database className="w-4 h-4"/> Định danh Vai trò <span className="text-rose-500">*</span></label>
              <input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="VD: Kế toán trưởng, Quản lý Kho..." className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-base focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-slate-900 dark:text-white font-bold transition-all shadow-inner" />
            </div>
            <div className="space-y-2 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-focus-within:text-purple-500 transition-colors"><Info className="w-4 h-4"/> Diễn giải Quy mô truy cập</label>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cho phép toàn quyền truy cập tài chính..." className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-slate-900 dark:text-white transition-all shadow-inner resize-none" />
            </div>
          </div>

          <div className="flex flex-col justify-center p-8 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-[#0B0F19] dark:to-black rounded-3xl shadow-xl relative overflow-hidden text-white">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="text-sm font-black text-slate-300 uppercase tracking-wider">Đánh giá Rủi ro</span>
              <div className={`p-2 rounded-xl bg-white/10 backdrop-blur-sm ${powerPercentage > 80 ? 'text-rose-400' : powerPercentage > 40 ? 'text-amber-400' : 'text-emerald-400'}`}><ShieldCheck className="w-6 h-6" /></div>
            </div>
            <div className="flex items-baseline gap-2 mb-5 relative z-10">
              <span className="text-6xl font-black tracking-tighter">{selectedCount}</span><span className="text-sm font-bold text-slate-400">/ {totalPermsCount} quyền</span>
            </div>
            <div className="w-full h-2.5 bg-slate-700/50 rounded-full overflow-hidden shadow-inner relative z-10 border border-white/5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${powerPercentage}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${powerPercentage > 80 ? 'bg-gradient-to-r from-rose-600 to-rose-400' : powerPercentage > 40 ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`} />
            </div>
            <p className="text-[11px] text-slate-400 mt-4 relative z-10">{powerPercentage > 80 ? "Cảnh báo: Quyền lực tuyệt đối (Admin Level)." : "Mức độ an toàn thông thường."}</p>
          </div>
        </div>

        {/* MA TRẬN PHÂN QUYỀN */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg"><Layers className="w-5 h-5" /></div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">Cấu trúc Policy (JSON)</h3>
              <p className="text-xs font-medium text-slate-500">Phân vùng quyền truy cập theo từng module nghiệp vụ</p>
            </div>
          </div>
          
          {isLoadingPerms ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-white/5"><Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" /><span className="text-slate-500 font-bold">Đang tải cấu trúc quyền...</span></div>
          ) : Object.keys(groupedPermissions).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700"><Info className="w-12 h-12 text-slate-400 mb-3" /><p className="text-lg font-bold text-slate-600 dark:text-slate-400">Database chưa được gieo hạt (Seed) Quyền.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                const moduleCodes = perms.map(p => p.code);
                const selectedInModule = perms.filter(p => selectedPerms.includes(p.code)).length;
                const isAllSelected = selectedInModule === perms.length;

                return (
                  <div key={moduleName} className="flex flex-col bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm hover:border-purple-300 dark:hover:border-purple-500/30 transition-colors">
                    <div className={`px-5 py-4 flex flex-col gap-3 border-b border-slate-200 dark:border-white/5 transition-colors ${isAllSelected ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-white dark:bg-slate-800/50'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[15px] text-slate-800 dark:text-white uppercase tracking-wide">{moduleName}</span>
                        <button onClick={() => toggleModuleGroup(moduleCodes)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${isAllSelected ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                          {isAllSelected ? "Thu hồi All" : "Cấp All"}
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Chính sách (Policies)</span>
                          <span className={isAllSelected ? "text-purple-600 dark:text-purple-400" : ""}>{selectedInModule} / {perms.length}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(selectedInModule / perms.length) * 100}%` }} className={`h-full rounded-full ${isAllSelected ? 'bg-purple-500' : 'bg-slate-400 dark:bg-slate-500'}`} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 flex flex-col gap-1 max-h-[260px] overflow-y-auto custom-scrollbar">
                      {perms.map(p => {
                        const isChecked = selectedPerms.includes(p.code);
                        return (
                          <div key={p.code} onClick={() => togglePermission(p.code)} className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${isChecked ? 'bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-500/50 shadow-sm' : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-slate-800'}`}>
                            <div className="flex flex-col">
                              <span className={`text-[13px] font-bold font-mono tracking-tight ${isChecked ? 'text-purple-700 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'}`}>{p.code}</span>
                              {p.desc !== p.code && <span className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">{p.desc}</span>}
                            </div>
                            <div className="shrink-0 ml-3">
                              {isChecked ? <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" /> : <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}