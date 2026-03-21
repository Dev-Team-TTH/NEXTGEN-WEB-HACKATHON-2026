import React, { useMemo } from "react";
import { ColumnDef } from "@/app/(components)/DataTable";
import { 
  AlignLeft, Coins, CreditCard, ShieldAlert, 
  Percent, Phone, Mail, UserCircle, Edit, Trash2
} from "lucide-react";
// 🚀 TÁI SỬ DỤNG
import RequirePermission from "@/app/(components)/RequirePermission";
import { formatVND } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

interface UseMasterDataColumnsProps {
  activeSubTab: string;
  branches: any[];
  warehouses: any[];
  taxes: any[];
  accounts: any[];
  handleOpenEditModal: (row: any) => void;
  handleUniversalDelete: (row: any) => void; 
}

export function useMasterDataColumns({
  activeSubTab,
  branches,
  warehouses,
  taxes,
  accounts,
  handleOpenEditModal,
  handleUniversalDelete
}: UseMasterDataColumnsProps) {
  
  return useMemo(() => {
    const baseCols: ColumnDef<any>[] = [
      {
        header: "Mã (Code)",
        accessorKey: "code",
        sortable: true,
        cell: (row) => (
          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1.5 w-fit">
            {activeSubTab === "currencies" && row.symbol && <span className="text-emerald-600">{row.symbol}</span>}
            {row.code || row.accountCode || row.taxCode || row.currencyCode || "N/A"}
          </span>
        )
      },
      {
        header: "Tên / Diễn giải",
        accessorKey: "name",
        sortable: true,
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-white">
              {row.name || row.description || row.listName || "Chưa đặt tên"}
            </span>
            {(activeSubTab === "categories" || activeSubTab === "taxes" || activeSubTab === "accounts") && row.description && (
              <span className="text-[10px] text-slate-500 max-w-[250px] truncate mt-0.5"><AlignLeft className="w-3 h-3 inline mr-1 opacity-50"/>{row.description}</span>
            )}
          </div>
        )
      }
    ];

    if (activeSubTab === "branches") {
      baseCols.push({ header: "Thuộc Công ty", accessorKey: "company", cell: (row) => <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md">{row.company?.name || "N/A"}</span> });
    } else if (activeSubTab === "departments") {
      baseCols.push({ header: "Trực thuộc Chi nhánh", accessorKey: "branch", cell: (row) => <span className="font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md">{row.branch?.name || "N/A"}</span> });
    } else if (activeSubTab === "warehouses") {
      baseCols.push({ header: "Trực thuộc Chi nhánh", accessorKey: "branch", cell: (row) => <span className="font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md">{row.branch?.name || "N/A"}</span> });
    } else if (activeSubTab === "bins") {
      baseCols.push({ header: "Thuộc Kho & Chi nhánh", accessorKey: "warehouse", cell: (row) => {
        const parentWarehouse = warehouses.find((w: any) => w.warehouseId === row.warehouseId || w.id === row.warehouseId);
        const parentBranch = parentWarehouse ? branches.find((b: any) => b.branchId === parentWarehouse.branchId || b.id === parentWarehouse.branchId) : null;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-800 dark:text-slate-200">{row.warehouse?.name || parentWarehouse?.name || "N/A"}</span>
            <span className="text-[10px] text-slate-500 font-medium">CN: {row.warehouse?.branch?.name || parentBranch?.name || "N/A"}</span>
          </div>
        );
      }});
    } 
    else if (activeSubTab === "suppliers" || activeSubTab === "customers") {
      baseCols.push({ 
        header: "Mã số Thuế", 
        accessorKey: "taxCode",
        cell: (row) => (
          <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {row.taxCode || "N/A"}
          </span>
        )
      });
      baseCols.push({ 
        header: "Thông tin Liên hệ", 
        accessorKey: "contact",
        cell: (row) => (
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            {row.contactPerson && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {row.contactPerson}
              </span>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[10px] font-medium text-slate-500">
              {row.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-blue-400 shrink-0" /> {row.phone}</span>}
              {row.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-amber-400 shrink-0" /> {row.email}</span>}
              {!row.phone && !row.email && !row.contactPerson && <span className="italic">-- Chưa cập nhật thông tin --</span>}
            </div>
          </div>
        )
      });
      baseCols.push({
        header: "Giao dịch",
        accessorKey: "financeInfo",
        cell: (row) => (
          <div className="flex flex-col gap-1.5">
            {row.currencyCode && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded w-fit border border-emerald-200 dark:border-emerald-500/20">
                <Coins className="w-3 h-3" /> Tiền tệ: {row.currencyCode}
              </span>
            )}
            {activeSubTab === "suppliers" && row.paymentTerms && (
              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium w-fit">
                <CreditCard className="w-3 h-3" /> TT: {row.paymentTerms}
              </span>
            )}
            {activeSubTab === "customers" && row.creditLimit !== undefined && (
              <span className="flex items-center gap-1 text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded w-fit border border-rose-100 dark:border-rose-500/20">
                <ShieldAlert className="w-3 h-3" /> Hạn mức: {formatVND(row.creditLimit)}
              </span>
            )}
          </div>
        )
      });
    }
    else if (activeSubTab === "categories") {
      baseCols.push({
        header: "Thuế suất Mặc định",
        accessorKey: "tax",
        cell: (row) => {
          const targetTaxId = row.taxId || row.tax?.taxId || row.tax?.id;
          const tax = taxes.find((t: any) => (t.taxId || t.id) === targetTaxId);
          return tax ? (
            <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-1 rounded-md w-fit border border-rose-100 dark:border-rose-500/20">
              <Percent className="w-3 h-3" /> {tax.taxCode} ({tax.rate}%)
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium italic">Không cấu hình</span>
          );
        }
      });
    }
    else if (activeSubTab === "uoms") {
      baseCols.push({
        header: "Nhóm / Loại hình",
        accessorKey: "uomType",
        cell: (row) => {
          const typeMap: any = { 
            UNIT: { label: "Số lượng", color: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/30" }, 
            WEIGHT: { label: "Khối lượng", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30" }, 
            VOLUME: { label: "Thể tích", color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30" }, 
            LENGTH: { label: "Chiều dài/DT", color: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-500/30" } 
          };
          const mapped = typeMap[row.uomType] || { label: row.uomType || "Cơ bản", color: "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700" };
          
          return <span className={cn("text-[10px] font-black px-2 py-1 rounded border uppercase tracking-wider", mapped.color)}>{mapped.label}</span>;
        }
      });
    }
    else if (activeSubTab === "taxes") {
      baseCols.push({ header: "Thuế suất (%)", accessorKey: "rate", cell: (row) => <span className="font-black text-rose-500">{row.rate}%</span> });
    } else if (activeSubTab === "currencies") {
      baseCols.push({ header: "Tỷ giá đối chiếu", accessorKey: "exchangeRate", cell: (row) => <span className="font-black text-emerald-500">{formatVND(row.exchangeRate)}</span> });
    } else if (activeSubTab === "accounts") {
      baseCols.push({ 
        header: "Tài khoản Cha (Cấp trên)", 
        accessorKey: "parentAccount", 
        cell: (row) => {
          const targetParentId = row.parentAccountId || row.parentAccount?.accountId || row.parentAccount?.id;
          const parent = accounts.find((a: any) => (a.accountId || a.id) === targetParentId);
          return parent ? (
             <span className="font-semibold text-slate-700 dark:text-slate-300">[{parent.accountCode}] {parent.name}</span>
          ) : (
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">Gốc (Root)</span>
          );
        } 
      });
      baseCols.push({ 
        header: "Loại Tài khoản", 
        accessorKey: "accountType", 
        cell: (row) => {
          const typeMap: any = {
            CASH: "bg-emerald-50 text-emerald-600 border-emerald-200", BANK: "bg-blue-50 text-blue-600 border-blue-200",
            AR: "bg-indigo-50 text-indigo-600 border-indigo-200", AP: "bg-orange-50 text-orange-600 border-orange-200",
            EXPENSE: "bg-rose-50 text-rose-600 border-rose-200", REVENUE: "bg-purple-50 text-purple-600 border-purple-200",
            INVENTORY: "bg-amber-50 text-amber-600 border-amber-200", ASSET: "bg-teal-50 text-teal-600 border-teal-200", EQUITY: "bg-slate-100 text-slate-700 border-slate-300"
          };
          const style = typeMap[row.accountType] || "bg-slate-100 text-slate-600 border-slate-200";
          return <span className={cn("text-[10px] font-black px-2 py-1 rounded border uppercase tracking-wider", style)}>{row.accountType}</span>;
        } 
      });
    } else if (activeSubTab === "price_lists") {
      baseCols.push({ header: "Tiền tệ", accessorKey: "currencyCode", cell: (row) => <span className="font-bold text-slate-600">{row.currencyCode}</span> });
    }

    baseCols.push({
      header: "Trạng thái",
      accessorKey: "isActive",
      cell: (row) => {
        const isActive = row.isActive !== false; 
        return (
          <span className={cn(
            "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", 
            isActive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
          )}>
            {isActive ? 'Hoạt động' : 'Tạm khóa'}
          </span>
        );
      }
    });

    baseCols.push({
      header: "Thao tác",
      accessorKey: "actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {/* 🚀 BẢO MẬT: CHỈ DATA MANAGER ĐƯỢC PHÉP SỬA/XÓA */}
          <RequirePermission permissions={["MANAGE_MASTER_DATA"]}>
            <button 
              onClick={(e) => { e.stopPropagation(); handleOpenEditModal(row); }}
              title="Sửa thông tin"
              className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-xl transition-colors inline-flex justify-center items-center shadow-sm border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/30"
            >
              <Edit className="w-4 h-4" />
            </button>
          </RequirePermission>
          
          <RequirePermission permissions={["MANAGE_MASTER_DATA"]}>
            <button 
              onClick={(e) => { e.stopPropagation(); handleUniversalDelete(row); }}
              title="Xóa vĩnh viễn"
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl transition-colors inline-flex justify-center items-center shadow-sm border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </RequirePermission>
        </div>
      )
    });

    return baseCols;
  }, [activeSubTab, branches, warehouses, taxes, accounts, handleOpenEditModal, handleUniversalDelete]); 
}