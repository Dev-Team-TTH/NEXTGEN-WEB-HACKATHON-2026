import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path"; // [THÊM MỚI] Dùng để định tuyến thư mục

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
import uploadRoutes from "./routes/uploadRoutes"; // [THÊM MỚI] Route upload

// ==========================================
// 2. IMPORT CÁC CRONJOBS (TIẾN TRÌNH CHẠY NGẦM)
// ==========================================
import { startCronJobs } from "./utils/fxAutoUpdater";

// Nạp biến môi trường từ file .env
dotenv.config();

// Khởi tạo ứng dụng Express
const app: Application = express();
const PORT = process.env.PORT || 5000;
const apiPrefix = "/api/v1"; // Tiền tố phiên bản API chuẩn mực

// ==========================================
// 3. GLOBAL MIDDLEWARES (LÁ CHẮN BẢO VỆ)
// ==========================================
// Helmet giúp bảo vệ ứng dụng khỏi một số lỗ hổng web đã biết bằng cách thiết lập cấu hình HTTP headers phù hợp
// [THÊM MỚI] Cấu hình crossOriginResourcePolicy để cho phép load ảnh từ domain khác (nếu cần)
app.use(helmet({ crossOriginResourcePolicy: false })); 

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

// [THÊM MỚI] BIẾN THƯ MỤC UPLOADS THÀNH PUBLIC ĐỂ FRONTEND XEM ĐƯỢC ẢNH
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ==========================================
// 4. ĐĂNG KÝ ROUTER (API ENDPOINTS)
// ==========================================

// --- 4.1. Authentication & Phân quyền (Security Core) ---
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/org-rbac`, orgAndRbacRoutes);

// --- 4.2. Master Data & Cấu hình (Dữ liệu nền tảng) ---
app.use(`${apiPrefix}/master-data`, masterDataRoutes);
app.use(`${apiPrefix}/asset-master`, assetMasterRoutes);
app.use(`${apiPrefix}/finance-setup`, financeSetupRoutes);

// --- 4.3. Sản phẩm & Tồn kho (WMS Core) ---
app.use(`${apiPrefix}/products`, productRoutes);
app.use(`${apiPrefix}/inventory`, inventoryRoutes);

// --- 4.4. Mua bán & Giao dịch kho (Transactions) ---
app.use(`${apiPrefix}/transactions`, transactionRoutes);

// --- 4.5. Tài chính Kế toán (Accounting & Finance Core) ---
app.use(`${apiPrefix}/accounting`, accountingRoutes);
app.use(`${apiPrefix}/advanced-finance`, advancedFinanceRoutes);
app.use(`${apiPrefix}/expenses`, expenseRoutes);

// --- 4.6. Quản lý Tài sản (Enterprise Asset Management) ---
app.use(`${apiPrefix}/assets`, assetRoutes);

// --- 4.7. Quy trình Phê duyệt (Approval Workflows) ---
app.use(`${apiPrefix}/approval-config`, approvalConfigRoutes);
app.use(`${apiPrefix}/approvals`, approvalRoutes);

// --- 4.8. Báo cáo & Thống kê & Tiện ích ---
app.use(`${apiPrefix}/dashboard`, dashboardRoutes);
app.use("/api/v1/search", searchRoutes);
app.use(`${apiPrefix}/upload`, uploadRoutes); // [THÊM MỚI] Đăng ký API Upload


// ==========================================
// 5. HEALTH CHECK ENDPOINT
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
// 6. XỬ LÝ LỖI (GLOBAL ERROR HANDLING)
// ==========================================

// 6.1. Bắt lỗi 404 (Route không tồn tại)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`
  });
});

// 6.2. Trạm bắt lỗi tập trung (Global Error Handler)
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
// 7. KÍCH HOẠT TIẾN TRÌNH & KHỞI ĐỘNG SERVER
// ==========================================

// 🚀 Kích hoạt Bot tự động cập nhật Tỷ giá ngoại tệ
startCronJobs();

// Bắt đầu lắng nghe các luồng kết nối
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Backend đang chạy mạnh mẽ tại cổng: ${PORT}`);
  console.log(`🌍 API Base URL: http://localhost:${PORT}${apiPrefix}`);
  console.log(`🛡️  Bảo vệ bởi Helmet, CORS và JWT Middleware`);
  console.log(`======================================================\n`);
});

export default app;