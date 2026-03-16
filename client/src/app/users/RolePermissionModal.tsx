"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Check, X, Loader2, KeyRound, AlertTriangle, 
  RotateCcw, PlusCircle, MinusCircle, Database 
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppDispatch } from "@/app/redux";
import { 
  api,
  useCreateRoleMutation, 
  useUpdateRoleMutation,
  useGetPermissionsQuery,
  useSeedPermissionsMutation // Hook gọi API Seed
} from "@/state/api";

import Modal from "@/app/(components)/Modal";
import { cn } from "@/utils/helpers";

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRole?: any | null;
}

export default function RolePermissionModal({ isOpen, onClose, existingRole }: RoleModalProps) {
  const dispatch = useAppDispatch();
  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();
  
  // 💡 GỌI API LẤY TOÀN BỘ QUYỀN TỪ DATABASE
  const { data: rawPermissionsList, isLoading: isFetchingPerms } = useGetPermissionsQuery(undefined, { skip: !isOpen });
  
  // 💡 HOOK GỌI API ĐỒNG BỘ QUYỀN (SEED)
  const [seedPermissions, { isLoading: isSeeding }] = useSeedPermissionsMutation();

  const isSubmitting = isCreating || isUpdating || isSeeding;

  // --- STATE ---
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]); // Lưu mảng UUID (permissionId)
  const [initialPerms, setInitialPerms] = useState<string[]>([]);

  // 💡 HÀM GOM NHÓM ĐỘNG: Tự động chia quyền theo Module để vẽ UI
  const dynamicModules = useMemo(() => {
    if (!rawPermissionsList) return [];
    
    // Gom nhóm bằng reduce
    const grouped = rawPermissionsList.reduce((acc: any, perm: any) => {
      // Nếu DB không có module, đưa vào nhóm 'Hệ thống chung'
      const mod = perm.module || "SYSTEM_GENERAL";
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(perm);
      return acc;
    }, {});

    // Chuyển object thành array để render và sắp xếp theo Alphabet
    return Object.keys(grouped).map(key => ({
      moduleName: key,
      permissions: grouped[key]
    })).sort((a, b) => a.moduleName.localeCompare(b.moduleName)); 
  }, [rawPermissionsList]);

  // --- EFFECT: Bơm dữ liệu khi mở Modal (Edit Mode) ---
  useEffect(() => {
    if (isOpen) {
      if (existingRole) {
        setRoleName(existingRole.roleName || existingRole.name || "");
        setDescription(existingRole.description || "");
        
        // Trích xuất mảng UUID (permissionId) từ role cũ
        let uuidList: string[] = [];
        if (Array.isArray(existingRole.permissions)) {
          uuidList = existingRole.permissions.map((p: any) => p.permissionId || p.id).filter(Boolean);
        }

        setSelectedPerms(uuidList);
        setInitialPerms(uuidList);
      } else {
        setRoleName("");
        setDescription("");
        setSelectedPerms([]);
        setInitialPerms([]);
      }
    }
  }, [isOpen, existingRole]);

  // --- HANDLERS TƯƠNG TÁC UI ---
  const togglePermission = useCallback((permissionId: string) => {
    setSelectedPerms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) newSet.delete(permissionId);
      else newSet.add(permissionId);
      return Array.from(newSet);
    });
  }, []);

  const handleSelectAllInModule = useCallback((modulePermIds: string[]) => {
    setSelectedPerms(prev => {
      const currentSet = new Set(prev);
      // Kiểm tra xem tất cả các quyền trong module này đã được chọn chưa
      const allSelected = modulePermIds.every(id => currentSet.has(id));
      
      if (allSelected) {
        // Đã chọn hết -> Bỏ chọn hết
        modulePermIds.forEach(id => currentSet.delete(id));
      } else {
        // Chưa chọn hết -> Chọn tất cả
        modulePermIds.forEach(id => currentSet.add(id));
      }
      return Array.from(currentSet);
    });
  }, []);

  const handleResetToInitial = () => {
    setSelectedPerms([...initialPerms]);
    toast.success("Đã hoàn tác về quyền hạn gốc của Vai trò này.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) { toast.error("Tên Vai trò không được để trống!"); return; }
    if (selectedPerms.length === 0) { toast.error("Vui lòng gán ít nhất 1 quyền hạn!"); return; }

    try {
      const payload = { 
        roleName: roleName,          
        description: description, 
        permissionIds: selectedPerms // Chỉ gửi mảng UUID lên Backend
      };

      if (existingRole) {
        const targetId = existingRole.roleId || existingRole.id;
        await updateRole({ id: targetId, data: payload }).unwrap();
        toast.success("Cập nhật Chính sách Quyền thành công!");
      } else {
        await createRole(payload).unwrap();
        toast.success("Khởi tạo Vai trò mới thành công!");
      }

      // Xóa Cache & Bắt buộc đồng bộ lại User hiện tại để UI/Sidebar mở khóa ngay lập tức
      dispatch(api.util.invalidateTags(["Roles", "Users", "Auth"] as any));
      dispatch(api.endpoints.getMe.initiate(undefined, { forceRefetch: true }));

      onClose();
    } catch (err: any) {
      console.error("Lỗi cập nhật Role API:", err);
      const errorMsg = err?.data?.error || err?.data?.message || err?.error || "Lỗi lưu cấu hình!";
      toast.error(`Lỗi: ${errorMsg}`);
    }
  };

  // --- TÍNH TOÁN UI STATE ---
  const superAdminPermId = rawPermissionsList?.find((p: any) => p.code === "ALL")?.permissionId;
  const hasAdminPerm = superAdminPermId ? selectedPerms.includes(superAdminPermId) : false;

  const addedCount = selectedPerms.filter(p => !initialPerms.includes(p)).length;
  const removedCount = initialPerms.filter(p => !selectedPerms.includes(p)).length;
  const isChanged = addedCount > 0 || removedCount > 0;

  // --- RENDER FOOTER ---
  const modalFooter = (
    <div className="w-full flex items-center justify-between">
      <div className="hidden sm:flex flex-col gap-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tổng đang chọn: <span className="text-purple-600 dark:text-purple-400 text-sm">{selectedPerms.length}</span></p>
        {isChanged && (
          <div className="flex items-center gap-2 text-[10px] font-black">
            {addedCount > 0 && <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded">+{addedCount} MỚI</span>}
            {removedCount > 0 && <span className="text-rose-600 bg-rose-50 dark:bg-rose-500/20 px-1.5 py-0.5 rounded">-{removedCount} GỠ BỎ</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">Hủy bỏ</button>
        <button type="submit" form="role-form" disabled={isSubmitting || selectedPerms.length === 0} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {isChanged ? "Lưu các thay đổi" : "Lưu Cấu hình"}
        </button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingRole ? "Chỉnh sửa Vai trò (Role)" : "Tạo Vai trò Mới"} subtitle="Thiết lập chính sách phân quyền chi tiết (RBAC Tự Động)" icon={<KeyRound className="w-6 h-6 text-purple-500" />} maxWidth="max-w-5xl" disableOutsideClick={isSubmitting} footer={modalFooter}>
      <form id="role-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row h-full md:h-[65vh] bg-slate-50/50 dark:bg-transparent relative">
        
        {/* LỚP PHỦ LOADING API KHI ĐANG FETCH */}
        {isFetchingPerms && (
          <div className="absolute inset-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Đang lấy dữ liệu Quyền hạn từ Database...</p>
          </div>
        )}

        {/* --- CỘT TRÁI: THÔNG TIN ROLE --- */}
        <div className="w-full md:w-1/3 p-6 border-r border-slate-200 dark:border-white/5 flex flex-col gap-5 shrink-0 bg-white/50 dark:bg-black/20">
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5 group-focus-within:text-purple-500 transition-colors">Tên Vai Trò (Role Name) <span className="text-rose-500">*</span></label>
            <input type="text" required value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="VD: Kế Toán Trưởng..." className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm" />
          </div>
          
          <div className="space-y-1.5 group flex-1 flex flex-col">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5 group-focus-within:text-purple-500 transition-colors">Mô tả chi tiết</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Phạm vi công việc của role này..." className="w-full flex-1 min-h-[100px] px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-shadow shadow-sm" />
          </div>

          <AnimatePresence>
            {hasAdminPerm && (
              <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-medium flex items-start gap-2 shadow-inner">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p><strong>CẢNH BÁO NGUY HIỂM:</strong> Bạn đang cấp quyền <b>Super Admin</b>. Tài khoản sở hữu role này có khả năng can thiệp toàn bộ hệ thống!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- CỘT PHẢI: MA TRẬN QUYỀN ĐỘNG --- */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          
          {/* HEADER CỦA CỘT BÊN PHẢI (MA TRẬN QUYỀN VÀ NÚT SEED LUÔN HIỂN THỊ) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Ma trận Phân quyền</h3>
            </div>
            
            <div className="flex items-center gap-2">
              {/* NÚT AUTO-HEALING: LUÔN HIỂN THỊ ĐỂ BƠM DỮ LIỆU */}
              <button 
                type="button" 
                onClick={async () => {
                  try {
                    const res = await seedPermissions().unwrap();
                    toast.success(`🎉 ${res.message} (Mới: ${res.added_new}, Cập nhật: ${res.updated_existing})`);
                  } catch (err: any) {
                    toast.error("Lỗi đồng bộ: " + (err?.data?.message || "Không thể kết nối máy chủ"));
                  }
                }}
                disabled={isSeeding || isFetchingPerms}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-400 text-[11px] font-bold rounded-lg transition-colors shadow-sm"
              >
                {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                Chuẩn hóa & Bơm đủ Quyền
              </button>

              {existingRole && isChanged && (
                <button type="button" onClick={handleResetToInitial} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 border border-amber-200 text-amber-700 dark:text-amber-400 text-[11px] font-bold rounded-lg transition-colors shadow-sm">
                  <RotateCcw className="w-3.5 h-3.5" /> Khôi phục gốc
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* THÔNG BÁO NẾU DATABASE CHƯA CÓ QUYỀN NÀO SAU KHI LOAD XONG */}
            {dynamicModules.length === 0 && !isFetchingPerms && (
               <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                 <p className="text-slate-500 dark:text-slate-400 font-medium">Chưa có Quyền nào được định nghĩa trong Cơ sở dữ liệu.<br/><span className="text-xs">Vui lòng bấm nút "Chuẩn hóa & Bơm đủ Quyền" ở trên.</span></p>
               </div>
            )}

            {/* VÒNG LẶP RENDER MODULES ĐỘNG TỪ DB */}
            {dynamicModules.map((mod, mIdx) => {
              const modulePermIds = mod.permissions.map((p: any) => p.permissionId);
              const isAllSelected = modulePermIds.every((id: string) => selectedPerms.includes(id));
              const isPartiallySelected = modulePermIds.some((id: string) => selectedPerms.includes(id)) && !isAllSelected;

              return (
                <div key={mIdx} className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                  {/* Tiêu đề Module & Nút Chọn tất cả */}
                  <div className="flex justify-between items-center px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/10">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                      Module: <span className="text-purple-600 dark:text-purple-400">{mod.moduleName}</span>
                    </h4>
                    <button 
                      type="button" onClick={() => handleSelectAllInModule(modulePermIds)}
                      className={cn(
                        "text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all active:scale-95",
                        isAllSelected 
                          ? "bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-500/50 dark:text-purple-400" 
                          : isPartiallySelected 
                            ? "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-500/50 dark:text-amber-400" 
                            : "bg-white border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {isAllSelected ? "Bỏ chọn tất cả" : isPartiallySelected ? "Chọn nốt phần còn lại" : "Chọn tất cả"}
                    </button>
                  </div>

                  {/* Lưới các Quyền (Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-px bg-slate-100 dark:bg-slate-700/50">
                    {mod.permissions.map((perm: any) => {
                      const isSelected = selectedPerms.includes(perm.permissionId);
                      const wasSelected = initialPerms.includes(perm.permissionId);
                      const isCritical = perm.code === "ALL" || perm.code.includes("MANAGE_USERS");

                      // Tính toán trạng thái Highlight (dành cho chế độ Edit)
                      const isNewlyAdded = isSelected && !wasSelected && existingRole;
                      const isBeingRemoved = !isSelected && wasSelected && existingRole;

                      return (
                        <div 
                          key={perm.permissionId} onClick={() => togglePermission(perm.permissionId)}
                          className={cn(
                            "flex items-start gap-3 p-4 cursor-pointer transition-all duration-300 relative group overflow-hidden",
                            isNewlyAdded ? "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100" 
                            : isBeingRemoved ? "bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100"
                            : isSelected ? (isCritical ? "bg-rose-50/50 dark:bg-rose-900/20" : "bg-purple-50/30 dark:bg-purple-900/10")
                            : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                          )}
                        >
                          {/* Dải màu đánh dấu (Indicator) */}
                          {isNewlyAdded && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                          {isBeingRemoved && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />}

                          {/* Checkbox vuông UI */}
                          <div className={cn(
                            "w-5 h-5 rounded flex items-center justify-center shrink-0 border mt-0.5 transition-all relative z-10",
                            isNewlyAdded ? "bg-emerald-500 border-emerald-600"
                            : isSelected ? (isCritical ? "bg-rose-500 border-rose-600" : "bg-purple-500 border-purple-600") 
                            : "bg-slate-100 border-slate-300 dark:bg-slate-900 dark:border-slate-600 group-hover:border-purple-400"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                          </div>
                          
                          {/* Nội dung Quyền */}
                          <div className={cn("relative z-10 flex-1", isBeingRemoved && "opacity-60")}>
                            <div className="flex items-center justify-between">
                              <p className={cn(
                                "text-sm font-bold transition-colors line-clamp-1", 
                                isBeingRemoved ? "text-slate-400 line-through"
                                : isNewlyAdded ? "text-emerald-700 dark:text-emerald-400"
                                : isSelected ? (isCritical ? "text-rose-700 dark:text-rose-400" : "text-purple-700 dark:text-purple-400") 
                                : "text-slate-700 dark:text-slate-300"
                              )}>
                                {/* THÔNG MINH HIỂN THỊ: Ưu tiên name, nếu không có lấy code */}
                                {perm.name || perm.code} 
                              </p>

                              {/* Nhãn tag (Badges) cho quyền vừa đổi */}
                              {isNewlyAdded && <span className="flex items-center gap-1 text-[9px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase"><PlusCircle className="w-2.5 h-2.5"/> Mới</span>}
                              {isBeingRemoved && <span className="flex items-center gap-1 text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 px-1.5 py-0.5 rounded uppercase"><MinusCircle className="w-2.5 h-2.5"/> Bỏ</span>}
                            </div>
                            
                            {/* Mô tả nhỏ ở dưới */}
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                              {perm.description || `Mã kỹ thuật: ${perm.code}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}