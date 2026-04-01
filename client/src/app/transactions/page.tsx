"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  FileText, Plus, Search, Filter, Anchor, CreditCard, 
  Trash2, AlertOctagon, RefreshCcw, Loader2, TrendingUp, 
  TrendingDown, ShoppingCart, Truck, Receipt, CheckCircle2,
  Clock, ArrowRightLeft, Building, Download, Printer
} from "lucide-react";
import dayjs from "dayjs";
import 'dayjs/locale/vi';
import { toast } from "react-hot-toast";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; 
import { 
  useGetDocumentsQuery,
  useDeleteDocumentMutation,
  useApproveDocumentDirectlyMutation
} from "@/state/api";

// --- COMPONENTS GIAO DIỆN LÕI ---
import DataTable, { ColumnDef } from "@/app/(components)/DataTable";
import RequirePermission from "@/app/(components)/RequirePermission";

// --- UTILS (SIÊU VŨ KHÍ) ---
import { formatVND, formatDateTime } from "@/utils/formatters";
import { exportTableToExcel } from "@/utils/exportUtils"; 
import { cn } from "@/utils/helpers";

// --- SIÊU COMPONENTS VỆ TINH (MODALS) ---
import LandedCostModal from "../transactions/LandedCostModal";
import CreateDocumentModal from "../transactions/CreateDocumentModal";
import PaymentModal from "../transactions/PaymentModal";

dayjs.locale('vi');

// ==========================================
// 1. HELPERS (DATA VIZ)
// ==========================================
const getDocTypeUI = (type: string) => {
  switch (type) {
    case "PURCHASE_ORDER": 
      return { 
        label: "Đơn Mua (PO)", 
        printLabel: "ĐƠN ĐẶT HÀNG MUA", 
        icon: ShoppingCart, 
        color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" 
      };
    case "SALES_ORDER": 
      return { 
        label: "Đơn Bán (SO)", 
        printLabel: "ĐƠN ĐẶT HÀNG BÁN", 
        icon: TrendingUp, 
        color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" 
      };
    case "GOODS_RECEIPT": 
      return { 
        label: "Nhập Kho (GRPO)", 
        printLabel: "PHIẾU NHẬP KHO", 
        icon: Truck, 
        color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30" 
      };
    case "INVOICE": 
      return { 
        label: "Hóa Đơn", 
        printLabel: "HÓA ĐƠN TÀI CHÍNH", 
        icon: Receipt, 
        color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30" 
      };
    default: 
      return { 
        label: type, 
        printLabel: "CHỨNG TỪ KẾ TOÁN", 
        icon: FileText, 
        color: "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30" 
      };
  }
};

const getPaymentStatusUI = (paid: number, total: number) => {
  if (total === 0) {
    return { label: "N/A", color: "text-slate-500", bar: "bg-slate-200 dark:bg-slate-700", percent: 0 };
  }
  const percent = Math.round((paid / total) * 100);
  if (percent >= 100) {
    return { label: "Đã thanh toán", color: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", percent: 100 };
  }
  if (percent > 0) {
    return { label: "Trả 1 phần", color: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", percent };
  }
  return { label: "Chưa thanh toán (Nợ)", color: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500", percent: 0 };
};

type DocTab = "ALL" | "PURCHASE_ORDER" | "SALES_ORDER" | "GOODS_RECEIPT" | "INVOICE";

// ==========================================
// 2. SKELETON LOADING
// ==========================================
const TransactionsSkeleton = () => (
  <div className="flex flex-col gap-6 w-full animate-pulse mt-6 transition-all duration-500 ease-in-out">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800/50 transition-all duration-500 ease-in-out"></div>
      ))}
    </div>
    <div className="h-16 w-full rounded-2xl bg-slate-200 dark:bg-slate-800/50 transition-all duration-500 ease-in-out"></div>
    <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800/50 rounded-3xl mt-2 transition-all duration-500 ease-in-out"></div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export default function TransactionsPage() {
  const { t } = useTranslation();
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // 🚀 LÁ CHẮN HYDRATION
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState<DocTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDocStatus, setFilterDocStatus] = useState("ALL");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("ALL");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDocForLandedCost, setSelectedDocForLandedCost] = useState<string | null>(null);
  const [selectedDocForPayment, setSelectedDocForPayment] = useState<string | null>(null);
  const [selectedDocForPrint, setSelectedDocForPrint] = useState<any | null>(null); 

  const { data: rawDocuments = [], isLoading, isError, refetch, isFetching } = useGetDocumentsQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );
  
  const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation();
  const [approveDocument, { isLoading: isApproving }] = useApproveDocumentDirectlyMutation();

  const documents = useMemo(() => {
    return rawDocuments.filter((doc: any) => {
      const matchTab = activeTab === "ALL" || doc.type === activeTab;
      
      const searchStr = searchQuery.toLowerCase();
      const partnerName = (doc.supplier?.name || doc.customer?.name || doc.partner?.name || "").toLowerCase();
      const matchSearch = 
        (doc.documentNumber && doc.documentNumber.toLowerCase().includes(searchStr)) ||
        partnerName.includes(searchStr);
      
      const matchDocStatus = filterDocStatus === "ALL" || doc.status === filterDocStatus;

      let matchPayment = true;
      if (filterPaymentStatus !== "ALL") {
        const total = doc.totalAmount || 0;
        const paid = doc.paidAmount || 0;
        
        if (filterPaymentStatus === "PAID") {
          matchPayment = paid >= total && total > 0;
        } else if (filterPaymentStatus === "PARTIAL") {
          matchPayment = paid > 0 && paid < total;
        } else if (filterPaymentStatus === "UNPAID") {
          matchPayment = paid === 0 && total > 0;
        }
      }
      
      return matchTab && matchSearch && matchDocStatus && matchPayment;
    });
  }, [rawDocuments, activeTab, searchQuery, filterDocStatus, filterPaymentStatus]);

  const kpis = useMemo(() => {
    let totalPurchases = 0;
    let totalSales = 0;
    let totalDebt = 0;
    let totalReceivables = 0;
    let pendingDocs = 0;

    rawDocuments.forEach((doc: any) => {
      const total = doc.totalAmount || 0;
      const paid = doc.paidAmount || 0;
      const remaining = total - paid;
      
      if (doc.type === "PURCHASE_ORDER" || doc.type === "GOODS_RECEIPT") {
        totalPurchases += total;
        if (remaining > 0) {
          totalDebt += remaining;
        }
      } else if (doc.type === "SALES_ORDER" || doc.type === "INVOICE") {
        totalSales += total;
        if (remaining > 0) {
          totalReceivables += remaining;
        }
      }
      
      if (doc.status === "PENDING" || doc.status === "DRAFT") {
        pendingDocs++;
      }
    });

    return { 
      totalPurchases, 
      totalSales, 
      totalDebt, 
      totalReceivables, 
      pendingDocs, 
      totalDocs: rawDocuments.length 
    };
  }, [rawDocuments]);

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
        const promise = approveDocument({ id, data: { action: "APPROVE", comment: "Duyệt nhanh từ Dashboard" } }).unwrap();
        toast.promise(promise, {
          loading: 'Đang xử lý phê duyệt...',
          success: `Đã duyệt chứng từ ${docNum}!`,
          error: (err) => err?.data?.message || "Lỗi khi duyệt chứng từ!"
        });
      } catch (err: any) {
        // Handled by toast.promise
      }
    }
  };

  const handlePrint = (doc: any) => {
    setSelectedDocForPrint(doc);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // 🚀 ENGINE SMART EXCEL MỚI: DÙNG BẢNG HTML TÀNG HÌNH ĐỂ XUẤT
  const handleExportData = () => {
    if (documents.length === 0) {
      toast.error("Không có dữ liệu để xuất!");
      return;
    }
    exportTableToExcel("smart-transactions-report", `Bao_Cao_Giao_Dich_${dayjs().format('DDMMYYYY')}`);
    toast.success("Đã xuất Báo cáo Giao dịch thành công!");
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      header: "Số Chứng từ",
      accessorKey: "documentNumber",
      sortable: true,
      cell: (row) => {
        const ui = getDocTypeUI(row.type);
        const Icon = ui.icon;
        return (
          <div className="flex items-center gap-3 transition-all duration-500 ease-in-out">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm group-hover:scale-105 transition-all duration-500 ease-in-out", ui.color)}>
              <Icon className="w-5 h-5 transition-all duration-500 ease-in-out" />
            </div>
            <div className="flex flex-col transition-all duration-500 ease-in-out">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider transition-all duration-500 ease-in-out">
                {row.documentNumber || "N/A"}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 transition-all duration-500 ease-in-out">
                {formatDateTime(row.issueDate || row.createdAt)}
              </span>
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
          <div className="flex flex-col max-w-[200px] transition-all duration-500 ease-in-out">
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate transition-all duration-500 ease-in-out" title={partnerName}>
              {partnerName}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 transition-all duration-500 ease-in-out">
              <Building className={cn("w-3 h-3 transition-all duration-500 ease-in-out", isSupplier ? "text-orange-500 dark:text-orange-400" : "text-emerald-500 dark:text-emerald-400")} />
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
          <div className="flex flex-col w-48 transition-all duration-500 ease-in-out">
            <div className="flex justify-between items-end mb-1 text-[11px] transition-all duration-500 ease-in-out">
              <span className="font-black text-slate-800 dark:text-white transition-all duration-500 ease-in-out">
                {formatVND(total)}
              </span>
              <span className={cn("font-bold transition-all duration-500 ease-in-out", payUI.color)}>
                {payUI.percent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner transition-all duration-500 ease-in-out">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${payUI.percent}%` }} 
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn("h-full rounded-full transition-all duration-500 ease-in-out", payUI.bar)}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between transition-all duration-500 ease-in-out">
              <span className="transition-all duration-500 ease-in-out">{payUI.label}</span>
              {payUI.percent < 100 && (
                <span className="font-semibold text-rose-500 dark:text-rose-400 transition-all duration-500 ease-in-out">
                  Nợ: {formatVND(total - paid)}
                </span>
              )}
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
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-all duration-500 ease-in-out",
            isPending 
              ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30" 
              : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
          )}>
            {isPending ? <Clock className="w-3.5 h-3.5 animate-pulse transition-all duration-500 ease-in-out" /> : <CheckCircle2 className="w-3.5 h-3.5 transition-all duration-500 ease-in-out" />}
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
          <div className="flex items-center justify-end gap-1.5 transition-all duration-500 ease-in-out">
            <button 
              onClick={() => handlePrint(row)} 
              title="In Chứng từ / Lưu PDF" 
              className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-xl transition-all shadow-sm duration-500 ease-in-out active:scale-95"
            >
              <Printer className="w-4 h-4 transition-all duration-500 ease-in-out" />
            </button>

            {isPending && (
              <RequirePermission roles={["ADMIN", "MANAGER"]}>
                <button 
                  onClick={() => handleApprove(docId, row.documentNumber)} 
                  disabled={isApproving} 
                  title="Duyệt Chứng từ" 
                  className="p-2 text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-600 dark:text-emerald-400 dark:hover:text-white rounded-xl transition-all shadow-sm duration-500 ease-in-out active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 transition-all duration-500 ease-in-out" />
                </button>
              </RequirePermission>
            )}

            {isGRPO && !isPending && (
              <button 
                onClick={() => setSelectedDocForLandedCost(docId)} 
                title="Phân bổ Landed Cost" 
                className="p-2 text-orange-500 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/30 rounded-xl transition-all shadow-sm duration-500 ease-in-out active:scale-95"
              >
                <Anchor className="w-4 h-4 transition-all duration-500 ease-in-out" />
              </button>
            )}
            
            {canPay && (
              <RequirePermission roles={["ADMIN", "ACCOUNTANT", "MANAGER"]}>
                <button 
                  onClick={() => setSelectedDocForPayment(docId)} 
                  title="Gạch nợ / Thanh toán" 
                  className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/30 rounded-xl transition-all shadow-sm duration-500 ease-in-out active:scale-95"
                >
                  <CreditCard className="w-4 h-4 transition-all duration-500 ease-in-out" />
                </button>
              </RequirePermission>
            )}

            {isPending && (
              <RequirePermission roles={["ADMIN"]}>
                <button 
                  onClick={() => handleDelete(docId, row.documentNumber)} 
                  disabled={isDeleting} 
                  title="Xóa chứng từ" 
                  className="p-2 text-rose-400 hover:text-white bg-rose-50 hover:bg-rose-500 dark:bg-rose-500/10 dark:hover:bg-rose-600 dark:text-rose-400 rounded-xl transition-all shadow-sm duration-500 ease-in-out active:scale-95 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 transition-all duration-500 ease-in-out" />
                </button>
              </RequirePermission>
            )}
          </div>
        );
      }
    }
  ], [isApproving, isDeleting]); 

  // 🚀 ĐƯA BỘ LỌC RA NGOÀI ĐỂ KHÔNG BỊ UNMOUNT KHI RỖNG
  const transactionFiltersNode = (
    <div className="flex flex-wrap items-center gap-5 w-full transition-all duration-500 ease-in-out">
      <div className="w-full sm:w-72 transition-all duration-500 ease-in-out">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block transition-all duration-500 ease-in-out">
          Lọc theo Trạng thái Chứng từ
        </label>
        <div className="relative group transition-all duration-500 ease-in-out">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-all duration-500 ease-in-out" />
          <select 
            value={filterDocStatus} 
            onChange={(e) => setFilterDocStatus(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white duration-500 ease-in-out"
          >
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="ALL">Tất cả trạng thái</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="DRAFT">Nháp (Draft)</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="PENDING">Chờ duyệt (Pending)</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="APPROVED">Đã duyệt (Approved)</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="COMPLETED">Hoàn tất (Completed)</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="CANCELLED">Đã hủy (Cancelled)</option>
          </select>
        </div>
      </div>
      
      <div className="w-full sm:w-72 transition-all duration-500 ease-in-out">
        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block transition-all duration-500 ease-in-out">
          Lọc theo Thanh toán Công nợ
        </label>
        <div className="relative group transition-all duration-500 ease-in-out">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-all duration-500 ease-in-out" />
          <select 
            value={filterPaymentStatus} 
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none cursor-pointer text-slate-900 dark:text-white duration-500 ease-in-out"
          >
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="ALL">Tất cả tiến độ</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="PAID">Đã thanh toán đủ 100%</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="PARTIAL">Thanh toán 1 phần</option>
            <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="UNPAID">Chưa thanh toán (Nợ)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const containerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // 🚀 ĐIỀU KIỆN RENDER TIÊN QUYẾT
  if (!isMounted) return <TransactionsSkeleton />;

  if (!activeBranchId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
        <AlertOctagon className="w-16 h-16 text-amber-500 mb-4 animate-pulse transition-all duration-500 ease-in-out" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-all duration-500 ease-in-out">Chưa chọn Chi nhánh</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md transition-all duration-500 ease-in-out font-medium">Vui lòng chọn Chi nhánh hoạt động ở góc trên màn hình để truy cập Trung tâm Giao dịch.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full text-center transition-all duration-500 ease-in-out">
        <AlertOctagon className="w-16 h-16 text-rose-500 mb-4 animate-pulse transition-all duration-500 ease-in-out" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-all duration-500 ease-in-out">Lỗi truy xuất hệ thống Giao dịch</h2>
        <button 
          onClick={() => refetch()} 
          className="px-8 py-3.5 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/40 active:scale-95 flex items-center gap-3 transition-all duration-500 ease-in-out"
        >
          <RefreshCcw className={cn("w-5 h-5 transition-all duration-500 ease-in-out", isFetching && "animate-spin")} /> Tải lại dữ liệu
        </button>
      </div>
    );
  }

  const partnerNamePrint = selectedDocForPrint?.supplier?.name || selectedDocForPrint?.customer?.name || "Khách hàng cá nhân / Vãng lai";
  const partnerAddressPrint = selectedDocForPrint?.supplier?.address || selectedDocForPrint?.customer?.address || "...............................................................";
  const partnerPhonePrint = selectedDocForPrint?.supplier?.phone || selectedDocForPrint?.customer?.phone || ".........................";

  return (
    <>
      <div className="w-full flex flex-col gap-8 pb-16 print:hidden transition-all duration-500 ease-in-out">
        
        {/* 🚀 ĐẠI TU HEADER THEO CHUẨN FLEXBOX BỌC THÉP VÀ UX MINIMALISM (INLINE) */}
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }} 
          className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 transform-gpu will-change-transform w-full transition-all duration-500 ease-in-out"
        >
          <div className="absolute -top-6 -left-6 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none z-0 transition-all duration-500 ease-in-out" />
          
          <div className="relative z-10 flex items-stretch gap-4 flex-1 min-w-0 transition-all duration-500 ease-in-out">
            <div className="w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-600 shadow-[0_0_12px_rgba(79,70,229,0.5)] transition-all duration-500 ease-in-out" />
            
            <div className="flex flex-col justify-center py-0.5 min-w-0 transition-all duration-500 ease-in-out w-full">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-slate-800 dark:text-slate-50 leading-none truncate break-words transition-all duration-500 ease-in-out">
                {t("Giao dịch & Mua bán")}
              </h1>
              <p className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-full md:max-w-2xl leading-relaxed transition-all duration-500 ease-in-out">
                {t("Kiểm soát toàn bộ vòng đời Đơn hàng, Nhập xuất kho và Thanh toán Công nợ.")}
              </p>
            </div>
          </div>

          <div className="relative z-10 w-full md:w-auto shrink-0 flex flex-row items-center justify-start md:justify-end gap-3 overflow-x-auto scrollbar-hide pb-1 md:pb-0 transition-all duration-500 ease-in-out">
            <button 
              onClick={handleExportData}
              className="px-5 py-3 flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-black rounded-2xl border-2 border-slate-100 dark:border-slate-700 transition-all active:scale-95 shadow-sm whitespace-nowrap duration-500 ease-in-out"
            >
              <Download className="w-5 h-5 transition-all duration-500 ease-in-out" />
              <span className="hidden sm:inline transition-all duration-500 ease-in-out">Xuất Dữ liệu Excel</span>
            </button>
            <RequirePermission roles={["ADMIN", "MANAGER", "STAFF"]}>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 whitespace-nowrap duration-500 ease-in-out"
              >
                <Plus className="w-5 h-5 transition-all duration-500 ease-in-out" />
                <span className="hidden sm:inline transition-all duration-500 ease-in-out">Khởi tạo Chứng từ</span>
              </button>
            </RequirePermission>
          </div>
        </motion.div>

        {isLoading ? <TransactionsSkeleton /> : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 w-full transition-all duration-500 ease-in-out">
            
            {/* 2. KHỐI THỐNG KÊ KÉP (KPI CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 transition-all duration-500 ease-in-out">
              
              <motion.div variants={itemVariants} className="glass p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-500 ease-in-out cursor-default">
                <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><ShoppingCart className="w-24 h-24 text-blue-500 transition-all duration-500 ease-in-out"/></div>
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 relative z-10 transition-all duration-500 ease-in-out">Chi phí Mua Hàng (PO)</p>
                <h3 className="text-4xl font-black text-blue-700 dark:text-blue-400 tracking-tighter truncate relative z-10 transition-all duration-500 ease-in-out">{formatVND(kpis.totalPurchases)}</h3>
                <p className="text-[11px] font-bold text-rose-500 dark:text-rose-400 mt-3 relative z-10 flex items-center gap-1 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-xl w-fit border border-rose-100 dark:border-rose-500/20 transition-all duration-500 ease-in-out">
                  Nợ phải trả: {formatVND(kpis.totalDebt)}
                </p>
              </motion.div>
              
              <motion.div variants={itemVariants} className="glass p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all duration-500 ease-in-out cursor-default">
                <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><TrendingUp className="w-24 h-24 text-emerald-500 transition-all duration-500 ease-in-out"/></div>
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 relative z-10 transition-all duration-500 ease-in-out">Doanh thu Bán Hàng (SO)</p>
                <h3 className="text-4xl font-black text-emerald-700 dark:text-emerald-400 tracking-tighter truncate relative z-10 transition-all duration-500 ease-in-out">{formatVND(kpis.totalSales)}</h3>
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-500 mt-3 relative z-10 flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-xl w-fit border border-amber-200 dark:border-amber-500/20 transition-all duration-500 ease-in-out">
                  Nợ phải thu: {formatVND(kpis.totalReceivables)}
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className={cn("glass p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group transition-all duration-500 ease-in-out cursor-default", kpis.pendingDocs > 0 ? "border-amber-300 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-900/10" : "border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50")}>
                <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><Clock className="w-24 h-24 text-amber-500 transition-all duration-500 ease-in-out"/></div>
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 relative z-10 transition-all duration-500 ease-in-out">Chứng từ Chờ Duyệt</p>
                <div className="flex items-center gap-3 relative z-10 transition-all duration-500 ease-in-out">
                  <h3 className={cn("text-4xl font-black tracking-tighter transition-all duration-500 ease-in-out", kpis.pendingDocs > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500")}>
                    {kpis.pendingDocs}
                  </h3>
                  {kpis.pendingDocs > 0 && (
                    <span className="flex h-3 w-3 relative transition-all duration-500 ease-in-out">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 transition-all duration-500 ease-in-out"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 transition-all duration-500 ease-in-out"></span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 relative z-10 transition-all duration-500 ease-in-out">Đang chờ phê duyệt</p>
              </motion.div>

              <motion.div variants={itemVariants} className="glass p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-purple-400 dark:hover:border-purple-500/50 transition-all duration-500 ease-in-out cursor-default">
                 <div className="absolute right-0 top-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:scale-110 transition-transform duration-500 ease-in-out"><ArrowRightLeft className="w-24 h-24 text-purple-500 transition-all duration-500 ease-in-out"/></div>
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 relative z-10 transition-all duration-500 ease-in-out">Tổng Lưu lượng (Volume)</p>
                <h3 className="text-4xl font-black tracking-tighter text-purple-600 dark:text-purple-400 relative z-10 transition-all duration-500 ease-in-out">{kpis.totalDocs} <span className="text-lg font-medium text-slate-400 dark:text-slate-500 tracking-normal transition-all duration-500 ease-in-out">phiếu</span></h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 relative z-10 transition-all duration-500 ease-in-out">Tất cả giao dịch hệ thống</p>
              </motion.div>

            </div>

            {/* 3. THANH CÔNG CỤ TABS VÀ TÌM KIẾM */}
            <motion.div variants={itemVariants} className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white/80 dark:bg-[#0B0F19]/70 backdrop-blur-xl p-3 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-sm z-30 sticky top-4 transition-all duration-500 ease-in-out">
              
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-all duration-500 ease-in-out">
                {[
                  { id: "ALL", label: "Tất cả" },
                  { id: "PURCHASE_ORDER", label: "Đơn Mua (PO)" },
                  { id: "SALES_ORDER", label: "Đơn Bán (SO)" },
                  { id: "GOODS_RECEIPT", label: "Nhập Kho (GRPO)" },
                  { id: "INVOICE", label: "Hóa Đơn" }
                ].map(tab => (
                  <button 
                    key={tab.id} onClick={() => setActiveTab(tab.id as DocTab)} 
                    className={cn(
                      "relative px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap z-10 duration-500 ease-in-out",
                      activeTab === tab.id ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-400"
                    )}
                  >
                    {activeTab === tab.id && <motion.div layoutId="docFilterTab" className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-xl -z-10 border border-slate-200/50 dark:border-slate-600 transition-all duration-500 ease-in-out" />}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-80 transition-all duration-500 ease-in-out">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 transition-all duration-500 ease-in-out" />
                <input 
                  type="text" placeholder="Tìm số phiếu, đối tác..." 
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm text-slate-900 dark:text-white duration-500 ease-in-out"
                />
              </div>
            </motion.div>

            {/* 4. BẢNG DỮ LIỆU ĐỘNG */}
            <motion.div variants={itemVariants} className="glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200/60 dark:border-slate-700/50 transition-all duration-500 ease-in-out bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-500 ease-in-out">
                {transactionFiltersNode}
              </div>
              
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-slate-400 dark:text-slate-500 transition-all duration-500 ease-in-out">
                  <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ease-in-out">
                    <FileText className="w-12 h-12 opacity-30 transition-all duration-500 ease-in-out" />
                  </div>
                  <p className="font-black text-slate-700 dark:text-slate-300 text-xl transition-all duration-500 ease-in-out">Không có dữ liệu</p>
                  <p className="text-sm mt-2 transition-all duration-500 ease-in-out font-medium">Chưa có chứng từ nào khớp với tiêu chí lọc của bạn.</p>
                </div>
              ) : (
                <DataTable 
                  data={documents} 
                  columns={columns} 
                  itemsPerPage={10} 
                />
              )}
            </motion.div>

          </motion.div>
        )}

        {/* MODALS */}
        <CreateDocumentModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); refetch(); }} />
        <LandedCostModal isOpen={!!selectedDocForLandedCost} onClose={() => setSelectedDocForLandedCost(null)} documentId={selectedDocForLandedCost} />
        <PaymentModal docId={selectedDocForPayment} isOpen={!!selectedDocForPayment} onClose={() => setSelectedDocForPayment(null)} />

      </div>

      {/* ==========================================
          5. TEMPLATE IN ẨN (CHỈ HIỂN THỊ KHI BẤM Ctrl+P) 
          ========================================== */}
      {selectedDocForPrint && (
        <div className="hidden print:block fixed inset-0 bg-white w-full min-h-screen text-black font-serif text-sm z-[9999] p-8 transition-all duration-500 ease-in-out">
          
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6 transition-all duration-500 ease-in-out">
            <div className="flex items-center gap-4 transition-all duration-500 ease-in-out">
              <div className="w-20 h-20 bg-gray-100 border border-black flex items-center justify-center font-bold text-lg transition-all duration-500 ease-in-out">LOGO</div>
              <div className="transition-all duration-500 ease-in-out">
                <h1 className="font-black text-xl uppercase transition-all duration-500 ease-in-out">CÔNG TY CỔ PHẦN TTH ENTERPRISE</h1>
                <p className="transition-all duration-500 ease-in-out">Địa chỉ: Khu công nghệ cao Biên Hòa, Đồng Nai, Việt Nam</p>
                <p className="transition-all duration-500 ease-in-out">Mã số thuế: 0101234567 | Điện thoại: (0251) 388 9999</p>
              </div>
            </div>
            <div className="text-right transition-all duration-500 ease-in-out">
              <p className="font-bold text-xs italic transition-all duration-500 ease-in-out">Mẫu số: 01GTKT</p>
              <p className="text-xs italic transition-all duration-500 ease-in-out">(Ban hành theo thông tư hệ thống ERP)</p>
            </div>
          </div>

          <div className="text-center mb-8 transition-all duration-500 ease-in-out">
            <h2 className="text-3xl font-black uppercase tracking-widest mb-1 transition-all duration-500 ease-in-out">{getDocTypeUI(selectedDocForPrint.type).printLabel}</h2>
            <p className="italic transition-all duration-500 ease-in-out">Ngày {dayjs(selectedDocForPrint.issueDate || selectedDocForPrint.createdAt).format('DD')} tháng {dayjs(selectedDocForPrint.issueDate || selectedDocForPrint.createdAt).format('MM')} năm {dayjs(selectedDocForPrint.issueDate || selectedDocForPrint.createdAt).format('YYYY')}</p>
            <p className="font-bold mt-1 transition-all duration-500 ease-in-out">Số: {selectedDocForPrint.documentNumber}</p>
          </div>

          <div className="mb-6 space-y-2 transition-all duration-500 ease-in-out">
            <p className="transition-all duration-500 ease-in-out"><span className="font-bold w-40 inline-block transition-all duration-500 ease-in-out">Khách hàng / Đơn vị:</span> {partnerNamePrint}</p>
            <p className="transition-all duration-500 ease-in-out"><span className="font-bold w-40 inline-block transition-all duration-500 ease-in-out">Địa chỉ:</span> {partnerAddressPrint}</p>
            <p className="transition-all duration-500 ease-in-out"><span className="font-bold w-40 inline-block transition-all duration-500 ease-in-out">Điện thoại:</span> {partnerPhonePrint}</p>
            <p className="transition-all duration-500 ease-in-out"><span className="font-bold w-40 inline-block transition-all duration-500 ease-in-out">Diễn giải:</span> {selectedDocForPrint.note || "...................................................................................................."}</p>
          </div>

          <table className="w-full border-collapse border border-black mb-6 text-sm transition-all duration-500 ease-in-out">
            <thead className="transition-all duration-500 ease-in-out">
              <tr className="bg-gray-100 transition-all duration-500 ease-in-out">
                <th className="border border-black p-2 text-center w-12 transition-all duration-500 ease-in-out">STT</th>
                <th className="border border-black p-2 text-left transition-all duration-500 ease-in-out">Tên Hàng hóa / Dịch vụ</th>
                <th className="border border-black p-2 text-center w-24 transition-all duration-500 ease-in-out">Số lượng</th>
                <th className="border border-black p-2 text-right w-32 transition-all duration-500 ease-in-out">Đơn giá</th>
                <th className="border border-black p-2 text-right w-32 transition-all duration-500 ease-in-out">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="transition-all duration-500 ease-in-out">
              {selectedDocForPrint.transactions && selectedDocForPrint.transactions.length > 0 ? (
                selectedDocForPrint.transactions.map((item: any, idx: number) => (
                  <tr key={idx} className="transition-all duration-500 ease-in-out">
                    <td className="border border-black p-2 text-center transition-all duration-500 ease-in-out">{idx + 1}</td>
                    <td className="border border-black p-2 text-left font-semibold transition-all duration-500 ease-in-out">{item.product?.name || "Vật tư không xác định"}</td>
                    <td className="border border-black p-2 text-center transition-all duration-500 ease-in-out">{item.quantity}</td>
                    <td className="border border-black p-2 text-right transition-all duration-500 ease-in-out">{formatVND(item.unitPrice)}</td>
                    <td className="border border-black p-2 text-right transition-all duration-500 ease-in-out">{formatVND(item.totalPrice)}</td>
                  </tr>
                ))
              ) : (
                <tr className="transition-all duration-500 ease-in-out"><td colSpan={5} className="border border-black p-8 text-center italic text-gray-500 transition-all duration-500 ease-in-out">(Không có dữ liệu chi tiết hàng hóa hoặc chưa tải)</td></tr>
              )}
            </tbody>
            <tfoot className="transition-all duration-500 ease-in-out">
              <tr className="transition-all duration-500 ease-in-out">
                <td colSpan={4} className="border border-black p-2 text-right font-bold uppercase transition-all duration-500 ease-in-out">Tổng Cộng:</td>
                <td className="border border-black p-2 text-right font-black text-lg transition-all duration-500 ease-in-out">{formatVND(selectedDocForPrint.totalAmount)}</td>
              </tr>
              <tr className="transition-all duration-500 ease-in-out">
                <td colSpan={4} className="border border-black p-2 text-right font-bold uppercase transition-all duration-500 ease-in-out">Đã Thanh Toán:</td>
                <td className="border border-black p-2 text-right transition-all duration-500 ease-in-out">{formatVND(selectedDocForPrint.paidAmount)}</td>
              </tr>
              <tr className="transition-all duration-500 ease-in-out">
                <td colSpan={4} className="border border-black p-2 text-right font-bold uppercase transition-all duration-500 ease-in-out">Số Tiền Còn Nợ:</td>
                <td className="border border-black p-2 text-right font-bold transition-all duration-500 ease-in-out">{formatVND(selectedDocForPrint.totalAmount - selectedDocForPrint.paidAmount)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="grid grid-cols-4 gap-4 mt-12 text-center transition-all duration-500 ease-in-out">
            <div className="transition-all duration-500 ease-in-out"><p className="font-bold transition-all duration-500 ease-in-out">Người Lập Phiếu</p><p className="text-xs italic transition-all duration-500 ease-in-out">(Ký, họ tên)</p><div className="h-24 transition-all duration-500 ease-in-out"></div></div>
            <div className="transition-all duration-500 ease-in-out"><p className="font-bold transition-all duration-500 ease-in-out">Người Nhận / Giao Hàng</p><p className="text-xs italic transition-all duration-500 ease-in-out">(Ký, họ tên)</p><div className="h-24 transition-all duration-500 ease-in-out"></div></div>
            <div className="transition-all duration-500 ease-in-out"><p className="font-bold transition-all duration-500 ease-in-out">Kế Toán Trưởng</p><p className="text-xs italic transition-all duration-500 ease-in-out">(Ký, họ tên)</p><div className="h-24 transition-all duration-500 ease-in-out"></div></div>
            <div className="transition-all duration-500 ease-in-out"><p className="font-bold transition-all duration-500 ease-in-out">Giám Đốc</p><p className="text-xs italic transition-all duration-500 ease-in-out">(Ký, đóng dấu)</p><div className="h-24 transition-all duration-500 ease-in-out"></div></div>
          </div>
          
          <div className="text-center text-xs italic mt-16 text-gray-500 transition-all duration-500 ease-in-out">
            Chứng từ được kết xuất tự động từ Hệ thống TTH ERP - Ngày in: {formatDateTime(new Date())}
          </div>
        </div>
      )}

      {/* ==========================================
          6. BẢNG ẨN DÙNG ĐỂ XUẤT BÁO CÁO SMART EXCEL
          ========================================== */}
      <div className="hidden transition-all duration-500 ease-in-out">
        <table id="smart-transactions-report">
          <thead>
            <tr>
              <th colSpan={8} style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#1e293b', color: '#ffffff', padding: '15px' }}>
                BÁO CÁO GIAO DỊCH & CHỨNG TỪ TỔNG HỢP
              </th>
            </tr>
            <tr>
              <th colSpan={8} style={{ textAlign: 'center', fontStyle: 'italic', padding: '10px' }}>
                Chi nhánh: {activeBranchId === "ALL" ? "Toàn Hệ Thống" : activeBranchId} | Ngày xuất: {dayjs().format('DD/MM/YYYY HH:mm')}
              </th>
            </tr>
            <tr>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Số chứng từ</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Loại chứng từ</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Đối tác</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Ngày tạo</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Tổng giá trị (VND)</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Đã thanh toán (VND)</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Còn nợ (VND)</th>
              <th style={{ backgroundColor: '#f1f5f9', padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc: any, idx: number) => {
              const total = doc.totalAmount || 0;
              const paid = doc.paidAmount || 0;
              const remaining = total - paid > 0 ? total - paid : 0;
              return (
                <tr key={`doc-${idx}`}>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', msoNumberFormat: '\@' } as any}>{doc.documentNumber}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{getDocTypeUI(doc.type).label}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{doc.supplier?.name || doc.customer?.name || doc.partner?.name || "Khách lẻ"}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{formatDateTime(doc.issueDate || doc.createdAt)}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#3b82f6' }}>{total}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: '#10b981' }}>{paid}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: remaining > 0 ? '#f43f5e' : '#64748b' }}>{remaining}</td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{doc.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </>
  );
}