"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  X, ShieldCheck, KeyRound, Loader2, CheckCircle2, 
  Layers, Info, CheckSquare, Square
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation
} from "@/state/api";

// ==========================================
// COMPONENT: MODAL TẠO/SỬA VAI TRÒ & PHÂN QUYỀN
// ==========================================
interface RolePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Truyền role vào nếu là chế độ Edit, null nếu là Create
  existingRole?: any | null; 
}

export default function RolePermissionModal({ isOpen, onClose, existingRole }: RolePermissionModalProps) {
  // --- API HOOKS ---
  const { data: rawPermissionsData, isLoading: isLoadingPerms } = useGetPermissionsQuery(undefined, { skip: !isOpen });
  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();

  const isSubmitting = isCreating || isUpdating;
  const isEditMode = !!existingRole;

  // --- LOCAL STATE ---
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  // Đổ dữ liệu khi mở Modal (Edit Mode vs Create Mode)
  useEffect(() => {
    if (isOpen) {
      if (existingRole) {
        setRoleName(existingRole.name || existingRole.roleName || "");
        setDescription(existingRole.description || "");
        
        // Trích xuất mã quyền (permissions) từ cấu trúc dữ liệu lồng nhau của Prisma
        let initialPerms: string[] = [];
        if (Array.isArray(existingRole.permissions)) {
          initialPerms = existingRole.permissions.map((p: any) => 
            typeof p === 'string' ? p : (p.permission?.code || p.code || p.id)
          ).filter(Boolean);
        }
        setSelectedPerms(initialPerms);

      } else {
        setRoleName("");
        setDescription("");
        setSelectedPerms([]);
      }
    }
  }, [isOpen, existingRole]);

  // --- THUẬT TOÁN DATA VIZ & NHÓM QUYỀN (GROUPING) THÔNG MINH ---
  // Chống lỗi "forEach is not a function" bằng Pipeline chuẩn hóa dữ liệu
  const { groupedPermissions, totalPermsCount } = useMemo(() => {
    const groups: Record<string, any[]> = {};
    let safeArray: any[] = [];

    // 1. Chuẩn hóa dữ liệu đầu vào (Defensive Parsing)
    if (Array.isArray(rawPermissionsData)) {
      safeArray = rawPermissionsData;
    } else if (rawPermissionsData && typeof rawPermissionsData === 'object') {
      // Nếu API cũ vẫn trả về { flat: [...], grouped: {...} }
      safeArray = rawPermissionsData.flat || Object.values(rawPermissionsData).find(Array.isArray) || [];
    }

    // 2. Nhóm quyền
    safeArray.forEach((p: any) => {
      const code = typeof p === 'string' ? p : (p.code || p.id || "");
      if (!code) return; // Bỏ qua dữ liệu rỗng

      const desc = typeof p === 'string' ? code : (p.description || p.name || code);
      const forcedModule = p.module || null; // Lấy module chuẩn từ database nếu có
      
      // Nội suy Tên Module nếu CSDL không cung cấp
      const parts = code.split(/[:_]/);
      const moduleName = forcedModule || (parts.length > 1 ? parts[0].toUpperCase() : "GENERAL");

      if (!groups[moduleName]) groups[moduleName] = [];
      groups[moduleName].push({ code, desc });
    });

    return { 
      groupedPermissions: groups, 
      totalPermsCount: safeArray.length || 1 
    };
  }, [rawPermissionsData]);

  // Tính toán % quyền lực
  const selectedCount = selectedPerms.length;
  const powerPercentage = Math.round((selectedCount / totalPermsCount) * 100);

  // --- HANDLERS ---
  const togglePermission = (code: string) => {
    setSelectedPerms(prev => 
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    );
  };

  const toggleModuleGroup = (moduleName: string, codes: string[]) => {
    const isAllSelected = codes.every(code => selectedPerms.includes(code));
    if (isAllSelected) {
      // Bỏ chọn tất cả trong nhóm
      setSelectedPerms(prev => prev.filter(p => !codes.includes(p)));
    } else {
      // Chọn tất cả trong nhóm (Tránh trùng lặp)
      setSelectedPerms(prev => Array.from(new Set([...prev, ...codes])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error("Vui lòng nhập Tên Vai trò (Role Name)!");
      return;
    }
    if (selectedPerms.length === 0) {
      toast.error("Vai trò phải được cấp ít nhất 1 quyền!");
      return;
    }

    // MAP PAYLOAD LÊN SCHEMA CHUẨN CỦA BACKEND
    // Do cấu trúc Schema, ta có bảng trung gian RolePermission, API update cần mảng permissionIds
    // Nhưng vì Frontend đang quản lý theo `code`, ta có thể tìm ID thực tương ứng, 
    // hoặc cấu trúc lại payload để backend tự nhận diện. Trong TH này ta giả định Backend API tạo/sửa đã hỗ trợ danh sách `code` hoặc `ID`.
    // Nếu API backend mong muốn permissionIds, ta cần map ngược từ `code` ra `id`.
    
    // Thuật toán: Tìm kiếm ngược `permissionId` dựa trên `code` đã chọn
    let actualPermissionIds: string[] = [];
    if (Array.isArray(rawPermissionsData)) {
       actualPermissionIds = selectedPerms.map(code => {
           const match = rawPermissionsData.find((p: any) => p.code === code);
           return match ? match.permissionId || match.id : code;
       });
    }

    const payload = {
      roleName: roleName, // Map với roleName trong schema.prisma
      description,
      permissionIds: actualPermissionIds.length > 0 ? actualPermissionIds : selectedPerms
    };

    try {
      if (isEditMode) {
        await updateRole({ id: existingRole.id || existingRole.roleId, data: payload }).unwrap();
        toast.success("Đã cập nhật Vai trò và Quyền hạn!");
      } else {
        await createRole(payload).unwrap();
        toast.success("Đã tạo mới Vai trò (Role) thành công!");
      }
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Lỗi hệ thống khi lưu Vai trò!");
    }
  };

  // --- ANIMATION CONFIG ---
  const backdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
        >
          {/* Khóa click ra ngoài khi đang Submit */}
          <div className="absolute inset-0" onClick={!isSubmitting ? onClose : undefined} />

          <motion.div
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-4xl glass-panel rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-10 flex flex-col max-h-[95vh]"
          >
            {/* 1. HEADER */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEditMode ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                    {isEditMode ? "Chỉnh sửa Vai trò" : "Thiết lập Vai trò Mới (Role)"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Nhào nặn DNA quyền lực của hệ thống</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. BODY SCROLLABLE */}
            <div className="p-6 overflow-y-auto scrollbar-thin bg-white/30 dark:bg-black/10 flex flex-col gap-6">
              
              {/* Form Thông tin Role */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Tên Vai trò (Role Name) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={roleName} onChange={(e) => setRoleName(e.target.value)}
                      placeholder="VD: Kế toán trưởng, Thủ kho, Quản lý Bán hàng..." 
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-white font-bold" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Mô tả / Diễn giải
                    </label>
                    <input 
                      type="text" 
                      value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Quyền hạn dành cho nhân sự quản lý tài chính..." 
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-white" 
                    />
                  </div>
                </div>

                {/* Data Viz: Thanh Tiến trình Quyền Lực */}
                <div className="flex flex-col justify-center p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mức độ Quyền lực</span>
                    <ShieldCheck className={`w-4 h-4 ${powerPercentage > 80 ? 'text-rose-500' : powerPercentage > 40 ? 'text-amber-500' : 'text-emerald-500'}`} />
                  </div>
                  <div className="text-3xl font-black text-slate-800 dark:text-white mb-2">
                    {selectedCount} <span className="text-base text-slate-400 font-medium">/ {totalPermsCount}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${powerPercentage}%` }} transition={{ duration: 0.5 }}
                      className={`h-full rounded-full ${powerPercentage > 80 ? 'bg-rose-500' : powerPercentage > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    />
                  </div>
                  <p className="text-[10px] mt-2 text-slate-500 text-center">
                    {powerPercentage > 80 ? "Cảnh báo: Vai trò có quyền truy cập gần như tối đa (Admin)." : "Mức độ an toàn."}
                  </p>
                </div>
              </div>

              {/* Ma trận Phân quyền (Permission Matrix) */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-blue-500" /> Ma trận Cấp quyền (Permission Matrix)
                </h3>
                
                {isLoadingPerms ? (
                  <div className="flex items-center justify-center py-10 opacity-50">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500 mr-2" /> Tải danh sách quyền...
                  </div>
                ) : Object.keys(groupedPermissions).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <Info className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm font-bold">Chưa có dữ liệu Quyền (Permissions).</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                      const moduleCodes = perms.map(p => p.code);
                      const isAllSelected = moduleCodes.every(code => selectedPerms.includes(code));
                      const isSomeSelected = moduleCodes.some(code => selectedPerms.includes(code)) && !isAllSelected;

                      return (
                        <div key={moduleName} className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                          {/* Module Header (Cho phép chọn tắt/mở cả cục) */}
                          <div 
                            className={`px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-white/5 cursor-pointer transition-colors ${isAllSelected ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            onClick={() => toggleModuleGroup(moduleName, moduleCodes)}
                          >
                            <span className="font-bold text-sm text-slate-800 dark:text-white">{moduleName}</span>
                            <div className={`text-xl ${isAllSelected ? 'text-purple-500' : isSomeSelected ? 'text-purple-300' : 'text-slate-300'}`}>
                              {isAllSelected ? <CheckSquare className="w-5 h-5" /> : isSomeSelected ? <CheckSquare className="w-5 h-5 opacity-50" /> : <Square className="w-5 h-5" />}
                            </div>
                          </div>
                          
                          {/* Danh sách quyền bên trong */}
                          <div className="p-2 flex flex-col gap-1 max-h-[200px] overflow-y-auto scrollbar-thin">
                            {perms.map(p => {
                              const isChecked = selectedPerms.includes(p.code);
                              return (
                                <label 
                                  key={p.code} 
                                  className={`flex items-start gap-3 p-2 rounded-xl cursor-pointer transition-all ${isChecked ? 'bg-purple-50/50 dark:bg-purple-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                >
                                  {/* Fake Checkbox logic click - Tích hợp với thẻ Label */}
                                  <div className="relative flex items-center pt-0.5">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={() => togglePermission(p.code)}
                                      className="sr-only" // Ẩn checkbox thật
                                    />
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-transparent'}`}>
                                      {isChecked && <CheckCircle2 className="w-3 h-3" />}
                                    </div>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={`text-xs font-bold font-mono ${isChecked ? 'text-purple-700 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                      {p.code}
                                    </span>
                                    {p.desc !== p.code && (
                                      <span className="text-[10px] text-slate-500 mt-0.5">{p.desc}</span>
                                    )}
                                  </div>
                                </label>
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

            {/* 3. FOOTER */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex justify-end gap-3 shrink-0">
              <button 
                type="button" onClick={onClose} disabled={isSubmitting} 
                className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting || selectedPerms.length === 0} 
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} 
                {isEditMode ? "Lưu Cập nhật" : "Tạo Vai trò Mới"}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}