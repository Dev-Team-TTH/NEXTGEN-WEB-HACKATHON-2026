import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import Toaster from "@/app/(components)/Toaster"; // Import Toaster độc lập
import "./globals.css";
import DashboardWrapper from "./dashboardWrapper";

const inter = Inter({ subsets: ["latin"] });

// ==========================================
// 1. CẤU HÌNH METADATA (SEO & ĐỊNH DANH)
// Đã đồng bộ Icon sử dụng định dạng PNG chất lượng cao
// ==========================================
export const metadata: Metadata = {
  title: "Hệ thống ERP | Quản lý Kho & Tài sản TTH",
  description: "Hệ thống quản lý nguồn lực doanh nghiệp (ERP) toàn diện. Tối ưu hóa quy trình xuất nhập tồn, tài sản, kế toán và phê duyệt. Sản phẩm xuất sắc dự thi NEXTGEN-WEB-HACKATHON-2026.",
  icons: {
    icon: "/logo.png", // Sử dụng logo PNG thay cho favicon cũ
    apple: "/logo.png", // Tương thích thêm với các thiết bị Apple (iPhone/iPad/Mac)
  },
};

// ==========================================
// 2. CẤU HÌNH VIEWPORT CHUẨN NEXT.JS 14+
// ==========================================
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" }, 
  ],
};

// ==========================================
// 3. ROOT LAYOUT (SERVER COMPONENT)
// ==========================================
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        
        {/* THANH TIẾN TRÌNH CHUYỂN TRANG (TOP LOADER) */}
        <NextTopLoader 
          color="#3b82f6"       
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}   
          easing="ease"
          speed={200}
          shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
          zIndex={1600}         
        />

        {/* COMPONENT THÔNG BÁO ĐỘC LẬP (CLIENT SIDE) */}
        <Toaster />

        {/* BỌC TOÀN BỘ ỨNG DỤNG TRONG DASHBOARD WRAPPER */}
        <DashboardWrapper>{children}</DashboardWrapper>
      </body>
    </html>
  );
}