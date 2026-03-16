"use client";

import React, { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useDispatch } from "react-redux";
import { api } from "@/state/api";
import { toast } from "react-hot-toast";

// Khai báo socket ở global scope của file để tránh re-create khi re-render
let socket: Socket | null = null;

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    // Tự động bóc tách URL từ biến môi trường API
    const socketUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || "http://localhost:5000";
    
    // Khởi tạo kết nối Socket chỉ dùng WebSocket (bỏ qua Polling để tối ưu tốc độ)
    socket = io(socketUrl, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("🟢 [Real-time] Đã kết nối Socket.io:", socket?.id);
    });

    // ==========================================
    // ĐĂNG KÝ LẮNG NGHE SỰ KIỆN TỪ BACKEND
    // ==========================================

    // 1. Dữ liệu Kho hàng thay đổi (Có phiếu nhập/xuất được duyệt)
    socket.on("inventory_updated", () => {
      // Background Refetch: Chớp nhoáng cập nhật UI mà không làm gián đoạn người dùng
      dispatch(api.util.invalidateTags(["Inventory", "Dashboard", "Products"]));
    });

    // 2. Trạng thái luồng duyệt thay đổi
    socket.on("approval_status_changed", (data: { message?: string, requestId?: string }) => {
      dispatch(api.util.invalidateTags(["Approvals", "Transactions"]));
      
      // Bắn popup thông báo (Micro-feedback)
      if (data?.message) {
        toast(data.message, { 
          icon: "🔔", 
          style: { borderRadius: '12px', background: '#1E293B', color: '#fff', fontWeight: 'bold' } 
        });
      }
    });

    // ==========================================
    // CLEANUP MEMORY (Chống Memory Leak)
    // ==========================================
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [dispatch]);

  // Provider này không render ra UI, nó chỉ bọc các logic ngầm
  return <>{children}</>;
}