"use client";

import React, { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  Building2, Briefcase, Users, ChevronDown, ChevronUp, 
  UserCircle, Network, Loader2, AlertOctagon, RefreshCcw, Star,
  ZoomIn, ZoomOut, Maximize, Search, XCircle
} from "lucide-react";

// --- REDUX & UTILS ---
import { useGetOrganizationStructureQuery } from "@/state/api";
import { cn } from "@/utils/helpers";

interface OrgNode {
  id?: string; companyId?: string; branchId?: string; departmentId?: string;
  name: string; type?: "COMPANY" | "BRANCH" | "DEPARTMENT" | "TEAM";
  managerName?: string; headcount?: number;
  branches?: OrgNode[]; departments?: OrgNode[]; warehouses?: OrgNode[]; children?: OrgNode[];
}

// ==========================================
// THUẬT TOÁN CHUẨN HÓA DỮ LIỆU
// Biến đổi cấu trúc Prisma lồng nhau thành cây chuẩn Node
// ==========================================
const normalizeOrgData = (node: any, type: string = "COMPANY"): OrgNode => {
  let children: OrgNode[] = [];
  if (type === "COMPANY" && node.branches) {
      children = node.branches.map((b: any) => normalizeOrgData(b, "BRANCH"));
  } else if (type === "BRANCH" && node.departments) {
      children = node.departments.map((d: any) => normalizeOrgData(d, "DEPARTMENT"));
  }

  return {
      id: node.companyId || node.branchId || node.departmentId || node.id || Math.random().toString(),
      name: node.name || "Unknown",
      type: type as any,
      managerName: node.managerName || node.managerId || "Chưa bổ nhiệm",
      headcount: node.headcount || 0,
      children
  };
}

// ==========================================
// COMPONENT CON: NODE PHẢ HỆ (TOP-DOWN TREE)
// ==========================================
const OrgNodeTree = ({ 
  node, isFirst, isLast, isOnlyItem, level = 0, searchQuery 
}: { 
  node: OrgNode, isFirst: boolean, isLast: boolean, isOnlyItem: boolean, level: number, searchQuery: string 
}) => {
  
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isHighlighted = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase());

  // Auto expand nếu search dính
  React.useEffect(() => {
    if (searchQuery && isHighlighted && level > 0) setIsExpanded(true);
  }, [searchQuery, isHighlighted, level]);

  const getTheme = (type: string) => {
    switch (type) {
      case "COMPANY": return { icon: Building2, bg: "bg-indigo-100 dark:bg-indigo-900/50", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500" };
      case "BRANCH": return { icon: Network, bg: "bg-purple-100 dark:bg-purple-900/50", text: "text-purple-600 dark:text-purple-400", border: "border-purple-400" };
      case "DEPARTMENT": return { icon: Briefcase, bg: "bg-emerald-100 dark:bg-emerald-900/50", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-400" };
      default: return { icon: Users, bg: "bg-amber-100 dark:bg-amber-900/50", text: "text-amber-600 dark:text-amber-400", border: "border-amber-400" };
    }
  };

  const theme = getTheme(node.type || "TEAM");
  const Icon = theme.icon;

  return (
    <div className="flex flex-col items-center relative px-2 sm:px-4">
      
      {/* Đường nối ngang phía trên (Siblings Connector) */}
      {level > 0 && !isOnlyItem && (
        <div className="absolute top-0 w-full h-[2px] flex z-0">
          <div className={cn("h-full w-1/2", isFirst ? "bg-transparent" : "bg-slate-300 dark:bg-slate-600")}></div>
          <div className={cn("h-full w-1/2", isLast ? "bg-transparent" : "bg-slate-300 dark:bg-slate-600")}></div>
        </div>
      )}

      {/* Đường nối dọc cắm xuống Node */}
      {level > 0 && (
        <div className="w-[2px] h-6 bg-slate-300 dark:bg-slate-600 z-0"></div>
      )}

      {/* THẺ NODE CARD */}
      <div 
        className={cn(
          "w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-md border-t-4 p-4 flex flex-col items-center text-center relative z-10 transition-all duration-300",
          theme.border,
          isHighlighted ? "ring-4 ring-rose-300 dark:ring-rose-900 shadow-rose-500/30 scale-105" : "border-x border-b border-x-slate-200 border-b-slate-200 dark:border-x-slate-700 dark:border-b-slate-700"
        )}
      >
        {node.type === "COMPANY" && <div className="absolute -top-3 -right-3 p-1.5 bg-amber-400 text-white rounded-full shadow-md"><Star className="w-3.5 h-3.5 fill-current" /></div>}
        
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-inner", theme.bg, theme.text)}>
          <Icon className="w-6 h-6" />
        </div>
        
        <h3 className="font-black text-[13px] text-slate-900 dark:text-white leading-tight mb-1">{node.name}</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{node.type}</p>

        <div className="w-full h-px bg-slate-100 dark:bg-slate-700 my-3"></div>

        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-md w-full justify-center">
            <UserCircle className="w-3.5 h-3.5 text-slate-400"/> <span className="truncate">{node.managerName}</span>
          </div>
          {node.headcount !== undefined && node.headcount > 0 && (
            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-500/20">
              {node.headcount} Nhân sự
            </div>
          )}
        </div>

        {/* Nút bấm Mở rộng / Thu gọn */}
        {hasChildren && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center shadow-md hover:text-indigo-600 hover:border-indigo-300 transition-all z-20 text-slate-500"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
          </button>
        )}
      </div>

      {/* RENDER CÁC NODE CON */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0, scaleY: 0.8 }} 
            animate={{ opacity: 1, height: "auto", scaleY: 1 }} 
            exit={{ opacity: 0, height: 0, scaleY: 0.8 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center origin-top relative z-0"
          >
            {/* Đường nối dọc đi xuống từ Node Card */}
            <div className="w-[2px] h-6 bg-slate-300 dark:bg-slate-600"></div>
            
            {/* Container chứa các con xếp hàng ngang */}
            <div className="flex justify-center items-start">
              {node.children!.map((child, idx) => (
                <OrgNodeTree 
                  key={child.id} 
                  node={child} 
                  isFirst={idx === 0}
                  isLast={idx === node.children!.length - 1}
                  isOnlyItem={node.children!.length === 1}
                  level={level + 1} 
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ==========================================
// COMPONENT CHÍNH: BẢN ĐỒ TỔ CHỨC
// ==========================================
export default function OrganizationChart() {
  const { data: rawOrgData, isLoading, isError, refetch } = useGetOrganizationStructureQuery();
  
  // Interactive States
  const [scale, setScale] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  // Chuẩn hóa dữ liệu API thành dạng Cây thuần túy
  const normalizedData = useMemo(() => {
    if (!rawOrgData) return null;
    const rawArray = Array.isArray(rawOrgData) ? rawOrgData : [rawOrgData];
    return rawArray.map(company => normalizeOrgData(company, "COMPANY"));
  }, [rawOrgData]);

  const containerVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

  if (isError) return (
    <div className="flex flex-col items-center justify-center py-20 text-center w-full glass-panel rounded-3xl border border-dashed border-rose-200 dark:border-rose-900/50">
      <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Lỗi truy xuất Sơ đồ Phả hệ</h2>
      <p className="text-sm text-slate-500 mb-6">Mất kết nối với Master Data. Vui lòng thử lại.</p>
      <button onClick={() => refetch()} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-indigo-500/30">
        <RefreshCcw className="w-4 h-4" /> Tải lại cấu trúc
      </button>
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
      
      {/* 1. THANH CÔNG CỤ */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-inner border border-indigo-200 dark:border-indigo-500/30">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Bản đồ Doanh nghiệp</h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Kéo thả vùng nền để di chuyển, cuộn chuột để thu phóng.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Thanh tìm kiếm thông minh */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" placeholder="Tìm bộ phận, phòng ban..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner text-slate-900 dark:text-white" 
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Cụm điều khiển Zoom */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-white/10 shadow-inner">
            <button onClick={() => setScale(s => Math.max(0.4, s - 0.2))} className="p-2.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-500/20 rounded-lg transition-all shadow-sm active:scale-95"><ZoomOut className="w-4 h-4"/></button>
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-12 text-center tracking-wider">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2, s + 0.2))} className="p-2.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-500/20 rounded-lg transition-all shadow-sm active:scale-95"><ZoomIn className="w-4 h-4"/></button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-1"></div>
            <button onClick={() => setScale(1)} className="p-2.5 text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-500/20 rounded-lg transition-all shadow-sm active:scale-95" title="Khôi phục mặc định"><Maximize className="w-4 h-4"/></button>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE CANVAS (NỀN SIMPLE, KHÔNG GRID) */}
      <div 
        ref={canvasRef} 
        className="relative w-full h-[700px] bg-[#f8fafc] dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-inner cursor-grab active:cursor-grabbing"
      >
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400 bg-white/60 dark:bg-black/60 backdrop-blur-md z-50">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex flex-col items-center border border-indigo-100 dark:border-indigo-500/20">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p className="font-bold tracking-wider">ĐANG RENDER PHẢ HỆ...</p>
            </div>
          </div>
        )}

        {!isLoading && (!normalizedData || normalizedData.length === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 opacity-50">
            <Network className="w-24 h-24 mb-4" />
            <p className="font-black text-xl uppercase tracking-widest">Workspace Trống</p>
          </div>
        )}

        {!isLoading && normalizedData && normalizedData.length > 0 && (
          <motion.div 
            drag 
            dragConstraints={canvasRef} 
            dragElastic={0.2}
            style={{ scale }}
            className="absolute inset-0 origin-top p-10 min-w-max flex justify-center"
          >
            <div className="flex justify-center items-start gap-12">
              {normalizedData.map((rootNode: OrgNode, index: number) => (
                <OrgNodeTree 
                  key={rootNode.id || index} 
                  node={rootNode} 
                  searchQuery={searchQuery}
                  isFirst={index === 0}
                  isLast={index === normalizedData.length - 1}
                  isOnlyItem={normalizedData.length === 1}
                  level={0}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

    </motion.div>
  );
}