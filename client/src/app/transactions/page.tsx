"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  FileText, Plus, Search, Filter, Anchor, CreditCard, 
  Trash2, AlertOctagon, RefreshCcw, Loader2, TrendingUp, 
  TrendingDown, ShoppingCart, Truck, Receipt, CheckCircle2,
  Clock, ArrowRightLeft, Building
} from "lucide-react";
import dayjs from "dayjs";
import 'dayjs/locale/vi';
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { 
  useGetDocumentsQuery,
  useDeleteDocumentMutation,
  useApproveDocumentDirectlyMutation
} from "@/state/api";

// --- COMPONENTS GIAO DIỆN LÕI ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

// --- SIÊU COMPONENTS VỆ TINH (MODALS) ---
import LandedCostModal from "./LandedCostModal";
import CreateDocumentModal from "./CreateDocumentModal";
import PaymentModal from "./PaymentModal";

dayjs.locale('vi');

// ==========================================
// 1. HELPERS & FORMATTERS (DATA VIZ)
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

// Phân loại màu sắc Chứng từ
const getDocTypeUI = (type: string) => {
  switch (type) {
    case "PURCHASE_ORDER": return { label: "Đơn Mua (PO)", icon: ShoppingCart, color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" };
    case "SALES_ORDER": return { label: "Đơn Bán (SO)", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" };
    case "GOODS_RECEIPT": return { label: "Nhập Kho (GRPO)", icon: Truck, color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30" };
    case "INVOICE": return { label: "Hóa Đơn", icon: Receipt, color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30" };
    default: return { label: type, icon: FileText, color: "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30" };
  }
};

// Trạng thái Thanh toán (Đã trả, Nợ, 1 phần)
const getPaymentStatusUI = (paid: number, total: number) => {
  if (total === 0) return { label: "N/A", color: "text-slate-500", bar: "bg-slate-200 dark:bg-slate-700", percent: 0 };
  const percent = Math.round((paid / total) * 100);
  if (percent >= 100) return { label: "Đã thanh toán", color: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", percent: 100 };
  if (percent > 0) return { label: "Trả 1 phần", color: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", percent };
  return { label: "Chưa thanh toán (Nợ)", color: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500", percent: 0 };
};

type DocTab = "ALL" | "PURCHASE_ORDER" | "SALES_ORDER" | "GOODS_RECEIPT" | "INVOICE";

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const TransactionsSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/50"></div>)}
    </div>
    <div className="h-16 w-full rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: TRUNG TÂM CHỨNG TỪ
// ==========================================
export default function TransactionsPage() {
  const { t } = useTranslation();

  // --- STATE TABS & LỌC ---
  const [activeTab, setActiveTab] = useState<DocTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // --- STATE MODALS ĐIỀU PHỐI ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDocForLandedCost, setSelectedDocForLandedCost] = useState<string | null>(null);
  const [selectedDocForPayment, setSelectedDocForPayment] = useState<string | null>(null);

  // 👉 FETCH & MUTATION API
  const { data: rawDocuments = [], isLoading, isError, refetch, isFetching } = useGetDocumentsQuery({});
  const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation();
  const [approveDocument, { isLoading: isApproving }] = useApproveDocumentDirectlyMutation();

  // --- XỬ LÝ LỌC TRÊN CLIENT ---
  const documents = useMemo(() => {
    return rawDocuments.filter((doc: any) => {
      const matchTab = activeTab === "ALL" || doc.type === activeTab;
      const searchStr = searchQuery.toLowerCase();
      
      // Tìm kiếm thông minh lấy đối tác tùy theo loại phiếu
      const partnerName = (doc.supplier?.name || doc.customer?.name || doc.partner?.name || "").toLowerCase();
      const matchSearch = 
        (doc.documentNumber && doc.documentNumber.toLowerCase().includes(searchStr)) ||
        partnerName.includes(searchStr);
      
      return matchTab && matchSearch;
    });
  }, [rawDocuments, activeTab, searchQuery]);

  // --- TÍNH TOÁN KPI ĐỈNH CAO ---
  const kpis = useMemo(() => {
    let totalPurchases = 0, totalSales = 0;
    let totalDebt = 0, totalReceivables = 0; 
    let pendingDocs = 0;

    rawDocuments.forEach((doc: any) => {
      const total = doc.totalAmount || 0;
      const paid = doc.paidAmount || 0;
      const remaining = total - paid;

      if (doc.type === "PURCHASE_ORDER" || doc.type === "GOODS_RECEIPT") {
        totalPurchases += total;
        if (remaining > 0) totalDebt += remaining;
      } else if (doc.type === "SALES_ORDER" || doc.type === "INVOICE") {
        totalSales += total;
        if (remaining > 0) totalReceivables += remaining;
      }

      if (doc.status === "PENDING" || doc.status === "DRAFT") pendingDocs++;
    });

    return { totalPurchases, totalSales, totalDebt, totalReceivables, pendingDocs, totalDocs: rawDocuments.length };
  }, [rawDocuments]);

  // --- HANDLERS DỮ LIỆU ---
  const handleDelete = async (id: string, docNum: string) => {
    if (window.confirm(`Xóa Chứng từ [${docNum}]?\nChỉ có thể xóa các chứng từ nháp hoặc chưa phát sinh hạch toán.`)) {
      try {
        await deleteDocument(id).unwrap();
        toast.success(`Đã xóa thành công chứng từ ${docNum}`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể xóa chứng từ này vì đã có dữ liệu liên kết!");
      }
    }
  };

  const handleApprove = async (id: string, docNum: string) => {
    if (window.confirm(`Duyệt Nhanh Chứng từ [${docNum}]?\nHệ thống sẽ tự động sinh phiếu nhập/xuất kho và hạch toán kế toán.`)) {
      try {
        // Gọi API duyệt trực tiếp
        await approveDocument({ id, data: { action: "APPROVE", comment: "Duyệt nhanh từ Dashboard" } }).unwrap();
        toast.success(`Đã duyệt chứng từ ${docNum}!`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi khi duyệt chứng từ!");
      }
    }
  };

  // --- CỘT BẢNG (DATATABLE COLUMNS) ---
  const columns: ColumnDef<any>[] = [
    {
      header: "Số Chứng từ",
      accessorKey: "documentNumber",
      sortable: true,
      cell: (row) => {
        const ui = getDocTypeUI(row.type);
        const Icon = ui.icon;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${ui.color} shadow-sm group-hover:scale-105 transition-transform`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">{row.documentNumber || "N/A"}</span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">{dayjs(row.issueDate || row.createdAt).format('HH:mm - DD/MM/YYYY')}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: "Đối tác (Partner)",
      accessorKey: "partner",
      cell: (row) => {
        const partnerName = row.supplier?.name || row.customer?.name || row.partner?.name || "Khách lẻ / Ẩn danh";
        const isSupplier = row.type === "PURCHASE_ORDER" || row.type === "GOODS_RECEIPT";
        return (
          <div className="flex flex-col max-w-[200px]">
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={partnerName}>
              {partnerName}
            </span>
            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-1">
              <Building className={`w-3 h-3 ${isSupplier ? 'text-orange-500' : 'text-emerald-500'}`} />
              {isSupplier ? "Nhà Cung Cấp" : "Khách Hàng"}
            </span>
          </div>
        );
      }
    },
    {
      header: "Giá trị & Thanh toán",
      accessorKey: "totalAmount",
      sortable: true,
      cell: (row) => {
        const total = row.totalAmount || 0;
        const paid = row.paidAmount || 0;
        const payUI = getPaymentStatusUI(paid, total);

        return (
          <div className="flex flex-col w-48">
            <div className="flex justify-between items-end mb-1 text-[11px]">
              <span className="font-black text-slate-800 dark:text-white">{formatVND(total)}</span>
              <span className={`font-bold ${payUI.color}`}>{payUI.percent}%</span>
            </div>
            {/* Thanh Progress Bar Data Viz */}
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }} animate={{ width: `${payUI.percent}%` }} transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${payUI.bar}`}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
              <span>{payUI.label}</span>
              {payUI.percent < 100 && <span className="font-semibold text-rose-500">Nợ: {formatVND(total - paid)}</span>}
            </div>
          </div>
        );
      }
    },
    {
      header: "Trạng thái",
      accessorKey: "status",
      cell: (row) => {
        const isPending = row.status === "PENDING" || row.status === "DRAFT";
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm ${isPending ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'}`}>
            {isPending ? <Clock className="w-3.5 h-3.5 animate-pulse" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {row.status}
          </span>
        );
      }
    },
    {
      header: "Thao tác",
      accessorKey: "id",
      align: "right",
      cell: (row) => {
        const docId = row.id || row.documentId;
        const isGRPO = row.type === "GOODS_RECEIPT";
        const isPending = row.status === "PENDING" || row.status === "DRAFT";
        const canPay = row.totalAmount > row.paidAmount && row.status === "APPROVED";
        
        return (
          <div className="flex items-center justify-end gap-1.5">
            
            {/* 1. Nút Duyệt Nhanh (Nếu đang chờ duyệt) */}
            {isPending && (
              <button onClick={() => handleApprove(docId, row.documentNumber)} disabled={isApproving} title="Duyệt Chứng từ" className="p-2 text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-600 rounded-xl transition-colors shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}

            {/* 2. Nút Landed Cost (Nếu là Phiếu nhập kho) */}
            {isGRPO && !isPending && (
              <button onClick={() => setSelectedDocForLandedCost(docId)} title="Phân bổ Landed Cost" className="p-2 text-orange-500 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/30 rounded-xl transition-colors shadow-sm">
                <Anchor className="w-4 h-4" />
              </button>
            )}
            
            {/* 3. Nút Thanh toán (Nếu còn nợ) */}
            {canPay && (
              <button onClick={() => setSelectedDocForPayment(docId)} title="Gạch nợ / Thanh toán" className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/30 rounded-xl transition-colors shadow-sm">
                <CreditCard className="w-4 h-4" />
              </button>
            )}

            {/* 4. Nút Xóa (Chỉ cho phép xóa nếu chưa duyệt) */}
            {isPending && (
              <button onClick={() => handleDelete(docId, row.documentNumber)} disabled={isDeleting} title="Xóa chứng từ" className="p-2 text-rose-400 hover:text-white bg-rose-50 hover:bg-rose-500 dark:bg-rose-500/10 dark:hover:bg-rose-600 rounded-xl transition-colors shadow-sm">
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
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Lỗi truy xuất hệ thống Giao dịch</h2>
        <button onClick={() => refetch()} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 mt-4">
          <RefreshCcw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} /> Tải lại dữ liệu
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      {/* 1. HEADER CHUẨN ENTERPRISE */}
      <Header 
        title={t("Giao dịch & Mua bán")} 
        subtitle={t("Kiểm soát toàn bộ vòng đời Đơn hàng, Nhập xuất kho và Thanh toán Công nợ.")}
        rightNode={
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black rounded-xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Khởi tạo Chứng từ</span>
          </button>
        }
      />

      {isLoading ? <TransactionsSkeleton /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          
          {/* 2. KHỐI THỐNG KÊ KÉP (KPI CARDS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-colors">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><ShoppingCart className="w-20 h-20 text-blue-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Chi phí Mua Hàng (PO)</p>
              <h3 className="text-2xl font-black text-blue-700 dark:text-blue-400 truncate relative z-10">{formatVND(kpis.totalPurchases)}</h3>
              <p className="text-[11px] font-bold text-rose-500 mt-2 relative z-10 flex items-center gap-1 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1.5 rounded-lg w-fit border border-rose-100 dark:border-rose-500/20">
                Nợ phải trả: {formatVND(kpis.totalDebt)}
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-colors">
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><TrendingUp className="w-20 h-20 text-emerald-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Doanh thu Bán Hàng (SO)</p>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 truncate relative z-10">{formatVND(kpis.totalSales)}</h3>
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-500 mt-2 relative z-10 flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 rounded-lg w-fit border border-amber-200 dark:border-amber-500/20">
                Nợ phải thu: {formatVND(kpis.totalReceivables)}
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className={`glass p-5 rounded-3xl border shadow-sm relative overflow-hidden group transition-colors ${kpis.pendingDocs > 0 ? 'border-amber-300 bg-amber-50/30 dark:border-amber-500/30 dark:bg-amber-900/10' : 'border-slate-200 dark:border-white/10'}`}>
              <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><Clock className="w-20 h-20 text-amber-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Chứng từ Chờ Duyệt</p>
              <div className="flex items-center gap-3 relative z-10">
                <h3 className={`text-3xl font-black ${kpis.pendingDocs > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                  {kpis.pendingDocs}
                </h3>
                {kpis.pendingDocs > 0 && (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-2 relative z-10">Đang chờ phê duyệt</p>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-purple-400 transition-colors">
               <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform"><ArrowRightLeft className="w-20 h-20 text-purple-500"/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Tổng Lưu lượng (Volume)</p>
              <h3 className="text-3xl font-black text-purple-600 dark:text-purple-400 relative z-10">{kpis.totalDocs} <span className="text-sm font-medium text-slate-500">phiếu</span></h3>
              <p className="text-[11px] font-medium text-slate-500 mt-2 relative z-10">Tất cả giao dịch trong hệ thống</p>
            </motion.div>

          </div>

          {/* 3. THANH CÔNG CỤ ĐIỀU HƯỚNG TABS (STICKY GLASSMORPHISM) */}
          <motion.div variants={itemVariants} className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-sm z-30 sticky top-4">
            
            {/* Tabs Filter */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-white/5">
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "PURCHASE_ORDER", label: "Đơn Mua (PO)" },
                { id: "SALES_ORDER", label: "Đơn Bán (SO)" },
                { id: "GOODS_RECEIPT", label: "Nhập Kho (GRPO)" },
                { id: "INVOICE", label: "Hóa Đơn" }
              ].map(tab => (
                <button 
                  key={tab.id} onClick={() => setActiveTab(tab.id as DocTab)} 
                  className={`relative px-4 py-2.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap z-10 ${activeTab === tab.id ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  {activeTab === tab.id && <motion.div layoutId="docFilterTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-xl -z-10 border border-slate-200/50 dark:border-slate-600" />}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Thanh Tìm kiếm */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" placeholder="Tìm số phiếu, đối tác..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm"
              />
            </div>
          </motion.div>

          {/* 4. BẢNG DỮ LIỆU ĐỘNG (DATATABLE) */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-white/10">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-10 h-10 opacity-50" />
                </div>
                <p className="font-bold text-slate-600 dark:text-slate-300 text-lg">Không có dữ liệu</p>
                <p className="text-sm mt-1">Chưa có chứng từ nào khớp với tiêu chí lọc của bạn.</p>
              </div>
            ) : (
              <DataTable 
                data={documents} 
                columns={columns} 
                searchKey="documentNumber" 
                searchPlaceholder="Lọc nhanh mã phiếu trong bảng..." 
                itemsPerPage={10} 
              />
            )}
          </motion.div>

        </motion.div>
      )}

      {/* ==========================================
          5. KHU VỰC TÍCH HỢP CÁC SIÊU MODALS 
          ========================================== */}
          
      <CreateDocumentModal 
        isOpen={isCreateModalOpen} 
        onClose={() => { setIsCreateModalOpen(false); refetch(); }} 
      />

      <LandedCostModal 
        isOpen={!!selectedDocForLandedCost} 
        onClose={() => setSelectedDocForLandedCost(null)} 
        documentId={selectedDocForLandedCost} 
      />

      <PaymentModal 
        docId={selectedDocForPayment} 
        isOpen={!!selectedDocForPayment} 
        onClose={() => setSelectedDocForPayment(null)} 
      />

    </div>
  );
}