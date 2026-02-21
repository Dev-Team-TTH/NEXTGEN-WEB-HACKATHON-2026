import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DashboardWrapper from "./dashboardWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quản lý kho và tài sản | Team TTH",
  description: "Hệ thống quản lý kho chuyên nghiệp, tối ưu hóa quy trình xuất nhập tồn. Sản phẩm dự thi NEXTGEN-WEB-HACKATHON-2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DashboardWrapper>{children}</DashboardWrapper>
      </body>
    </html>
  );
}
