import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

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
  // Bổ sung các trường mới:
  purchasePrice?: number;
  status?: string;
  category?: string;
  description?: string;
  reorderPoint?: number;
  location?: string;
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
  // Bổ sung các trường mới:
  purchasePrice?: number;
  status?: string;
  category?: string;
  description?: string;
  reorderPoint?: number;
  location?: string;
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
}

// INTERFACE CHO GIAO DỊCH KHO
export interface InventoryTransaction {
  productId: string;
  type: "IN" | "OUT";
  quantity: number;
  note: string;
}

// INTERFACE CHO TÀI SẢN
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

    // API ĐIỀU PHỐI NHẬP/XUẤT KHO
    createTransaction: build.mutation<void, InventoryTransaction>({
      query: (transaction) => ({
        url: "/inventory/transaction",
        method: "POST",
        body: transaction,
      }),
      invalidatesTags: ["Products", "DashboardMetrics"], 
    }),

    getUsers: build.query<User[], void>({
      query: () => "/users",
      providesTags: ["Users"],
    }),
    
    getExpensesByCategory: build.query<ExpenseByCategorySummary[], void>({
      query: () => "/expenses",
      providesTags: ["Expenses"],
    }),

    // API TÀI SẢN
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
  }),
});

export const {
  useGetDashboardMetricsQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateTransactionMutation,
  useGetUsersQuery,
  useGetExpensesByCategoryQuery,
  useGetAssetsQuery,
  useCreateAssetMutation,
  useDeleteAssetMutation,
} = api;