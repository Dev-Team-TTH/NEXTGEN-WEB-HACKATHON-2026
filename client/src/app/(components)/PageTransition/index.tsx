"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  // Hook lấy đường dẫn hiện tại để làm 'key' định danh cho Framer Motion
  const pathname = usePathname();

  return (
    // mode="wait" đảm bảo trang cũ mờ đi HOÀN TOÀN rồi trang mới mới hiện lên
    // Tránh tình trạng 2 trang đè lên nhau làm giật layout (Layout Shift)
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        }}
        // Class đảm bảo div này chiếm trọn không gian content và không làm vỡ flexbox
        className="w-full h-full flex flex-col flex-grow overflow-hidden relative"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}