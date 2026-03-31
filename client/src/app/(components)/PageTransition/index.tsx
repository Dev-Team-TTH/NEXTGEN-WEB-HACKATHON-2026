"use client";

import React from "react";
import { motion } from "framer-motion";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    // 🚀 LÁ CHẮN KIẾN TRÚC: GỠ BỎ AnimatePresence VÀ key={pathname} BỊ TRÙNG LẶP.
    // Parent Component (dashboardWrapper) đã xử lý việc chuyển trang mượt mà.
    // Component này giờ đây đóng vai trò như một wrapper cấu trúc, đồng thời cung cấp
    // một hiệu ứng nảy (spring) tinh tế độc lập với routing để nội dung xuất hiện tự nhiên hơn.
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      }}
      // Class đảm bảo div này chiếm trọn không gian content và không làm vỡ flexbox
      className="w-full h-full flex flex-col flex-grow overflow-hidden relative transition-colors duration-500"
    >
      {children}
    </motion.div>
  );
}