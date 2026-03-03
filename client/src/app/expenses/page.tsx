"use client";

import React, { useState, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Receipt, Plus, Calculator, AlertOctagon, 
  RefreshCcw, CheckCircle2, Clock, XCircle, 
  Send, Trash2, Activity, PieChart as PieChartIcon,
  FileText // ✅ Đã bổ sung import FileText để fix lỗi
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from "recharts";
import dayjs from "dayjs";
import 'dayjs/locale/vi';
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetExpensesQuery, 
  useGetExpenseSummaryQuery,
  usePostExpenseMutation,
  useDeleteExpenseMutation
} from "@/state/api";

// --- COMPONENTS ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

// --- MODALS (Sẽ code ở bước sau) ---
// import CreateExpenseModal from "./CreateExpenseModal";

dayjs.locale('vi');

// ==========================================
// 1. HELPERS & FORMATTERS (DATA VIZ)
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const getStatusUI = (status: string) => {
  switch (status) {
    case "DRAFT": return { label: "Bản nháp", icon: Receipt, color: "text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800" };
    case "PENDING": return { label: "Chờ Sếp duyệt", icon: Clock, color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10" };
    case "APPROVED": return { label: "Đã duyệt (Chờ chi)", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10" };
    case "POSTED": return { label: "Đã hạch toán", icon: Calculator, color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10" };
    case "REJECTED": return { label: "Bị từ chối", icon: XCircle, color: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10" };
    default: return { label: status || "N/A", icon: Activity, color: "text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800" };
  }
};

// Bảng màu cho Biểu đồ Donut
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const ExpensesSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>)}
      </div>
      <div className="h-64 bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>
    </div>
    <div className="h-[400px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: QUẢN LÝ CHI PHÍ (EXPENSES)
// ==========================================
export default function ExpensesPage() {
  const { t } = useTranslation();

  // --- STATE ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 👉 FETCH DATA THẬT
  const { data: expenses = [], isLoading: loadingExp, isError, refetch } = useGetExpensesQuery({});
  const { data: expenseSummary = [], isLoading: loadingSummary } = useGetExpenseSummaryQuery({});
  
  const [postExpense, { isLoading: isPosting }] = usePostExpenseMutation();
  const [deleteExpense, { isLoading: isDeleting }] = useDeleteExpenseMutation();

  const isLoading = loadingExp || loadingSummary;

  // --- HANDLERS ---
  const handlePostToAccounting = async (id: string, refCode: string) => {
    if (window.confirm(`Xác nhận chi tiền và Hạch toán sổ cái cho phiếu [${refCode}]?\nHành động này sẽ đẩy dữ liệu sang Phân hệ Kế toán.`)) {
      try {
        await postExpense(id).unwrap();
        toast.success(`Đã hạch toán thành công phiếu ${refCode}!`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi khi hạch toán chi phí!");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Xóa phiếu chi này? Chỉ có thể xóa phiếu Nháp hoặc Bị từ chối.")) {
      try {
        await deleteExpense(id).unwrap();
        toast.success("Đã xóa phiếu chi!");
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể xóa phiếu chi này!");
      }
    }
  };

  // --- TÍNH TOÁN KPI ---
  const kpis = useMemo(() => {
    let totalAmount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;

    expenses.forEach((exp: any) => {
      const amount = Number(exp.totalAmount || exp.amount || 0);
      if (exp.status !== "REJECTED" && exp.status !== "DRAFT") totalAmount += amount;
      if (exp.status === "PENDING") pendingAmount += amount;
      if (exp.status === "APPROVED") approvedAmount += amount;
    });

    return { totalAmount, pendingAmount, approvedAmount, count: expenses.length };
  }, [expenses]);

  // --- CỘT DATATABLE ---
  const columns: ColumnDef<any>[] = [
    {
      header: "Mã Phiếu / Ngày",
      accessorKey: "reference",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 transition-colors">
            {row.reference || row.expenseCode || `EXP-${row.expenseId?.substring(0, 5)}`}
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            {dayjs(row.expenseDate || row.createdAt).format('DD/MM/YYYY')}
          </span>
        </div>
      )
    },
    {
      header: "Nội dung / Phân loại",
      accessorKey: "description",
      cell: (row) => (
        <div className="flex flex-col max-w-[250px]">
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={row.description}>
            {row.description || "Thanh toán chi phí"}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded w-fit uppercase tracking-wider">
            {row.category?.name || row.expenseType || "Khác"}
          </span>
        </div>
      )
    },
    {
      header: "Người đề nghị",
      accessorKey: "requesterId",
      cell: (row) => {
        const name = row.requester?.fullName || row.requester?.email || row.requester?.username || "Hệ thống";
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {name}
            </span>
          </div>
        );
      }
    },
    {
      header: "Số tiền (VND)",
      accessorKey: "amount",
      sortable: true,
      align: "right",
      cell: (row) => (
        <span className="font-black text-orange-600 dark:text-orange-400 text-sm">
          {formatVND(row.totalAmount || row.amount || 0)}
        </span>
      )
    },
    {
      header: "Trạng thái",
      accessorKey: "status",
      cell: (row) => {
        const { label, icon: Icon, color } = getStatusUI(row.status);
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${color}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </span>
        );
      }
    },
    {
      header: "Thao tác",
      accessorKey: "expenseId",
      align: "right",
      cell: (row) => {
        const ref = row.reference || row.expenseCode;
        return (
          <div className="flex items-center justify-end gap-1">
            {/* Nếu là Draft -> Nút gửi duyệt (Submit) - Sẽ nhúng logic Trình ký sau */}
            {row.status === "DRAFT" && (
              <button title="Trình ký (Gửi Sếp duyệt)" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors">
                <Send className="w-4 h-4" />
              </button>
            )}

            {/* CỰC KỲ QUAN TRỌNG: Nút Hạch toán dành cho Kế toán (Chỉ hiện khi Sếp đã duyệt) */}
            {row.status === "APPROVED" && (
              <button 
                onClick={() => handlePostToAccounting(row.expenseId, ref)}
                disabled={isPosting}
                title="Hạch toán Kế toán (Ghi sổ Sổ cái & Xuất tiền)" 
                className="p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-500/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <Calculator className="w-4 h-4" />
              </button>
            )}

            {/* Nút Xóa (Chỉ nháp hoặc bị từ chối mới được xóa) */}
            {(row.status === "DRAFT" || row.status === "REJECTED") && (
              <button 
                onClick={() => handleDelete(row.expenseId)}
                disabled={isDeleting}
                title="Xóa phiếu" 
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  // --- ANIMATION ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Lỗi truy xuất Dữ liệu Chi phí</h2>
        <button onClick={() => refetch()} className="px-6 py-3 mt-4 bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 flex items-center gap-2"><RefreshCcw className="w-5 h-5" /> Tải lại dữ liệu</button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      {/* 1. HEADER & ACTIONS */}
      <Header 
        title={t("Quản lý Chi phí Nội bộ (Expenses)")} 
        subtitle={t("Tạo đề nghị thanh toán, theo dõi phê duyệt và hạch toán chi phí.")}
        rightNode={
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Tạo Phiếu Chi</span>
          </button>
        }
      />

      {isLoading ? <ExpensesSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          
          {/* 2. GRID DASHBOARD: KPI + BIỂU ĐỒ DONUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 2.1. Thẻ KPI (Bên trái, chiếm 2 cột trên Desktop) */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border-l-4 border-l-blue-500 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Yêu cầu Chi tiêu</p>
                  <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg"><Receipt className="w-4 h-4 text-blue-500"/></div>
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white truncate">{formatVND(kpis.totalAmount)}</h3>
                <p className="text-xs text-slate-400 mt-2 font-medium">{kpis.count} phiếu đã lập</p>
              </motion.div>

              <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border-l-4 border-l-amber-500 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đang chờ Sếp duyệt</p>
                  <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg"><Clock className="w-4 h-4 text-amber-500"/></div>
                </div>
                <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 truncate">{formatVND(kpis.pendingAmount)}</h3>
                <p className="text-xs text-slate-400 mt-2 font-medium">Cần đốc thúc phê duyệt</p>
              </motion.div>

              <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border-l-4 border-l-emerald-500 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã Duyệt (Chờ Kế toán Chi)</p>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-500"/></div>
                </div>
                <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 truncate">{formatVND(kpis.approvedAmount)}</h3>
                <p className="text-xs text-slate-400 mt-2 font-medium">Sẵn sàng hạch toán</p>
              </motion.div>

              <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border-l-4 border-l-purple-500 flex flex-col justify-center bg-purple-50/30 dark:bg-purple-900/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Calculator className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Kế toán lưu ý</h4>
                    <p className="text-xs text-slate-500 mt-1">Hãy bấm Icon Máy tính để đẩy phiếu Đã duyệt vào Sổ cái Nhật ký chung.</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* 2.2. Biểu đồ Data Viz (Bên phải) */}
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl flex flex-col h-[280px]">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-500" /> Cơ cấu Chi phí
              </h3>
              
              {expenseSummary.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Chưa có dữ liệu phân tích</div>
              ) : (
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseSummary}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={80}
                        paddingAngle={5}
                        dataKey="value" // API trả về mảng { name: 'Điện', value: 5000000 }
                        stroke="none"
                      >
                        {expenseSummary.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any) => formatVND(Number(value))}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          </div>

          {/* 3. BẢNG DANH SÁCH CHI PHÍ */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5">
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" /> Sổ theo dõi Phiếu Chi
              </h3>
            </div>
            <DataTable 
              data={expenses} 
              columns={columns} 
              searchKey="description" 
              searchPlaceholder="Tìm nội dung chi, mã phiếu..." 
              itemsPerPage={10} 
            />
          </motion.div>

        </motion.div>
      )}

      {/* ==========================================
          4. NHÚNG MODAL TẠO PHIẾU
          ========================================== */}
      {/* <CreateExpenseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} /> */}

    </div>
  );
}