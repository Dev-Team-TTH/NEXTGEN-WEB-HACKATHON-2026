"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Network, Users, Building2, AlertOctagon, Loader2, ChevronDown, ChevronUp } from "lucide-react";

// --- REDUX & API ---
import { useGetDepartmentsQuery, useGetUsersQuery } from "@/state/api";

// --- UTILS ---
import { cn, generateAvatarColor } from "@/utils/helpers";
import { getInitials } from "@/utils/formatters";

// ==========================================
// COMPONENT CON: NODE CÂY (TREE NODE) VỚI TÍNH NĂNG COLLAPSE
// ==========================================
const TreeNode = ({ node, isRoot = false }: { node: any, isRoot?: boolean }) => {
  // Mặc định: Root và Department được mở, nhưng nếu Department có User thì TỰ ĐỘNG ĐÓNG để chống lag DOM
  const [isExpanded, setIsExpanded] = useState(isRoot || node.type === "ROOT");
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* KHỐI HIỂN THỊ NODE */}
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cn(
          "relative flex flex-col items-center p-4 rounded-2xl border shadow-sm transition-all z-10 w-48 text-center group",
          isRoot 
            ? "bg-gradient-to-br from-indigo-600 to-blue-700 border-indigo-400 text-white hover:shadow-indigo-500/30" 
            : node.type === "DEPARTMENT" 
              ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 cursor-pointer" 
              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800/80"
        )}
        // Nếu là phòng ban và có nhân viên, cho phép click vào cả thẻ để Mở/Đóng
        onClick={() => {
          if (node.type === "DEPARTMENT" && hasChildren) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-black text-lg mb-2 shadow-inner border-2 transition-transform group-hover:scale-110",
          isRoot ? "bg-white/20 border-white/40" 
          : node.type === "DEPARTMENT" ? "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30" 
          : generateAvatarColor(node.name)
        )}>
          {node.type === "DEPARTMENT" || isRoot ? <Building2 className="w-6 h-6" /> : getInitials(node.name)}
        </div>
        
        <h4 className={cn("font-bold text-sm w-full px-2 line-clamp-2 leading-tight", isRoot ? "text-white" : "text-slate-900 dark:text-white")}>
          {node.name}
        </h4>
        <p className={cn("text-[10px] font-medium uppercase tracking-wider mt-1 line-clamp-1", isRoot ? "text-indigo-200" : "text-slate-500")}>
          {node.subtitle}
        </p>

        {/* NÚT MỞ/ĐÓNG NODE CON */}
        {hasChildren && !isRoot && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors z-20"
            title={isExpanded ? "Thu gọn" : `Mở rộng (${node.children.length} nhân sự)`}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
        
        {/* HIỂN THỊ SỐ LƯỢNG KHI BỊ ĐÓNG */}
        {hasChildren && !isExpanded && !isRoot && (
          <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm border border-white dark:border-slate-800">
            {node.children.length}
          </div>
        )}
      </motion.div>

      {/* RENDER CÁC NHÁNH CON VỚI ANIMATE PRESENCE (HIỆU ỨNG MƯỢT & CHỐNG LAG DOM) */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0, scaleY: 0.8 }}
            animate={{ opacity: 1, height: "auto", scaleY: 1 }}
            exit={{ opacity: 0, height: 0, scaleY: 0.8 }}
            style={{ transformOrigin: "top" }}
            className="relative flex flex-col items-center pt-6"
          >
            {/* Trục dọc nối từ Node cha xuống */}
            <div className="absolute top-0 w-px h-6 bg-slate-300 dark:bg-slate-700" />
            
            {/* Thanh ngang nối các Node con */}
            {node.children.length > 1 && (
              <div className="absolute top-6 h-px bg-slate-300 dark:bg-slate-700" 
                   style={{ width: `calc(100% - ${100 / node.children.length}%)` }} 
              />
            )}
            
            {/* Render các Node con */}
            <div className="flex gap-4 sm:gap-8 justify-center relative pt-6 pb-2">
              {node.children.map((child: any) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Trục dọc nối từ thanh ngang xuống Node con */}
                  <div className="absolute -top-6 w-px h-6 bg-slate-300 dark:bg-slate-700" />
                  <TreeNode node={child} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// COMPONENT CHÍNH: SƠ ĐỒ TỔ CHỨC
// ==========================================
export default function OrganizationChart() {
  const { data: departments = [], isLoading: loadDepts, isError: errDepts } = useGetDepartmentsQuery({});
  const { data: usersResponse, isLoading: loadUsers, isError: errUsers } = useGetUsersQuery({});
  
  const users = Array.isArray(usersResponse) ? usersResponse : (usersResponse as any)?.data || [];

  const isLoading = loadDepts || loadUsers;
  const isError = errDepts || errUsers;

  // --- THUẬT TOÁN XÂY DỰNG CÂY TỐI ƯU ---
  const orgTree = useMemo(() => {
    if (!departments.length) return null;

    const rootNode = {
      id: "root",
      name: "TTH ENTERPRISE",
      subtitle: "Headquarters",
      type: "ROOT",
      children: [] as any[]
    };

    departments.forEach((dept: any) => {
      const deptNode = {
        id: dept.departmentId,
        name: dept.name,
        subtitle: dept.code,
        type: "DEPARTMENT",
        children: [] as any[]
      };

      const deptUsers = users.filter((u: any) => u.departmentId === dept.departmentId);
      deptUsers.forEach((u: any) => {
        deptNode.children.push({
          id: u.userId,
          name: u.fullName,
          subtitle: u.role || "Nhân viên",
          type: "USER"
        });
      });

      rootNode.children.push(deptNode);
    });

    const unassignedUsers = users.filter((u: any) => !u.departmentId);
    if (unassignedUsers.length > 0) {
      const unassignedNode = {
        id: "unassigned",
        name: "Chưa phân bổ",
        subtitle: "Nhân sự tự do",
        type: "DEPARTMENT",
        children: unassignedUsers.map((u: any) => ({
          id: u.userId,
          name: u.fullName,
          subtitle: u.role || "Nhân viên",
          type: "USER"
        }))
      };
      rootNode.children.push(unassignedNode);
    }

    return rootNode;
  }, [departments, users]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl mt-4 border border-rose-200">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Lỗi truy xuất dữ liệu Nhân sự</h3>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 glass-panel rounded-3xl mt-4 opacity-50">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
        <p className="font-bold text-slate-500">Đang phác thảo sơ đồ tổ chức...</p>
      </div>
    );
  }

  return (
    <div className="w-full glass-panel rounded-3xl p-6 sm:p-10 overflow-auto border border-slate-200 dark:border-white/10 shadow-sm relative min-h-[600px] flex items-start justify-center custom-scrollbar">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] dark:opacity-5 pointer-events-none" />

      <div className="absolute top-6 left-6 flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm z-20">
        <Network className="w-6 h-6 text-indigo-500" />
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">Sơ đồ Tổ chức</h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{users.length} Nhân sự</p>
        </div>
      </div>

      <div className="relative pt-16 pb-20 min-w-max">
        {orgTree ? (
          <TreeNode node={orgTree} isRoot={true} />
        ) : (
          <div className="text-slate-500 flex flex-col items-center pt-20">
            <Users className="w-12 h-12 mb-2 opacity-30" />
            <p>Chưa có dữ liệu phòng ban</p>
          </div>
        )}
      </div>

    </div>
  );
}