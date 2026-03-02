import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../utils/auditLogger";

const prisma = new PrismaClient();

// Hàm Helper trích xuất userId
const getUserId = (req: Request) => (req as any).user?.userId || req.body.userId;

// ==========================================
// 1. QUẢN LÝ CÔNG TY (COMPANIES)
// ==========================================
export const getCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const companies = await prisma.company.findMany({ where: { isDeleted: false }, orderBy: { name: 'asc' } });
    res.json(companies);
  } catch (error: any) { res.status(500).json({ message: "Lỗi truy xuất", error: error.message }); }
};

export const createCompany = async (req: Request, res: Response): Promise<void> => {
  const { code, name, taxCode, address } = req.body;
  try {
    const company = await prisma.company.create({ data: { code, name, taxCode, address } });
    await logAudit("Company", company.companyId, "CREATE", null, company, getUserId(req), req.ip);
    res.status(201).json(company);
  } catch (error: any) { res.status(400).json({ message: "Lỗi tạo Công ty", error: error.message }); }
};

export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { name, taxCode, address } = req.body;
  try {
    const old = await prisma.company.findUnique({ where: { companyId: id } });
    const company = await prisma.company.update({ where: { companyId: id }, data: { name, taxCode, address } });
    await logAudit("Company", id, "UPDATE", old, company, getUserId(req), req.ip);
    res.json(company);
  } catch (error: any) { res.status(400).json({ message: "Lỗi cập nhật", error: error.message }); }
};

export const deleteCompany = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.company.update({ where: { companyId: id }, data: { isDeleted: true } });
    await logAudit("Company", id, "DELETE", null, { isDeleted: true }, getUserId(req), req.ip);
    res.json({ message: "Đã xóa mềm Công ty thành công!" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi xóa", error: error.message }); }
};

// ==========================================
// 2. QUẢN LÝ CHI NHÁNH (BRANCHES)
// ==========================================
export const getBranches = async (req: Request, res: Response): Promise<void> => {
  try {
    const branches = await prisma.branch.findMany({ where: { isDeleted: false }, include: { company: true }, orderBy: { name: 'asc' } });
    res.json(branches);
  } catch (error: any) { res.status(500).json({ message: "Lỗi", error: error.message }); }
};

export const createBranch = async (req: Request, res: Response): Promise<void> => {
  const { companyId, code, name } = req.body;
  try {
    const branch = await prisma.branch.create({ data: { companyId, code, name } });
    await logAudit("Branch", branch.branchId, "CREATE", null, branch, getUserId(req), req.ip);
    res.status(201).json(branch);
  } catch (error: any) { res.status(400).json({ message: "Lỗi tạo Chi nhánh", error: error.message }); }
};

export const updateBranch = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { name, companyId } = req.body;
  try {
    const old = await prisma.branch.findUnique({ where: { branchId: id } });
    const branch = await prisma.branch.update({ where: { branchId: id }, data: { name, companyId } });
    await logAudit("Branch", id, "UPDATE", old, branch, getUserId(req), req.ip);
    res.json(branch);
  } catch (error: any) { res.status(400).json({ message: "Lỗi cập nhật", error: error.message }); }
};

export const deleteBranch = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.branch.update({ where: { branchId: id }, data: { isDeleted: true } });
    await logAudit("Branch", id, "DELETE", null, { isDeleted: true }, getUserId(req), req.ip);
    res.json({ message: "Đã xóa mềm Chi nhánh thành công!" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi xóa", error: error.message }); }
};

// ==========================================
// 3. QUẢN LÝ PHÒNG BAN (DEPARTMENTS)
// ==========================================
export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    const depts = await prisma.department.findMany({ 
      where: { isDeleted: false, ...(branchId && { branchId: String(branchId) }) },
      include: { branch: { select: { name: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(depts);
  } catch (error: any) { res.status(500).json({ message: "Lỗi", error: error.message }); }
};

export const createDepartment = async (req: Request, res: Response): Promise<void> => {
  const { branchId, code, name } = req.body;
  try {
    const dept = await prisma.department.create({ data: { branchId, code, name } });
    await logAudit("Department", dept.departmentId, "CREATE", null, dept, getUserId(req), req.ip);
    res.status(201).json(dept);
  } catch (error: any) { res.status(400).json({ message: "Lỗi tạo Phòng ban", error: error.message }); }
};

export const updateDepartment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { name, branchId } = req.body;
  try {
    const old = await prisma.department.findUnique({ where: { departmentId: id } });
    const dept = await prisma.department.update({ where: { departmentId: id }, data: { name, branchId } });
    await logAudit("Department", id, "UPDATE", old, dept, getUserId(req), req.ip);
    res.json(dept);
  } catch (error: any) { res.status(400).json({ message: "Lỗi cập nhật", error: error.message }); }
};

export const deleteDepartment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.department.update({ where: { departmentId: id }, data: { isDeleted: true } });
    await logAudit("Department", id, "DELETE", null, { isDeleted: true }, getUserId(req), req.ip);
    res.json({ message: "Đã xóa mềm Phòng ban thành công!" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi xóa", error: error.message }); }
};

// ==========================================
// 4. TRUNG TÂM CHI PHÍ (COST CENTERS)
// ==========================================
export const getCostCenters = async (req: Request, res: Response): Promise<void> => {
  try {
    const centers = await prisma.costCenter.findMany({ where: { isDeleted: false }, orderBy: { code: 'asc' } });
    res.json(centers);
  } catch (error: any) { res.status(500).json({ message: "Lỗi", error: error.message }); }
};

export const createCostCenter = async (req: Request, res: Response): Promise<void> => {
  const { code, name, description } = req.body;
  try {
    const center = await prisma.costCenter.create({ data: { code, name, description } });
    await logAudit("CostCenter", center.costCenterId, "CREATE", null, center, getUserId(req), req.ip);
    res.status(201).json(center);
  } catch (error: any) { res.status(400).json({ message: "Lỗi tạo Cost Center", error: error.message }); }
};

export const updateCostCenter = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { name, description } = req.body;
  try {
    const old = await prisma.costCenter.findUnique({ where: { costCenterId: id } });
    const center = await prisma.costCenter.update({ where: { costCenterId: id }, data: { name, description } });
    await logAudit("CostCenter", id, "UPDATE", old, center, getUserId(req), req.ip);
    res.json(center);
  } catch (error: any) { res.status(400).json({ message: "Lỗi cập nhật", error: error.message }); }
};

export const deleteCostCenter = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.costCenter.update({ where: { costCenterId: id }, data: { isDeleted: true } });
    await logAudit("CostCenter", id, "DELETE", null, { isDeleted: true }, getUserId(req), req.ip);
    res.json({ message: "Đã xóa mềm Trung tâm chi phí!" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi xóa", error: error.message }); }
};

// ==========================================
// 5. QUẢN LÝ ĐỐI TÁC: NHÀ CUNG CẤP & KHÁCH HÀNG
// ==========================================
export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await prisma.supplier.findMany({ where: { isDeleted: false }, include: { priceList: { select: { name: true } } }, orderBy: { name: 'asc' } });
    res.json(suppliers);
  } catch (error: any) { res.status(500).json({ message: "Lỗi", error: error.message }); }
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  const { code, name, taxCode, email, phone, address, priceListId } = req.body;
  try {
    const supplier = await prisma.supplier.create({ data: { code, name, taxCode, email, phone, address, priceListId } });
    await logAudit("Supplier", supplier.supplierId, "CREATE", null, supplier, getUserId(req), req.ip);
    res.status(201).json(supplier);
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { name, taxCode, email, phone, address, priceListId } = req.body;
  try {
    const old = await prisma.supplier.findUnique({ where: { supplierId: id } });
    const supplier = await prisma.supplier.update({ where: { supplierId: id }, data: { name, taxCode, email, phone, address, priceListId } });
    await logAudit("Supplier", id, "UPDATE", old, supplier, getUserId(req), req.ip);
    res.json(supplier);
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.supplier.update({ where: { supplierId: id }, data: { isDeleted: true } });
    await logAudit("Supplier", id, "DELETE", null, { isDeleted: true }, getUserId(req), req.ip);
    res.json({ message: "Đã xóa Nhà cung cấp thành công!" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({ where: { isDeleted: false }, include: { priceList: { select: { name: true } } }, orderBy: { name: 'asc' } });
    res.json(customers);
  } catch (error: any) { res.status(500).json({ message: "Lỗi", error: error.message }); }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  const { code, name, taxCode, email, phone, address, priceListId } = req.body;
  try {
    const customer = await prisma.customer.create({ data: { code, name, taxCode, email, phone, address, priceListId } });
    await logAudit("Customer", customer.customerId, "CREATE", null, customer, getUserId(req), req.ip);
    res.status(201).json(customer);
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { name, taxCode, email, phone, address, priceListId } = req.body;
  try {
    const old = await prisma.customer.findUnique({ where: { customerId: id } });
    const customer = await prisma.customer.update({ where: { customerId: id }, data: { name, taxCode, email, phone, address, priceListId } });
    await logAudit("Customer", id, "UPDATE", old, customer, getUserId(req), req.ip);
    res.json(customer);
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.customer.update({ where: { customerId: id }, data: { isDeleted: true } });
    await logAudit("Customer", id, "DELETE", null, { isDeleted: true }, getUserId(req), req.ip);
    res.json({ message: "Đã xóa Khách hàng thành công!" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

// ==========================================
// 6. QUẢN LÝ KHO & VỊ TRÍ KỆ (WAREHOUSES & BINS)
// ==========================================
export const getWarehouses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    const warehouses = await prisma.warehouse.findMany({
      where: { isDeleted: false, ...(branchId && { branchId: branchId.toString() }) },
      include: { branch: { select: { name: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(warehouses);
  } catch (error: any) { res.status(500).json({ message: "Lỗi", error: error.message }); }
};

export const createWarehouse = async (req: Request, res: Response): Promise<void> => {
  const { branchId, code, name } = req.body;
  try {
    const newWarehouse = await prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.create({ data: { branchId, code, name } });
      // Thiết kế thông minh: Tự động tạo một vị trí kệ mặc định cho kho mới
      await tx.binLocation.create({ data: { warehouseId: warehouse.warehouseId, code: `${code}-DEFAULT`, name: "Khu vực chung" } });
      return warehouse;
    });
    await logAudit("Warehouse", newWarehouse.warehouseId, "CREATE", null, newWarehouse, getUserId(req), req.ip);
    res.status(201).json(newWarehouse);
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const updateWarehouse = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { name, branchId } = req.body;
  try {
    const old = await prisma.warehouse.findUnique({ where: { warehouseId: id } });
    const warehouse = await prisma.warehouse.update({ where: { warehouseId: id }, data: { name, branchId } });
    await logAudit("Warehouse", id, "UPDATE", old, warehouse, getUserId(req), req.ip);
    res.json(warehouse);
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const deleteWarehouse = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.warehouse.update({ where: { warehouseId: id }, data: { isDeleted: true } });
      // Xóa mềm luôn các vị trí kệ trực thuộc
      await tx.binLocation.updateMany({ where: { warehouseId: id }, data: { isDeleted: true } });
    });
    await logAudit("Warehouse", id, "DELETE", null, { isDeleted: true }, getUserId(req), req.ip);
    res.json({ message: "Đã xóa Kho thành công!" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

// API Vị trí Kệ hàng (Bin Locations)
export const getBinLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouseId } = req.query;
    const bins = await prisma.binLocation.findMany({
      where: { isDeleted: false, ...(warehouseId && { warehouseId: String(warehouseId) }) },
      include: { warehouse: { select: { name: true } } },
      orderBy: { code: 'asc' }
    });
    res.json(bins);
  } catch (error: any) { res.status(500).json({ message: "Lỗi", error: error.message }); }
};

export const createBinLocation = async (req: Request, res: Response): Promise<void> => {
  const { warehouseId, code, name } = req.body;
  try {
    const bin = await prisma.binLocation.create({ data: { warehouseId, code, name } });
    await logAudit("BinLocation", bin.binId, "CREATE", null, bin, getUserId(req), req.ip);
    res.status(201).json(bin);
  } catch (error: any) { res.status(400).json({ message: "Lỗi (Mã vị trí có thể bị trùng trong kho này)", error: error.message }); }
};

export const updateBinLocation = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { name } = req.body;
  try {
    const old = await prisma.binLocation.findUnique({ where: { binId: id } });
    const bin = await prisma.binLocation.update({ where: { binId: id }, data: { name } });
    await logAudit("BinLocation", id, "UPDATE", old, bin, getUserId(req), req.ip);
    res.json(bin);
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const deleteBinLocation = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.binLocation.update({ where: { binId: id }, data: { isDeleted: true } });
    await logAudit("BinLocation", id, "DELETE", null, { isDeleted: true }, getUserId(req), req.ip);
    res.json({ message: "Đã xóa Vị trí kệ thành công!" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

// ==========================================
// 7. DANH MỤC SẢN PHẨM & TÀI KHOẢN (CATEGORIES)
// ==========================================
export const getProductCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isDeleted: false },
      include: { 
        inventoryAccount: { select: { name: true, accountCode: true } }, 
        cogsAccount: { select: { name: true, accountCode: true } }, 
        incomeAccount: { select: { name: true, accountCode: true } } 
      },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error: any) { res.status(500).json({ message: "Lỗi", error: error.message }); }
};

export const createProductCategory = async (req: Request, res: Response): Promise<void> => {
  const { code, name, parentId, inventoryAccountId, cogsAccountId, incomeAccountId } = req.body;
  try {
    const category = await prisma.productCategory.create({ data: { code, name, parentId, inventoryAccountId, cogsAccountId, incomeAccountId } });
    await logAudit("ProductCategory", category.categoryId, "CREATE", null, category, getUserId(req), req.ip);
    res.status(201).json(category);
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const updateProductCategory = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { name, parentId, inventoryAccountId, cogsAccountId, incomeAccountId } = req.body;
  try {
    const old = await prisma.productCategory.findUnique({ where: { categoryId: id } });
    const category = await prisma.productCategory.update({ where: { categoryId: id }, data: { name, parentId, inventoryAccountId, cogsAccountId, incomeAccountId } });
    await logAudit("ProductCategory", id, "UPDATE", old, category, getUserId(req), req.ip);
    res.json(category);
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const deleteProductCategory = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.productCategory.update({ where: { categoryId: id }, data: { isDeleted: true } });
    await logAudit("ProductCategory", id, "DELETE", null, { isDeleted: true }, getUserId(req), req.ip);
    res.json({ message: "Đã xóa Danh mục sản phẩm thành công!" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

// ==========================================
// 8. QUẢN LÝ ĐƠN VỊ TÍNH (UoM)
// ==========================================
export const getUoMs = async (req: Request, res: Response): Promise<void> => {
  try {
    const uoms = await prisma.unitOfMeasure.findMany({ where: { isDeleted: false }, orderBy: { name: 'asc' } });
    res.json(uoms);
  } catch (error: any) { res.status(500).json({ message: "Lỗi", error: error.message }); }
};

export const createUoM = async (req: Request, res: Response): Promise<void> => {
  const { code, name } = req.body;
  try {
    const uom = await prisma.unitOfMeasure.create({ data: { code, name } });
    await logAudit("UnitOfMeasure", uom.uomId, "CREATE", null, uom, getUserId(req), req.ip);
    res.status(201).json(uom);
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const updateUoM = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; const { name } = req.body;
  try {
    const old = await prisma.unitOfMeasure.findUnique({ where: { uomId: id } });
    const uom = await prisma.unitOfMeasure.update({ where: { uomId: id }, data: { name } });
    await logAudit("UnitOfMeasure", id, "UPDATE", old, uom, getUserId(req), req.ip);
    res.json(uom);
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};

export const deleteUoM = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.unitOfMeasure.update({ where: { uomId: id }, data: { isDeleted: true } });
    await logAudit("UnitOfMeasure", id, "DELETE", null, { isDeleted: true }, getUserId(req), req.ip);
    res.json({ message: "Đã xóa Đơn vị tính thành công!" });
  } catch (error: any) { res.status(400).json({ message: "Lỗi", error: error.message }); }
};