"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  TrendingUp, Wallet, PackageSearch, CreditCard, 
  ArrowUpRight, ArrowDownRight, Clock, Activity, 
  Box, FileSignature, Download, Sparkles, ArrowRight,
  WifiOff
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from "recharts";

// Import Redux & API
import { useAppSelector } from "@/app/redux";
import { useGetDashboardMetricsQuery, useGetCashflowReportQuery } from "@/state/api";

// ==========================================
// UTILITY 1: FORMAT TIỀN TỆ VNĐ ĐẦY ĐỦ
// ==========================================
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// ==========================================
// UTILITY 2: FORMAT SỐ RÚT GỌN CHO TRỤC Y RECHARTS
// ==========================================
const formatCompactCurrency = (value: number) => {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1).replace(/\.0$/, '') + ' Tỷ';
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace(/\.0$/, '') + ' Tr';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + ' N';
  }
  return value.toString();
};

// ==========================================
// UTILITY 3: DỊCH THUẬT HÀNH ĐỘNG AUDIT LOG
// ==========================================
const ACTION_MAP: Record<string, string> = {
  "CREATE": "đã tạo mới",
  "UPDATE": "đã cập nhật",
  "DELETE": "đã xóa",
  "APPROVE": "đã phê duyệt",
  "REJECT": "đã từ chối",
  "LOGIN": "đã đăng nhập vào",
  "LOGOUT": "đã đăng xuất khỏi"
};

const translateAction = (action: string) => {
  return ACTION_MAP[action] || `đã ${action.toLowerCase()}`;
};

// ==========================================
// MOCK DATA FALLBACK (Cứu cánh khi Backend sập hoặc chưa Code xong)
// ==========================================
const fallbackMetrics = {
  summary: { totalInventoryValue: 2450000000, currentCashBalance: 850000000, totalAccountsReceivable: 120000000, totalAccountsPayable: 45000000 },
  financials: { totalCashIn: 0, totalCashOut: 0, currentMonth: { revenue: 0, expense: 0, netProfit: 0 } },
  tasks: { pendingApprovals: 3 },
  popularProducts: [
    { name: "Thép xây dựng Hòa Phát", productCode: "STEEL-01", totalStock: 1250 },
    { name: "Xi măng Hà Tiên", productCode: "CEMENT-HT", totalStock: 850 },
    { name: "Gạch Tuynel Đồng Nai", productCode: "BRICK-DN", totalStock: 5000 },
  ],
  recentActivities: [
    { action: "CREATE", entityName: "Phiếu nhập kho #PN001", timestamp: new Date().toISOString(), user: { fullName: "Nguyễn Văn A" } },
    { action: "APPROVE", entityName: "Đề xuất mua sắm thiết bị", timestamp: new Date(Date.now() - 3600000).toISOString(), user: { fullName: "Trần Thị B" } },
  ]
};

// Đã đổi key từ 'in'/'out' sang 'cashIn'/'cashOut' để khớp tuyệt đối với interface CashflowData trong api.ts
const fallbackCashflowData = [
  { period: "T1", cashIn: 450000000, cashOut: 240000000 },
  { period: "T2", cashIn: 300000000, cashOut: 139000000 },
  { period: "T3", cashIn: 200000000, cashOut: 980000000 }, 
  { period: "T4", cashIn: 278000000, cashOut: 390000000 },
  { period: "T5", cashIn: 189000000, cashOut: 480000000 },
  { period: "T6", cashIn: 239000000, cashOut: 380000000 },
  { period: "T7", cashIn: 349000000, cashOut: 430000000 },
];

// ==========================================
// COMPONENT: DASHBOARD SKELETON
// ==========================================
const DashboardSkeleton = () => (
  <div className="w-full space-y-6 animate-pulse pb-safe">
    <div className="flex justify-between items-end mb-8">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
      </div>
      <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-36 bg-gray-200 dark:bg-gray-800 rounded-[1.5rem] border border-white/10"></div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-[400px] bg-gray-200 dark:bg-gray-800 rounded-[1.5rem]"></div>
      <div className="lg:col-span-1 h-[400px] bg-gray-200 dark:bg-gray-800 rounded-[1.5rem]"></div>
    </div>
  </div>
);

// ==========================================
// COMPONENT CHÍNH: BẢNG ĐIỀU KHIỂN
// ==========================================
export default function Dashboard() {
  const activeBranchId = useAppSelector((state) => state.global.activeBranchId);
  const currentUser = useAppSelector((state) => state.global.currentUser);
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // 1. API GỌI METRICS TỔNG QUAN
  const { data: apiMetrics, isLoading: isLoadingMetrics, isError: isMetricsError } = useGetDashboardMetricsQuery(
    activeBranchId || undefined, 
    { skip: !isMounted }
  );

  // 2. NÂNG CẤP: API GỌI DÒNG TIỀN CASHFLOW
  const { data: apiCashflow, isLoading: isLoadingCashflow, isError: isCashflowError } = useGetCashflowReportQuery(
    { branchId: activeBranchId || undefined },
    { skip: !isMounted }
  );

  // ==========================================
  // GRACEFUL DEGRADATION (CƠ CHẾ FALLBACK AN TOÀN)
  // Nếu API lỗi, tự động dùng Dữ liệu mẫu thay vì sập màn hình
  // ==========================================
  const metrics = isMetricsError || !apiMetrics ? fallbackMetrics : apiMetrics;
  const cashflowData = isCashflowError || !apiCashflow ? fallbackCashflowData : apiCashflow;
  const isUsingFallback = isMetricsError || isCashflowError || !apiMetrics;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(5px)" },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)", 
      transition: { type: "spring" as const, stiffness: 300, damping: 24 } 
    }
  };

  if (!isMounted || (isLoadingMetrics && !apiMetrics)) return <DashboardSkeleton />;

  const { summary, tasks, popularProducts, recentActivities } = metrics;

  const summaryCards = [
    {
      title: "Giá trị Tồn kho",
      value: formatCurrency(summary?.totalInventoryValue || 0),
      icon: PackageSearch,
      trend: "+5.2%",
      isPositive: true,
      color: "from-blue-500 to-cyan-400",
      bgLight: "bg-blue-50", bgDark: "dark:bg-blue-900/20",
    },
    {
      title: "Số dư Tiền mặt",
      value: formatCurrency(summary?.currentCashBalance || 0),
      icon: Wallet,
      trend: "+12.5%",
      isPositive: true,
      color: "from-emerald-500 to-teal-400",
      bgLight: "bg-emerald-50", bgDark: "dark:bg-emerald-900/20",
    },
    {
      title: "Khoản Phải thu (Khách nợ)",
      value: formatCurrency(summary?.totalAccountsReceivable || 0),
      icon: TrendingUp,
      trend: "-2.1%",
      isPositive: false,
      color: "from-amber-500 to-orange-400",
      bgLight: "bg-amber-50", bgDark: "dark:bg-amber-900/20",
    },
    {
      title: "Khoản Phải trả (Nợ NCC)",
      value: formatCurrency(summary?.totalAccountsPayable || 0),
      icon: CreditCard,
      trend: "+1.2%",
      isPositive: false, 
      color: "from-purple-500 to-indigo-400",
      bgLight: "bg-purple-50", bgDark: "dark:bg-purple-900/20",
    }
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full min-h-screen pb-safe space-y-6 sm:space-y-8"
    >
      {/* ==========================================
          CẢNH BÁO MẤT KẾT NỐI (HIỂN THỊ NẾU DÙNG FALLBACK DATA)
          ========================================== */}
      {isUsingFallback && (
        <motion.div variants={itemVariants} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-amber-700 dark:text-amber-400 shadow-sm">
          <div className="flex items-center text-sm font-medium">
            <WifiOff className="w-4 h-4 mr-2 flex-shrink-0" />
            Không thể kết nối máy chủ. Đang hiển thị Dữ liệu giả lập (Mock Data) để trình diễn giao diện.
          </div>
        </motion.div>
      )}

      {/* ==========================================
          HEADER: TIÊU ĐỀ & HÀNH ĐỘNG NHANH
          ========================================== */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 tracking-tight">
            Tổng quan Hệ thống
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 flex items-center">
            <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
            Báo cáo theo thời gian thực — {activeBranchId ? "Chi nhánh hiện tại" : "Toàn bộ Tổng công ty"}
          </p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-all focus:outline-none"
        >
          <Download className="w-4 h-4 mr-2" />
          Xuất báo cáo PDF
        </motion.button>
      </motion.div>

      {/* ==========================================
          SECTION 1: 4 WIDGETS TỔNG QUAN
          ========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {summaryCards.map((card, idx) => (
          <motion.div 
            key={idx} variants={itemVariants}
            whileHover={{ y: -5, transition: { type: "spring", stiffness: 300 } }}
            className="relative overflow-hidden bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-[1.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] group"
          >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20 dark:opacity-10 blur-2xl bg-gradient-to-br ${card.color} group-hover:scale-150 transition-transform duration-500`}></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${card.bgLight} ${card.bgDark} shadow-inner`}>
                <card.icon className={`w-6 h-6 text-transparent bg-clip-text bg-gradient-to-br ${card.color}`} stroke="url(#gradient)" />
                <svg width="0" height="0">
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop stopColor="currentColor" offset="0%" />
                    <stop stopColor="currentColor" offset="100%" />
                  </linearGradient>
                </svg>
              </div>
              
              <span className={`inline-flex items-center px-2 py-1 text-[11px] font-bold rounded-lg ${card.isPositive ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>
                {card.isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                {card.trend}
              </span>
            </div>
            
            <div>
              <p className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                {card.title}
              </p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate" title={card.value}>
                {card.value}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ==========================================
          SECTION 2: BIỂU ĐỒ TÀI CHÍNH & SẢN PHẨM BÁN CHẠY
          ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KHUNG TRÁI: BIỂU ĐỒ CASHFLOW (SỬ DỤNG API THẬT) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-[1.5rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Phân tích Dòng tiền (Cashflow)</h2>
            <select className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>7 tháng gần nhất</option>
              <option>Năm nay</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* Đã map data từ API Cashflow */}
              <AreaChart data={cashflowData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                {/* Dùng dataKey="period" theo interface API */}
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                
                {/* RÚT GỌN SỐ TRỤC Y */}
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af' }} 
                  tickFormatter={formatCompactCurrency} 
                  width={60} 
                />
                
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                {/* Dùng dataKey="cashIn" và "cashOut" theo interface API */}
                <Area type="monotone" dataKey="cashIn" name="Tiền Vào (Thu)" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" dataKey="cashOut" name="Tiền Ra (Chi)" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* KHUNG PHẢI: SẢN PHẨM BÁN CHẠY */}
        <motion.div variants={itemVariants} className="lg:col-span-1 bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-[1.5rem] p-6 shadow-sm flex flex-col">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-6">Top Hàng Hóa Lưu Chuyển</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-4">
            {popularProducts && popularProducts.length > 0 ? (
              popularProducts.slice(0, 5).map((product, idx) => (
                <div key={idx} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                      <Box className="w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <div className="flex flex-col max-w-[120px] sm:max-w-[150px]">
                      <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{product?.name || "Sản phẩm A"}</span>
                      <span className="text-[11px] font-medium text-gray-500">{product?.productCode || "SKU-001"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-gray-900 dark:text-white">{product?.totalStock || 0}</span>
                    <span className="text-[10px] font-bold text-blue-500 uppercase">Đã xuất</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">Chưa có dữ liệu hàng hóa lưu chuyển.</p>
            )}
          </div>
          
          {/* FIX LỖI HTML: Áp dụng style trực tiếp vào thẻ Link */}
          <Link 
            href="/inventory" 
            className="mt-4 block w-full py-2.5 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-colors text-center focus:outline-none"
          >
            Xem toàn bộ Báo cáo Kho
          </Link>
        </motion.div>
      </div>

      {/* ==========================================
          SECTION 3: NHẬT KÝ HOẠT ĐỘNG & PHÊ DUYỆT
          ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* NHẬT KÝ HOẠT ĐỘNG (DỊCH THUẬT NGÔN NGỮ) */}
        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-[1.5rem] p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-indigo-500" /> Hoạt động gần đây
          </h2>
          
          <div className="relative pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-6">
            {recentActivities && recentActivities.length > 0 ? (
              recentActivities.slice(0, 4).map((log, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[21px] top-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                    {log.user?.fullName || "Hệ thống"} 
                    <span className="font-normal text-gray-500"> {translateAction(log.action)} </span> 
                    <span className="font-bold">{log.entityName}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> {new Date(log.timestamp).toLocaleString('vi-VN')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">Chưa ghi nhận hoạt động nào trong phiên làm việc này.</p>
            )}
          </div>
        </motion.div>

        {/* NHẮC NHỞ VIỆC CẦN LÀM (TODO / APPROVALS) */}
        <motion.div variants={itemVariants} className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.5rem] p-6 shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          
          <div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <FileSignature className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-2">Trung tâm Phê duyệt</h2>
            <p className="text-blue-100 text-sm font-medium mb-6">
              Bạn hiện đang có <span className="text-white font-black text-lg bg-white/20 px-2 py-0.5 rounded-lg mx-1">{tasks?.pendingApprovals || 0}</span> chứng từ/phiếu yêu cầu chờ xử lý.
            </p>
          </div>

          <div className="space-y-3 relative z-10">
            {/* FIX LỖI HTML: Thẻ Link tự gánh Style, không dùng button bên trong */}
            <Link 
              href="/approvals" 
              className="w-full flex items-center justify-between bg-white text-blue-700 px-5 py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all focus:outline-none"
            >
              Vào màn hình Phê duyệt nhanh
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <button className="w-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3 rounded-xl font-semibold transition-all focus:outline-none backdrop-blur-sm">
              <Box className="w-4 h-4 mr-2" />
              Bật Sơ đồ Kho 3D (Thực tế ảo)
            </button>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}