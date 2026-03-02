import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  getCompanies, createCompany, updateCompany, deleteCompany,
  getBranches, createBranch, updateBranch, deleteBranch,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getCostCenters, createCostCenter, updateCostCenter, deleteCostCenter,
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  getBinLocations, createBinLocation, updateBinLocation, deleteBinLocation,
  getProductCategories, createProductCategory, updateProductCategory, deleteProductCategory,
  getUoMs, createUoM, updateUoM, deleteUoM
} from "../controllers/masterDataController";

const router = Router();

// BẮT BUỘC BẢO MẬT: Master Data là cấu hình hệ thống, cần Auth
router.use(authenticateToken);

// 1. Tổ chức cấp cao (Companies)
router.get("/companies", getCompanies);
router.post("/companies", createCompany);
router.put("/companies/:id", updateCompany);
router.delete("/companies/:id", deleteCompany);

// 2. Chi nhánh (Branches)
router.get("/branches", getBranches);
router.post("/branches", createBranch);
router.put("/branches/:id", updateBranch);
router.delete("/branches/:id", deleteBranch);

// 3. Phòng ban (Departments)
router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

// 4. Trung tâm chi phí (Cost Centers)
router.get("/cost-centers", getCostCenters);
router.post("/cost-centers", createCostCenter);
router.put("/cost-centers/:id", updateCostCenter);
router.delete("/cost-centers/:id", deleteCostCenter);

// 5. Đối tác (Suppliers & Customers)
router.get("/suppliers", getSuppliers);
router.post("/suppliers", createSupplier);
router.put("/suppliers/:id", updateSupplier);
router.delete("/suppliers/:id", deleteSupplier);

router.get("/customers", getCustomers);
router.post("/customers", createCustomer);
router.put("/customers/:id", updateCustomer);
router.delete("/customers/:id", deleteCustomer);

// 6. Kho & Kệ (Warehouses & Bins)
router.get("/warehouses", getWarehouses);
router.post("/warehouses", createWarehouse);
router.put("/warehouses/:id", updateWarehouse);
router.delete("/warehouses/:id", deleteWarehouse);

router.get("/bins", getBinLocations);
router.post("/bins", createBinLocation);
router.put("/bins/:id", updateBinLocation);
router.delete("/bins/:id", deleteBinLocation);

// 7. Danh mục Sản phẩm (Categories)
router.get("/categories", getProductCategories);
router.post("/categories", createProductCategory);
router.put("/categories/:id", updateProductCategory);
router.delete("/categories/:id", deleteProductCategory);

// 8. Đơn vị tính (UoMs)
router.get("/uoms", getUoMs);
router.post("/uoms", createUoM);
router.put("/uoms/:id", updateUoM);
router.delete("/uoms/:id", deleteUoM);

export default router;