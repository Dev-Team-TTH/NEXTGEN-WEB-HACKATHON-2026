import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu gieo hạt (Seeding) dữ liệu Phân quyền...");

  // Danh sách các Quyền (Permissions) chuẩn của hệ thống ERP
  const systemPermissions = [
    // MODULE: INVENTORY (Kho bãi)
    { code: "VIEW_INVENTORY", module: "INVENTORY" },
    { code: "MANAGE_INVENTORY", module: "INVENTORY" },
    
    // MODULE: USERS (Nhân sự & Phân quyền)
    { code: "VIEW_USERS", module: "USERS" },
    { code: "MANAGE_USERS", module: "USERS" },
    { code: "MANAGE_ROLES", module: "USERS" },
    
    // MODULE: ASSETS (Tài sản)
    { code: "VIEW_ASSETS", module: "ASSETS" },
    { code: "MANAGE_ASSETS", module: "ASSETS" },
    
    // MODULE: FINANCE (Tài chính Kế toán)
    { code: "VIEW_FINANCE", module: "FINANCE" },
    { code: "MANAGE_FINANCE", module: "FINANCE" },
    
    // MODULE: APPROVALS (Phê duyệt)
    { code: "VIEW_APPROVALS", module: "APPROVALS" },
    { code: "MANAGE_APPROVALS", module: "APPROVALS" },
    { code: "ACTION_APPROVALS", module: "APPROVALS" }, // Quyền được bấm Duyệt/Từ chối
  ];

  for (const perm of systemPermissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {}, // Nếu có rồi thì bỏ qua
      create: {
        code: perm.code,
        module: perm.module
      }
    });
  }

  console.log("✅ Đã tạo xong danh sách Quyền (Permissions) hệ thống!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });