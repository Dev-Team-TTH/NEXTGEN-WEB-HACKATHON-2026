import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import Toaster from "@/app/(components)/Toaster"; 
import DashboardWrapper from "./dashboardWrapper";
import "./globals.css";

// ==========================================
// TỐI ƯU HÓA FONT CHỮ CHUẨN ENTERPRISE
// ==========================================
const inter = Inter({ 
  subsets: ["latin", "vietnamese"], 
  display: "swap",                  
  variable: "--font-inter",         
  weight: ["300", "400", "500", "600", "700", "800"],
});

// ==========================================
// 1. CẤU HÌNH METADATA (SEO & PWA)
// ==========================================
export const metadata: Metadata = {
  title: {
    template: "%s | TTH ERP Enterprise",
    default: "TTH ERP | Hệ thống Quản trị Doanh nghiệp",
  },
  description: "Hệ thống quản lý nguồn lực doanh nghiệp (ERP) toàn diện.",
  applicationName: "TTH ERP",
  authors: [{ name: "TTH Team" }],
  generator: "Next.js",
  manifest: "/manifest.json", 
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", 
    title: "TTH ERP",
  },
};

// ==========================================
// 2. CẤU HÌNH VIEWPORT (CHỐNG PHÓNG TO RÁC & ĐỒNG BỘ MÀU)
// ==========================================
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" }, 
    // Đã khớp chuẩn tuyệt đối với mã màu --bg-main của Darkmode
    { media: "(prefers-color-scheme: dark)", color: "#090D14" },  
  ],
};

// ==========================================
// 3. ROOT LAYOUT 
// ==========================================
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning data-scroll-behavior="smooth" className={`${inter.variable}`}>
      <body 
        className={`${inter.className} min-h-screen`}
      >
        
        {/* THANH TIẾN TRÌNH CHUYỂN TRANG */}
        <NextTopLoader 
          color="#3b82f6"       
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}   
          easing="ease"
          speed={200}
          shadow="0 0 15px rgba(59, 130, 246, 0.6), 0 0 5px rgba(59, 130, 246, 0.4)"
          zIndex={1600}         
        />

        {/* HỆ THỐNG THÔNG BÁO TOAST */}
        <Toaster />

        {/* BỌC TOÀN BỘ ỨNG DỤNG BỞI DASHBOARD WRAPPER */}
        <DashboardWrapper>
          {children}
        </DashboardWrapper>
        
      </body>
    </html>
  );
}