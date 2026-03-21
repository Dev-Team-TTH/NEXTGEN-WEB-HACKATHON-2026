"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  GitMerge, ShieldAlert, Plus, Edit3, Trash2, 
  ArrowRight, Loader2, Save, GripVertical, CheckCircle2, RefreshCcw,
  FileText, DollarSign
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

import Modal from "@/app/(components)/Modal";
import { formatVND } from "@/utils/formatters";

// 🚀 NÂNG CẤP GIAO DIỆN DỮ LIỆU ĐỂ WORKFLOW THỰC SỰ HOẠT ĐỘNG
interface WorkflowStep {
  stepOrder: number;
  roleId: string;
}

interface WorkflowFormData {
  name: string;
  description: string;
  documentType: string; // PO, SO, EXPENSE, INVENTORY
  minAmount: number;    // Điều kiện số tiền tối thiểu để kích hoạt luồng
  steps: WorkflowStep[];
}

export default function WorkflowManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorkflowFormData>({ 
    name: "", description: "", documentType: "", minAmount: 0, steps: [] 
  });

  // 👉 FETCH DATA API
  const { data: workflows = [], isLoading: loadingWorkflows, isError, refetch } = useGetWorkflowsQuery({});
  const { data: roles = [], isLoading: loadingRoles } = useGetRolesQuery(); 
  
  const [createWorkflow, { isLoading: isCreating }] = useCreateWorkflowMutation();
  const [updateWorkflow, { isLoading: isUpdating }] = useUpdateWorkflowMutation();
  const [deleteWorkflow, { isLoading: isDeleting }] = useDeleteWorkflowMutation();

  const isSubmitting = isCreating || isUpdating;

  const handleOpenBuilder = (workflow?: any) => {
    if (workflow) {
      setEditingId(workflow.workflowId || workflow.id);
      setFormData({
        name: workflow.name || "",
        description: workflow.description || "",
        documentType: workflow.documentType || "",
        minAmount: workflow.minAmount || 0,
        steps: workflow.steps?.length > 0 ? [...workflow.steps] : [{ stepOrder: 1, roleId: "" }]
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", description: "", documentType: "", minAmount: 0, steps: [{ stepOrder: 1, roleId: "" }] });
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
      toast.error("Hệ thống yêu cầu ít nhất 1 cấp phê duyệt!"); return;
    }
    const newSteps = formData.steps
      .filter((_, idx) => idx !== indexToRemove)
      .map((step, idx) => ({ ...step, stepOrder: idx + 1 })); 
    
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  const handleStepRoleChange = (index: number, roleId: string) => {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      newSteps[index] = { ...newSteps[index], roleId: roleId }; 
      return { ...prev, steps: newSteps };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error("Thiếu Tên quy trình!"); return; }
    if (!formData.documentType) { toast.error("Vui lòng chọn Loại chứng từ áp dụng!"); return; }
    if (formData.steps.some(s => !s.roleId)) { toast.error("Vui lòng phân bổ Chức vụ cho tất cả các Node duyệt!"); return; }

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
    if (window.confirm(`Bạn chắc chắn muốn xóa vĩnh viễn quy trình "${name}"?`)) {
      try {
        await deleteWorkflow(id).unwrap();
        toast.success("Đã hủy bỏ quy trình!");
      } catch (err) {
        toast.error("Hệ thống từ chối: Quy trình này đang bị ràng buộc bởi các chứng từ!");
      }
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.roleId === roleId || (r as any).id === roleId);
    return role ? (role.roleName || (role as any).name) : "Đang tải...";
  };

  const getDocTypeName = (type: string) => {
    switch (type) {
      case "PO": return "Đơn Mua Hàng (PO)";
      case "SO": return "Đơn Bán Hàng (SO)";
      case "EXPENSE": return "Phiếu Chi (Expense)";
      case "INVENTORY": return "Phiếu Kho (Nhập/Xuất)";
      default: return "Tất cả Chứng từ";
    }
  };

  const builderFooter = (
    <div className="flex w-full items-center justify-between">
      <p className="text-[11px] font-bold text-slate-400 hidden sm:block">
        Lưu ý: Mọi sự thay đổi sẽ tác động ngay đến các chứng từ được tạo sau thời điểm này.
      </p>
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors">
          Hủy bỏ
        </button>
        <button 
          form="workflow-form" type="submit" disabled={isSubmitting}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl shadow-[0_8px_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Ban hành Luồng
        </button>
      </div>
    </div>
  );

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (loadingWorkflows || loadingRoles) {
    return (
      <div className="flex flex-col gap-6 w-full animate-pulse">
        <div className="h-16 bg-slate-200 dark:bg-white/5 rounded-2xl w-1/3 mb-4"></div>
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/50 dark:bg-[#0B0F19]/50 rounded-3xl border border-slate-200/50 dark:border-white/5"></div>)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-rose-50/50 dark:bg-rose-500/5 rounded-3xl border border-rose-200 dark:border-rose-500/20">
        <ShieldAlert className="w-14 h-14 text-rose-500 mb-5 animate-pulse" />
        <p className="font-extrabold text-lg text-slate-800 dark:text-white mb-2">Đứt gãy kết nối CSDL Quy trình</p>
        <button onClick={() => refetch()} className="mt-4 px-6 py-3 bg-white dark:bg-[#0B0F19] text-rose-600 font-bold rounded-xl shadow-sm border border-rose-200 dark:border-rose-500/30 flex items-center gap-2 hover:scale-105 transition-transform"><RefreshCcw className="w-4 h-4"/> Khởi chạy lại</button>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl p-6 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] gap-4">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-xl">Kiến trúc Phê duyệt</h3>
          <p className="text-sm font-medium text-slate-500 mt-1 max-w-lg">Bản đồ cấu trúc các cấp thẩm quyền mà một chứng từ phải vượt qua trước khi có hiệu lực.</p>
        </div>
        <button 
          onClick={() => handleOpenBuilder()}
          className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-black rounded-2xl shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_12px_24px_rgba(79,70,229,0.4)] transition-all active:scale-95 whitespace-nowrap shrink-0 transform-gpu"
        >
          <Plus className="w-5 h-5" /> Khởi tạo Luồng mới
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence>
          {workflows.map(wf => (
            <motion.div 
              layoutId={`wf-${wf.workflowId || wf.id}`}
              key={wf.workflowId || wf.id} variants={itemVariants}
              className="flex flex-col bg-white dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden"
            >
              <div className="flex justify-between items-start p-6 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 shadow-inner">
                    <GitMerge className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{wf.name}</h4>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> Áp dụng: {getDocTypeName(wf.documentType)}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" /> Mức kích hoạt: {wf.minAmount > 0 ? `>= ${formatVND(wf.minAmount)}` : "Mọi giá trị"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenBuilder(wf)} className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-xl transition-colors shadow-sm"><Edit3 className="w-4.5 h-4.5"/></button>
                  <button onClick={() => handleDelete(wf.workflowId || wf.id, wf.name)} disabled={isDeleting} className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl transition-colors shadow-sm"><Trash2 className="w-4.5 h-4.5"/></button>
                </div>
              </div>

              <div className="p-6 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-3 w-max">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-sm"><span className="w-2.5 h-2.5 bg-slate-400 rounded-full" /></div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Trình lên</span>
                  </div>
                  
                  {wf.steps?.map((step: any, idx: number) => (
                    <React.Fragment key={idx}>
                      <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-700 mb-6 shrink-0 relative"><ArrowRight className="absolute -top-2 -right-2 w-4 h-4 text-slate-400" /></div>
                      <div className="flex flex-col items-center gap-2 group/node cursor-default">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 shadow-[0_4px_15px_rgba(99,102,241,0.4)] flex items-center justify-center text-white font-black text-lg border border-indigo-400 group-hover/node:scale-110 transition-transform">{step.stepOrder}</div>
                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10"><span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{getRoleName(step.roleId)}</span></div>
                      </div>
                    </React.Fragment>
                  ))}
                  
                  <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-700 mb-6 shrink-0 relative"><ArrowRight className="absolute -top-2 -right-2 w-4 h-4 text-emerald-400" /></div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)]"><CheckCircle2 className="w-6 h-6 text-emerald-500" /></div>
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Hiệu lực</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
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

      {/* MODAL BUILDER (CÓ LOGIC LIÊN KẾT CHỨNG TỪ) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Tái cấu trúc Quy trình" : "Xây dựng Bản đồ Phê duyệt"}
        subtitle="Thiết lập luồng duyệt và giới hạn số tiền kích hoạt."
        icon={<GitMerge className="w-6 h-6 text-indigo-500" />}
        maxWidth="max-w-3xl"
        disableOutsideClick={isSubmitting}
        footer={builderFooter}
      >
        <form id="workflow-form" onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Mã Quy trình (Tên) *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="VD: Duyệt mua sắm Vật tư > 50 Triệu" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl text-base focus:ring-2 focus:ring-indigo-500 outline-none font-black text-slate-900 dark:text-white shadow-inner"/>
            </div>
            
            {/* 🚀 CHỌN LOẠI CHỨNG TỪ */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Loại chứng từ áp dụng *</label>
              <select required value={formData.documentType} onChange={(e) => setFormData({...formData, documentType: e.target.value})} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white shadow-inner cursor-pointer appearance-none">
                <option value="">-- Chọn loại chứng từ --</option>
                <option value="PO">Đơn Mua Hàng (PO)</option>
                <option value="SO">Đơn Bán Hàng (SO)</option>
                <option value="EXPENSE">Phiếu Chi (Expense)</option>
                <option value="INVENTORY">Phiếu Kho (Nhập/Xuất/Kiểm Kê)</option>
              </select>
            </div>

            {/* 🚀 ĐIỀU KIỆN KÍCH HOẠT (SỐ TIỀN) */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Hạn mức kích hoạt (VND)</label>
              <input type="number" min="0" value={formData.minAmount} onChange={(e) => setFormData({...formData, minAmount: Number(e.target.value)})} placeholder="VD: 50000000" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white shadow-inner"/>
              <p className="text-[10px] text-slate-400 font-medium italic">Để 0 nếu áp dụng cho mọi mức giá.</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 border-t border-slate-200 dark:border-slate-800 pt-6">
              <div><h4 className="text-base font-black text-slate-800 dark:text-white">Bản đồ Chuỗi Phê duyệt</h4><p className="text-xs font-semibold text-slate-500 mt-1">Dữ liệu sẽ chạy từ Node 1 cho đến Node cuối cùng.</p></div>
              <button type="button" onClick={handleAddStep} className="text-xs font-black text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 hover:bg-indigo-200 px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"><Plus className="w-4 h-4" /> Thêm Node</button>
            </div>

            <div className="flex flex-col gap-4 relative before:absolute before:top-6 before:bottom-6 before:left-6 before:w-1 before:bg-indigo-100 dark:before:bg-indigo-900/50 before:-z-10">
              <AnimatePresence initial={false}>
                {formData.steps.map((step, index) => (
                  <motion.div key={index} initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="relative flex items-center gap-4 z-10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0">{index + 1}</div>
                    <div className="flex-1 flex items-center gap-3 p-2.5 pr-4 bg-white dark:bg-slate-800/80 border-2 border-slate-100 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-2xl shadow-sm transition-colors group">
                      <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl cursor-grab active:cursor-grabbing"><GripVertical className="w-4 h-4 text-slate-400" /></div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase">Giao quyền cho Chức vụ</span>
                        <select required value={step.roleId} onChange={(e) => handleStepRoleChange(index, e.target.value)} className={`w-full bg-transparent text-sm font-bold outline-none cursor-pointer mt-0.5 ${!step.roleId ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                          <option value="" disabled className="text-slate-400">-- Vui lòng chọn một Chức vụ --</option>
                          {roles.map(r => {
                            const rId = r.roleId || (r as any).id;
                            const rName = r.roleName || (r as any).name;
                            return <option key={rId} value={rId} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{rName}</option>;
                          })}
                        </select>
                      </div>
                      <button type="button" onClick={() => handleRemoveStep(index)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors"><Trash2 className="w-4.5 h-4.5" /></button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </form>
      </Modal>

    </motion.div>
  );
}