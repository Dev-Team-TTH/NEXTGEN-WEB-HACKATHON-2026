import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

// ==========================================
// IMPORT TOÀN BỘ CÁC ROUTES CỦA HỆ THỐNG
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

// Nạp biến môi trường từ file .env
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// 1. GLOBAL MIDDLEWARES (LÁ CHẮN BẢO VỆ)
// ==========================================
// Helmet giúp bảo vệ ứng dụng khỏi một số lỗ hổng web đã biết bằng cách thiết lập cấu hình HTTP headers phù hợp
app.use(helmet()); 

// CORS (Cross-Origin Resource Sharing): Kiểm soát domain nào được phép gọi API
app.use(cors({
  origin: process.env.CLIENT_URL || "*", // Trên Production, thay "*" bằng URL của Frontend
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Morgan: Ghi log mọi request HTTP ra console để dễ debug
app.use(morgan("dev"));

// Body Parser: Xử lý payload JSON và URL-encoded
app.use(express.json({ limit: "10mb" })); // Tăng giới hạn payload lên 10MB cho các form lớn
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ==========================================
// 2. ĐĂNG KÝ ROUTER (API ENDPOINTS)
// ==========================================
// Tiền tố phiên bản API chuẩn mực
const apiPrefix = "/api/v1";

// --- 2.1. Authentication & Phân quyền (Security Core) ---
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/org-rbac`, orgAndRbacRoutes);

// --- 2.2. Master Data & Cấu hình (Dữ liệu nền tảng) ---
app.use(`${apiPrefix}/master-data`, masterDataRoutes);
app.use(`${apiPrefix}/asset-master`, assetMasterRoutes);
app.use(`${apiPrefix}/finance-setup`, financeSetupRoutes);

// --- 2.3. Sản phẩm & Tồn kho (WMS Core) ---
app.use(`${apiPrefix}/products`, productRoutes);
app.use(`${apiPrefix}/inventory`, inventoryRoutes);

// --- 2.4. Mua bán & Giao dịch kho (Transactions) ---
app.use(`${apiPrefix}/transactions`, transactionRoutes);

// --- 2.5. Tài chính Kế toán (Accounting & Finance Core) ---
app.use(`${apiPrefix}/accounting`, accountingRoutes);
app.use(`${apiPrefix}/advanced-finance`, advancedFinanceRoutes);
app.use(`${apiPrefix}/expenses`, expenseRoutes);

// --- 2.6. Quản lý Tài sản (Enterprise Asset Management) ---
app.use(`${apiPrefix}/assets`, assetRoutes);

// --- 2.7. Quy trình Phê duyệt (Approval Workflows) ---
app.use(`${apiPrefix}/approval-config`, approvalConfigRoutes);
app.use(`${apiPrefix}/approvals`, approvalRoutes);

// --- 2.8. Báo cáo & Thống kê (Dashboard & Analytics) ---
app.use(`${apiPrefix}/dashboard`, dashboardRoutes);


// ==========================================
// 3. HEALTH CHECK ENDPOINT
// ==========================================
// Dùng để AWS, Docker hoặc Load Balancer kiểm tra xem Server còn sống không
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Chào mừng đến với hệ thống ERP Core API",
    version: "1.0.0",
    status: "Running smoothly 🚀",
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 4. XỬ LÝ LỖI (GLOBAL ERROR HANDLING)
// ==========================================

// 4.1. Bắt lỗi 404 (Route không tồn tại)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`
  });
});

// 4.2. Trạm bắt lỗi tập trung (Global Error Handler)
// Ngăn chặn việc sập Node.js (App Crash) khi có lỗi không mong muốn xảy ra ở Controller
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[🔥 LỖI HỆ THỐNG]:", err.stack || err.message);
  
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message || "Lỗi máy chủ nội bộ (Internal Server Error)",
    // Chỉ trả về chi tiết stack trace nếu đang ở môi trường dev để bảo mật
    error: process.env.NODE_ENV === "development" ? err.stack : undefined 
  });
});

// ==========================================
// 5. KHỞI ĐỘNG SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Backend đang chạy mạnh mẽ tại cổng: ${PORT}`);
  console.log(`🌍 API Base URL: http://localhost:${PORT}${apiPrefix}`);
  console.log(`🛡️  Bảo vệ bởi Helmet, CORS và JWT Middleware`);
  console.log(`======================================================\n`);
});

// Export app để dễ dàng viết Unit Test (với Jest / Supertest) sau này
export default app;