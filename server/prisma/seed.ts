import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Bắt đầu cấp tài khoản Root Admin...");

  // Kiểm tra xem đã có admin chưa để không bị tạo trùng
  const adminExists = await prisma.users.findUnique({ where: { email: "admin@team-tth.com" } });
  
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("123456", 10); // Mật khẩu mặc định: 123456
    
    await prisma.users.create({
      data: {
        name: "Giám Đốc (Root Admin)",
        email: "admin@team-tth.com",
        password: hashedPassword,
        role: "ADMIN",
        warehouseId: null, // Root Admin không bị trói buộc vào kho nào
        phone: "0909000000"
      }
    });
    console.log("✅ Đã tạo tài khoản thành công!");
    console.log("Tài khoản: admin@team-tth.com | Mật khẩu: 123456");
  } else {
    console.log("✅ Tài khoản Root Admin đã có sẵn trong hệ thống.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });