/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tắt StrictMode trong lúc Dev để tránh React render 2 lần liên tiếp làm x2 lượng RAM tiêu thụ
  reactStrictMode: false, 
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "**" },
      { protocol: "https", hostname: "**" },
    ],
  },
  
  experimental: {
    // Tối ưu hóa phân luồng CPU/RAM khi Next.js biên dịch
    memoryBasedWorkersCount: true,
  },

  // ==========================================
  // VŨ KHÍ MỚI: TÍCH HỢP TURBOPACK (NEXT.JS 15+)
  // ==========================================
  // Khai báo block này để báo cho Next.js biết chúng ta chủ động dùng Turbopack trong Dev.
  // Điều này sẽ xóa bỏ lỗi cảnh báo "This build is using Turbopack, with a webpack config..."
  turbopack: {
    // Để trống hoặc cấu hình alias nếu dự án yêu cầu trong tương lai
  },

  // ==========================================
  // VŨ KHÍ DỰ PHÒNG: WEBPACK (CHO PRODUCTION BUILD)
  // ==========================================
  webpack: (config, { dev, isServer }) => {
    // Cấu hình chống tràn RAM này vẫn có tác dụng nếu bạn chạy dev bằng cờ --webpack
    if (dev) {
      config.cache = {
        type: 'memory',
        maxMemoryGenerations: 1,
      };
      config.devtool = 'eval-cheap-module-source-map';
    }
    
    // Tắt các module Node.js không cần thiết trên Frontend (Giúp giảm dung lượng bundle)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },
};

export default nextConfig;