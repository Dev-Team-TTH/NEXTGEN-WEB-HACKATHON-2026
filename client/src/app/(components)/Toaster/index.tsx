"use client";

import React from "react";
import { Toaster as ReactHotToaster } from "react-hot-toast";

// ==========================================
// HỆ THỐNG THÔNG BÁO TOÀN CỤC (CLIENT COMPONENT)
// Tách biệt hoàn toàn khỏi layout.tsx để bảo toàn sức mạnh SSR của Next.js
// ==========================================
export default function Toaster() {
  return (
    <ReactHotToaster
      position="top-right"
      reverseOrder={false}
      toastOptions={{
        // Cấu hình thời gian hiển thị mặc định (4 giây)
        duration: 4000,
        // Style mặc định
        style: {
          background: '#333',
          color: '#fff',
          zIndex: 1700,
        },
        // Style khi Thông báo Thành công
        success: {
          style: {
            background: '#10B981', // green-500
            color: 'white',
          },
          iconTheme: {
            primary: 'white',
            secondary: '#10B981',
          },
        },
        // Style khi Thông báo Lỗi
        error: {
          style: {
            background: '#EF4444', // red-500
            color: 'white',
          },
          iconTheme: {
            primary: 'white',
            secondary: '#EF4444',
          },
        },
      }}
    />
  );
}