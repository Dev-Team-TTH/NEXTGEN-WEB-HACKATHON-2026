import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Product {
  productId: string;
  name: string;
  price: number;
  rating?: number;
  stockQuantity: number;
}

export interface NewProduct {
  name: string;
  price: number;
  rating?: number;
  stockQuantity: number;
}

export interface SalesSummary {
  salesSummaryId: string;
  totalValue: number;
  changePercentage?: number;
  date: string;
}

export interface PurchaseSummary {
  purchaseSummaryId: string;
  totalPurchased: number;
  changePercentage?: number;
  date: string;
}

export interface ExpenseSummary {
  expenseSummarId: string;
  totalExpenses: number;
  date: string;
}

export interface ExpenseByCategorySummary {
  expenseByCategorySummaryId: string;
  category: string;
  amount: string;
  date: string;
}

export interface DashboardMetrics {
  popularProducts: Product[];
  salesSummary: SalesSummary[];
  purchaseSummary: PurchaseSummary[];
  expenseSummary: ExpenseSummary[];
  expenseByCategorySummary: ExpenseByCategorySummary[];
}

export interface User {
  userId: string;
  name: string;
  email: string;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL }),
  reducerPath: "api",
  // Khai báo các Tags để Redux tự động refresh data khi có thay đổi
  tagTypes: ["DashboardMetrics", "Products", "Users", "Expenses"],
  endpoints: (build) => ({
    getDashboardMetrics: build.query<DashboardMetrics, void>({
      query: () => "/dashboard",
      providesTags: ["DashboardMetrics"],
    }),
    
    // [R] READ - Lấy danh sách sản phẩm
    getProducts: build.query<Product[], string | void>({
      query: (search) => ({
        url: "/products",
        params: search ? { search } : {},
      }),
      providesTags: ["Products"],
    }),
    
    // [C] CREATE - Thêm sản phẩm mới
    createProduct: build.mutation<Product, NewProduct>({
      query: (newProduct) => ({
        url: "/products",
        method: "POST",
        body: newProduct,
      }),
      // Báo cho Redux biết danh sách Products đã cũ, cần fetch lại
      invalidatesTags: ["Products"],
    }),

    // [U] UPDATE - Cập nhật sản phẩm
    updateProduct: build.mutation<Product, { productId: string; updatedProduct: Partial<NewProduct> }>({
      query: ({ productId, updatedProduct }) => ({
        url: `/products/${productId}`,
        method: "PUT", // Hoặc PATCH tùy theo cấu hình Backend NestJS của bạn
        body: updatedProduct,
      }),
      invalidatesTags: ["Products"], // Tự động reload lại danh sách
    }),

    // [D] DELETE - Xóa sản phẩm
    deleteProduct: build.mutation<void, string>({
      query: (productId) => ({
        url: `/products/${productId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products"], // Tự động reload lại danh sách
    }),

    getUsers: build.query<User[], void>({
      query: () => "/users",
      providesTags: ["Users"],
    }),
    getExpensesByCategory: build.query<ExpenseByCategorySummary[], void>({
      query: () => "/expenses",
      providesTags: ["Expenses"],
    }),
  }),
});

// EXPORT ĐẦY ĐỦ CÁC HOOKS CRUD
export const {
  useGetDashboardMetricsQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation, // <-- MỚI THÊM
  useDeleteProductMutation, // <-- MỚI THÊM
  useGetUsersQuery,
  useGetExpensesByCategoryQuery,
} = api;