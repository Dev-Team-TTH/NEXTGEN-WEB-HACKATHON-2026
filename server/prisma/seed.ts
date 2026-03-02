import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient()

async function main() {
  console.log("Bắt đầu gieo dữ liệu hệ thống (Seeding)...")

  // 1. Tạo UoM (Đơn vị tính) Mặc định
  const uom = await prisma.unitOfMeasure.upsert({
    where: { code: 'DEFAULT_UOM' },
    update: {},
    create: { code: 'DEFAULT_UOM', name: 'Cái' }
  })

  // 2. Tạo Category (Danh mục) Mặc định
  const category = await prisma.productCategory.upsert({
    where: { code: 'DEFAULT_CAT' },
    update: {},
    create: { code: 'DEFAULT_CAT', name: 'Chưa phân loại' }
  })

  // 3. Tạo Product (Sản phẩm) Hệ thống
  const product = await prisma.products.upsert({
    where: { productCode: 'SYS_PROD' },
    update: {},
    create: {
      productCode: 'SYS_PROD',
      name: 'Sản phẩm Hệ thống',
      price: 0,
      uomId: uom.uomId,
      categoryId: category.categoryId,
    }
  })

  // 4. Tạo Variant (Biến thể) mặc định mang ID "NONE"
  await prisma.productVariant.upsert({
    where: { sku: 'NONE' },
    update: {},
    create: {
      variantId: 'NONE', // Ép cứng ID là NONE
      productId: product.productId,
      sku: 'NONE',
      attributes: '{"type": "system_default"}'
    }
  })

  // 5. Tạo Batch (Lô) mặc định mang ID "NONE"
  await prisma.productBatch.upsert({
    where: {
      productId_variantId_batchNumber: {
        productId: product.productId,
        variantId: 'NONE',
        batchNumber: 'NONE'
      }
    },
    update: {},
    create: {
      batchId: 'NONE', // Ép cứng ID là NONE
      productId: product.productId,
      variantId: 'NONE',
      batchNumber: 'NONE'
    }
  })

  // 6. Cấu trúc Tổ chức & Kho bãi Mặc định (Company -> Branch -> Department -> Warehouse -> Bin)
  const company = await prisma.company.upsert({
    where: { code: 'SYS_COMP' },
    update: {},
    create: { code: 'SYS_COMP', name: 'Công ty Cổ phần TTH' }
  })

  const branch = await prisma.branch.upsert({
    where: { code: 'HQ_BRANCH' },
    update: {},
    create: { companyId: company.companyId, code: 'HQ_BRANCH', name: 'Trụ sở chính' }
  })

  // 🔥 ĐÃ SỬA LỖI: Tạo thêm Phòng Ban cho Admin
  const department = await prisma.department.upsert({
    where: { code: 'BOD' },
    update: {},
    create: { 
      branchId: branch.branchId, 
      code: 'BOD', 
      name: 'Ban Giám Đốc' 
    }
  })

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'MAIN_WH' },
    update: {},
    create: { branchId: branch.branchId, code: 'MAIN_WH', name: 'Kho Tổng Mặc định' }
  })

  // 7. Tạo Vị trí kệ (BinLocation) mặc định mang ID "NONE"
  await prisma.binLocation.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.warehouseId, code: 'NONE' } },
    update: {},
    create: {
      binId: 'NONE', // Ép cứng ID là NONE
      warehouseId: warehouse.warehouseId,
      code: 'NONE',
      name: 'Không phân kệ'
    }
  })

  // ==========================================
  // 8. TẠO TÀI KHOẢN QUẢN TRỊ VIÊN (ADMIN) ĐẦU TIÊN
  // ==========================================
  console.log("⏳ Đang tạo cấu hình Phân quyền và Tài khoản Quản trị viên (Admin)...")

  // 8.1. Băm mật khẩu an toàn
  const saltRounds = 10;
  const plainPassword = "Admin@123";
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

  // 8.2. Tạo Role (Vai trò) hệ thống: SYSTEM_ADMIN
  const adminRole = await prisma.role.upsert({
    where: { roleName: 'SYSTEM_ADMIN' },
    update: {},
    create: {
      roleName: 'SYSTEM_ADMIN',
      description: 'Quản trị viên toàn quyền hệ thống (System Administrator)',
      isDeleted: false
    }
  })

  // 8.3. Tạo Tài khoản Admin
  const adminUser = await prisma.users.upsert({
    where: { email: 'admin@tth-erp.com' },
    update: {
      passwordHash: hashedPassword,
      status: 'ACTIVE',
      isDeleted: false
    },
    create: {
      email: 'admin@tth-erp.com',
      passwordHash: hashedPassword,
      fullName: 'Quản Trị Viên',
      status: 'ACTIVE',
      isDeleted: false,
      departmentId: department.departmentId // 🔥 ĐÃ SỬA LỖI: Dùng departmentId thay vì branchId
    }
  })

  // 8.4. Cấp phát Role SYSTEM_ADMIN cho tài khoản Admin vừa tạo
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.userId,
        roleId: adminRole.roleId
      }
    },
    update: {},
    create: {
      userId: adminUser.userId,
      roleId: adminRole.roleId
    }
  })

  console.log("✅ Đã tạo tài khoản thành công!");
  console.log("==================================================");
  console.log("🔐 THÔNG TIN ĐĂNG NHẬP CỦA BẠN:");
  console.log("   - Email     : admin@tth-erp.com");
  console.log("   - Mật khẩu  : Admin@123");
  console.log("==================================================");
  console.log("✅ Đã tạo xong toàn bộ Dữ liệu Hệ thống (System Data)! 🚀");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi trong quá trình Seed dữ liệu:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })