import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface ProductVariant {
  variantId: string;
  productId: string;
  sku: string;
  attributes: string;
  additionalPrice: number;
  stockQuantity: number;
}

export interface ProductBatch {
  batchId: string;
  batchNumber: string;
  productId: string;
  variantId?: string;
  manufactureDate?: string;
  expiryDate: string;
  stockQuantity: number;
}

export interface Product {
  productId: string;
  name: string;
  price: number;
  rating?: number;
  stockQuantity: number;
  baseUnit?: string;
  largeUnit?: string;
  conversionRate?: number;
  imageUrl?: string;
  purchasePrice?: number;
  status?: string;
  category?: string;
  description?: string;
  reorderPoint?: number;
  reorderUnit?: string;
  location?: string;
  hasVariants?: boolean;
  hasBatches?: boolean;
  Variants?: ProductVariant[];
  Batches?: ProductBatch[];
}

export interface NewProduct {
  productId: string;
  name: string;
  price: number;
  rating?: number;
  stockQuantity: number;
  baseUnit?: string;
  largeUnit?: string;
  conversionRate?: number;
  imageUrl?: string;
  purchasePrice?: number;
  status?: string;
  category?: string;
  description?: string;
  reorderPoint?: number;
  reorderUnit?: string;
  location?: string;
  hasVariants?: boolean;
  hasBatches?: boolean;
  variants?: any[];
}

export interface ExpenseSummary {
  expenseSummaryId: string;
  totalExpenses: number;
  date: string;
}

export interface ExpenseByCategorySummary {
  expenseByCategoryId: string;
  category: string;
  amount: string;
  date: string;
}

export interface DashboardMetrics {
  popularProducts: Product[];
  expenseSummary: ExpenseSummary[];
  expenseByCategorySummary: ExpenseByCategorySummary[];
}

export interface User {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
}

export interface NewUser {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  role: string;
}

export interface InventoryTransaction {
  transactionId: string;
  productId: string;
  timestamp: string;
  type: string;
  quantity: number;
  note?: string;
  variantId?: string;
  batchId?: string;
  status?: string;
}

export interface NewInventoryTransaction {
  productId: string;
  type: string;
  quantity: number;
  note?: string;
  variantId?: string;
  batchId?: string;
  newBatchNumber?: string;
  expiryDate?: string;
  location?: string;
  createdBy?: string;
}

export interface Asset {
  assetId: string;
  name: string;
  category: string;
  status: string;
  
  // Thông tin bàn giao & Vị trí
  assignedTo?: string | null;
  location?: string | null;
  
  // Thông tin Tài chính
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  
  imageUrl?: string | null;
  
  // Khấu hao & Bảo trì định kỳ
  depreciationMonths?: number;
  maintenanceCycle?: number;
  lastMaintenance?: string;
  nextMaintenance?: string;
  isMaintenanceOverdue?: boolean;
}

export interface NewAsset {
  name: string;
  category: string;
  status: string;
  assignedTo?: string;
  purchaseDate: string;
  price: number;
  imageUrl?: string;
}

export interface AssetHistory {
  historyId: string;
  assetId: string;
  actionType: string;
  description: string;
  changedBy: string;
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InventoryTransactionResponse {
  data: InventoryTransaction[];
  pagination: PaginationMeta;
}

export interface AssetHistory {
  id: string;
  assetId: string;
  actionDate: string;   // Ngày thực hiện
  actionType: string;   // CREATE, UPDATE, ASSIGN, MAINTENANCE, BROKEN
  title: string;        // Tiêu đề ngắn gọn
  description: string;  // Chi tiết thay đổi
  performedBy: string;  // Tên người thực hiện
}

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL }),
  reducerPath: "api",
  tagTypes: ["DashboardMetrics", "Products", "Users", "Expenses", "Assets", "Inventory"],
  endpoints: (build) => ({
    getDashboardMetrics: build.query<DashboardMetrics, void>({
      query: () => "/dashboard",
      providesTags: ["DashboardMetrics"],
    }),
    
    getProducts: build.query<Product[], string | void>({
      query: (search) => ({
        url: "/products",
        params: search ? { search } : {},
      }),
      providesTags: ["Products"],
    }),
    
    createProduct: build.mutation<Product, NewProduct>({
      query: (newProduct) => ({
        url: "/products",
        method: "POST",
        body: newProduct,
      }),
      invalidatesTags: ["Products"],
    }),

    updateProduct: build.mutation<Product, { productId: string; updatedProduct: Partial<NewProduct> }>({
      query: ({ productId, updatedProduct }) => ({
        url: `/products/${productId}`,
        method: "PUT",
        body: updatedProduct,
      }),
      invalidatesTags: ["Products"],
    }),

    deleteProduct: build.mutation<void, string>({
      query: (productId) => ({
        url: `/products/${productId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products", "DashboardMetrics"], 
    }),

    createTransaction: build.mutation<InventoryTransaction, NewInventoryTransaction>({
      query: (newTransaction) => ({
        url: "/inventory",
        method: "POST",
        body: newTransaction,
      }),
      invalidatesTags: ["Products", "Inventory"], 
    }),

    getTransactions: build.query<
      InventoryTransactionResponse, 
      { page?: number; limit?: number; search?: string; type?: string; startDate?: string; endDate?: string } | void
    >({
      query: (params) => ({
        url: "/inventory",
        params: params ? params : undefined,
      }),
      providesTags: ["Inventory"],
    }),

    approveTransaction: build.mutation<void, { id: string; approvedBy: string }>({
      query: ({ id, approvedBy }) => ({
        url: `/inventory/${id}/approve`,
        method: "PUT",
        body: { approvedBy },
      }),
      invalidatesTags: ["Products", "Inventory"],
    }),

    rejectTransaction: build.mutation<void, { id: string; approvedBy: string }>({
      query: ({ id, approvedBy }) => ({
        url: `/inventory/${id}/reject`,
        method: "PUT",
        body: { approvedBy },
      }),
      invalidatesTags: ["Products", "Inventory"],
    }),

    // --- API DUYỆT MASTER DATA ---
    getMasterDataRequests: build.query<any[], void>({
      query: () => "/products/requests",
      providesTags: ["Products"],
    }),

    approveMasterData: build.mutation<void, { id: string; approvedBy: string }>({
      query: ({ id, approvedBy }) => ({
        url: `/products/requests/${id}/approve`,
        method: "PUT",
        body: { approvedBy },
      }),
      invalidatesTags: ["Products"],
    }),

    rejectMasterData: build.mutation<void, { id: string; approvedBy: string }>({
      query: ({ id, approvedBy }) => ({
        url: `/products/requests/${id}/reject`,
        method: "PUT",
        body: { approvedBy },
      }),
      invalidatesTags: ["Products"],
    }),
    // ---------------------------------

    getUsers: build.query<User[], void>({
      query: () => "/users",
      providesTags: ["Users"],
    }),

    registerUser: build.mutation<User, NewUser>({
      query: (newUser) => ({
        url: "/users/register",
        method: "POST",
        body: newUser,
      }),
      invalidatesTags: ["Users"],
    }),

    updateUser: build.mutation<User, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Users"],
    }),

    deleteUser: build.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    
    getExpensesByCategory: build.query<ExpenseByCategorySummary[], void>({
      query: () => "/expenses",
      providesTags: ["Expenses"],
    }),

    getAssets: build.query<Asset[], string | void>({
      query: (search) => ({
        url: "/assets",
        params: search ? { search } : {},
      }),
      providesTags: ["Assets"],
    }),
    
    
    createAsset: build.mutation<Asset, NewAsset>({
      query: (newAsset) => ({
        url: "/assets",
        method: "POST",
        body: newAsset,
      }),
      invalidatesTags: ["Assets"],
    }),

    updateAsset: build.mutation<Asset, { id: string; data: Partial<Asset> }>({
      query: ({ id, data }) => ({
        url: `/assets/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Assets"], // Cập nhật lại UI ngay lập tức
    }),

    deleteAsset: build.mutation<void, string>({
      query: (assetId) => ({
        url: `/assets/${assetId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Assets"],
    }),

    getAssetHistory: build.query<AssetHistory[], string>({
      query: (id) => `/assets/${id}/history`,
      providesTags: ["Assets"],
    }),

    // === API DUYỆT TÀI SẢN (ENTERPRISE) ===
    getAssetRequests: build.query<any[], void>({
      query: () => "/assets/requests/all",
      providesTags: ["Assets"],
    }),

    approveAssetRequest: build.mutation<void, { id: string; approvedBy: string }>({
      query: ({ id, approvedBy }) => ({
        url: `/assets/requests/${id}/approve`,
        method: "PUT",
        body: { approvedBy },
      }),
      invalidatesTags: ["Assets"],
    }),

    rejectAssetRequest: build.mutation<void, { id: string; approvedBy: string }>({
      query: ({ id, approvedBy }) => ({
        url: `/assets/requests/${id}/reject`,
        method: "PUT",
        body: { approvedBy },
      }),
      invalidatesTags: ["Assets"],
    }),

    login: build.mutation<any, any>({
      query: (credentials) => ({
        url: "/users/login",
        method: "POST",
        body: credentials,
      }),
    }),

  }),
});

export const {
  useGetDashboardMetricsQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateTransactionMutation,
  useGetTransactionsQuery,
  useApproveTransactionMutation,
  useRejectTransactionMutation,
  useApproveMasterDataMutation, 
  useGetMasterDataRequestsQuery,  
  useRejectMasterDataMutation,   
  useGetUsersQuery,
  useRegisterUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetExpensesByCategoryQuery,
  useGetAssetsQuery,
  useCreateAssetMutation,
  useDeleteAssetMutation,
  useUpdateAssetMutation,
  useGetAssetHistoryQuery,
  useGetAssetRequestsQuery,
  useApproveAssetRequestMutation,
  useRejectAssetRequestMutation,
  useLoginMutation,
} = api;