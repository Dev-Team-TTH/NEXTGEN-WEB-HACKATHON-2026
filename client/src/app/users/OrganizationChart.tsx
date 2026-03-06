"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  Building2, Briefcase, Users, ChevronRight, ChevronDown, 
  UserCircle, Network, Loader2, AlertOctagon, RefreshCcw, Star
} from "lucide-react";

// --- REDUX & API ---
import { useGetOrganizationStructureQuery } from "@/state/api";

// ==========================================
// 1. INTERFACES (CẤU TRÚC DỮ LIỆU CÂY)
// ==========================================
interface OrgNode {
  // Bổ sung các ID động từ Prisma Schema để chống lỗi Missing Key
  id?: string;
  companyId?: string;
  branchId?: string;
  departmentId?: string;
  
  name: string;
  type?: "COMPANY" | "BRANCH" | "DEPARTMENT" | "TEAM";
  managerName?: string;
  headcount?: number;
  
  // Các relation lồng nhau từ Backend trả về
  branches?: OrgNode[];
  departments?: OrgNode[];
  warehouses?: OrgNode[];
  children?: OrgNode[];
}

// ==========================================
// 2. COMPONENT CON: NHÁNH CÂY (RECURSIVE NODE)
// ==========================================
const TreeNode = ({ node, level = 0 }: { node: OrgNode; level?: number }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Mặc định mở 2 cấp đầu

  // Tự động nhận diện loại Node dựa vào cấp bậc hoặc ID có sẵn nếu Backend không gửi trường 'type'
  const nodeType = node.type 
    || (node.companyId ? "COMPANY" : "") 
    || (node.branchId ? "BRANCH" : "") 
    || (node.departmentId ? "DEPARTMENT" : "TEAM");

  // Gom các nhánh con thực tế lại (Do Prisma trả về các mảng branches, departments riêng biệt)
  const actualChildren = node.children || node.branches || node.departments || node.warehouses || [];
  const hasChildren = actualChildren.length > 0;

  // Data Viz & Theming dựa trên loại Entity
  const getTheme = (type: string) => {
    switch (type) {
      case "COMPANY": return { icon: Building2, color: "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400", ring: "ring-indigo-500/30" };
      case "BRANCH": return { icon: Network, color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400", ring: "ring-purple-500/30" };
      case "DEPARTMENT": return { icon: Briefcase, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400", ring: "ring-emerald-500/30" };
      case "TEAM": return { icon: Users, color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400", ring: "ring-amber-500/30" };
      default: return { icon: Users, color: "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400", ring: "ring-slate-500/30" };
    }
  };

  const theme = getTheme(nodeType);
  const Icon = theme.icon;

  return (
    <div className="relative flex flex-col items-start w-full">
      {/* KHỐI GIAO DIỆN CỦA NODE */}
      <div className={`relative z-10 flex items-center gap-3 my-2 p-3 pr-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-md ${hasChildren ? 'cursor-pointer' : ''}`}
           onClick={() => hasChildren && setIsExpanded(!isExpanded)}>
        
        {/* Nút Toggle (Chỉ hiện nếu có node con) */}
        {hasChildren ? (
          <button className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${isExpanded ? 'text-indigo-600' : 'text-slate-400'}`}>
            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}><ChevronRight className="w-4 h-4" /></motion.div>
          </button>
        ) : <div className="w-6" />} {/* Placeholder cho node lá */}

        {/* Icon Entity */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${theme.color} ring-4 ${theme.ring}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Thông tin Node */}
        <div className="flex flex-col">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{node.name}</h4>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1"><UserCircle className="w-3.5 h-3.5" /> {node.managerName || "Chưa bổ nhiệm"}</span>
            {node.headcount !== undefined && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="text-blue-600 dark:text-blue-400">{node.headcount} nhân sự</span>
              </>
            )}
          </div>
        </div>
        
        {/* Badge cho Tổng Công ty */}
        {nodeType === "COMPANY" && <div className="absolute -top-2 -right-2 p-1.5 bg-amber-400 text-white rounded-full shadow-lg"><Star className="w-3 h-3 fill-current" /></div>}
      </div>

      {/* RENDER CÁC NHÁNH CON (RECURSIVE) */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div 
            initial={{ opacity: 0, height: 0, scale: 0.95 }} 
            animate={{ opacity: 1, height: "auto", scale: 1 }} 
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full relative"
          >
            {/* Đường dây kết nối dọc (Connection Line) */}
            <div className="absolute top-0 bottom-0 left-[2.3rem] w-px bg-slate-200 dark:bg-slate-700 -z-10" />
            
            <div className="pl-12 flex flex-col gap-1 relative">
              {actualChildren.map((child, index) => {
                // [GIẢI PHÁP SMART FALLBACK KEY]: Quét mọi loại ID có thể tồn tại trong object
                const uniqueKey = child.companyId || child.branchId || child.departmentId || child.id || `node-${level}-${index}`;
                return (
                  <div key={uniqueKey} className="relative">
                    {/* Nhánh rẽ ngang */}
                    <div className="absolute top-8 left-[-1.5rem] w-6 h-px bg-slate-200 dark:bg-slate-700 -z-10" />
                    <TreeNode node={child} level={level + 1} />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 3. COMPONENT CHÍNH: ORG CHART
// ==========================================
export default function OrganizationChart() {
  // 👉 FETCH DATA TỪ API (Lấy cấu trúc dạng cây từ Master Data)
  const { data: orgData, isLoading, isError, refetch } = useGetOrganizationStructureQuery();

  // --- ANIMATION CONFIG ---
  const containerVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center w-full glass-panel rounded-3xl border border-dashed border-rose-200">
        <AlertOctagon className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Lỗi truy xuất Sơ đồ Tổ chức</h2>
        <p className="text-sm text-slate-500 mb-4">Vui lòng kiểm tra lại kết nối mạng hoặc API Backend.</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform">
          <RefreshCcw className="w-4 h-4" /> Tải lại dữ liệu
        </button>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
      
      {/* Header của Tab Org Chart */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-xl flex items-center gap-2">
            <Network className="w-6 h-6 text-indigo-500" /> Sơ đồ Tổ chức Doanh nghiệp
          </h3>
          <p className="text-sm text-slate-500 mt-1">Cấu trúc cây phả hệ, định tuyến luồng duyệt và giới hạn dữ liệu.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-100 dark:border-white/5">
          <span className="flex items-center gap-1"><Building2 className="w-4 h-4 text-indigo-500"/> Công ty</span>
          <span className="flex items-center gap-1"><Network className="w-4 h-4 text-purple-500"/> Chi nhánh</span>
          <span className="flex items-center gap-1"><Briefcase className="w-4 h-4 text-emerald-500"/> Phòng ban</span>
        </div>
      </div>

      {/* Vùng Canvas chứa Biểu đồ cây */}
      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-white/10 overflow-x-auto overflow-y-hidden shadow-inner min-h-[500px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-indigo-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">Đang vẽ sơ đồ phả hệ...</p>
          </div>
        ) : !orgData || (Array.isArray(orgData) && orgData.length === 0) ? (
           <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
             <Network className="w-20 h-20 mb-4" />
             <p className="font-bold">Chưa có dữ liệu Tổ chức.</p>
           </div>
        ) : (
          <div className="min-w-[600px] w-full">
            {Array.isArray(orgData) ? (
              orgData.map((rootNode: OrgNode, index: number) => {
                // [GIẢI PHÁP SMART FALLBACK KEY]: Dành cho node Gốc
                const uniqueKey = rootNode.companyId || rootNode.branchId || rootNode.id || `root-${index}`;
                return <TreeNode key={uniqueKey} node={rootNode} />;
              })
            ) : (
              <TreeNode node={orgData as OrgNode} />
            )}
          </div>
        )}
      </div>

    </motion.div>
  );
}