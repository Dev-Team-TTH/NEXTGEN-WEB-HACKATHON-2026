"use client";

import React, { useState, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  FileText, ArrowDownLeft, ArrowUpRight, 
  AlertOctagon, RefreshCcw, Plus, CreditCard, Eye, Trash2, CheckCircle2, Clock, XCircle, Ship
} from "lucide-react";
import dayjs from "dayjs";
import 'dayjs/locale/vi';
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useGetDocumentsQuery, useDeleteDocumentMutation, DocumentTx } from "@/state/api";

// --- COMPONENTS GIAO DIỆN LÕI ---
import Header from "@/app/(components)/Header";
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";

// --- SUB-MODALS ĐÃ THIẾT KẾ ---
import CreateDocumentModal from "./CreateDocumentModal";
import PaymentModal from "./PaymentModal";
import LandedCostModal from "./LandedCostModal";
// Import DocumentDetail nếu bạn đã tạo (Hoặc làm dạng Drawer)
// import DocumentDetail from "./DocumentDetail";

dayjs.locale('vi');

// ==========================================
// 1. HELPERS & FORMATTERS
// ==========================================
const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

// Trực quan hóa Trạng thái Thanh toán (Data Viz)
const getPaymentStatusUI = (status: string, total: number, paid: number) => {
  if (status === "PAID") return { label: "Đã thanh toán", bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" };
  if (status === "PARTIAL") {
    const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
    return { label: `Đã trả ${percent}%`, bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", percent };
  }
  return { label: "Chưa thanh toán", bg: "bg-rose-100 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400" };
};

// Trực quan hóa Trạng thái Phê duyệt
const getDocStatusUI = (status: string) => {
  switch (status) {
    case "APPROVED": return { label: "Đã duyệt", icon: CheckCircle2, color: "text-emerald-500" };
    case "PENDING": return { label: "Chờ duyệt", icon: Clock, color: "text-amber-500" };
    case "REJECTED": return { label: "Từ chối", icon: XCircle, color: "text-rose-500" };
    default: return { label: "Bản nháp", icon: FileText, color: "text-slate-500" };
  }
};

// ==========================================
// 2. SKELETON LOADING (Ưu tiên Hiệu năng)
// ==========================================
const TransactionsSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>)}
    </div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: QUẢN LÝ CHỨNG TỪ (TỔNG HỢP)
// ==========================================
export default function TransactionsPage() {
  const { t } = useTranslation();

  // --- STATE QUẢN LÝ MODALS (Adaptive Strategy) ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [paymentDocId, setPaymentDocId] = useState<string | null>(null);
  const [landedCostDocId, setLandedCostDocId] = useState<string | null>(null);
  // const [detailDocId, setDetailDocId] = useState<string | null>(null);

  // 👉 FETCH DATA THẬT (Gọi API từ Redux)
  const { data: documents = [], isLoading, isError, refetch, isFetching } = useGetDocumentsQuery({});
  const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation();

  // --- TÍNH TOÁN KPI TỔNG QUAN THỜI GIAN THỰC ---
  const summary = useMemo(() => {
    return documents.reduce((acc, doc) => {
      if (doc.type === "PO") acc.totalPO += doc.totalAmount;
      if (doc.type === "SO") acc.totalSO += doc.totalAmount;
      if (doc.paymentStatus !== "PAID") acc.totalUnpaid += (doc.totalAmount - (doc.paidAmount || 0));
      return acc;
    }, { totalPO: 0, totalSO: 0, totalUnpaid: 0 });
  }, [documents]);

  const handleDelete = async (id: string, docNumber: string) => {
    if (window.confirm(`Xóa chứng từ ${docNumber}? Hệ thống sẽ hoàn tác các giao dịch liên quan.`)) {
      try {
        await deleteDocument(id).unwrap();
        toast.success(`Đã xóa ${docNumber} thành công!`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Lỗi: Không thể xóa chứng từ đã chốt sổ hoặc đã duyệt.");
      }
    }
  };

  // --- ĐỊNH NGHĨA CỘT CHO DATATABLE TỐI ƯU UX ---
  const columns: ColumnDef<DocumentTx>[] = [
    {
      header: "Mã chứng từ",
      accessorKey: "documentNumber",
      sortable: true,
      cell: (row) => {
        const isPO = row.type === "PO";
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${isPO ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400'}`}>
              {isPO ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div className="flex flex-col">
              <span 
                // onClick={() => setDetailDocId(row.documentId)}
                className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 transition-colors"
                title="Xem chi tiết chứng từ"
              >
                {row.documentNumber}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {dayjs(row.createdAt).format('DD/MM/YYYY')}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      header: "Đối tác",
      accessorKey: "type",
      cell: (row) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
            {row.type === "PO" ? row.supplier?.name : row.customer?.name}
          </span>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded w-fit mt-0.5">
            {row.type === "PO" ? "Nhà cung cấp" : "Khách hàng"}
          </span>
        </div>
      )
    },
    {
      header: "Giá trị (VND)",
      accessorKey: "totalAmount",
      sortable: true,
      align: "right",
      cell: (row) => (
        <div className="flex flex-col items-end">
          <span className="font-black text-slate-900 dark:text-white">
            {formatVND(row.totalAmount)}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Đã trả: {formatVND(row.paidAmount || 0)}
          </span>
        </div>
      )
    },
    {
      header: "Thanh toán",
      accessorKey: "paymentStatus",
      cell: (row) => {
        const ui = getPaymentStatusUI(row.paymentStatus, row.totalAmount, row.paidAmount || 0);
        return (
          <div className="flex flex-col gap-1.5 w-28">
            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-bold ${ui.bg} ${ui.text}`}>
              {ui.label}
            </span>
            {/* Thanh tiến trình mini trực quan hóa công nợ */}
            {row.paymentStatus === "PARTIAL" && ui.percent !== undefined && (
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${ui.percent}%` }}></div>
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "Trạng thái",
      accessorKey: "status",
      cell: (row) => {
        const { label, icon: Icon, color } = getDocStatusUI(row.status);
        return (
          <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${color}`}>
            <Icon className="w-4 h-4" /> {label}
            {row.isLocked && <div className="w-1.5 h-1.5 rounded-full bg-slate-400 ml-1" title="Chứng từ đã chốt sổ, không thể sửa" />}
          </div>
        );
      }
    },
    {
      header: "Thao tác",
      accessorKey: "documentId",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {/* Nút Phân bổ Landed Cost (Chỉ hiện cho PO đã duyệt) */}
          {row.type === "PO" && row.status === "APPROVED" && (
            <button 
              onClick={() => setLandedCostDocId(row.documentId)}
              title="Phân bổ chi phí vận chuyển/Hải quan (Landed Cost)"
              className="p-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/20 rounded-lg transition-colors"
            >
              <Ship className="w-4 h-4" />
            </button>
          )}

          {/* Nút Gạch nợ (Thanh toán) */}
          {row.paymentStatus !== "PAID" && row.status === "APPROVED" && (
            <button 
              onClick={() => setPaymentDocId(row.documentId)}
              title="Ghi nhận Thu/Chi tiền"
              className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-colors"
            >
              <CreditCard className="w-4 h-4" />
            </button>
          )}
          
          <button 
            // onClick={() => setDetailDocId(row.documentId)}
            title="Xem chi tiết" 
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button 
            title="Xóa chứng từ"
            onClick={() => handleDelete(row.documentId, row.documentNumber)}
            disabled={isDeleting || row.isLocked || row.status === "APPROVED"}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // --- CẤU HÌNH MOTION (60fps Stagger) ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  // --- RENDER XỬ LÝ LỖI MẠNG LỚP NGOÀI ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Không thể kết nối Phân hệ Chứng từ</h2>
        <p className="text-slate-500 mb-6">Mất kết nối với máy chủ hoặc phiên đăng nhập đã hết hạn.</p>
        <button onClick={() => refetch()} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2 transition-transform">
          <RefreshCcw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} /> Tải lại dữ liệu
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 pb-10">
      
      {/* 1. HEADER TỔNG HỢP & NÚT HÀNH ĐỘNG */}
      <Header 
        title={t("Trung tâm Giao dịch & Chứng từ")} 
        subtitle={t("Giám sát Toàn bộ Đơn mua hàng (PO), Đơn bán hàng (SO) và Trạng thái Công nợ.")}
        rightNode={
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Tạo Chứng từ Mới</span>
          </button>
        }
      />

      {isLoading ? (
        <TransactionsSkeleton />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full">
          
          {/* 2. KHỐI THỐNG KÊ (KPI CARDS) - THEO THỜI GIAN THỰC */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-indigo-500 group hover:-translate-y-1 transition-transform duration-300">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng Giá trị Nhập Mua (PO)</p>
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl">
                  <ArrowDownLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white truncate">{formatVND(summary.totalPO)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-emerald-500 group hover:-translate-y-1 transition-transform duration-300">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng Giá trị Xuất Bán (SO)</p>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white truncate">{formatVND(summary.totalSO)}</h3>
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-5 rounded-2xl border-l-4 border-l-rose-500 group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl"></div>
              <div className="flex justify-between items-start mb-2 relative z-10">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Công nợ (Chưa thu/chi)</p>
                <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
                  <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 relative z-10 truncate">{formatVND(summary.totalUnpaid)}</h3>
            </motion.div>
          </div>

          {/* 3. BẢNG DỮ LIỆU TRUNG TÂM (DATATABLE) */}
          <motion.div variants={itemVariants} className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5">
            <DataTable 
              data={documents} 
              columns={columns} 
              searchKey="documentNumber" 
              searchPlaceholder="Tìm kiếm nhanh mã chứng từ, mã khách hàng..."
              itemsPerPage={10}
            />
          </motion.div>

        </motion.div>
      )}

      {/* ==========================================
          4. KHU VỰC TÍCH HỢP CÁC MODALS NGHIỆP VỤ 
          ========================================== */}
      <CreateDocumentModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      
      {/* Gọi Modal Thanh toán (Chỉ mở khi có ID chứng từ) */}
      <PaymentModal 
        docId={paymentDocId} 
        isOpen={!!paymentDocId} 
        onClose={() => setPaymentDocId(null)} 
      />
      
      {/* Gọi Modal Phân bổ Landed Cost (Chỉ mở khi có ID chứng từ PO) */}
      <LandedCostModal 
        docId={landedCostDocId} 
        isOpen={!!landedCostDocId} 
        onClose={() => setLandedCostDocId(null)} 
      />
      
      {/* Nếu bạn xây dựng DocumentDetail Drawer/Modal:
      <DocumentDetail docId={detailDocId} isOpen={!!detailDocId} onClose={() => setDetailDocId(null)} />
      */}

    </div>
  );
}