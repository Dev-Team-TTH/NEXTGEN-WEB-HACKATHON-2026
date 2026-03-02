import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { updateAccessToken, setAuthTokens, logout } from "./index";

// ==========================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU (INTERFACES)
// ==========================================

export interface User {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  departmentId?: string;
  status: string;
  permissions?: string[];
  is2FAEnabled?: boolean;
}

export interface Product {
  productId: string;
  productCode: string;
  name: string;
  price: number;
  purchasePrice: number;
  standardCost?: number;
  costingMethod?: string;
  imageUrl?: string;
  reorderPoint?: number;
  hasVariants?: boolean;
  hasBatches?: boolean;
  totalStock?: number;
  availableStock?: number;
  status: string;
  categoryId: string;
  uomId: string;
}

export interface ProductVariant {
  variantId: string;
  productId: string;
  sku: string;
  attributes: string;
  additionalPrice: number;
}

export interface ProductBatch {
  batchId: string;
  productId: string;
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate?: string;
  isActive: boolean;
  product?: { name: string; productCode: string };
}

export interface InventoryBalance {
  balanceId: string;
  warehouseId: string;
  productId: string;
  variantId?: string | null;
  batchId?: string | null;
  binId?: string | null;
  costCenterId?: string | null;
  quantity: number;
  lockedQty: number;
  totalValue: number;
  avgCost: number;
  warehouse?: { name: string; code: string };
  product?: { name: string; productCode: string; uom: { name: string } };
  variant?: { sku: string; attributes: string };
  bin?: { code: string; description: string };
  costCenter?: { code: string; name: string };
}

export interface InventoryTransaction {
  transactionId: string;
  documentId: string;
  movementDirection: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  timestamp: string;
  document?: { documentNumber: string; type: string; note: string };
  product?: { name: string; productCode: string };
  fromWarehouse?: { name: string };
  toWarehouse?: { name: string };
}

export interface AssetMaintenance {
  maintenanceId: string;
  maintenanceDate: string;
  description: string;
  cost: number;
  performedBy?: string;
}

export interface AssetRevaluation {
  revaluationId: string;
  revaluationDate: string;
  oldValue: number;
  newValue: number;
  reason: string;
}

export interface Asset {
  assetId: string;
  assetCode: string;
  name: string;
  status: string;
  purchasePrice: number;
  currentValue: number;
  depreciationMethod?: string;
  depreciationMonths?: number;
  maintenanceHistory?: AssetMaintenance[]; 
  revaluations?: AssetRevaluation[];       
  maintenanceCycleMonths?: number;
  categoryId: string;
  category?: { name: string; code: string };
  department?: { name: string };
}

// Interface JournalLine chuẩn xác 100% để hiển thị Auto-complete Account/CostCenter
export interface JournalLine {
  lineId: string;
  accountId: string;
  costCenterId?: string | null;
  debit: number;
  credit: number;
  description?: string;
  account?: { accountCode: string; name: string; accountType: string };
  costCenter?: { code: string; name: string };
}

// Expense dùng chung lines với JournalLine để đảm bảo tính đồng bộ CSDL
export interface Expense {
  journalId: string;
  branchId: string;
  entryDate: string;
  reference: string;
  description: string;
  postingStatus: string;
  lines: JournalLine[]; 
}

export interface ExpenseSummary {
  categoryName: string;
  totalAmount: number;
}

export interface ApprovalRequest {
  requestId: string;
  documentId: string;
  status: string;
  currentStep: number;
  createdAt: string;
  workflow?: { name: string };
  requester?: { fullName: string; email: string };
  document?: any; 
}

export interface ApprovalLog {
  logId: string;
  requestId: string;
  step: number;
  action: string;
  comment?: string;
  createdAt: string;
  processor?: { fullName: string; email: string };
}

export interface DashboardMetrics {
  summary: {
    totalInventoryValue: number;
    currentCashBalance: number;
    totalAccountsReceivable: number;
    totalAccountsPayable: number;
  };
  financials: {
    totalCashIn: number;
    totalCashOut: number;
    currentMonth: { revenue: number; expense: number; netProfit: number };
  };
  tasks: { pendingApprovals: number };
  popularProducts: any[];
  recentActivities: SystemAuditLog[]; // Nhúng sẵn cho Dashboard nếu cần thiết
}

export interface MasterDataBasic {
  id?: string;
  code?: string;
  name?: string;
  [key: string]: any;
}

export interface DocumentTransactionLine {
  lineId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: { name: string; productCode: string };
}

export interface DocumentTx {
  documentId: string;
  documentNumber: string;
  type: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  currencyCode?: string;
  exchangeRate?: number;
  createdAt: string;
  supplier?: { name: string; code: string };
  customer?: { name: string; code: string };
  transactions?: DocumentTransactionLine[]; 
  documentSnapshot?: any;
  fiscalPeriodId?: string;
  isLocked: boolean;
  notes?: string;
}

export interface JournalEntry {
  journalId: string;
  entryDate: string;
  reference: string;
  description: string;
  postingStatus: string;
  lines: JournalLine[]; 
  isPeriodClosed?: boolean; 
  reversalEntryId?: string; 
  isReversed?: boolean;     
}

// --- TÀI CHÍNH CHUYÊN SÂU (REPORTS) ---
export interface CashflowData {
  period: string; 
  cashIn: number;
  cashOut: number;
  netCash: number;
}

export interface TrialBalanceData {
  accountId: string;
  accountCode: string;
  accountName: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

// --- TÀI CHÍNH & KẾ TOÁN ---
export interface Account {
  accountId: string;
  accountCode: string;
  name: string;
  accountType: string;
  description?: string;
  isActive: boolean;
}

export interface FiscalYear {
  yearId: string;
  yearName: string;
  startDate: string;
  endDate: string;
  status: string;
  isClosed?: boolean;
}

export interface FiscalPeriod {
  periodId: string;
  yearId: string;
  periodName: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface Tax {
  taxId: string;
  taxCode: string;
  name: string;
  rate: number;
  description?: string;
  isActive: boolean;
}

export interface Currency {
  currencyCode: string;
  name: string;
  exchangeRate: number;
  isActive: boolean;
}

export interface PriceList {
  priceListId: string;
  listName: string;
  currencyCode: string;
  isActive: boolean;
}

export interface Budget {
  budgetId: string;
  departmentId: string;
  periodId: string;
  totalAmount: number;
  usedAmount: number;
  isActive: boolean;
}

// --- CƠ CẤU TỔ CHỨC & KHO BÃI & ĐỐI TÁC ---
export interface Company {
  companyId: string;
  code: string;
  name: string;
  taxCode?: string;
  address?: string;
}

export interface Branch {
  branchId: string;
  companyId: string;
  code: string;
  name: string;
  address?: string;
}

export interface Department {
  departmentId: string;
  branchId: string;
  code: string;
  name: string;
}

export interface CostCenter {
  costCenterId: string;
  code: string;
  name: string;
}

export interface Supplier {
  supplierId: string;
  code: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
}

export interface Customer {
  customerId: string;
  code: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
}

export interface Warehouse {
  warehouseId: string;
  branchId: string;
  code: string;
  name: string;
  address?: string;
}

export interface BinLocation {
  binId: string;
  warehouseId: string;
  code: string;
  description?: string;
}

export interface ProductCategory {
  categoryId: string;
  code: string;
  name: string;
  description?: string;
}

export interface UnitOfMeasure {
  uomId: string;
  code: string;
  name: string;
}

// --- UOM CONVERSION, LANDED COST, AUDIT LOG ---
export interface ProductUomConversion {
  conversionId: string;
  productId: string;
  fromUomId: string;
  toUomId: string;
  conversionRate: number;
  product?: { name: string };
  fromUom?: { name: string };
  toUom?: { name: string };
}

export interface LandedCost {
  landedCostId: string;
  documentId: string;
  expenseName: string;
  amount: number;
  allocationMethod: string;
  status: string;
  isAllocated?: boolean; 
}

export interface SystemAuditLog {
  logId: string;
  userId: string;
  action: string;
  entityName: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  user?: { fullName: string; email: string };
}

// ==========================================
// 2. KHỞI TẠO REDUX TOOLKIT QUERY API
// ==========================================

// ==========================================
// 2. CẤU HÌNH API GỐC VÀ CHÈN TOKEN (BASE QUERY MỚI)
// ==========================================

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1",
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as any; 
    
    // 1. Lấy từ Redux RAM (Chạy bình thường khi state đã hydrat xong)
    let token = state.global?.accessToken;
    
    // 2. GIẢI MÃ REDUX PERSIST BẰNG TAY (Chống lỗi F5 Race Condition)
    if (!token && typeof window !== "undefined") {
      try {
        // Redux Persist bọc data trong các key này, phải tìm và Parse JSON
        const persistKeys = ["persist:root", "persist:global", "persist:auth"];
        for (const key of persistKeys) {
          const persistData = localStorage.getItem(key);
          if (persistData) {
            const parsedData = JSON.parse(persistData);
            // Slice global hoặc auth thường bị JSON.stringify lần 2 bởi redux-persist
            const globalSlice = parsedData.global ? JSON.parse(parsedData.global) : null;
            
            // Ép móc Access Token ra!
            token = globalSlice?.accessToken || token;
            if (token) break; // Lấy được là thoát vòng lặp ngay
          }
        }
      } catch (error) {
        console.error("Lỗi trích xuất Token từ Persist:", error);
      }

      // 3. Fallback dự phòng
      if (!token) {
        token = localStorage.getItem("accessToken");
      }
    }

    if (token && token !== "null" && token !== "undefined") {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    return headers;
  },
});

// ==========================================
// 3. XÂY DỰNG LÁ CHẮN "INTERCEPTOR" THÔNG MINH (CHỐNG CHẾT TOKEN)
// ==========================================

// Biến cờ (Mutex Flag) để tránh Gọi Refresh Token nhiều lần cùng lúc khi có hàng loạt API bị 401
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  // Bước 1: Vẫn gọi API như bình thường
  let result = await baseQuery(args, api, extraOptions);

  // Bước 2: NẾU BỊ 401 UNAUTHORIZED (Mặc dù đã cố gắng gửi token) -> TOKEN HẾT HẠN
  if (result.error && result.error.status === 401) {
    
    // Khóa luồng (Race Condition Lock)
    if (!isRefreshing) {
      isRefreshing = true;
      
      refreshPromise = (async () => {
        try {
          const state = api.getState() as any;
          // Cố gắng lấy từ RAM trước
          let refreshToken = state.global?.refreshToken;
          
          // GIẢI MÃ REDUX PERSIST TÌM REFRESH TOKEN (Chống F5 Race Condition)
          if (!refreshToken && typeof window !== "undefined") {
            const persistKeys = ["persist:root", "persist:global", "persist:auth"];
            for (const key of persistKeys) {
              const persistData = localStorage.getItem(key);
              if (persistData) {
                const parsedData = JSON.parse(persistData);
                // Slice global hoặc auth thường bị JSON.stringify lần 2 bởi redux-persist
                const globalSlice = parsedData.global ? JSON.parse(parsedData.global) : null;
                
                // Ép móc Refresh Token ra!
                refreshToken = globalSlice?.refreshToken || refreshToken;
                if (refreshToken) break;
              }
            }
            // Fallback cuối cùng nếu app tự lưu key rời
            if (!refreshToken) refreshToken = localStorage.getItem("refreshToken");
          }

          if (refreshToken) {
            // GỌI API REFRESH TOKEN NGẦM
            const refreshResult = await baseQuery(
              {
                url: "/auth/refresh-token",
                method: "POST",
                body: { refreshToken },
              },
              api,
              extraOptions
            );

            if (refreshResult.data) {
              const data = refreshResult.data as any;
              
              // Trích xuất Token mới tùy theo cấu trúc trả về của Backend
              const newAccessToken = data.accessToken || data.metadata?.accessToken || data.data?.accessToken;
              const newRefreshToken = data.refreshToken || data.metadata?.refreshToken || data.data?.refreshToken;

              if (newAccessToken) {
                // Đập thẳng Token mới vào Redux 
                if (newRefreshToken) {
                  api.dispatch(setAuthTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken }));
                } else {
                  api.dispatch(updateAccessToken(newAccessToken));
                }
                return newAccessToken;
              }
            }
          }
          
          // Đã cố gắng mọi cách nhưng vô vọng (Refresh token chết nốt) -> Đá ra trang Đăng nhập
          api.dispatch(logout());
          return null;
        } catch (err) {
          api.dispatch(logout());
          return null;
        } finally {
          isRefreshing = false; // Xả khóa
        }
      })();
    }

    // Đợi đến khi quá trình đổi token hoàn tất (Các API khác bị 401 cùng lúc sẽ đứng ở đây chờ)
    const newAccessToken = await refreshPromise;

    // Bước 3: NẾU THAY MÁU THÀNH CÔNG -> GỌI LẠI CÁI API VỪA BỊ XỊT!
    if (newAccessToken) {
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth", "Security", "Session", "Dashboard", "Finance", 
    "Users", "Roles", "Permissions", "AuditLogs",
    "Products", "ProductVariants", "ProductBatches", "UomConversions",
    "Inventory", 
    "Assets", "AssetCategories", "AssetRequests",
    "Expenses", 
    "Approvals", "ApprovalConfig", "ApprovalLogs",
    "Transactions", "LandedCosts",
    "Accounting", "FinancialReports",
    "Companies", "Branches", "Departments", "CostCenters", 
    "Suppliers", "Customers", "Warehouses", "Bins", 
    "Categories", "UoMs", 
    "Taxes", "Currencies", "ExchangeRates", "PriceLists", "Budgets",
    "Accounts", "FiscalYears", "FiscalPeriods"
  ],

  // ==========================================
  // 3. ĐỊNH NGHĨA CÁC ENDPOINTS
  // ==========================================
  endpoints: (build) => ({
    
    // ------------------------------------------
    // A1. AUTHENTICATION & SESSION MANAGEMENT
    // ------------------------------------------
    login: build.mutation<any, any>({ query: (body) => ({ url: "/auth/login", method: "POST", body }), invalidatesTags: ["Auth", "Session"] }),
    verify2FALogin: build.mutation<any, any>({ query: (body) => ({ url: "/auth/verify-2fa", method: "POST", body }), invalidatesTags: ["Auth", "Session"] }),
    getMe: build.query<User, void>({ query: () => "/auth/me", providesTags: ["Auth"] }),
    refreshToken: build.mutation<any, { refreshToken: string }>({ query: (body) => ({ url: "/auth/refresh-token", method: "POST", body }), invalidatesTags: ["Auth", "Session"] }),
    logout: build.mutation<any, void>({ query: () => ({ url: "/auth/logout", method: "POST" }), invalidatesTags: ["Auth", "Session"] }),
    logoutAllDevices: build.mutation<any, void>({ query: () => ({ url: "/auth/logout-all", method: "POST" }), invalidatesTags: ["Auth", "Session"] }),

    // ------------------------------------------
    // A2. ADVANCED SECURITY & 2FA
    // ------------------------------------------
    changePassword: build.mutation<any, any>({ query: (body) => ({ url: "/auth/change-password", method: "POST", body }) }),
    generate2FASecret: build.mutation<any, void>({ query: () => ({ url: "/auth/2fa/generate", method: "POST" }) }),
    enable2FA: build.mutation<any, { token: string }>({ query: (body) => ({ url: "/auth/2fa/enable", method: "POST", body }), invalidatesTags: ["Auth", "Security"] }),
    disable2FA: build.mutation<any, { token: string }>({ query: (body) => ({ url: "/auth/2fa/disable", method: "POST", body }), invalidatesTags: ["Auth", "Security"] }), 

    // ------------------------------------------
    // A3. ORG_RBAC & AUDIT LOGS
    // ------------------------------------------
    getUsers: build.query<User[], any>({ query: (params) => ({ url: "/org-rbac/users", params }), providesTags: ["Users"] }),
    getUserById: build.query<User, string>({ query: (id) => `/org-rbac/users/${id}`, providesTags: ["Users"] }),
    createUser: build.mutation<User, Partial<User>>({ query: (body) => ({ url: "/auth/users", method: "POST", body }), invalidatesTags: ["Users"] }),
    updateUser: build.mutation<User, { id: string; data: Partial<User> }>({ query: ({ id, data }) => ({ url: `/org-rbac/users/${id}`, method: "PUT", body: data }), invalidatesTags: ["Users", "Auth"] }),
    deleteUser: build.mutation<void, string>({ query: (id) => ({ url: `/org-rbac/users/${id}`, method: "DELETE" }), invalidatesTags: ["Users"] }),
    
    getPermissions: build.query<any, void>({ query: () => "/org-rbac/permissions", providesTags: ["Permissions"] }),
    getRoles: build.query<any[], void>({ query: () => "/org-rbac/roles", providesTags: ["Roles"] }),
    createRole: build.mutation<any, any>({ query: (body) => ({ url: "/org-rbac/roles", method: "POST", body }), invalidatesTags: ["Roles"] }),
    updateRole: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/org-rbac/roles/${id}`, method: "PUT", body: data }), invalidatesTags: ["Roles", "Users"] }),
    deleteRole: build.mutation<void, string>({ query: (id) => ({ url: `/org-rbac/roles/${id}`, method: "DELETE" }), invalidatesTags: ["Roles"] }),
    getOrganizationStructure: build.query<any, void>({ query: () => "/org-rbac/organization", providesTags: ["Companies", "Branches", "Departments"] }),
    
    // Tổng hợp Logs
    getSystemAuditLogs: build.query<SystemAuditLog[], any>({ query: (params) => ({ url: "/org-rbac/audit-logs", params }), providesTags: ["AuditLogs"] }),
    getAuditLogsByRecord: build.query<SystemAuditLog[], { tableName: string; recordId: string }>({ query: (params) => ({ url: "/org-rbac/audit-logs/detail", params }), providesTags: ["AuditLogs"] }),
    
    // NÂNG CẤP DASHBOARD: API lấy danh sách Hoạt động gần đây (Limit 10)
    getRecentActivities: build.query<SystemAuditLog[], number | void>({ 
      query: (limit = 10) => ({ url: "/org-rbac/audit-logs", params: { limit, sort: 'desc' } }), 
      providesTags: ["AuditLogs"] 
    }),

    // ------------------------------------------
    // B. DASHBOARD & FINANCIAL REPORTS
    // ------------------------------------------
    getDashboardMetrics: build.query<DashboardMetrics, string | void>({ query: (branchId) => ({ url: "/dashboard", params: branchId ? { branchId } : {} }), providesTags: ["Dashboard"] }),
    
    getCashflowReport: build.query<CashflowData[], any>({ query: (params) => ({ url: "/accounting/reports/cashflow", params }), providesTags: ["FinancialReports", "Accounting"] }),
    getTrialBalanceReport: build.query<TrialBalanceData[], any>({ query: (params) => ({ url: "/accounting/reports/trial-balance", params }), providesTags: ["FinancialReports", "Accounting"] }),

    // ------------------------------------------
    // C. PRODUCTS & UOM CONVERSIONS
    // ------------------------------------------
    getProducts: build.query<Product[], any>({ query: (params) => ({ url: "/products", params }), providesTags: ["Products"] }),
    getProductById: build.query<Product, string>({ query: (id) => `/products/${id}`, providesTags: ["Products"] }),
    createProduct: build.mutation<Product, Partial<Product>>({ query: (body) => ({ url: "/products", method: "POST", body }), invalidatesTags: ["Products", "Dashboard"] }),
    updateProduct: build.mutation<Product, { id: string; data: Partial<Product> }>({ query: ({ id, data }) => ({ url: `/products/${id}`, method: "PUT", body: data }), invalidatesTags: ["Products"] }),
    deleteProduct: build.mutation<void, string>({ query: (id) => ({ url: `/products/${id}`, method: "DELETE" }), invalidatesTags: ["Products"] }),
    getProductVariants: build.query<ProductVariant[], string>({ query: (id) => `/products/${id}/variants`, providesTags: ["ProductVariants"] }),
    
    getProductBatches: build.query<ProductBatch[], string>({ query: (id) => `/products/${id}/batches`, providesTags: ["ProductBatches"] }),
    createProductBatch: build.mutation<ProductBatch, Partial<ProductBatch>>({ query: (body) => ({ url: "/products/batches", method: "POST", body }), invalidatesTags: ["ProductBatches", "Products"] }),
    updateProductBatch: build.mutation<ProductBatch, { id: string; data: Partial<ProductBatch> }>({ query: ({ id, data }) => ({ url: `/products/batches/${id}`, method: "PUT", body: data }), invalidatesTags: ["ProductBatches", "Products"] }),
    deleteProductBatch: build.mutation<void, string>({ query: (id) => ({ url: `/products/batches/${id}`, method: "DELETE" }), invalidatesTags: ["ProductBatches", "Products"] }),

    getUomConversions: build.query<ProductUomConversion[], any>({ query: (params) => ({ url: "/products/uom-conversions", params }), providesTags: ["UomConversions"] }),
    createUomConversion: build.mutation<ProductUomConversion, Partial<ProductUomConversion>>({ query: (body) => ({ url: "/products/uom-conversions", method: "POST", body }), invalidatesTags: ["UomConversions", "Products"] }),
    updateUomConversion: build.mutation<ProductUomConversion, { id: string; data: Partial<ProductUomConversion> }>({ query: ({ id, data }) => ({ url: `/products/uom-conversions/${id}`, method: "PUT", body: data }), invalidatesTags: ["UomConversions", "Products"] }),
    deleteUomConversion: build.mutation<void, string>({ query: (id) => ({ url: `/products/uom-conversions/${id}`, method: "DELETE" }), invalidatesTags: ["UomConversions", "Products"] }),

    // ------------------------------------------
    // D. INVENTORY
    // ------------------------------------------
    getInventoryBalances: build.query<InventoryBalance[], any>({ query: (params) => ({ url: "/inventory/balances", params }), providesTags: ["Inventory"] }),
    getInventoryTransactions: build.query<InventoryTransaction[], any>({ query: (params) => ({ url: "/inventory/transactions", params }), providesTags: ["Inventory"] }),
    
    adjustStock: build.mutation<any, any>({ 
      query: (body) => ({ url: "/inventory/adjust", method: "POST", body }), 
      invalidatesTags: ["Inventory", "Products", "Dashboard", "Transactions", "Finance", "Accounting", "FinancialReports"] 
    }),
    transferStock: build.mutation<any, any>({ 
      query: (body) => ({ url: "/inventory/transfer", method: "POST", body }), 
      invalidatesTags: ["Inventory", "Products", "Transactions"] 
    }),

    // ------------------------------------------
    // E. ASSETS & ASSET MASTER
    // ------------------------------------------
    getAssetCategories: build.query<any[], void>({ query: () => "/asset-master/categories", providesTags: ["AssetCategories"] }),
    createAssetCategory: build.mutation<any, any>({ query: (body) => ({ url: "/asset-master/categories", method: "POST", body }), invalidatesTags: ["AssetCategories"] }),
    updateAssetCategory: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/asset-master/categories/${id}`, method: "PUT", body: data }), invalidatesTags: ["AssetCategories"] }),
    deleteAssetCategory: build.mutation<void, string>({ query: (id) => ({ url: `/asset-master/categories/${id}`, method: "DELETE" }), invalidatesTags: ["AssetCategories"] }),

    getAssets: build.query<Asset[], any>({ query: (params) => ({ url: "/assets", params }), providesTags: ["Assets"] }),
    getAssetById: build.query<Asset, string>({ query: (id) => `/assets/${id}`, providesTags: ["Assets"] }),
    createAsset: build.mutation<Asset, Partial<Asset>>({ query: (body) => ({ url: "/assets", method: "POST", body }), invalidatesTags: ["Assets"] }),
    updateAsset: build.mutation<Asset, { id: string; data: Partial<Asset> }>({ query: ({ id, data }) => ({ url: `/assets/${id}`, method: "PUT", body: data }), invalidatesTags: ["Assets"] }),
    deleteAsset: build.mutation<void, string>({ query: (id) => ({ url: `/assets/${id}`, method: "DELETE" }), invalidatesTags: ["Assets"] }),
    
    assignAsset: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/assets/${id}/assign`, method: "POST", body: data }), invalidatesTags: ["Assets"] }),
    returnAsset: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/assets/${id}/return`, method: "POST", body: data }), invalidatesTags: ["Assets"] }),
    logAssetMaintenance: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/assets/${id}/maintenance`, method: "POST", body: data }), invalidatesTags: ["Assets"] }),
    completeAssetMaintenance: build.mutation<any, { maintenanceId: string; data: any }>({ query: ({ maintenanceId, data }) => ({ url: `/assets/maintenances/${maintenanceId}/complete`, method: "PUT", body: data }), invalidatesTags: ["Assets"] }),
    
    // NÂNG CẤP: Đánh giá lại TS sẽ tạo bút toán nên cần Invalidate Accounting & Finance
    revaluateAsset: build.mutation<any, { id: string; data: any }>({ 
      query: ({ id, data }) => ({ url: `/assets/${id}/revaluate`, method: "POST", body: data }), 
      invalidatesTags: ["Assets", "Accounting", "Finance", "FinancialReports"] 
    }),
    liquidateAsset: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/assets/${id}/liquidate`, method: "POST", body: data }), invalidatesTags: ["Assets", "Accounting", "Finance", "FinancialReports"] }),
    runAssetDepreciation: build.mutation<any, any>({ query: (body) => ({ url: `/assets/depreciation/run`, method: "POST", body }), invalidatesTags: ["Assets", "Accounting", "Finance", "FinancialReports"] }),
    getAssetHistory: build.query<any, string>({ query: (id) => `/assets/${id}/history`, providesTags: ["Assets"] }),

    getAssetRequests: build.query<any[], any>({ query: (params) => ({ url: "/assets/requests/all", params }), providesTags: ["AssetRequests"] }),
    approveAssetRequest: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/assets/requests/${id}/approve`, method: "PUT", body: data }), invalidatesTags: ["AssetRequests"] }),
    rejectAssetRequest: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/assets/requests/${id}/reject`, method: "PUT", body: data }), invalidatesTags: ["AssetRequests"] }),

    // ------------------------------------------
    // F. EXPENSES
    // ------------------------------------------
    getExpenses: build.query<Expense[], any>({ query: (params) => ({ url: "/expenses", params }), providesTags: ["Expenses"] }),
    getExpenseById: build.query<Expense, string>({ query: (id) => `/expenses/${id}`, providesTags: ["Expenses"] }),
    getExpenseSummary: build.query<ExpenseSummary[], any>({ query: (params) => ({ url: "/expenses/category", params }), providesTags: ["Expenses"] }),
    createExpense: build.mutation<Expense, Partial<Expense>>({ query: (body) => ({ url: "/expenses", method: "POST", body }), invalidatesTags: ["Expenses"] }),
    updateExpense: build.mutation<Expense, { id: string; data: Partial<Expense> }>({ query: ({ id, data }) => ({ url: `/expenses/${id}`, method: "PUT", body: data }), invalidatesTags: ["Expenses"] }),
    deleteExpense: build.mutation<void, string>({ query: (id) => ({ url: `/expenses/${id}`, method: "DELETE" }), invalidatesTags: ["Expenses"] }),
    postExpense: build.mutation<any, string>({ query: (id) => ({ url: `/expenses/${id}/post`, method: "POST" }), invalidatesTags: ["Expenses", "Dashboard", "Budgets", "Accounting", "Finance", "FinancialReports"] }),

    // ------------------------------------------
    // G. APPROVALS & APPROVAL CONFIG
    // ------------------------------------------
    getPendingApprovals: build.query<ApprovalRequest[], void>({ query: () => "/approvals/pending", providesTags: ["Approvals"] }),
    getMyRequests: build.query<ApprovalRequest[], void>({ query: () => "/approvals/my-requests", providesTags: ["Approvals"] }),
    getApprovalById: build.query<ApprovalRequest, string>({ query: (id) => `/approvals/${id}`, providesTags: ["Approvals"] }),
    getApprovalLogs: build.query<ApprovalLog[], string>({ query: (requestId) => `/approvals/${requestId}/logs`, providesTags: ["ApprovalLogs"] }),
    
    submitApproval: build.mutation<any, { documentId: string; comment?: string }>({ query: (body) => ({ url: "/approvals/submit", method: "POST", body }), invalidatesTags: ["Approvals", "Transactions"] }),
    
    processApproval: build.mutation<any, { id: string; action: "APPROVE" | "REJECT"; comment?: string }>({ 
      query: ({ id, ...body }) => ({ url: `/approvals/${id}/action`, method: "POST", body }), 
      invalidatesTags: ["Approvals", "ApprovalLogs", "Dashboard", "Inventory", "Transactions", "Accounting", "Products", "Finance", "LandedCosts"] 
    }),
    cancelApproval: build.mutation<any, string>({ query: (id) => ({ url: `/approvals/${id}/cancel`, method: "POST" }), invalidatesTags: ["Approvals", "Transactions"] }),

    getWorkflows: build.query<any[], any>({ query: (params) => ({ url: "/approval-config", params }), providesTags: ["ApprovalConfig"] }),
    getWorkflowById: build.query<any, string>({ query: (id) => `/approval-config/${id}`, providesTags: ["ApprovalConfig"] }),
    createWorkflow: build.mutation<any, any>({ query: (body) => ({ url: "/approval-config", method: "POST", body }), invalidatesTags: ["ApprovalConfig"] }),
    updateWorkflow: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/approval-config/${id}`, method: "PUT", body: data }), invalidatesTags: ["ApprovalConfig"] }),
    deleteWorkflow: build.mutation<void, string>({ query: (id) => ({ url: `/approval-config/${id}`, method: "DELETE" }), invalidatesTags: ["ApprovalConfig"] }),

    // ------------------------------------------
    // H. MASTER DATA
    // ------------------------------------------
    getCompanies: build.query<Company[], void>({ query: () => "/master-data/companies", providesTags: ["Companies"] }),
    createCompany: build.mutation<Company, Partial<Company>>({ query: (body) => ({ url: "/master-data/companies", method: "POST", body }), invalidatesTags: ["Companies"] }),
    updateCompany: build.mutation<Company, { id: string; data: Partial<Company> }>({ query: ({ id, data }) => ({ url: `/master-data/companies/${id}`, method: "PUT", body: data }), invalidatesTags: ["Companies"] }),
    deleteCompany: build.mutation<void, string>({ query: (id) => ({ url: `/master-data/companies/${id}`, method: "DELETE" }), invalidatesTags: ["Companies"] }),

    getBranches: build.query<Branch[], void>({ query: () => "/master-data/branches", providesTags: ["Branches"] }),
    createBranch: build.mutation<Branch, Partial<Branch>>({ query: (body) => ({ url: "/master-data/branches", method: "POST", body }), invalidatesTags: ["Branches"] }),
    updateBranch: build.mutation<Branch, { id: string; data: Partial<Branch> }>({ query: ({ id, data }) => ({ url: `/master-data/branches/${id}`, method: "PUT", body: data }), invalidatesTags: ["Branches"] }),
    deleteBranch: build.mutation<void, string>({ query: (id) => ({ url: `/master-data/branches/${id}`, method: "DELETE" }), invalidatesTags: ["Branches"] }),

    getDepartments: build.query<Department[], any>({ query: (params) => ({ url: "/master-data/departments", params }), providesTags: ["Departments"] }),
    createDepartment: build.mutation<Department, Partial<Department>>({ query: (body) => ({ url: "/master-data/departments", method: "POST", body }), invalidatesTags: ["Departments"] }),
    updateDepartment: build.mutation<Department, { id: string; data: Partial<Department> }>({ query: ({ id, data }) => ({ url: `/master-data/departments/${id}`, method: "PUT", body: data }), invalidatesTags: ["Departments"] }),
    deleteDepartment: build.mutation<void, string>({ query: (id) => ({ url: `/master-data/departments/${id}`, method: "DELETE" }), invalidatesTags: ["Departments"] }),

    getCostCenters: build.query<CostCenter[], void>({ query: () => "/master-data/cost-centers", providesTags: ["CostCenters"] }),
    createCostCenter: build.mutation<CostCenter, Partial<CostCenter>>({ query: (body) => ({ url: "/master-data/cost-centers", method: "POST", body }), invalidatesTags: ["CostCenters"] }),
    updateCostCenter: build.mutation<CostCenter, { id: string; data: Partial<CostCenter> }>({ query: ({ id, data }) => ({ url: `/master-data/cost-centers/${id}`, method: "PUT", body: data }), invalidatesTags: ["CostCenters"] }),
    deleteCostCenter: build.mutation<void, string>({ query: (id) => ({ url: `/master-data/cost-centers/${id}`, method: "DELETE" }), invalidatesTags: ["CostCenters"] }),

    getSuppliers: build.query<Supplier[], void>({ query: () => "/master-data/suppliers", providesTags: ["Suppliers"] }),
    createSupplier: build.mutation<Supplier, Partial<Supplier>>({ query: (body) => ({ url: "/master-data/suppliers", method: "POST", body }), invalidatesTags: ["Suppliers"] }),
    updateSupplier: build.mutation<Supplier, { id: string; data: Partial<Supplier> }>({ query: ({ id, data }) => ({ url: `/master-data/suppliers/${id}`, method: "PUT", body: data }), invalidatesTags: ["Suppliers"] }),
    deleteSupplier: build.mutation<void, string>({ query: (id) => ({ url: `/master-data/suppliers/${id}`, method: "DELETE" }), invalidatesTags: ["Suppliers"] }),

    getCustomers: build.query<Customer[], void>({ query: () => "/master-data/customers", providesTags: ["Customers"] }),
    createCustomer: build.mutation<Customer, Partial<Customer>>({ query: (body) => ({ url: "/master-data/customers", method: "POST", body }), invalidatesTags: ["Customers"] }),
    updateCustomer: build.mutation<Customer, { id: string; data: Partial<Customer> }>({ query: ({ id, data }) => ({ url: `/master-data/customers/${id}`, method: "PUT", body: data }), invalidatesTags: ["Customers"] }),
    deleteCustomer: build.mutation<void, string>({ query: (id) => ({ url: `/master-data/customers/${id}`, method: "DELETE" }), invalidatesTags: ["Customers"] }),

    getWarehouses: build.query<Warehouse[], any>({ query: (params) => ({ url: "/master-data/warehouses", params }), providesTags: ["Warehouses"] }),
    createWarehouse: build.mutation<Warehouse, Partial<Warehouse>>({ query: (body) => ({ url: "/master-data/warehouses", method: "POST", body }), invalidatesTags: ["Warehouses"] }),
    updateWarehouse: build.mutation<Warehouse, { id: string; data: Partial<Warehouse> }>({ query: ({ id, data }) => ({ url: `/master-data/warehouses/${id}`, method: "PUT", body: data }), invalidatesTags: ["Warehouses"] }),
    deleteWarehouse: build.mutation<void, string>({ query: (id) => ({ url: `/master-data/warehouses/${id}`, method: "DELETE" }), invalidatesTags: ["Warehouses"] }),

    getBins: build.query<BinLocation[], any>({ query: (params) => ({ url: "/master-data/bins", params }), providesTags: ["Bins"] }),
    createBin: build.mutation<BinLocation, Partial<BinLocation>>({ query: (body) => ({ url: "/master-data/bins", method: "POST", body }), invalidatesTags: ["Bins"] }),
    updateBin: build.mutation<BinLocation, { id: string; data: Partial<BinLocation> }>({ query: ({ id, data }) => ({ url: `/master-data/bins/${id}`, method: "PUT", body: data }), invalidatesTags: ["Bins"] }),
    deleteBin: build.mutation<void, string>({ query: (id) => ({ url: `/master-data/bins/${id}`, method: "DELETE" }), invalidatesTags: ["Bins"] }),

    getCategories: build.query<ProductCategory[], void>({ query: () => "/master-data/categories", providesTags: ["Categories"] }),
    createCategory: build.mutation<ProductCategory, Partial<ProductCategory>>({ query: (body) => ({ url: "/master-data/categories", method: "POST", body }), invalidatesTags: ["Categories"] }),
    updateCategory: build.mutation<ProductCategory, { id: string; data: Partial<ProductCategory> }>({ query: ({ id, data }) => ({ url: `/master-data/categories/${id}`, method: "PUT", body: data }), invalidatesTags: ["Categories"] }),
    deleteCategory: build.mutation<void, string>({ query: (id) => ({ url: `/master-data/categories/${id}`, method: "DELETE" }), invalidatesTags: ["Categories"] }),

    getUoMs: build.query<UnitOfMeasure[], void>({ query: () => "/master-data/uoms", providesTags: ["UoMs"] }),
    createUoM: build.mutation<UnitOfMeasure, Partial<UnitOfMeasure>>({ query: (body) => ({ url: "/master-data/uoms", method: "POST", body }), invalidatesTags: ["UoMs"] }),
    updateUoM: build.mutation<UnitOfMeasure, { id: string; data: Partial<UnitOfMeasure> }>({ query: ({ id, data }) => ({ url: `/master-data/uoms/${id}`, method: "PUT", body: data }), invalidatesTags: ["UoMs"] }),
    deleteUoM: build.mutation<void, string>({ query: (id) => ({ url: `/master-data/uoms/${id}`, method: "DELETE" }), invalidatesTags: ["UoMs"] }),

    // ------------------------------------------
    // I. TRANSACTIONS & LANDED COSTS
    // ------------------------------------------
    getDocuments: build.query<DocumentTx[], any>({ query: (params) => ({ url: "/transactions", params }), providesTags: ["Transactions"] }),
    getDocumentById: build.query<DocumentTx, string>({ query: (id) => `/transactions/${id}`, providesTags: ["Transactions"] }),
    createDocument: build.mutation<any, any>({ query: (body) => ({ url: "/transactions", method: "POST", body }), invalidatesTags: ["Transactions"] }),
    updateDocument: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/transactions/${id}`, method: "PUT", body: data }), invalidatesTags: ["Transactions"] }),
    deleteDocument: build.mutation<void, string>({ query: (id) => ({ url: `/transactions/${id}`, method: "DELETE" }), invalidatesTags: ["Transactions", "Dashboard"] }), 
    
    // NÂNG CẤP: Phê duyệt chứng từ làm thay đổi toàn bộ bức tranh tài chính/kho bãi
    approveDocumentDirectly: build.mutation<any, { id: string; data: any }>({ 
      query: ({ id, data }) => ({ url: `/transactions/${id}/approve`, method: "POST", body: data }), 
      invalidatesTags: ["Transactions", "Inventory", "Accounting", "Dashboard", "Products", "Finance", "LandedCosts", "FinancialReports"] 
    }),

    getLandedCosts: build.query<LandedCost[], any>({ query: (params) => ({ url: "/transactions/landed-costs", params }), providesTags: ["LandedCosts"] }),
    createLandedCost: build.mutation<LandedCost, Partial<LandedCost>>({ query: (body) => ({ url: "/transactions/landed-costs", method: "POST", body }), invalidatesTags: ["LandedCosts", "Transactions", "Products", "Finance"] }),
    updateLandedCost: build.mutation<LandedCost, { id: string; data: Partial<LandedCost> }>({ query: ({ id, data }) => ({ url: `/transactions/landed-costs/${id}`, method: "PUT", body: data }), invalidatesTags: ["LandedCosts", "Transactions", "Products", "Finance"] }),
    deleteLandedCost: build.mutation<void, string>({ query: (id) => ({ url: `/transactions/landed-costs/${id}`, method: "DELETE" }), invalidatesTags: ["LandedCosts", "Transactions", "Products", "Finance"] }),
    
    // NÂNG CẤP NÚT PHÂN BỔ: Làm thay đổi Tồn kho (Unit Cost) và Báo cáo tài chính
    allocateLandedCost: build.mutation<any, string>({ 
      query: (id) => ({ url: `/transactions/landed-costs/${id}/allocate`, method: "POST" }), 
      invalidatesTags: ["LandedCosts", "Transactions", "Products", "Finance", "Accounting", "Inventory", "FinancialReports"] 
    }),

    // ------------------------------------------
    // J. ACCOUNTING & FINANCE SETUP 
    // ------------------------------------------
    getJournalEntries: build.query<JournalEntry[], any>({ query: (params) => ({ url: "/accounting/journal-entries", params }), providesTags: ["Accounting"] }),
    getJournalEntryById: build.query<any, string>({ query: (id) => `/accounting/journal-entries/${id}`, providesTags: ["Accounting"] }),
    createJournalEntry: build.mutation<any, any>({ query: (body) => ({ url: "/accounting/journal-entries", method: "POST", body }), invalidatesTags: ["Accounting"] }),
    updateJournalEntry: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/accounting/journal-entries/${id}`, method: "PUT", body: data }), invalidatesTags: ["Accounting"] }),
    deleteJournalEntry: build.mutation<void, string>({ query: (id) => ({ url: `/accounting/journal-entries/${id}`, method: "DELETE" }), invalidatesTags: ["Accounting"] }),
    postJournalEntry: build.mutation<any, string>({ query: (id) => ({ url: `/accounting/journal-entries/${id}/post`, method: "POST" }), invalidatesTags: ["Accounting", "Dashboard", "Finance", "FinancialReports"] }),
    reverseJournalEntry: build.mutation<any, { id: string; data: any }>({ query: ({ id, data }) => ({ url: `/accounting/journal-entries/${id}/reverse`, method: "POST", body: data }), invalidatesTags: ["Accounting", "Dashboard", "Finance", "FinancialReports"] }),
    processPayment: build.mutation<any, { documentId: string; data: any }>({ query: ({ documentId, data }) => ({ url: `/accounting/documents/${documentId}/pay`, method: "POST", body: data }), invalidatesTags: ["Accounting", "Transactions", "Dashboard", "Finance", "FinancialReports"] }),

    getAccounts: build.query<Account[], any>({ query: (params) => ({ url: "/finance-setup/accounts", params }), providesTags: ["Accounts"] }),
    createAccount: build.mutation<Account, Partial<Account>>({ query: (body) => ({ url: "/finance-setup/accounts", method: "POST", body }), invalidatesTags: ["Accounts", "FinancialReports"] }),
    updateAccount: build.mutation<Account, { id: string; data: Partial<Account> }>({ query: ({ id, data }) => ({ url: `/finance-setup/accounts/${id}`, method: "PUT", body: data }), invalidatesTags: ["Accounts", "FinancialReports"] }),
    deleteAccount: build.mutation<void, string>({ query: (id) => ({ url: `/finance-setup/accounts/${id}`, method: "DELETE" }), invalidatesTags: ["Accounts", "FinancialReports"] }),

    getFiscalYears: build.query<FiscalYear[], void>({ query: () => "/finance-setup/years", providesTags: ["FiscalYears"] }),
    createFiscalYear: build.mutation<FiscalYear, Partial<FiscalYear>>({ query: (body) => ({ url: "/finance-setup/years", method: "POST", body }), invalidatesTags: ["FiscalYears", "FiscalPeriods"] }),
    
    closeFiscalYear: build.mutation<any, string>({ query: (id) => ({ url: `/finance-setup/years/${id}/close`, method: "POST" }), invalidatesTags: ["FiscalYears", "FiscalPeriods", "Accounting", "Transactions"] }),
    
    getFiscalPeriods: build.query<FiscalPeriod[], any>({ query: (params) => ({ url: "/finance-setup/periods", params }), providesTags: ["FiscalPeriods"] }),
    closeFiscalPeriod: build.mutation<any, string>({ query: (id) => ({ url: `/finance-setup/periods/${id}/close`, method: "POST" }), invalidatesTags: ["FiscalPeriods", "Accounting", "Transactions"] }), 
    reopenFiscalPeriod: build.mutation<any, string>({ query: (id) => ({ url: `/finance-setup/periods/${id}/reopen`, method: "POST" }), invalidatesTags: ["FiscalPeriods", "Accounting", "Transactions"] }), 

    // ------------------------------------------
    // K. ADVANCED FINANCE 
    // ------------------------------------------
    getTaxes: build.query<Tax[], void>({ query: () => "/advanced-finance/taxes", providesTags: ["Taxes"] }),
    createTax: build.mutation<Tax, Partial<Tax>>({ query: (body) => ({ url: "/advanced-finance/taxes", method: "POST", body }), invalidatesTags: ["Taxes"] }),
    updateTax: build.mutation<Tax, { id: string; data: Partial<Tax> }>({ query: ({ id, data }) => ({ url: `/advanced-finance/taxes/${id}`, method: "PUT", body: data }), invalidatesTags: ["Taxes"] }),
    deleteTax: build.mutation<void, string>({ query: (id) => ({ url: `/advanced-finance/taxes/${id}`, method: "DELETE" }), invalidatesTags: ["Taxes"] }),

    getCurrencies: build.query<Currency[], void>({ query: () => "/advanced-finance/currencies", providesTags: ["Currencies"] }),
    createCurrency: build.mutation<Currency, Partial<Currency>>({ query: (body) => ({ url: "/advanced-finance/currencies", method: "POST", body }), invalidatesTags: ["Currencies"] }),
    updateCurrency: build.mutation<Currency, { currencyCode: string; data: Partial<Currency> }>({ query: ({ currencyCode, data }) => ({ url: `/advanced-finance/currencies/${currencyCode}`, method: "PUT", body: data }), invalidatesTags: ["Currencies"] }),
    deleteCurrency: build.mutation<void, string>({ query: (currencyCode) => ({ url: `/advanced-finance/currencies/${currencyCode}`, method: "DELETE" }), invalidatesTags: ["Currencies"] }),

    addExchangeRate: build.mutation<any, any>({ query: (body) => ({ url: "/advanced-finance/exchange-rates", method: "POST", body }), invalidatesTags: ["Currencies", "ExchangeRates"] }),
    deleteExchangeRate: build.mutation<void, string>({ query: (rateId) => ({ url: `/advanced-finance/exchange-rates/${rateId}`, method: "DELETE" }), invalidatesTags: ["Currencies", "ExchangeRates"] }),

    getPriceLists: build.query<PriceList[], void>({ query: () => "/advanced-finance/price-lists", providesTags: ["PriceLists"] }),
    createPriceList: build.mutation<PriceList, Partial<PriceList>>({ query: (body) => ({ url: "/advanced-finance/price-lists", method: "POST", body }), invalidatesTags: ["PriceLists"] }),
    updatePriceList: build.mutation<PriceList, { id: string; data: Partial<PriceList> }>({ query: ({ id, data }) => ({ url: `/advanced-finance/price-lists/${id}`, method: "PUT", body: data }), invalidatesTags: ["PriceLists"] }),
    deletePriceList: build.mutation<void, string>({ query: (id) => ({ url: `/advanced-finance/price-lists/${id}`, method: "DELETE" }), invalidatesTags: ["PriceLists"] }),

    getBudgets: build.query<Budget[], any>({ query: (params) => ({ url: "/advanced-finance/budgets", params }), providesTags: ["Budgets"] }),
    createBudget: build.mutation<Budget, Partial<Budget>>({ query: (body) => ({ url: "/advanced-finance/budgets", method: "POST", body }), invalidatesTags: ["Budgets"] }),
    updateBudget: build.mutation<Budget, { id: string; data: Partial<Budget> }>({ query: ({ id, data }) => ({ url: `/advanced-finance/budgets/${id}`, method: "PUT", body: data }), invalidatesTags: ["Budgets"] }),
    deleteBudget: build.mutation<void, string>({ query: (id) => ({ url: `/advanced-finance/budgets/${id}`, method: "DELETE" }), invalidatesTags: ["Budgets"] }),

  }),
});

// ==========================================
// 4. UTILITY HELPERS DÀNH CHO GIAO DIỆN
// ==========================================

/**
 * Hàm kiểm tra tính toàn vẹn của Chứng từ (Document Integrity).
 * Cảnh báo UI nếu dữ liệu gốc bị can thiệp trái phép dưới Database 
 * khác với trạng thái đã chốt trong documentSnapshot.
 */
export const verifyDocumentIntegrity = (document: DocumentTx): boolean => {
  if (!document.documentSnapshot || !document.isLocked) return true; 

  try {
    const snapshotData = typeof document.documentSnapshot === 'string'
      ? JSON.parse(document.documentSnapshot)
      : document.documentSnapshot;

    // So khớp các trường tài chính cốt lõi không được phép thay đổi
    return (
      snapshotData.totalAmount === document.totalAmount &&
      snapshotData.status === document.status &&
      snapshotData.paymentStatus === document.paymentStatus
    );
  } catch (error) {
    console.error("Lỗi khi giải mã Document Snapshot:", error);
    return false; 
  }
};

// ==========================================
// 5. XUẤT HOOKS (Đầy đủ, Ánh xạ tuyệt đối 1-1 với Endpoint)
// ==========================================
export const {
  // --- A1. Auth & Session ---
  useLoginMutation,
  useVerify2FALoginMutation, 
  useGetMeQuery,
  useRefreshTokenMutation,
  useLogoutMutation,
  useLogoutAllDevicesMutation,

  // --- A2. Advanced Security ---
  useChangePasswordMutation,
  useGenerate2FASecretMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,

  // --- A3. Org RBAC & Audit Logs ---
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetPermissionsQuery,
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetOrganizationStructureQuery,
  useGetSystemAuditLogsQuery, 
  useGetAuditLogsByRecordQuery,
  useGetRecentActivitiesQuery, // Xuất hook phục vụ Widget Dashboard

  // --- B. Dashboard & Financial Reports ---
  useGetDashboardMetricsQuery,
  useGetCashflowReportQuery,
  useGetTrialBalanceReportQuery,

  // --- C. Products & UoM Conversions & Batches ---
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetProductVariantsQuery,
  useGetProductBatchesQuery,
  useCreateProductBatchMutation,
  useUpdateProductBatchMutation,
  useDeleteProductBatchMutation,
  useGetUomConversionsQuery,        
  useCreateUomConversionMutation,
  useUpdateUomConversionMutation,
  useDeleteUomConversionMutation,

  // --- D. Inventory ---
  useGetInventoryBalancesQuery,
  useGetInventoryTransactionsQuery,
  useAdjustStockMutation,
  useTransferStockMutation,

  // --- E. Assets & Asset Master ---
  useGetAssetCategoriesQuery,
  useCreateAssetCategoryMutation,
  useUpdateAssetCategoryMutation,
  useDeleteAssetCategoryMutation,
  useGetAssetsQuery,
  useGetAssetByIdQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
  useAssignAssetMutation,
  useReturnAssetMutation,
  useLogAssetMaintenanceMutation,
  useCompleteAssetMaintenanceMutation,
  useRevaluateAssetMutation,
  useLiquidateAssetMutation,
  useRunAssetDepreciationMutation,
  useGetAssetHistoryQuery,
  useGetAssetRequestsQuery,
  useApproveAssetRequestMutation,
  useRejectAssetRequestMutation,

  // --- F. Expenses ---
  useGetExpensesQuery,
  useGetExpenseByIdQuery,
  useGetExpenseSummaryQuery, 
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  usePostExpenseMutation,

  // --- G. Approvals & Config ---
  useGetPendingApprovalsQuery,
  useGetMyRequestsQuery,
  useGetApprovalByIdQuery,
  useGetApprovalLogsQuery,
  useSubmitApprovalMutation,
  useProcessApprovalMutation,
  useCancelApprovalMutation,
  useGetWorkflowsQuery,
  useGetWorkflowByIdQuery,
  useCreateWorkflowMutation,
  useUpdateWorkflowMutation,
  useDeleteWorkflowMutation,

  // --- H. Master Data ---
  useGetCompaniesQuery, useCreateCompanyMutation, useUpdateCompanyMutation, useDeleteCompanyMutation,
  useGetBranchesQuery, useCreateBranchMutation, useUpdateBranchMutation, useDeleteBranchMutation,
  useGetDepartmentsQuery, useCreateDepartmentMutation, useUpdateDepartmentMutation, useDeleteDepartmentMutation,
  useGetCostCentersQuery, useCreateCostCenterMutation, useUpdateCostCenterMutation, useDeleteCostCenterMutation,
  useGetSuppliersQuery, useCreateSupplierMutation, useUpdateSupplierMutation, useDeleteSupplierMutation,
  useGetCustomersQuery, useCreateCustomerMutation, useUpdateCustomerMutation, useDeleteCustomerMutation,
  useGetWarehousesQuery, useCreateWarehouseMutation, useUpdateWarehouseMutation, useDeleteWarehouseMutation,
  useGetBinsQuery, useCreateBinMutation, useUpdateBinMutation, useDeleteBinMutation,
  useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation,
  useGetUoMsQuery, useCreateUoMMutation, useUpdateUoMMutation, useDeleteUoMMutation,

  // --- I. Transactions & Landed Costs ---
  useGetDocumentsQuery,
  useGetDocumentByIdQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useApproveDocumentDirectlyMutation,
  useGetLandedCostsQuery,        
  useCreateLandedCostMutation,
  useUpdateLandedCostMutation,
  useDeleteLandedCostMutation,
  useAllocateLandedCostMutation, 

  // --- J. Accounting & Finance Setup ---
  useGetJournalEntriesQuery,
  useGetJournalEntryByIdQuery,
  useCreateJournalEntryMutation,
  useUpdateJournalEntryMutation,
  useDeleteJournalEntryMutation,
  usePostJournalEntryMutation,
  useReverseJournalEntryMutation,
  useProcessPaymentMutation,
  
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useGetFiscalYearsQuery,
  useCreateFiscalYearMutation,
  useCloseFiscalYearMutation,    
  useGetFiscalPeriodsQuery,
  useCloseFiscalPeriodMutation, 
  useReopenFiscalPeriodMutation,

  // --- K. Advanced Finance ---
  useGetTaxesQuery, useCreateTaxMutation, useUpdateTaxMutation, useDeleteTaxMutation,
  useGetCurrenciesQuery, useCreateCurrencyMutation, useUpdateCurrencyMutation, useDeleteCurrencyMutation,
  useAddExchangeRateMutation, useDeleteExchangeRateMutation,
  useGetPriceListsQuery, useCreatePriceListMutation, useUpdatePriceListMutation, useDeletePriceListMutation,
  useGetBudgetsQuery, useCreateBudgetMutation, useUpdateBudgetMutation, useDeleteBudgetMutation,

} = api;