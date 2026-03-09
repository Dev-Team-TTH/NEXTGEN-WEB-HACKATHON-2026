import { ActionType, Prisma } from "@prisma/client";
import prisma from "../prismaClient"; // Dùng chung instance prisma thay vì new PrismaClient() mới
import { getIo } from "./socket"; // Nhúng bộ bắn sự kiện thời gian thực Socket.io

/**
 * Hàm làm sạch dữ liệu an toàn (Safe Serialize)
 * Ngăn chặn lỗi "TypeError: Converting circular structure to JSON"
 * thường xảy ra khi truyền các Object phức tạp của Prisma vào.
 */
const sanitizeJson = (data: any): any => {
  if (!data) return null;
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.warn("[AUDIT WARNING] Dữ liệu truyền vào có cấu trúc vòng lặp (Circular), hệ thống đã cắt gọn để tránh lỗi.");
    return { _message: "Dữ liệu quá phức tạp để lưu trữ nguyên bản", _type: typeof data };
  }
};

// ==========================================
// 1. GHI NHẬT KÝ KIỂM TOÁN (WRITE LOG & REAL-TIME BROADCAST)
// ==========================================
export const logAudit = async (
  tableName: string,
  recordId: string,
  action: ActionType,
  oldValues: any = null,
  newValues: any = null,
  userId: string | null = null,
  ipAddress: string | null = null
): Promise<void> => {
  try {
    // 1. Lưu xuống Database
    const newLog = await prisma.systemAuditLog.create({
      data: {
        tableName,
        recordId,
        action,
        oldValues: sanitizeJson(oldValues),
        newValues: sanitizeJson(newValues),
        userId,
        ipAddress,
      },
      include: {
        user: { select: { fullName: true, email: true } } // Kéo theo user để bắn lên UI
      }
    });

    // 2. PHÁT SÓNG THỜI GIAN THỰC (REAL-TIME BROADCAST) TỚI FRONTEND
    try {
      const io = getIo();
      
      // Phân tách kênh riêng cho Yêu cầu Phê duyệt
      if (tableName === "ApprovalRequest" || tableName === "ApprovalLog") {
        io.emit("new_approval_event", {
          message: "Có cập nhật mới về Phê duyệt chứng từ",
          action: action,
          data: newLog
        });
      } 
      // Kênh chung cho mọi hoạt động khác
      else {
        io.emit("new_system_activity", {
          message: "Hoạt động hệ thống mới",
          action: action,
          tableName: tableName,
          data: newLog
        });
      }
    } catch (socketErr) {
      console.warn("[Socket] Chưa có kết nối hoặc lỗi phát sóng:", socketErr);
    }

  } catch (error) {
    // 💡 Thiết kế thông minh: Bắt lỗi nhưng TUYỆT ĐỐI KHÔNG THROW.
    console.error(`[AUDIT LOG ERROR] Lỗi khi ghi log cho bảng ${tableName} (ID: ${recordId}):`, error);
  }
};

// ==========================================
// 2. TRUY XUẤT LỊCH SỬ 1 BẢN GHI (READ RECORD HISTORY)
// ==========================================
/**
 * Dành cho Frontend gọi khi muốn vẽ Tab "Lịch sử" trong chi tiết 1 đối tượng.
 * Ví dụ: Xem lịch sử ai đã đổi giá của Sản phẩm X.
 */
export const getRecordHistory = async (tableName: string, recordId: string) => {
  try {
    const history = await prisma.systemAuditLog.findMany({
      where: {
        tableName,
        recordId,
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
    return history;
  } catch (error: any) {
    console.error("[AUDIT LOG ERROR] Lỗi truy xuất lịch sử đối tượng:", error);
    throw new Error(`Không thể lấy lịch sử dữ liệu của ${tableName}`);
  }
};

// ==========================================
// 3. TRUY XUẤT NHẬT KÝ TOÀN HỆ THỐNG (READ SYSTEM LOGS FOR ADMIN)
// ==========================================
/**
 * Phục vụ cho màn hình "Nhật ký hệ thống" của Quản trị viên (IT / Admin).
 * Có phân trang (Pagination) và bộ lọc phức tạp.
 */
export const getSystemLogs = async (
  filters: { 
    userId?: string; 
    action?: ActionType; 
    tableName?: string; 
    startDate?: string; 
    endDate?: string 
  }, 
  skip: number = 0, 
  take: number = 50
) => {
  try {
    // Khởi tạo điều kiện lọc chuẩn Prisma
    const whereCondition: Prisma.SystemAuditLogWhereInput = {};
    
    if (filters.userId) whereCondition.userId = filters.userId;
    if (filters.action) whereCondition.action = filters.action;
    if (filters.tableName) whereCondition.tableName = filters.tableName;
    
    // TỐI ƯU HÓA: Xử lý bộ lọc thời gian an toàn và chặt chẽ với TypeScript
    if (filters.startDate || filters.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
      if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
      
      whereCondition.timestamp = dateFilter;
    }

    // Chạy song song Count và Lấy dữ liệu để tối ưu tốc độ truy vấn
    const [total, logs] = await Promise.all([
      prisma.systemAuditLog.count({ where: whereCondition }),
      prisma.systemAuditLog.findMany({
        where: whereCondition,
        include: {
          user: {
            select: { fullName: true, email: true, department: { select: { name: true } } }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: Number(skip),
        take: Number(take)
      })
    ]);

    return { 
      total,
      currentPage: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
      logs 
    };
  } catch (error: any) {
    console.error("[AUDIT LOG ERROR] Lỗi truy xuất system logs:", error);
    throw new Error("Không thể lấy nhật ký hệ thống");
  }
};