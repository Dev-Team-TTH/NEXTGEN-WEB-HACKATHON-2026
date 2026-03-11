"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Network, Users, Building2, AlertOctagon, Loader2 } from "lucide-react";

// --- REDUX & API ---
import { useGetDepartmentsQuery, useGetUsersQuery } from "@/state/api";

// --- UTILS (SIÊU VŨ KHÍ) ---
import { cn, generateAvatarColor } from "@/utils/helpers";
import { getInitials } from "@/utils/formatters";

// ==========================================
// COMPONENT CON: NODE CÂY (TREE NODE)
// ==========================================
const TreeNode = ({ node, isRoot = false }: { node: any, isRoot?: boolean }) => {
  return (
    <div className="flex flex-col items-center">
      {/* Node Content */}
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cn(
          "relative flex flex-col items-center p-4 rounded-2xl border shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md z-10 w-48 text-center",
          isRoot 
            ? "bg-gradient-to-br from-indigo-600 to-blue-700 border-indigo-400 text-white" 
            : node.type === "DEPARTMENT" 
              ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/5"
        )}
      >
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-black text-lg mb-2 shadow-inner border-2",
          isRoot ? "bg-white/20 border-white/40" : node.type === "DEPARTMENT" ? "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30" : generateAvatarColor(node.name)
        )}>
          {node.type === "DEPARTMENT" || isRoot ? <Building2 className="w-6 h-6" /> : getInitials(node.name)}
        </div>
        
        <h4 className={cn("font-bold text-sm truncate w-full px-2", isRoot ? "text-white" : "text-slate-900 dark:text-white")}>
          {node.name}
        </h4>
        <p className={cn("text-[10px] font-medium uppercase tracking-wider mt-1", isRoot ? "text-indigo-200" : "text-slate-500")}>
          {node.subtitle}
        </p>
      </motion.div>

      {/* Children Branches */}
      {node.children && node.children.length > 0 && (
        <div className="relative flex flex-col items-center pt-6">
          {/* Trục dọc nối từ Node cha xuống */}
          <div className="absolute top-0 w-px h-6 bg-slate-300 dark:bg-slate-700" />
          
          {/* Thanh ngang nối các Node con */}
          {node.children.length > 1 && (
            <div className="absolute top-6 h-px bg-slate-300 dark:bg-slate-700" 
                 style={{ width: `calc(100% - ${100 / node.children.length}%)` }} 
            />
          )}
          
          {/* Render các Node con */}
          <div className="flex gap-4 sm:gap-8 justify-center relative pt-6">
            {node.children.map((child: any) => (
              <div key={child.id} className="relative flex flex-col items-center">
                {/* Trục dọc nối từ thanh ngang xuống Node con */}
                <div className="absolute -top-6 w-px h-6 bg-slate-300 dark:bg-slate-700" />
                <TreeNode node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
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

  // --- THUẬT TOÁN XÂY DỰNG CÂY (DATA VIZ) ---
  const orgTree = useMemo(() => {
    if (!departments.length) return null;

    const rootNode = {
      id: "root",
      name: "TTH ENTERPRISE",
      subtitle: "Headquarters",
      type: "ROOT",
      children: [] as any[]
    };

    // Gắn nhân viên vào từng phòng ban
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

    // Gom các nhân viên chưa có phòng ban vào 1 cục "Khác"
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

      <div className="absolute top-6 left-6 flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
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