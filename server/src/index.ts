import express, { Application, Request, Response, NextFunction } from "express";
import http from "http"; 
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import compression from "compression"; // 🚀 MỚI: Tối ưu băng thông
import rateLimit from "express-rate-limit"; // 🚀 MỚI: Chống DDoS / Brute-force

// Import Socket.io (Hệ thống Real-time)
import { initSocket } from "./utils/socket";
// Import Prisma để quản lý Graceful Shutdown
import prisma from "./prismaClient";

// ==========================================
// 1. IMPORT TOÀN BỘ CÁC ROUTES CỦA HỆ THỐNG
// ==========================================
import authRoutes from "./routes/authRoutes";
import orgAndRbacRoutes from "./routes/orgAndRbacRoutes";
import masterDataRoutes from "./routes/masterDataRoutes";
import productRoutes from "./routes/productRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import accountingRoutes from "./routes/accountingRoutes";
import advancedFinanceRoutes from "./routes/advancedFinanceRoutes";
import financeSetupRoutes from "./routes/financeSetupRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import assetRoutes from "./routes/assetRoutes";
import assetMasterRoutes from "./routes/assetMasterRoutes";
import approvalRoutes from "./routes/approvalRoutes";
import approvalConfigRoutes from "./routes/approvalConfigRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import searchRoutes from "./routes/searchRoutes";
import uploadRoutes from "./routes/uploadRoutes"; 
import chatbotRoutes from "./routes/chatbotRoutes"; // 🚀 MỚI: Chatbot AI

// ==========================================
// 2. IMPORT CÁC CRONJOBS (TIẾN TRÌNH CHẠY NGẦM)
// ==========================================
import { startCronJobs } from "./utils/fxAutoUpdater";

// Nạp biến môi trường
dotenv.config();

// Khởi tạo ứng dụng Express và bọc bằng HTTP Server
const app: Application = express();
const server = http.createServer(app);

// Khởi tạo Socket.IO
initSocket(server);

const PORT = process.env.PORT || 5000;
const apiPrefix = "/api/v1"; 

// ==========================================
// 3. GLOBAL MIDDLEWARES (LÁ CHẮN BẢO VỆ & TỐI ƯU)
// ==========================================
// 3.1. Bảo mật Header HTTP
app.use(helmet({ crossOriginResourcePolicy: false })); 

// 3.2. Cấu hình CORS an toàn
app.use(cors({
  origin: process.env.CLIENT_URL || "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 3.3. Giới hạn số lượng Request (Rate Limiter - 1000 requests / 15 phút / 1 IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: { message: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau!" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiPrefix, limiter); // Chỉ áp dụng cho các route API

// 3.4. Nén Response (Giảm tải băng thông Server lên đến 70%)
app.use(compression());

// 3.5. Logger
app.use(morgan("dev"));

// 3.6. Body Parser (Giới hạn 10MB để chống tràn RAM)
app.use(express.json({ limit: "10mb" })); 
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 3.7. Thư mục Public (Cho file Uploads)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ==========================================
// 4. QUẢN LÝ ROUTER THÔNG MINH (ROUTER ORCHESTRATION)
// ==========================================
const apiRoutes = [
  { path: "/auth", router: authRoutes },
  { path: "/org-rbac", router: orgAndRbacRoutes },
  { path: "/master-data", router: masterDataRoutes },
  { path: "/asset-master", router: assetMasterRoutes },
  { path: "/finance-setup", router: financeSetupRoutes },
  { path: "/products", router: productRoutes },
  { path: "/inventory", router: inventoryRoutes },
  { path: "/transactions", router: transactionRoutes },
  { path: "/accounting", router: accountingRoutes },
  { path: "/advanced-finance", router: advancedFinanceRoutes },
  { path: "/expenses", router: expenseRoutes },
  { path: "/assets", router: assetRoutes },
  { path: "/approval-config", router: approvalConfigRoutes },
  { path: "/approvals", router: approvalRoutes },
  { path: "/dashboard", router: dashboardRoutes },
  { path: "/search", router: searchRoutes },
  { path: "/upload", router: uploadRoutes },
  { path: "/chatbot", router: chatbotRoutes }, // Đã map Chatbot
];

// Tự động Mount tất cả các Route vào Prefix (Sạch sẽ, dễ bảo trì)
apiRoutes.forEach(route => {
  app.use(`${apiPrefix}${route.path}`, route.router);
});

// ==========================================
// 5. HEALTH CHECK ENDPOINT (MONITORING)
// ==========================================
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "TTH ERP Core API System",
    version: "1.0.0",
    status: "Running smoothly 🚀",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 6. XỬ LÝ LỖI TẬP TRUNG (GLOBAL ERROR HANDLING)
// ==========================================

// 6.1. Bắt lỗi 404 (Route không tồn tại)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`
  });
});

// 6.2. Trạm bắt lỗi trung tâm (Tránh crash Server Node.js)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("🔥 [CRITICAL ERROR]:", err.stack || err.message);
  
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Lỗi máy chủ nội bộ (Internal Server Error)",
    // Ẩn stack trace nếu đang ở môi trường Production để bảo mật
    error: process.env.NODE_ENV === "development" ? err.stack : undefined 
  });
});

// ==========================================
// 7. KÍCH HOẠT & GRACEFUL SHUTDOWN (DEVOPS STANDARD)
// ==========================================

// Kích hoạt Cronjob (Tiến trình ngầm)
startCronJobs();

// Khởi động Server
const runningServer = server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 TTH ERP Backend & Socket.io đang chạy tại cổng: ${PORT}`);
  console.log(`🌍 API Base URL: http://localhost:${PORT}${apiPrefix}`);
  console.log(`🛡️  Bảo vệ bởi: Helmet, CORS, Rate Limit & Compression`);
  console.log(`======================================================\n`);
});

// 🚀 NÂNG CẤP: Đóng Server An toàn (Graceful Shutdown)
// Bắt tín hiệu khi bạn ấn Ctrl+C hoặc khi VPS Restart
const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Nhận tín hiệu tắt hệ thống. Đang dọn dẹp...`);
  
  runningServer.close(async () => {
    console.log("🛑 Đã ngắt kết nối HTTP Server (Không nhận Request mới).");
    try {
      await prisma.$disconnect();
      console.log("🗄️ Đã đóng kết nối Database (Prisma) an toàn.");
      process.exit(0);
    } catch (err) {
      console.error("❌ Lỗi khi đóng Database:", err);
      process.exit(1);
    }
  });

  // Ép tắt nếu quá 10 giây mà các tác vụ cũ chưa chạy xong
  setTimeout(() => {
    console.error("⚠️ Quá thời gian đóng an toàn. Ép buộc tắt hệ thống!");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;