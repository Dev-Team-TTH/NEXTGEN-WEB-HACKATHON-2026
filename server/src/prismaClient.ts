import { PrismaClient } from "@prisma/client";

// Áp dụng Singleton Pattern: Ngăn chặn việc khởi tạo nhiều PrismaClient
// đặc biệt là trong môi trường Development (Nodemon/Ts-node-dev) khi Hot-Reload
declare global {
  var prisma: PrismaClient | undefined;
}

// Khởi tạo và tối ưu hóa Connection Pool
const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["warn", "error"], // Chỉ log lỗi để giảm tải I/O Console, tăng tốc độ thực thi
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;