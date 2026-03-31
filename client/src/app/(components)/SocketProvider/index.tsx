"use client";

import React, { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useDispatch } from "react-redux";
import { api } from "@/state/api";
import { toast } from "react-hot-toast";
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG LẤY TOKEN & BRANCH

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  
  // 🚀 LẤY DỮ LIỆU ĐỂ XÁC THỰC VÀ PHÂN LUỒNG SOCKET
  const accessToken = useAppSelector((state: any) => state.global?.accessToken);
  const activeBranchId = useAppSelector((state: any) => state.global?.activeBranchId);
  
  // 🚀 SỬ DỤNG USEREF ĐỂ QUẢN LÝ VÒNG ĐỜI SOCKET (CHỐNG MEMORY LEAK)
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Nếu chưa đăng nhập, không mở kết nối Socket
    const token = accessToken || (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null);
    if (!token) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || "http://localhost:5000";
    
    // 🚀 KHỞI TẠO KẾT NỐI BẢO MẬT (KÈM TOKEN)
    socketRef.current = io(socketUrl, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      auth: {
        token: token // Backend Socket.io middleware phải check token này!
      }
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("🟢 [Real-time] Đã kết nối Socket an toàn:", socket.id);
      
      // 🚀 BÁO CHO BACKEND BIẾT ĐANG Ở CHI NHÁNH NÀO ĐỂ NHẬN EVENT RIÊNG
      if (activeBranchId) {
        socket.emit("join_branch", activeBranchId);
      }
    });

    // ==========================================
    // ĐĂNG KÝ LẮNG NGHE SỰ KIỆN TỪ BACKEND
    // ==========================================

    socket.on("inventory_updated", () => {
      dispatch(api.util.invalidateTags(["Inventory", "Dashboard", "Products"]));
    });

    socket.on("approval_status_changed", (data: { message?: string, requestId?: string }) => {
      dispatch(api.util.invalidateTags(["Approvals", "Transactions"]));
      
      if (data?.message) {
        toast(data.message, { 
          icon: "🔔", 
          style: { borderRadius: '12px', background: '#1E293B', color: '#fff', fontWeight: 'bold' } 
        });
      }
    });

    // ==========================================
    // CLEANUP MEMORY KHÉP KÍN
    // ==========================================
    return () => {
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
        console.log("🔴 [Real-time] Đã ngắt kết nối Socket.");
      }
    };
  }, [dispatch, accessToken, activeBranchId]); // 🚀 Re-connect và Join room mới khi đổi Chi nhánh

  return <>{children}</>;
}