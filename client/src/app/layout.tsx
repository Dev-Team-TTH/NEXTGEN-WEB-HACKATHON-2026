import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import Toaster from "@/app/(components)/Toaster"; // Component thông báo độc lập
import DashboardWrapper from "./dashboardWrapper";
import "./globals.css";

// ==========================================
// TỐI ƯU HÓA FONT CHỮ CHUẨN ENTERPRISE (Chống FOIT/FOUT)
// ==========================================
const inter = Inter({ 
  subsets: ["latin", "vietnamese"], // Hỗ trợ trọn vẹn ký tự Tiếng Việt
  display: "swap",                  // Hiển thị font fallback trước khi tải xong
  variable: "--font-inter",         // Tích hợp với Tailwind CSS
  weight: ["300", "400", "500", "600", "700", "800"],
});

// ==========================================
// 1. CẤU HÌNH METADATA (SEO, PWA & SOCIAL SHARING)
// ==========================================
export const metadata: Metadata = {
  title: {
    template: "%s | TTH ERP Enterprise",
    default: "TTH ERP | Hệ thống Quản trị Doanh nghiệp",
  },
  description: "Hệ thống quản lý nguồn lực doanh nghiệp (ERP) toàn diện. Tối ưu hóa quy trình xuất nhập tồn, tài sản, kế toán và phê duyệt.",
  applicationName: "TTH ERP",
  authors: [{ name: "TTH Team" }],
  generator: "Next.js",
  keywords: ["ERP", "Quản lý kho", "Kế toán", "Tài sản", "Doanh nghiệp", "Next.js"],
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" }, // Icon khi thêm ra màn hình chính iPhone
    ],
  },
  manifest: "/manifest.json", // Chuẩn bị cho PWA (Tải app về máy)
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://tth-erp.com",
    title: "TTH ERP Enterprise",
    description: "Hệ thống Quản trị Nguồn lực Doanh nghiệp toàn diện",
    siteName: "TTH ERP",
  },
  twitter: {
    card: "summary_large_image",
    title: "TTH ERP Enterprise",
    description: "Hệ thống Quản trị Nguồn lực Doanh nghiệp toàn diện",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // Thanh trạng thái trong suốt trên iOS
    title: "TTH ERP",
  },
};

// ==========================================
// 2. CẤU HÌNH VIEWPORT CHUẨN NEXT.JS 14+ 
// (RESPONSIVE & PWA)
// ==========================================
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // CHỐNG ZOOM LỘN XỘN TRÊN MOBILE KHI GÕ INPUT
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" }, // Màu slate-50 khớp với nền DashboardWrapper
    { media: "(prefers-color-scheme: dark)", color: "#0B0F19" },  // Màu nền tối sâu thẳm
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
    // suppressHydrationWarning BẮT BUỘC phải có ở <html> khi dùng next-themes
    // Đã thêm data-scroll-behavior="smooth" để triệt tiêu cảnh báo Next.js
    <html lang="vi" suppressHydrationWarning data-scroll-behavior="smooth" className={`${inter.variable}`}>
      <body 
        // antialiased: Làm mịn font chữ trên macOS/iOS
        // selection: Tùy chỉnh màu khi người dùng bôi đen đoạn text
        className={`${inter.className} min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-50 overflow-x-hidden antialiased selection:bg-blue-500/30 selection:text-blue-900 dark:selection:text-blue-100`}
      >
        
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
          // Đổ bóng (Glow effect) cho thanh tải
          shadow="0 0 15px rgba(59, 130, 246, 0.6), 0 0 5px rgba(59, 130, 246, 0.4)"
          zIndex={1600}         
        />

        {/* COMPONENT THÔNG BÁO ĐỘC LẬP (CLIENT SIDE) */}
        <Toaster />

        {/* BỌC TOÀN BỘ ỨNG DỤNG TRONG DASHBOARD WRAPPER */}
        <DashboardWrapper>
          {children}
        </DashboardWrapper>
        
      </body>
    </html>
  );
}