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

export interface Warehouse {
  warehouseId: string;
  name: string;
  address?: string;
}

export interface User {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  warehouseId?: string;
  warehouse?: any; // Chứa thông tin kho nếu có
}

export interface NewUser {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  role: string;
  warehouseId?: string;
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
  warehouseId: string; // <-- THÊM DÒNG NÀY
  warehouse?: any;     // <-- THÊM DÒNG NÀY NỮA (để chứa tên kho khi lấy list)
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
  warehouseId: string;
}

export interface Asset {
  assetId: string;
  name: string;
  category: string;
  status: string;
  assignedTo: string | null;
  purchaseDate: string;
  price: number;
}

export interface NewAsset {
  name: string;
  category: string;
  status: string;
  assignedTo?: string;
  purchaseDate: string;
  price: number;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL }),
  reducerPath: "api",
  tagTypes: ["DashboardMetrics", "Products", "Users", "Expenses", "Assets"],
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
      invalidatesTags: ["Products"], 
    }),

    // === 3 API MỚI CHO QUY TRÌNH DUYỆT PHIẾU ===
    getTransactions: build.query<any[], void>({
      query: () => "/inventory",
      providesTags: ["Products"],
    }),

    approveTransaction: build.mutation<void, { id: string; approvedBy: string }>({
      query: ({ id, approvedBy }) => ({
        url: `/inventory/${id}/approve`,
        method: "PUT",
        body: { approvedBy },
      }),
      invalidatesTags: ["Products"],
    }),

    rejectTransaction: build.mutation<void, { id: string; approvedBy: string }>({
      query: ({ id, approvedBy }) => ({
        url: `/inventory/${id}/reject`,
        method: "PUT",
        body: { approvedBy },
      }),
      invalidatesTags: ["Products"],
    }),
    // ===========================================

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
      invalidatesTags: ["Users"], // Cập nhật lại danh sách ngay sau khi tạo
    }),

    getWarehouses: build.query<Warehouse[], void>({
      query: () => "/warehouses",
      providesTags: ["Products"], // Tạm dùng chung tag để cache
    }),

    createWarehouse: build.mutation<Warehouse, Partial<Warehouse>>({
      query: (newWarehouse) => ({
        url: "/warehouses",
        method: "POST",
        body: newWarehouse,
      }),
      invalidatesTags: ["Products"], // Tự động load lại danh sách sau khi tạo
    }),

    deleteWarehouse: build.mutation<void, string>({
      query: (id) => ({
        url: `/warehouses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products"],
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

    deleteAsset: build.mutation<void, string>({
      query: (assetId) => ({
        url: `/assets/${assetId}`,
        method: "DELETE",
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

// XUẤT THÊM 3 CÁI HOOK MỚI VÀO ĐÂY
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
  useGetUsersQuery,
  useRegisterUserMutation,
  useGetExpensesByCategoryQuery,
  useGetAssetsQuery,
  useCreateAssetMutation,
  useDeleteAssetMutation,
  useLoginMutation,
  useGetWarehousesQuery,
  useCreateWarehouseMutation,
  useDeleteWarehouseMutation,
} = api;