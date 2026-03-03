"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { 
  ArrowRight, ShieldCheck, Zap, Package, 
  MonitorSmartphone, WalletCards, ClipboardCheck, 
  Globe
} from "lucide-react";

// ==========================================
// COMPONENT: CỔNG KHÔNG GIAN (IMMERSIVE LANDING PAGE)
// Dành cho Hackathon: Phô diễn sức mạnh giao diện trước khi vào App
// ==========================================

export default function HomePage() {
  // Cấu hình Animation với kiểu Variants chuẩn và 'as const' để TS hiểu literal type
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    show: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)", 
      transition: { type: "spring" as const, stiffness: 200, damping: 20 } 
    },
  };

  const features = [
    { id: "wms", name: "Quản lý Kho bãi", icon: Package, color: "from-blue-500 to-cyan-400" },
    { id: "eam", name: "Tài sản Cố định", icon: MonitorSmartphone, color: "from-orange-500 to-amber-400" },
    { id: "acc", name: "Kế toán Tài chính", icon: WalletCards, color: "from-emerald-500 to-teal-400" },
    { id: "app", name: "Luồng Phê duyệt", icon: ClipboardCheck, color: "from-purple-500 to-pink-400" },
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#0B0F19] text-white overflow-hidden selection:bg-blue-500/30">
      
      {/* --- BACKGROUND IMMERSIVE --- */}
      {/* 1. Lớp Noise (Nhám) */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay bg-[url('/noise.png')] z-0"></div>
      
      {/* 2. Ánh sáng Cực quang (Aurora Glow) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none z-0 animate-pulse duration-10000"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0 animate-pulse duration-7000"></div>

      {/* 3. Lưới tọa độ (Grid pattern) tạo cảm giác Tech */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none z-0"></div>

      {/* --- NỘI DUNG CHÍNH --- */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* THANH TOP NAV NHỎ */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          className="absolute top-0 w-full flex justify-between items-center p-6"
        >
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="drop-shadow-lg" />
            <span className="font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">TTH</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <span className="hidden sm:flex items-center gap-1.5"><Globe className="w-4 h-4"/> NextGen Hackathon</span>
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full"><ShieldCheck className="w-4 h-4"/> Enterprise Ready</span>
          </div>
        </motion.div>

        {/* HERO SECTION */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="text-center flex flex-col items-center mt-12"
        >
          {/* Badge Nổi bật */}
          <motion.div variants={itemVariants} className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">Hệ thống ERP Thế Hệ Mới</span>
          </motion.div>

          {/* Tiêu đề siêu lớn (Typography) */}
          <motion.div variants={itemVariants} className="max-w-4xl mx-auto relative">
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1] mb-6">
              Vận hành <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                Doanh Nghiệp
              </span> 
              <br className="hidden sm:block" /> Tương Lai
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p variants={itemVariants} className="mt-4 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Nền tảng quản trị tài nguyên toàn diện. Kết hợp sức mạnh của 
            <strong className="text-white font-semibold"> React Three Fiber</strong>, 
            <strong className="text-white font-semibold"> AI</strong> và 
            <strong className="text-white font-semibold"> Kiến trúc chuẩn IFRS</strong>.
          </motion.p>

          {/* CTA Buttons (Nút Call to Action) */}
          <motion.div variants={itemVariants} className="mt-10 flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto px-4">
            <Link href="/dashboard" className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
              <span className="relative z-10">Truy cập Hệ thống</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login" className="flex items-center justify-center px-8 py-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white rounded-full font-bold text-lg transition-all hover:scale-105 active:scale-95 backdrop-blur-md">
              Đăng nhập Admin
            </Link>
          </motion.div>
        </motion.div>

        {/* CÁC MODULE (BENTO GRID STYLE) */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full max-w-5xl"
        >
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <motion.div 
                key={feat.id}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group relative flex flex-col items-center text-center p-6 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-xl overflow-hidden"
              >
                {/* Ánh sáng khi hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-white/5 to-transparent"></div>
                
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${feat.color} bg-opacity-10 mb-4 shadow-lg`}>
                  <Icon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <h3 className="font-bold text-slate-200">{feat.name}</h3>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </div>
  );
}