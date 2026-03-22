import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu gieo hạt (Seeding) dữ liệu hệ thống TTH ERP...");

  // ==========================================
  // BƯỚC 1: KHỞI TẠO 22 QUYỀN HỆ THỐNG (CHUẨN ERP)
  // ==========================================
  const standardPermissions = [
    { code: "ALL", name: "Super Admin (Quản trị Tối cao)", description: "Quyền năng vô hạn, can thiệp mọi cấu hình", module: "SYSTEM" },
    { code: "MANAGE_SETTINGS", name: "Quản lý Cài đặt", description: "Thay đổi cấu hình máy chủ, logo, múi giờ", module: "SYSTEM" },
    { code: "VIEW_SETTINGS", name: "Xem Cài đặt", description: "Xem các cấu hình chung", module: "SYSTEM" },
    { code: "MANAGE_USERS", name: "Quản lý Nhân sự", description: "Thêm, xóa, khóa, reset mật khẩu nhân viên", module: "USERS" },
    { code: "VIEW_USERS", name: "Xem Danh sách Nhân sự", description: "Xem sơ đồ tổ chức, danh sách nhân viên", module: "USERS" },
    { code: "MANAGE_ROLES", name: "Quản lý Phân quyền", description: "Tạo Vai trò (Role) và gán quyền hạn", module: "USERS" },
    { code: "MANAGE_MASTER_DATA", name: "Quản lý Dữ liệu gốc", description: "Thêm/sửa danh mục, đối tác, thuế, tiền tệ", module: "MASTER_DATA" },
    { code: "VIEW_MASTER_DATA", name: "Xem Dữ liệu gốc", description: "Tra cứu danh mục hệ thống", module: "MASTER_DATA" },
    { code: "MANAGE_INVENTORY", name: "Điều chỉnh Kho bãi", description: "Nhập/xuất thủ công, chuyển kho, kiểm kê", module: "INVENTORY" },
    { code: "VIEW_INVENTORY", name: "Tra cứu Tồn kho", description: "Xem thẻ kho, lịch sử và số lượng hàng hóa", module: "INVENTORY" },
    { code: "MANAGE_TRANSACTION", name: "Tạo Chứng từ Mua/Bán", description: "Lập Đơn hàng (PO/SO), Nhập kho (GRPO)", module: "TRANSACTIONS" },
    { code: "VIEW_TRANSACTION", name: "Xem Lịch sử Giao dịch", description: "Tra cứu chứng từ mua bán, hóa đơn", module: "TRANSACTIONS" },
    { code: "MANAGE_ACCOUNTING", name: "Ghi sổ Kế toán", description: "Tạo bút toán thủ công, đảo sổ, khóa kỳ", module: "ACCOUNTING" },
    { code: "VIEW_ACCOUNTING", name: "Xem Sổ Kế toán", description: "Xem sổ cái, bảng cân đối, lưu chuyển tiền tệ", module: "ACCOUNTING" },
    { code: "MANAGE_EXPENSES", name: "Lập Phiếu Chi", description: "Tạo và ghi nhận chứng từ chi phí", module: "EXPENSES" },
    { code: "VIEW_EXPENSES", name: "Tra cứu Phiếu Chi", description: "Xem danh sách và lịch sử chi phí", module: "EXPENSES" },
    { code: "MANAGE_ASSET", name: "Quản trị Tài sản", description: "Cấp phát, thanh lý, tính khấu hao TSCĐ", module: "ASSETS" },
    { code: "VIEW_ASSET", name: "Xem Tài sản", description: "Xem danh sách và lịch sử tài sản", module: "ASSETS" },
    { code: "MANAGE_APPROVALS", name: "Cấu hình Quy trình", description: "Thiết lập các bước duyệt (Workflow)", module: "APPROVALS" },
    { code: "APPROVE_DOCUMENTS", name: "Thực hiện Phê duyệt", description: "Có quyền Bấm nút Duyệt hoặc Từ chối tờ trình", module: "APPROVALS" },
    { code: "VIEW_APPROVALS", name: "Xem Bảng Phê duyệt", description: "Xem tiến trình và trạng thái các tờ trình", module: "APPROVALS" },
    { code: "VIEW_DASHBOARD", name: "Trực quan hóa Dữ liệu", description: "Xem biểu đồ tổng quan, báo cáo BI", module: "DASHBOARD" }
  ];

  for (const perm of standardPermissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, description: perm.description, module: perm.module },
      create: perm
    });
  }
  console.log("✅ 1. Đã đồng bộ Ma trận 22 Quyền hệ thống!");

  // ==========================================
  // BƯỚC 2: TẠO VAI TRÒ "SUPER ADMIN"
  // ==========================================
  let adminRole = await prisma.role.findFirst({ where: { roleName: "Super Admin" } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { roleName: "Super Admin", description: "Quản trị viên tối cao của hệ thống" }
    });
  }

  // Gán TẤT CẢ quyền cho Role Super Admin
  const allPerms = await prisma.permission.findMany();
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.roleId } }); // Xóa quyền cũ nếu có
  await prisma.rolePermission.createMany({
    data: allPerms.map(p => ({ roleId: adminRole!.roleId, permissionId: p.permissionId }))
  });
  console.log("✅ 2. Đã tạo Vai trò Super Admin và gán Full quyền!");

  // ==========================================
  // BƯỚC 3: TẠO CƠ CẤU TỔ CHỨC MẶC ĐỊNH
  // Để User có DepartmentId bám vào (Tránh lỗi Ràng buộc khóa ngoại)
  // ==========================================
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({ data: { code: "TTH", name: "Công ty TNHH TTH ERP", address: "Việt Nam" } });
  }

  let branch = await prisma.branch.findFirst({ where: { companyId: company.companyId } });
  if (!branch) {
    branch = await prisma.branch.create({ data: { companyId: company.companyId, code: "HQ", name: "Trụ sở chính HQ", address: "Việt Nam" } });
  }

  let department = await prisma.department.findFirst({ where: { branchId: branch.branchId } });
  if (!department) {
    department = await prisma.department.create({ data: { branchId: branch.branchId, code: "BOD", name: "Ban Giám Đốc" } });
  }
  console.log("✅ 3. Đã xác nhận Cơ cấu Tổ chức mặc định!");

  // ==========================================
  // BƯỚC 4: TẠO HOẶC KHÔI PHỤC TÀI KHOẢN ADMIN
  // ==========================================
  const adminEmail = "admin@erp.com"; // Bạn có thể đổi email tùy ý
  const plainPassword = "Admin@123";
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  let adminUser = await prisma.users.findUnique({ where: { email: adminEmail } });

  if (adminUser) {
    // Nếu vô tình khóa tài khoản hoặc lỗi pass, khôi phục lại!
    await prisma.users.update({
      where: { email: adminEmail },
      data: { 
        passwordHash, 
        roleId: adminRole.roleId, 
        departmentId: department.departmentId, 
        status: "ACTIVE",
        failedLoginAttempts: 0,
        lockedUntil: null,
        isDeleted: false
      }
    });
    console.log("✅ 4. Đã khôi phục và Reset Mật khẩu cho tài khoản Admin cũ!");
  } else {
    // Nếu đã bị xóa mất, tạo mới tinh
    await prisma.users.create({
      data: {
        email: adminEmail,
        passwordHash: passwordHash,
        fullName: "System Administrator",
        phone: "0999999999",
        departmentId: department.departmentId,
        roleId: adminRole.roleId,
        status: "ACTIVE"
      }
    });
    console.log("✅ 4. Đã tạo mới hoàn toàn tài khoản Admin!");
  }

  console.log("\n=============================================");
  console.log("🎉 SEEDING HOÀN TẤT THÀNH CÔNG!");
  console.log("=============================================");
  console.log(`👤 Tài khoản : ${adminEmail}`);
  console.log(`🔑 Mật khẩu  : ${plainPassword}`);
  console.log("=============================================\n");
}

main()
  .catch((e) => {
    console.error("🔥 Lỗi nghiêm trọng khi Seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });