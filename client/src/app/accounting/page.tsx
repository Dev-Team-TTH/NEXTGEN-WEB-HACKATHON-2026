"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  BookOpen, Plus, Lock, AlertOctagon, 
  RefreshCcw, CheckCircle2, Clock, FileText, 
  ArrowRightLeft, Trash2, Send, Scale, TrendingUp
} from "lucide-react";
import dayjs from "dayjs";
import 'dayjs/locale/vi';
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetJournalEntriesQuery, 
  usePostJournalEntryMutation,
  useDeleteJournalEntryMutation,
  JournalEntry 
} from "@/state/api";

// --- COMPONENTS GIAO DIỆN LÕI ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

// --- SUB-PAGES & MODALS ĐÃ TẠO ---
import ManualJournalModal from "./ManualJournalModal";
import ReverseEntryModal from "./ReverseEntryModal";
import FiscalPeriodModal from "./FiscalPeriodModal";
import TrialBalanceReport from "./reports/TrialBalance";
import CashflowReport from "./reports/Cashflow";

dayjs.locale('vi');

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const getStatusUI = (status: string) => {
  switch (status) {
    case "POSTED": return { label: "Đã ghi sổ", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10" };
    case "DRAFT": return { label: "Bản nháp", icon: FileText, color: "text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800" };
    case "REVERSED": return { label: "Đã đảo", icon: ArrowRightLeft, color: "text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10" };
    default: return { label: status || "N/A", icon: Clock, color: "text-amber-500 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10" };
  }
};

type TabType = "JOURNAL" | "TRIAL_BALANCE" | "CASHFLOW";

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const AccountingSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>)}
    </div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: TRUNG TÂM TÀI CHÍNH KẾ TOÁN
// ==========================================
export default function FinancialHubPage() {
  const { t } = useTranslation();

  // --- STATE TABS & MODALS ---
  const [activeTab, setActiveTab] = useState<TabType>("JOURNAL");
  const [isManualJournalOpen, setIsManualJournalOpen] = useState(false);
  const [isFiscalPeriodOpen, setIsFiscalPeriodOpen] = useState(false);
  const [reverseEntryId, setReverseEntryId] = useState<string | null>(null);

  // 👉 FETCH DATA SỔ NHẬT KÝ (Dùng chung để tính KPI)
  const { data: journalEntries = [], isLoading, isError, refetch, isFetching } = useGetJournalEntriesQuery({});
  const [postEntry, { isLoading: isPosting }] = usePostJournalEntryMutation();
  const [deleteEntry, { isLoading: isDeleting }] = useDeleteJournalEntryMutation();

  // --- XỬ LÝ NGHIỆP VỤ: GHI SỔ & XÓA NHÁP ---
  const handlePostEntry = async (id: string, ref: string) => {
    if (window.confirm(`Bạn muốn Ghi sổ (Post) bút toán ${ref}? Dữ liệu sau khi ghi sổ sẽ không thể xóa.`)) {
      try {
        await postEntry(id).unwrap();
        toast.success(`Đã ghi sổ thành công bút toán ${ref}`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi khi ghi sổ bút toán!");
      }
    }
  };

  const handleDeleteEntry = async (id: string, ref: string) => {
    if (window.confirm(`Xóa bản nháp ${ref}? Thao tác này không thể hoàn tác.`)) {
      try {
        await deleteEntry(id).unwrap();
        toast.success(`Đã xóa bản nháp ${ref}`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể xóa bút toán này!");
      }
    }
  };

  // --- TÍNH TOÁN KPI THỜI GIAN THỰC ---
  const summary = useMemo(() => {
    let totalPosted = 0;
    let totalDraft = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    journalEntries.forEach(entry => {
      const entryDebit = entry.lines?.reduce((sum, line) => sum + Number(line.debit || 0), 0) || 0;
      const entryCredit = entry.lines?.reduce((sum, line) => sum + Number(line.credit || 0), 0) || 0;

      if (entry.postingStatus === "POSTED") {
        totalPosted++;
        totalDebit += entryDebit;
        totalCredit += entryCredit;
      } else if (entry.postingStatus === "DRAFT") {
        totalDraft++;
      }
    });

    return { totalPosted, totalDraft, totalDebit, totalCredit, isBalanced: totalDebit === totalCredit };
  }, [journalEntries]);

  // --- ĐỊNH NGHĨA CỘT CHO DATATABLE (SỔ NHẬT KÝ) ---
  const columns: ColumnDef<JournalEntry>[] = [
    {
      header: "Ngày HT / Ref",
      accessorKey: "reference",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 transition-colors" title="Xem chi tiết">
            {row.reference || `JRN-${row.journalId.substring(0, 5)}`}
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            {dayjs(row.entryDate).format('DD/MM/YYYY')}
          </span>
        </div>
      )
    },
    {
      header: "Diễn giải",
      accessorKey: "description",
      cell: (row) => (
        <div className="flex flex-col max-w-[250px]">
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate" title={row.description}>
            {row.description}
          </span>
        </div>
      )
    },
    {
      header: "Phát sinh Nợ (Debit)",
      accessorKey: "journalId", 
      align: "right",
      cell: (row) => {
        const debit = row.lines?.reduce((sum, line) => sum + Number(line.debit || 0), 0) || 0;
        return <span className="font-bold text-blue-600 dark:text-blue-400">{formatVND(debit)}</span>;
      }
    },
    {
      header: "Phát sinh Có (Credit)",
      accessorKey: "journalId", 
      align: "right",
      cell: (row) => {
        const credit = row.lines?.reduce((sum, line) => sum + Number(line.credit || 0), 0) || 0;
        return <span className="font-bold text-orange-600 dark:text-orange-400">{formatVND(credit)}</span>;
      }
    },
    {
      header: "Trạng thái",
      accessorKey: "postingStatus",
      cell: (row) => {
        const { label, icon: Icon, color } = getStatusUI(row.postingStatus);
        const debit = row.lines?.reduce((sum, line) => sum + Number(line.debit || 0), 0) || 0;
        const credit = row.lines?.reduce((sum, line) => sum + Number(line.credit || 0), 0) || 0;

        return (
          <div className="flex flex-col gap-1 w-fit">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${color}`}>
              <Icon className="w-3 h-3" /> {label}
            </span>
            {debit !== credit && (
              <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1 mt-0.5">
                <AlertOctagon className="w-3 h-3" /> Lệch Nợ/Có
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Thao tác",
      accessorKey: "journalId",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {/* Action cho BẢN NHÁP (DRAFT) */}
          {row.postingStatus === "DRAFT" && (
            <>
              <button 
                onClick={() => handlePostEntry(row.journalId, row.reference)}
                disabled={isPosting}
                title="Ghi sổ (Post)"
                className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDeleteEntry(row.journalId, row.reference)}
                disabled={isDeleting}
                title="Xóa nháp"
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Action cho BÚT TOÁN ĐÃ GHI SỔ (POSTED) */}
          {row.postingStatus === "POSTED" && !row.isReversed && (
            <button 
              onClick={() => setReverseEntryId(row.journalId)}
              title="Đảo bút toán (Reverse Entry)"
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          )}
          
          <button title="Xem chi tiết" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors">
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // --- CẤU HÌNH MOTION (60fps Stagger) ---
  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } } };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Lỗi truy xuất Sổ Kế Toán</h2>
        <button onClick={() => refetch()} className="px-6 py-3 mt-4 bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 flex items-center gap-2"><RefreshCcw className="w-5 h-5" /> Tải lại Sổ cái</button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      {/* 1. HEADER & ACTIONS CHUNG */}
      <Header 
        title={t("Trung tâm Tài chính Kế toán")} 
        subtitle={t("Giám sát Sổ cái, cân đối phát sinh và báo cáo dòng tiền chuẩn IFRS.")}
        rightNode={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFiscalPeriodOpen(true)}
              className="p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
            >
              <Lock className="w-5 h-5" />
              <span className="hidden sm:block text-sm font-bold">Khóa kỳ</span>
            </button>
            <button 
              onClick={() => setIsManualJournalOpen(true)}
              className="px-5 py-2.5 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Ghi sổ Thủ công</span>
            </button>
          </div>
        }
      />

      {isLoading ? <AccountingSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          
          {/* 2. KHỐI THỐNG KÊ (KPI CARDS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-blue-500 group hover:-translate-y-1 transition-transform">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tổng Nợ (Debit)</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 truncate">{formatVND(summary.totalDebit)}</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-orange-500 group hover:-translate-y-1 transition-transform">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tổng Có (Credit)</p>
              <h3 className="text-2xl font-black text-orange-600 dark:text-orange-400 truncate">{formatVND(summary.totalCredit)}</h3>
            </motion.div>
            
            <motion.div variants={itemVariants} className={`glass p-5 rounded-2xl border-l-4 ${summary.isBalanced ? 'border-l-emerald-500' : 'border-l-rose-500 bg-rose-50/50 dark:bg-rose-900/10'} group hover:-translate-y-1 transition-transform`}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Trạng thái Cân bằng</p>
              {summary.isBalanced ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-6 h-6" /><span className="font-bold text-lg">Cân Nợ / Có</span></div>
              ) : (
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400"><AlertOctagon className="w-6 h-6 animate-pulse" /><span className="font-bold text-lg">Lệch Bảng!</span></div>
              )}
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2"><span className="text-sm font-medium text-slate-500">Đã Ghi sổ:</span><span className="font-bold text-emerald-600">{summary.totalPosted}</span></div>
              <div className="flex justify-between items-center border-t border-slate-200 dark:border-white/10 pt-2"><span className="text-sm font-medium text-slate-500">Chờ phê duyệt:</span><span className="font-bold text-amber-500">{summary.totalDraft}</span></div>
            </motion.div>
          </div>

          {/* 3. THANH ĐIỀU HƯỚNG TABS (SHARED LAYOUT ANIMATION) */}
          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200 dark:border-white/5">
              
              <button onClick={() => setActiveTab("JOURNAL")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeTab === "JOURNAL" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {activeTab === "JOURNAL" && <motion.div layoutId="accTab" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm -z-10" />}
                <BookOpen className="w-4 h-4" /> Sổ Nhật Ký Chung
              </button>

              <button onClick={() => setActiveTab("TRIAL_BALANCE")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeTab === "TRIAL_BALANCE" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {activeTab === "TRIAL_BALANCE" && <motion.div layoutId="accTab" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm -z-10" />}
                <Scale className="w-4 h-4" /> Bảng Cân đối Số phát sinh
              </button>

              <button onClick={() => setActiveTab("CASHFLOW")} className={`relative px-5 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 flex items-center gap-2 whitespace-nowrap ${activeTab === "CASHFLOW" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {activeTab === "CASHFLOW" && <motion.div layoutId="accTab" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm -z-10" />}
                <TrendingUp className="w-4 h-4" /> Báo cáo Dòng tiền
              </button>

            </div>
          </div>

          {/* 4. RENDER NỘI DUNG TABS */}
          <div className="w-full relative">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: SỔ NHẬT KÝ CHUNG */}
              {activeTab === "JOURNAL" && (
                <motion.div key="journal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5">
                    <DataTable 
                      data={journalEntries} 
                      columns={columns} 
                      searchKey="reference" 
                      searchPlaceholder="Tìm kiếm mã chứng từ gốc (Ref), diễn giải..." 
                      itemsPerPage={15} 
                    />
                  </div>
                </motion.div>
              )}

              {/* TAB 2: BẢNG CÂN ĐỐI (Nhúng Report) */}
              {activeTab === "TRIAL_BALANCE" && (
                <motion.div key="trial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <TrialBalanceReport />
                </motion.div>
              )}

              {/* TAB 3: DÒNG TIỀN (Nhúng Report) */}
              {activeTab === "CASHFLOW" && (
                <motion.div key="cashflow" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
                  <CashflowReport />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </motion.div>
      )}

      {/* ==========================================
          5. KHU VỰC TÍCH HỢP CÁC MODALS NGHIỆP VỤ 
          ========================================== */}
      <ManualJournalModal isOpen={isManualJournalOpen} onClose={() => setIsManualJournalOpen(false)} />
      <ReverseEntryModal entryId={reverseEntryId} isOpen={!!reverseEntryId} onClose={() => setReverseEntryId(null)} />
      <FiscalPeriodModal isOpen={isFiscalPeriodOpen} onClose={() => setIsFiscalPeriodOpen(false)} />

    </div>
  );
}