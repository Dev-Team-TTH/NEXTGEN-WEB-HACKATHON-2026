"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Settings, GitMerge, ShieldAlert, Plus, Edit3, Trash2, 
  ArrowRight, CheckCircle2, Loader2, RefreshCcw, Save, X, GripVertical
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
// 2. SKELETON LOADING
// ==========================================
const SettingsSkeleton = () => (
  <div className="flex flex-col md:flex-row gap-6 w-full animate-pulse mt-6">
    <div className="w-full md:w-64 flex flex-col gap-2">
      {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-200 dark:bg-slate-800/50 rounded-xl"></div>)}
    </div>
    <div className="flex-1 flex flex-col gap-4">
      <div className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>
      <div className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>
    </div>
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

  // 👉 FETCH DATA API
  const { data: workflows = [], isLoading: loadingWorkflows, isError, refetch } = useGetWorkflowsQuery(undefined, { skip: activeTab !== "WORKFLOWS" });
  const { data: roles = [], isLoading: loadingRoles } = useGetRolesQuery(); // Dùng để chọn người duyệt
  
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
      toast.error("Phải có ít nhất 1 cấp phê duyệt!");
      return;
    }
    const newSteps = formData.steps
      .filter((_, idx) => idx !== indexToRemove)
      .map((step, idx) => ({ ...step, stepOrder: idx + 1 })); // Đánh lại số thứ tự
    
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
      toast.error("Vui lòng nhập tên quy trình!"); return;
    }
    if (formData.steps.some(s => !s.roleId)) {
      toast.error("Vui lòng chọn Vai trò (Role) cho tất cả các bước duyệt!"); return;
    }

    try {
      if (editingId) {
        await updateWorkflow({ id: editingId, data: formData }).unwrap();
        toast.success("Cập nhật luồng phê duyệt thành công!");
      } else {
        await createWorkflow(formData).unwrap();
        toast.success("Đã tạo luồng phê duyệt mới!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Lỗi khi lưu cấu hình!");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn chắc chắn muốn xóa quy trình "${name}"?\nCác tờ trình đang sử dụng luồng này có thể bị lỗi.`)) {
      try {
        await deleteWorkflow(id).unwrap();
        toast.success("Đã xóa quy trình!");
      } catch (err) {
        toast.error("Không thể xóa quy trình đang được sử dụng!");
      }
    }
  };

  // Lấy tên Role từ ID để hiển thị Data Viz
  const getRoleName = (roleId: string) => {
    return roles.find(r => r.id === roleId || r.roleId === roleId)?.name || "N/A";
  };

  // --- ANIMATION CONFIG ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };
  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      <Header 
        title={t("Cài đặt Hệ thống (Settings)")} 
        subtitle={t("Thiết lập luồng công việc, cấu hình chung và tích hợp hệ thống.")}
      />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* 1. SIDEBAR MENU CÀI ĐẶT */}
        <div className="w-full md:w-64 flex flex-col gap-2 shrink-0 bg-white dark:bg-slate-900 p-3 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm sticky top-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Quản trị cốt lõi</p>
          
          <button 
            onClick={() => setActiveTab("WORKFLOWS")}
            className={`relative px-4 py-3 text-sm font-bold rounded-2xl transition-colors text-left flex items-center gap-3 ${activeTab === "WORKFLOWS" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"}`}
          >
            {activeTab === "WORKFLOWS" && <motion.div layoutId="settingsNav" className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl -z-10 border border-indigo-100 dark:border-indigo-500/20" />}
            <GitMerge className="w-4 h-4" /> Luồng Phê duyệt
          </button>

          <button 
            onClick={() => setActiveTab("GENERAL")}
            className={`relative px-4 py-3 text-sm font-bold rounded-2xl transition-colors text-left flex items-center gap-3 ${activeTab === "GENERAL" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"}`}
          >
            {activeTab === "GENERAL" && <motion.div layoutId="settingsNav" className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl -z-10 border border-indigo-100 dark:border-indigo-500/20" />}
            <Settings className="w-4 h-4" /> Cấu hình Chung
          </button>
        </div>

        {/* 2. KHU VỰC NỘI DUNG (MAIN CONTENT) */}
        <div className="flex-1 w-full min-w-0">
          {activeTab === "WORKFLOWS" && (
            loadingWorkflows ? <SettingsSkeleton /> : isError ? (
              <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-3xl border border-rose-200">
                <ShieldAlert className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
                <p className="font-bold text-slate-800 dark:text-white mb-2">Lỗi tải dữ liệu Quy trình</p>
                <button onClick={() => refetch()} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl text-sm flex gap-2"><RefreshCcw className="w-4 h-4"/> Thử lại</button>
              </div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-4">
                
                {/* Header của Tab */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">Danh sách Luồng Phê duyệt</h3>
                    <p className="text-xs text-slate-500 mt-1">Định nghĩa các nấc thang quyền lực mà một tờ trình phải vượt qua.</p>
                  </div>
                  <button 
                    onClick={() => handleOpenBuilder()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Tạo Luồng mới
                  </button>
                </div>

                {/* Danh sách Workflows (Data Viz Chain) */}
                <div className="flex flex-col gap-4">
                  <AnimatePresence>
                    {workflows.map(wf => (
                      <motion.div 
                        layoutId={`wf-${wf.workflowId || wf.id}`}
                        key={wf.workflowId || wf.id} variants={itemVariants}
                        className="flex flex-col p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">{wf.name}</h4>
                            <p className="text-xs text-slate-500 mt-1">{wf.description || "Không có mô tả"}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenBuilder(wf)} className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 rounded-lg"><Edit3 className="w-4 h-4"/></button>
                            <button onClick={() => handleDelete(wf.workflowId || wf.id, wf.name)} disabled={isDeleting} className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </div>

                        {/* Chuỗi Nodes Data Viz */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                            Bắt đầu
                          </div>
                          
                          {wf.steps?.map((step: any, idx: number) => (
                            <React.Fragment key={idx}>
                              <ArrowRight className="w-4 h-4 text-indigo-300 dark:text-indigo-700 shrink-0" />
                              <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
                                <span className="w-4 h-4 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-[9px]">{step.stepOrder}</span>
                                {getRoleName(step.roleId)}
                              </div>
                            </React.Fragment>
                          ))}
                          
                          <ArrowRight className="w-4 h-4 text-emerald-300 dark:text-emerald-700 shrink-0" />
                          <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-500/30">
                            Hoàn tất
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {workflows.length === 0 && (
                      <div className="p-10 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                        Chưa có luồng phê duyệt nào được thiết lập.
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          )}

          {activeTab === "GENERAL" && (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 glass-panel rounded-3xl border border-dashed">
              <Settings className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold text-slate-800 dark:text-white">Cấu hình Chung hệ thống</p>
              <p className="text-sm">Module đang được phát triển...</p>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          3. MODAL BUILDER: TẠO/SỬA WORKFLOW
          ========================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} initial="hidden" animate="visible" exit="hidden"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          >
            <div className="absolute inset-0" onClick={!isSubmitting ? () => setIsModalOpen(false) : undefined} />
            
            <motion.div
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              className="relative w-full max-w-2xl bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl border border-indigo-500/30 overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                    <GitMerge className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {editingId ? "Thiết kế lại Luồng" : "Xây dựng Luồng Phê duyệt"}
                    </h2>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Modal */}
              <div className="p-6 overflow-y-auto scrollbar-thin flex flex-col gap-6">
                
                {/* Info */}
                <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Tên Quy trình *</label>
                    <input 
                      type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="VD: Duyệt mua sắm Vật tư > 50 Triệu"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Mô tả mục đích</label>
                    <input 
                      type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Áp dụng cho các phòng ban kỹ thuật..."
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Builder Steps */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <GitMerge className="w-4 h-4 text-indigo-500" /> Các nấc thang Phê duyệt
                    </h4>
                    <button 
                      type="button" onClick={handleAddStep}
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Thêm Cấp duyệt
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 relative before:absolute before:inset-y-0 before:left-5 before:w-0.5 before:bg-indigo-100 dark:before:bg-indigo-900">
                    <AnimatePresence initial={false}>
                      {formData.steps.map((step, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          className="relative flex items-center gap-3 z-10"
                        >
                          {/* Node Icon */}
                          <div className="w-10 h-10 rounded-full bg-indigo-500 border-4 border-slate-50 dark:border-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                            {index + 1}
                          </div>
                          
                          {/* Khối chọn Role */}
                          <div className="flex-1 flex items-center gap-2 p-2 pr-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm group">
                            <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                            <div className="flex-1">
                              <select
                                value={step.roleId} onChange={(e) => handleStepRoleChange(index, e.target.value)}
                                className="w-full bg-transparent text-sm font-semibold text-slate-800 dark:text-white outline-none cursor-pointer"
                              >
                                <option value="">-- Chọn Chức vụ (Role) duyệt --</option>
                                {roles.map(r => <option key={r.id || r.roleId} value={r.id || r.roleId}>{r.name}</option>)}
                              </select>
                            </div>
                            <button 
                              type="button" onClick={() => handleRemoveStep(index)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

              </div>

              {/* Footer Modal */}
              <div className="px-6 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-white/5 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  Hủy
                </button>
                <button 
                  onClick={handleSubmit} disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu Cấu hình Luồng
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}