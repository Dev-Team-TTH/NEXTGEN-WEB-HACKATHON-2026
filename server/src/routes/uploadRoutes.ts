import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

// Đảm bảo thư mục uploads tồn tại
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình Multer lưu file (Ép kiểu any để fix lỗi TS7006)
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    // Tạo tên file độc nhất: timestamp_tên-gốc
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Giới hạn file 10MB
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

// ==========================================
// API: UPLOAD 1 FILE
// ==========================================
router.post("/", authenticateToken, upload.single("file"), (req: Request, res: Response): void => {
  try {
    // Ép kiểu (req as any) để fix triệt để lỗi TS2339: Property 'file' does not exist
    const uploadedFile = (req as any).file;

    if (!uploadedFile) {
      res.status(400).json({ message: "Không tìm thấy file để tải lên!" });
      return;
    }

    // Trả về URL tương đối để Frontend truy cập thông qua express.static
    const fileUrl = `/uploads/${uploadedFile.filename}`;
    
    res.status(200).json({
      message: "Tải file lên thành công!",
      url: fileUrl,
      fileName: uploadedFile.originalname,
      size: uploadedFile.size
    });
  } catch (error: any) {
    console.error("[UPLOAD ERROR]:", error);
    res.status(500).json({ message: "Lỗi máy chủ khi tải file", error: error.message });
  }
});

export default router;