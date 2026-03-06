"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Settings, GitMerge, ShieldAlert, Plus, Edit3, Trash2, 
  ArrowRight, Loader2, RefreshCcw, Save, X, GripVertical, 
  Building2, Globe2, Briefcase, CheckCircle2 // ĐÃ FIX: Thêm CheckCircle2 vào đây
} from "lucide-react";
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetWorkflowsQuery,
  useCreateWorkflowMutation,
  useUpdateWorkflowMutation,
  useDeleteWorkflowMutation,
  useGetRolesQuery
} from "@/state/api";

// --- COMPONENTS ---
import Header from "@/app/(components)/Header";

// ==========================================
// 1. INTERFACES CHO WORKFLOW BUILDER
// ==========================================
interface WorkflowStep {
  stepOrder: number;
  roleId: string;
}

interface WorkflowFormData {
  name: string;
  description: string;
  steps: WorkflowStep[];
}

// ==========================================
// 2. SKELETON LOADING CAO CẤP
// ==========================================
const SettingsSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse">
    <div className="h-16 bg-slate-200 dark:bg-white/5 rounded-2xl w-1/3 mb-4"></div>
    {[1, 2, 3].map(i => (
      <div key={i} className="h-32 bg-white/50 dark:bg-[#0B0F19]/50 rounded-3xl border border-slate-200/50 dark:border-white/5"></div>
    ))}
  </div>
);

// ==========================================
// COMPONENT CHÍNH: CÀI ĐẶT HỆ THỐNG
// ==========================================
export default function SettingsPage() {
  const { t } = useTranslation();

  // --- STATE ĐIỀU HƯỚNG ---
  const [activeTab, setActiveTab] = useState("WORKFLOWS");

  // --- STATE WORKFLOW BUILDER MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorkflowFormData>({ name: "", description: "", steps: [] });

  // --- STATE CHO TAB GENERAL (Cấu hình công ty) ---
  const [generalData, setGeneralData] = useState({
    companyName: "TTH Enterprise Corp",
    taxCode: "0123456789",
    currency: "VND",
    timezone: "Asia/Ho_Chi_Minh",
  });

  // 👉 FETCH DATA API
  const { data: workflows = [], isLoading: loadingWorkflows, isError, refetch } = useGetWorkflowsQuery(undefined, { skip: activeTab !== "WORKFLOWS" });
  const { data: roles = [], isLoading: loadingRoles } = useGetRolesQuery(); 
  
  const [createWorkflow, { isLoading: isCreating }] = useCreateWorkflowMutation();
  const [updateWorkflow, { isLoading: isUpdating }] = useUpdateWorkflowMutation();
  const [deleteWorkflow, { isLoading: isDeleting }] = useDeleteWorkflowMutation();

  const isSubmitting = isCreating || isUpdating;

  // --- HANDLERS: BUILDER LUỒNG PHÊ DUYỆT ---
  const handleOpenBuilder = (workflow?: any) => {
    if (workflow) {
      setEditingId(workflow.workflowId || workflow.id);
      setFormData({
        name: workflow.name || "",
        description: workflow.description || "",
        steps: workflow.steps?.length > 0 ? [...workflow.steps] : [{ stepOrder: 1, roleId: "" }]
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", description: "", steps: [{ stepOrder: 1, roleId: "" }] });
    }
    setIsModalOpen(true);
  };

  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { stepOrder: prev.steps.length + 1, roleId: "" }]
    }));
  };

  const handleRemoveStep = (indexToRemove: number) => {
    if (formData.steps.length <= 1) {
      toast.error("Hệ thống yêu cầu ít nhất 1 cấp phê duyệt!", { style: { borderRadius: '12px', background: '#333', color: '#fff' }});
      return;
    }
    const newSteps = formData.steps
      .filter((_, idx) => idx !== indexToRemove)
      .map((step, idx) => ({ ...step, stepOrder: idx + 1 })); 
    
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  const handleStepRoleChange = (index: number, roleId: string) => {
    const newSteps = [...formData.steps];
    newSteps[index].roleId = roleId;
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Thiếu Tên quy trình!"); return;
    }
    if (formData.steps.some(s => !s.roleId)) {
      toast.error("Vui lòng phân bổ Chức vụ cho tất cả các Node duyệt!"); return;
    }

    try {
      if (editingId) {
        await updateWorkflow({ id: editingId, data: formData }).unwrap();
        toast.success("Cập nhật luồng phê duyệt thành công!");
      } else {
        await createWorkflow(formData).unwrap();
        toast.success("Thiết lập luồng phê duyệt mới thành công!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi giao tiếp máy chủ khi lưu cấu hình!");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`HÀNH ĐỘNG NGUY HIỂM:\nBạn chắc chắn muốn xóa vĩnh viễn quy trình "${name}"?\nCác tờ trình đang chạy trong luồng này sẽ bị treo trạng thái.`)) {
      try {
        await deleteWorkflow(id).unwrap();
        toast.success("Đã hủy bỏ quy trình!");
      } catch (err) {
        toast.error("Hệ thống từ chối: Quy trình này đang bị ràng buộc bởi các tờ trình chưa hoàn tất!");
      }
    }
  };

  // Helper
  const getRoleName = (roleId: string) => {
    return roles.find(r => r.id === roleId || r.roleId === roleId)?.name || "Đang tải...";
  };

  // --- ANIMATION CONFIG ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-24 flex flex-col gap-6 sm:gap-8 mt-2">
      
      {/* HEADER CAO CẤP */}
      <Header 
        title={t("Trung tâm Cấu hình")} 
        subtitle={t("Quản trị luồng nghiệp vụ, tham số vận hành và thông tin lõi của doanh nghiệp.")}
        rightNode={
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-sm shadow-[0_8px_20px_rgba(0,0,0,0.1)] transition-all duration-300 active:scale-95 transform-gpu">
            <Save className="w-4 h-4" /> Lưu Tùy chọn (Global)
          </button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
        
        {/* 1. SIDEBAR MENU CÀI ĐẶT (STICKY GLASS) */}
        <div className="w-full lg:w-72 shrink-0 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl p-4 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] sticky top-24 transform-gpu z-10">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-4 py-3">Danh mục Quản trị</p>
          
          <div className="flex flex-col gap-1.5">
            <button 
              onClick={() => setActiveTab("WORKFLOWS")}
              className={`relative px-5 py-3.5 text-[13.5px] font-bold rounded-2xl transition-all text-left flex items-center gap-3.5 group
                ${activeTab === "WORKFLOWS" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5"}`}
            >
              {activeTab === "WORKFLOWS" && (
                <motion.div layoutId="settingsNav" className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm z-0" />
              )}
              <GitMerge className={`w-5 h-5 relative z-10 transition-transform ${activeTab === "WORKFLOWS" ? "scale-110" : "group-hover:scale-110"}`} /> 
              <span className="relative z-10">Luồng Phê duyệt</span>
            </button>

            <button 
              onClick={() => setActiveTab("GENERAL")}
              className={`relative px-5 py-3.5 text-[13.5px] font-bold rounded-2xl transition-all text-left flex items-center gap-3.5 group
                ${activeTab === "GENERAL" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5"}`}
            >
              {activeTab === "GENERAL" && (
                <motion.div layoutId="settingsNav" className="absolute inset-0 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm z-0" />
              )}
              <Settings className={`w-5 h-5 relative z-10 transition-transform ${activeTab === "GENERAL" ? "scale-110 rotate-90" : "group-hover:rotate-90 group-hover:scale-110"}`} /> 
              <span className="relative z-10">Cấu hình Doanh nghiệp</span>
            </button>
          </div>
        </div>

        {/* 2. KHU VỰC NỘI DUNG CHÍNH (MAIN CONTENT) */}
        <div className="flex-1 w-full min-w-0">
          
          {/* TAB 1: WORKFLOWS */}
          {activeTab === "WORKFLOWS" && (
            loadingWorkflows || loadingRoles ? <SettingsSkeleton /> : isError ? (
              <div className="flex flex-col items-center justify-center py-24 bg-rose-50/50 dark:bg-rose-500/5 rounded-3xl border border-rose-200 dark:border-rose-500/20">
                <ShieldAlert className="w-14 h-14 text-rose-500 mb-5 animate-pulse" />
                <p className="font-extrabold text-lg text-slate-800 dark:text-white mb-2">Đứt gãy kết nối CSDL Quy trình</p>
                <p className="text-sm text-slate-500 mb-6 text-center max-w-md">Hệ thống không thể tải cấu trúc luồng phê duyệt từ máy chủ. Vui lòng kiểm tra lại đường truyền.</p>
                <button onClick={() => refetch()} className="px-6 py-3 bg-white dark:bg-[#0B0F19] text-rose-600 font-bold rounded-xl shadow-sm border border-rose-200 dark:border-rose-500/30 flex items-center gap-2 hover:scale-105 transition-transform"><RefreshCcw className="w-4 h-4"/> Khởi chạy lại</button>
              </div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6">
                
                {/* Header Hành động */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl p-6 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] gap-4">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-xl">Kiến trúc Phê duyệt</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1 max-w-lg">Bản đồ cấu trúc các cấp thẩm quyền mà một chứng từ (Ví dụ: Phiếu chi, Phiếu xuất kho) phải vượt qua trước khi có hiệu lực.</p>
                  </div>
                  <button 
                    onClick={() => handleOpenBuilder()}
                    className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-black rounded-2xl shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_12px_24px_rgba(79,70,229,0.4)] transition-all active:scale-95 whitespace-nowrap shrink-0 transform-gpu"
                  >
                    <Plus className="w-5 h-5" /> Khởi tạo Luồng mới
                  </button>
                </div>

                {/* Danh sách Workflows (Bento Grid Visualization) */}
                <div className="grid grid-cols-1 gap-6">
                  <AnimatePresence>
                    {workflows.map(wf => (
                      <motion.div 
                        layoutId={`wf-${wf.workflowId || wf.id}`}
                        key={wf.workflowId || wf.id} variants={itemVariants}
                        className="flex flex-col bg-white dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden"
                      >
                        {/* Header của thẻ WF */}
                        <div className="flex justify-between items-start p-6 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                          <div className="flex gap-4 items-start">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 shadow-inner">
                              <GitMerge className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{wf.name}</h4>
                              <p className="text-[13px] font-medium text-slate-500 mt-1 max-w-xl">{wf.description || "Luồng tự động cơ bản."}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenBuilder(wf)} className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-xl transition-colors shadow-sm" title="Chỉnh sửa luồng"><Edit3 className="w-4.5 h-4.5"/></button>
                            <button onClick={() => handleDelete(wf.workflowId || wf.id, wf.name)} disabled={isDeleting} className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl transition-colors shadow-sm" title="Xóa luồng"><Trash2 className="w-4.5 h-4.5"/></button>
                          </div>
                        </div>

                        {/* Chuỗi Nodes Data Viz (Nấc thang quyền lực) */}
                        <div className="p-6 overflow-x-auto scrollbar-none">
                          <div className="flex items-center gap-3 w-max">
                            
                            {/* Điểm bắt đầu */}
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-sm">
                                <span className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
                              </div>
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Trình lên</span>
                            </div>
                            
                            {/* Render Steps */}
                            {wf.steps?.map((step: any, idx: number) => (
                              <React.Fragment key={idx}>
                                <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-700 mb-6 shrink-0 relative">
                                  <ArrowRight className="absolute -top-2 -right-2 w-4 h-4 text-slate-400" />
                                </div>
                                <div className="flex flex-col items-center gap-2 group/node cursor-default">
                                  <div className="w-12 h-12 rounded-2xl bg-indigo-500 shadow-[0_4px_15px_rgba(99,102,241,0.4)] flex items-center justify-center text-white font-black text-lg border border-indigo-400 group-hover/node:scale-110 transition-transform">
                                    {step.stepOrder}
                                  </div>
                                  <div className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{getRoleName(step.roleId)}</span>
                                  </div>
                                </div>
                              </React.Fragment>
                            ))}
                            
                            {/* Điểm Kết thúc */}
                            <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-700 mb-6 shrink-0 relative">
                              <ArrowRight className="absolute -top-2 -right-2 w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                              </div>
                              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Hiệu lực</span>
                            </div>

                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Empty State */}
                    {workflows.length === 0 && (
                      <div className="p-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-slate-50/50 dark:bg-white/[0.02]">
                        <GitMerge className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                        <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Hệ thống chưa có luồng phê duyệt</h4>
                        <p className="text-sm text-slate-500 max-w-md">Hãy tạo luồng đầu tiên để kiểm soát chặt chẽ việc xuất/nhập kho và các khoản chi tiêu.</p>
                        <button onClick={() => handleOpenBuilder()} className="mt-6 px-6 py-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-200 transition-colors">Thiết lập ngay</button>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          )}

          {/* TAB 2: GENERAL (CẤU HÌNH CÔNG TY) - BENTO GRID FORM */}
          {activeTab === "GENERAL" && (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 sm:gap-8">
              
              <div className="bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 sm:p-8">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400"><Building2 className="w-5 h-5" /></div>
                  Định danh Doanh nghiệp
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tên Tổ chức / Công ty</label>
                    <input type="text" value={generalData.companyName} onChange={(e) => setGeneralData({...generalData, companyName: e.target.value})} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-5 py-3.5 text-base font-black text-slate-900 dark:text-white outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5"/> Mã số Thuế (Tax ID)</label>
                    <input type="text" value={generalData.taxCode} onChange={(e) => setGeneralData({...generalData, taxCode: e.target.value})} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5"/> Đồng Tiền Hạch Toán</label>
                    <select value={generalData.currency} onChange={(e) => setGeneralData({...generalData, currency: e.target.value})} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm appearance-none">
                      <option value="VND">Việt Nam Đồng (VND)</option>
                      <option value="USD">Đô la Mỹ (USD)</option>
                    </select>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </div>
      </div>

      {/* ==========================================
          3. MODAL BUILDER: TẠO/SỬA WORKFLOW (NEO-BRUTALISM)
          ========================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} initial="hidden" animate="visible" exit="hidden"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#0B0F19]/80 backdrop-blur-sm"
          >
            <div className="absolute inset-0" onClick={!isSubmitting ? () => setIsModalOpen(false) : undefined} />
            
            <motion.div
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              className="relative w-full max-w-3xl bg-slate-50 dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-indigo-200 dark:border-indigo-500/30 overflow-hidden z-10 flex flex-col max-h-[90vh] transform-gpu"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shadow-inner">
                    <GitMerge className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {editingId ? "Tái cấu trúc Quy trình" : "Xây dựng Bản đồ Phê duyệt"}
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Xác định ai là người cầm trịch tờ trình tại mỗi bước.</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-full text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Modal */}
              <div className="p-6 md:p-8 overflow-y-auto scrollbar-thin flex flex-col gap-8 bg-slate-50/50 dark:bg-transparent">
                
                {/* Info Block */}
                <div className="grid grid-cols-1 gap-5 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Mã Quy trình (Tên) *</label>
                    <input 
                      type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="VD: Duyệt mua sắm Vật tư > 50 Triệu"
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-base focus:ring-2 focus:ring-indigo-500 outline-none font-black text-slate-900 dark:text-white shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">Mô tả cơ sở áp dụng</label>
                    <input 
                      type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Quy định áp dụng cho phòng ban kỹ thuật khi mua thiết bị..."
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>

                {/* Node Builder Area */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-base font-black text-slate-800 dark:text-white">Bản đồ Chuỗi Phê duyệt</h4>
                      <p className="text-xs font-semibold text-slate-500 mt-1">Dữ liệu sẽ chạy từ Node 1 cho đến Node cuối cùng.</p>
                    </div>
                    <button 
                      type="button" onClick={handleAddStep}
                      className="text-xs font-black text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 hover:bg-indigo-200 px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Thêm Node Duyệt
                    </button>
                  </div>

                  <div className="flex flex-col gap-4 relative before:absolute before:top-6 before:bottom-6 before:left-6 before:w-1 before:bg-indigo-100 dark:before:bg-indigo-900/50 before:-z-10">
                    <AnimatePresence initial={false}>
                      {formData.steps.map((step, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          className="relative flex items-center gap-4 z-10"
                        >
                          {/* Node Number */}
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0">
                            {index + 1}
                          </div>
                          
                          {/* Khối chọn Role (Glass Form) */}
                          <div className="flex-1 flex items-center gap-3 p-2.5 pr-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-2xl shadow-sm transition-colors group">
                            <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl cursor-grab active:cursor-grabbing"><GripVertical className="w-4 h-4 text-slate-400" /></div>
                            
                            <div className="flex-1 flex flex-col">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase">Giao quyền cho Chức vụ</span>
                              <select
                                value={step.roleId} onChange={(e) => handleStepRoleChange(index, e.target.value)}
                                className={`w-full bg-transparent text-sm font-bold outline-none cursor-pointer mt-0.5 ${!step.roleId ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}
                              >
                                <option value="" disabled className="text-slate-400">-- Vui lòng chọn một Chức vụ bắt buộc --</option>
                                {roles.map(r => <option key={r.id || r.roleId} value={r.id || r.roleId} className="text-slate-900">{r.name}</option>)}
                              </select>
                            </div>

                            <button 
                              type="button" onClick={() => handleRemoveStep(index)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                              title="Loại bỏ Node này"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

              </div>

              {/* Footer Modal */}
              <div className="px-6 py-4 md:py-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex justify-between items-center shrink-0">
                <p className="text-[11px] font-bold text-slate-400 hidden sm:block">
                  Lưu ý: Mọi sự thay đổi sẽ tác động ngay lập tức đến các chứng từ mới.
                </p>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={handleSubmit} disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl shadow-[0_8px_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Ban hành Luồng
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}