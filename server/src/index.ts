import express, { Application, Request, Response, NextFunction } from "express";
import http from "http"; // BẮT BUỘC ĐỂ BỌC SOCKET.IO
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";

// Import Socket.io (Hệ thống Real-time)
import { initSocket } from "./utils/socket";

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
import uploadRoutes from "./routes/uploadRoutes"; // Module Upload File

// ==========================================
// 2. IMPORT CÁC CRONJOBS (TIẾN TRÌNH CHẠY NGẦM)
// ==========================================
import { startCronJobs } from "./utils/fxAutoUpdater";

// Nạp biến môi trường từ file .env
dotenv.config();

// Khởi tạo ứng dụng Express và bọc bằng HTTP Server
const app: Application = express();
const server = http.createServer(app); // VŨ KHÍ CỐT LÕI ĐỂ CHẠY CHUNG SOCKET.IO

// KHỞI TẠO SOCKET.IO TRÊN HTTP SERVER NÀY
initSocket(server);

const PORT = process.env.PORT || 5000;
const apiPrefix = "/api/v1"; 

// ==========================================
// 3. GLOBAL MIDDLEWARES (LÁ CHẮN BẢO VỆ)
// ==========================================
// crossOriginResourcePolicy: false cho phép Frontend lấy ảnh từ thư mục public
app.use(helmet({ crossOriginResourcePolicy: false })); 

// CORS: Kiểm soát domain gọi API
app.use(cors({
  origin: process.env.CLIENT_URL || "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Morgan: Ghi log API ra Terminal
app.use(morgan("dev"));

// Body Parser: Xử lý JSON và form-data (Giới hạn 10MB)
app.use(express.json({ limit: "10mb" })); 
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Mở public thư mục uploads để Frontend truy cập ảnh
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ==========================================
// 4. ĐĂNG KÝ ROUTER (API ENDPOINTS)
// ==========================================

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/org-rbac`, orgAndRbacRoutes);
app.use(`${apiPrefix}/master-data`, masterDataRoutes);
app.use(`${apiPrefix}/asset-master`, assetMasterRoutes);
app.use(`${apiPrefix}/finance-setup`, financeSetupRoutes);
app.use(`${apiPrefix}/products`, productRoutes);
app.use(`${apiPrefix}/inventory`, inventoryRoutes);
app.use(`${apiPrefix}/transactions`, transactionRoutes);
app.use(`${apiPrefix}/accounting`, accountingRoutes);
app.use(`${apiPrefix}/advanced-finance`, advancedFinanceRoutes);
app.use(`${apiPrefix}/expenses`, expenseRoutes);
app.use(`${apiPrefix}/assets`, assetRoutes);
app.use(`${apiPrefix}/approval-config`, approvalConfigRoutes);
app.use(`${apiPrefix}/approvals`, approvalRoutes);
app.use(`${apiPrefix}/dashboard`, dashboardRoutes);
app.use("/api/v1/search", searchRoutes);
app.use(`${apiPrefix}/upload`, uploadRoutes); // Endpoint Upload

// ==========================================
// 5. HEALTH CHECK ENDPOINT
// ==========================================
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Chào mừng đến với hệ thống ERP Core API",
    version: "1.0.0",
    status: "Running smoothly 🚀",
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 6. XỬ LÝ LỖI (GLOBAL ERROR HANDLING)
// ==========================================

// 6.1. Bắt lỗi 404 (Route không tồn tại)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`
  });
});

// 6.2. Trạm bắt lỗi tập trung (Tránh crash server Node.js)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[🔥 LỖI HỆ THỐNG]:", err.stack || err.message);
  
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message || "Lỗi máy chủ nội bộ (Internal Server Error)",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined 
  });
});

// ==========================================
// 7. KÍCH HOẠT TIẾN TRÌNH & KHỞI ĐỘNG SERVER
// ==========================================

// Kích hoạt Cronjob
startCronJobs();

// SỬA LỖI QUAN TRỌNG: Dùng `server.listen` thay vì `app.listen` để Socket.io hoạt động!
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Backend & Socket.io đang chạy tại cổng: ${PORT}`);
  console.log(`🌍 API Base URL: http://localhost:${PORT}${apiPrefix}`);
  console.log(`🛡️  Bảo vệ bởi Helmet, CORS và JWT Middleware`);
  console.log(`======================================================\n`);
});

export default app;