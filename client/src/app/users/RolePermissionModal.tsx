"use client";

import React, { useState, useEffect } from "react";
// FIX LỖI TS2304: Đã import AnimatePresence
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check, X, Loader2, Info, KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useCreateRoleMutation, 
  useUpdateRoleMutation 
} from "@/state/api";

// --- COMPONENTS & UTILS ---
import Modal from "@/app/(components)/Modal";
import { cn } from "@/utils/helpers";

// ==========================================
// 1. CẤU HÌNH DANH SÁCH QUYỀN (RBAC DICTIONARY)
// ==========================================
const PERMISSION_MODULES = [
  {
    module: "Hệ thống (System)",
    permissions: [
      { id: "SYSTEM_ADMIN", label: "Quản trị Tối cao (Super Admin)", desc: "Quyền năng vô hạn, can thiệp mọi cấu hình" },
      { id: "MANAGE_USERS", label: "Quản lý Nhân sự", desc: "Thêm, xóa, khóa và reset mật khẩu nhân viên" },
      { id: "MANAGE_SETTINGS", label: "Cài đặt Chung", desc: "Đổi logo, cấu hình máy chủ" },
      { id: "MANAGE_MASTER_DATA", label: "Dữ liệu Nền tảng", desc: "Quản lý danh mục hàng, đối tác, tiền tệ" }
    ]
  },
  {
    module: "Giao dịch & Kho (Operations)",
    permissions: [
      { id: "VIEW_INVENTORY", label: "Xem Tồn kho", desc: "Xem số lượng và thẻ kho" },
      { id: "MANAGE_INVENTORY", label: "Điều chỉnh Kho", desc: "Chuyển kho, kiểm kê, cấu hình lô" },
      { id: "VIEW_TRANSACTION", label: "Xem Giao dịch", desc: "Xem chứng từ mua/bán" },
      { id: "MANAGE_TRANSACTION", label: "Tạo Chứng từ", desc: "Lập PO, SO, GRPO" },
      { id: "APPROVE_DOCUMENTS", label: "Phê duyệt", desc: "Duyệt hoặc từ chối tờ trình" }
    ]
  },
  {
    module: "Kế toán & Tài sản (Finance)",
    permissions: [
      { id: "VIEW_ACCOUNTING", label: "Xem Kế toán", desc: "Xem sổ cái, báo cáo TC" },
      { id: "MANAGE_ACCOUNTING", label: "Ghi sổ Kế toán", desc: "Tạo bút toán, đảo sổ, khóa kỳ" },
      { id: "VIEW_EXPENSES", label: "Xem Chi phí", desc: "Xem phiếu chi" },
      { id: "MANAGE_EXPENSES", label: "Lập Phiếu chi", desc: "Tạo chứng từ chi phí" },
      { id: "VIEW_ASSET", label: "Xem Tài sản", desc: "Xem danh sách TSCĐ" },
      { id: "MANAGE_ASSET", label: "Quản lý Tài sản", desc: "Cấp phát, thanh lý, chạy khấu hao" }
    ]
  }
];

// ==========================================
// COMPONENT: MODAL PHÂN QUYỀN (RBAC)
// ==========================================
interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRole?: any | null;
}

export default function RolePermissionModal({ isOpen, onClose, existingRole }: RoleModalProps) {
  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();

  const isSubmitting = isCreating || isUpdating;

  // --- STATE FORMS ---
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (existingRole) {
        setRoleName(existingRole.roleName || existingRole.name || existingRole.title || "");
        setDescription(existingRole.description || "");
        setSelectedPerms(existingRole.permissions || []);
      } else {
        setRoleName("");
        setDescription("");
        setSelectedPerms([]);
      }
    }
  }, [isOpen, existingRole]);

  // --- HANDLERS ---
  const togglePermission = (permId: string) => {
    setSelectedPerms(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const handleSelectAllInModule = (modulePerms: string[]) => {
    const allSelected = modulePerms.every(p => selectedPerms.includes(p));
    if (allSelected) {
      setSelectedPerms(prev => prev.filter(p => !modulePerms.includes(p)));
    } else {
      const newPerms = new Set([...selectedPerms, ...modulePerms]);
      setSelectedPerms(Array.from(newPerms));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error("Tên Vai trò không được để trống!"); return;
    }
    if (selectedPerms.length === 0) {
      toast.error("Vui lòng gán ít nhất 1 quyền hạn!"); return;
    }

    try {
      const payload = { roleName, description, permissions: selectedPerms };

      if (existingRole) {
        await updateRole({ id: existingRole.roleId || existingRole.id, data: payload }).unwrap();
        toast.success("Cập nhật Chính sách thành công!");
      } else {
        await createRole(payload).unwrap();
        toast.success("Khởi tạo Vai trò mới thành công!");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi lưu cấu hình phân quyền!");
    }
  };

  // Cảnh báo nếu cấp quyền ADMIN
  const hasAdminPerm = selectedPerms.includes("SYSTEM_ADMIN");

  // --- FOOTER ---
  const modalFooter = (
    <div className="w-full flex items-center justify-between">
      <div className="hidden sm:block">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Đã chọn</p>
        <p className="text-lg font-black text-purple-600 dark:text-purple-400">{selectedPerms.length} Quyền</p>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
          Hủy bỏ
        </button>
        <button type="submit" form="role-form" disabled={isSubmitting || selectedPerms.length === 0} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          Lưu Cấu hình
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingRole ? "Chỉnh sửa Vai trò (Role)" : "Tạo Vai trò Mới"}
      subtitle="Thiết lập chính sách phân quyền chi tiết (RBAC)"
      icon={<KeyRound className="w-6 h-6 text-purple-500" />}
      maxWidth="max-w-5xl"
      disableOutsideClick={isSubmitting}
      footer={modalFooter}
    >
      <form id="role-form" onSubmit={handleSubmit} className="flex flex-col md:flex-row h-full md:h-[65vh] bg-slate-50/50 dark:bg-transparent">
        
        {/* CỘT TRÁI: THÔNG TIN CƠ BẢN */}
        <div className="w-full md:w-1/3 p-6 border-r border-slate-200 dark:border-white/5 flex flex-col gap-5 shrink-0 bg-white/50 dark:bg-black/20">
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5 group-focus-within:text-purple-500 transition-colors">Tên Vai Trò (Role Name) <span className="text-rose-500">*</span></label>
            <input 
              type="text" required value={roleName} onChange={(e) => setRoleName(e.target.value)}
              placeholder="VD: Kế Toán Trưởng..."
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm"
            />
          </div>
          
          <div className="space-y-1.5 group flex-1 flex flex-col">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5 group-focus-within:text-purple-500 transition-colors">Mô tả chi tiết</label>
            <textarea 
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Phạm vi công việc của role này..."
              className="w-full flex-1 min-h-[100px] px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-shadow shadow-sm"
            />
          </div>

          <AnimatePresence>
            {hasAdminPerm && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-medium flex items-start gap-2 shadow-inner">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p><strong>CẢNH BÁO NGUY HIỂM:</strong> Bạn đang cấp quyền <b>Super Admin</b>. Tài khoản sở hữu role này có khả năng phá hủy hoặc thay đổi toàn bộ hệ thống!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CỘT PHẢI: BẢNG CHECKBOX QUYỀN (MATRIX) */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Ma trận Phân quyền (Policy Matrix)</h3>
          </div>

          <div className="flex flex-col gap-6">
            {PERMISSION_MODULES.map((module, mIdx) => {
              const modulePermIds = module.permissions.map(p => p.id);
              const isAllSelected = modulePermIds.every(p => selectedPerms.includes(p));
              const isPartiallySelected = modulePermIds.some(p => selectedPerms.includes(p)) && !isAllSelected;

              return (
                <div key={mIdx} className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                  {/* Header Module */}
                  <div className="flex justify-between items-center px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/10">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">{module.module}</h4>
                    <button 
                      type="button" onClick={() => handleSelectAllInModule(modulePermIds)}
                      className={cn(
                        "text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all active:scale-95",
                        isAllSelected 
                          ? "bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-500/50 dark:text-purple-400" 
                          : isPartiallySelected 
                            ? "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-500/50 dark:text-amber-400" 
                            : "bg-white border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      )}
                    >
                      {isAllSelected ? "Bỏ chọn tất cả" : isPartiallySelected ? "Chọn nốt phần còn lại" : "Chọn tất cả"}
                    </button>
                  </div>

                  {/* Lưới Quyền */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-px bg-slate-100 dark:bg-slate-700/50">
                    {module.permissions.map(perm => {
                      const isSelected = selectedPerms.includes(perm.id);
                      const isCritical = perm.id === "SYSTEM_ADMIN";
                      return (
                        <div 
                          key={perm.id} onClick={() => togglePermission(perm.id)}
                          className={cn(
                            "flex items-start gap-3 p-4 cursor-pointer transition-colors bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 group",
                            isSelected && !isCritical && "bg-purple-50/30 dark:bg-purple-900/10",
                            isSelected && isCritical && "bg-rose-50/50 dark:bg-rose-900/20"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded flex items-center justify-center shrink-0 border mt-0.5 transition-all",
                            isSelected 
                              ? isCritical ? "bg-rose-500 border-rose-600" : "bg-purple-500 border-purple-600" 
                              : "bg-slate-100 border-slate-300 dark:bg-slate-900 dark:border-slate-600 group-hover:border-purple-400"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                          </div>
                          <div>
                            <p className={cn("text-sm font-bold transition-colors", isSelected ? (isCritical ? "text-rose-700 dark:text-rose-400" : "text-purple-700 dark:text-purple-400") : "text-slate-700 dark:text-slate-300")}>
                              {perm.label}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{perm.desc}</p>
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