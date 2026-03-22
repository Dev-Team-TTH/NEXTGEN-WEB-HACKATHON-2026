import { Response } from "express";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";
import { AuthRequest } from "../middleware/authMiddleware";

// Hàm Helper trích xuất userId an toàn
const getUserId = (req: AuthRequest) => req.user?.userId || req.body.userId;

// ==========================================
// 1. QUẢN LÝ THUẾ (TAX CODES)
// ==========================================
export const getTaxes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taxes = await prisma.taxCode.findMany({ orderBy: { code: 'asc' } });
    res.json(taxes);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy Mã thuế", error: error.message });
  }
};

export const createTax = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, name, rate, description } = req.body;
  const userId = getUserId(req);

  try {
    const tax = await prisma.taxCode.create({ data: { code, name, rate: Number(rate), description } });
    await logAudit("TaxCode", tax.taxId, "CREATE", null, tax, userId, req.ip);
    res.status(201).json(tax);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo Mã thuế", error: error.message });
  }
};

export const updateTax = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, rate, description } = req.body;
  const userId = getUserId(req);

  try {
    const oldTax = await prisma.taxCode.findUnique({ where: { taxId: id } });
    const tax = await prisma.taxCode.update({
      where: { taxId: id },
      data: { name, rate: rate !== undefined ? Number(rate) : undefined, description }
    });
    await logAudit("TaxCode", tax.taxId, "UPDATE", oldTax, tax, userId, req.ip);
    res.json(tax);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật Mã thuế", error: error.message });
  }
};

export const deleteTax = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    await prisma.taxCode.delete({ where: { taxId: id } });
    await logAudit("TaxCode", id, "DELETE", null, { deleted: true }, userId, req.ip);
    res.json({ message: "Đã xóa Mã thuế thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Không thể xóa Mã thuế này vì đã được sử dụng trong các chứng từ!", error: error.message });
  }
};

// ==========================================
// 2. QUẢN LÝ TIỀN TỆ & TỶ GIÁ (CURRENCY & EXCHANGE RATES)
// ==========================================
export const getCurrencies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currencies = await prisma.currency.findMany({
      include: { exchangeRates: { orderBy: { validFrom: 'desc' } } }
    });
    res.json(currencies);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách Tiền tệ", error: error.message });
  }
};

export const createCurrency = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currencyCode, name, symbol } = req.body;
  const userId = getUserId(req);

  try {
    const currency = await prisma.currency.create({
      data: { currencyCode, name, symbol }
    });
    await logAudit("Currency", currencyCode, "CREATE", null, currency, userId, req.ip);
    res.status(201).json(currency);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo Tiền tệ", error: error.message });
  }
};

export const updateCurrency = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currencyCode } = req.params;
  const { name, symbol } = req.body;
  const userId = getUserId(req);

  try {
    const oldCurrency = await prisma.currency.findUnique({ where: { currencyCode } });
    const currency = await prisma.currency.update({
      where: { currencyCode },
      data: { name, symbol }
    });
    await logAudit("Currency", currencyCode, "UPDATE", oldCurrency, currency, userId, req.ip);
    res.json(currency);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật Tiền tệ", error: error.message });
  }
};

export const deleteCurrency = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currencyCode } = req.params;
  const userId = getUserId(req);

  try {
    await prisma.currency.delete({ where: { currencyCode } });
    await logAudit("Currency", currencyCode, "DELETE", null, { deleted: true }, userId, req.ip);
    res.json({ message: "Xóa Tiền tệ thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Không thể xóa Tiền tệ này vì đang được sử dụng!", error: error.message });
  }
};

export const addExchangeRate = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currencyCode, rate, validFrom, validTo } = req.body;
  const userId = getUserId(req);

  try {
    const exchangeRate = await prisma.exchangeRate.create({
      data: {
        currencyCode,
        rate: Number(rate),
        validFrom: new Date(validFrom),
        validTo: validTo ? new Date(validTo) : null
      }
    });
    await logAudit("ExchangeRate", exchangeRate.rateId, "CREATE", null, exchangeRate, userId, req.ip);
    res.status(201).json(exchangeRate);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi thêm Tỷ giá", error: error.message });
  }
};

export const deleteExchangeRate = async (req: AuthRequest, res: Response): Promise<void> => {
  const { rateId } = req.params;
  const userId = getUserId(req);

  try {
    await prisma.exchangeRate.delete({ where: { rateId } });
    await logAudit("ExchangeRate", rateId, "DELETE", null, { deleted: true }, userId, req.ip);
    res.json({ message: "Xóa tỷ giá thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa Tỷ giá", error: error.message });
  }
};

// ==========================================
// 3. QUẢN LÝ BẢNG GIÁ (PRICE LISTS)
// ==========================================
export const getPriceLists = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const priceLists = await prisma.priceList.findMany({
      where: { isDeleted: false },
      include: { items: { include: { product: true, variant: true } } }
    });
    res.json(priceLists);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy Bảng giá", error: error.message });
  }
};

export const createPriceList = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, name, currencyCode, items } = req.body;
  const userId = getUserId(req);

  try {
    const priceList = await prisma.$transaction(async (tx) => {
      const pl = await tx.priceList.create({ data: { code, name, currencyCode } });
      if (items && items.length > 0) {
        await tx.priceListItem.createMany({
          data: items.map((i: any) => ({
            priceListId: pl.priceListId,
            productId: i.productId,
            variantId: i.variantId || null,
            price: Number(i.price),
            minQuantity: Number(i.minQuantity || 1),
            validFrom: i.validFrom ? new Date(i.validFrom) : null,
            validTo: i.validTo ? new Date(i.validTo) : null
          }))
        });
      }
      return pl;
    });
    await logAudit("PriceList", priceList.priceListId, "CREATE", null, priceList, userId, req.ip);
    res.status(201).json(priceList);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo Bảng giá", error: error.message });
  }
};

export const updatePriceList = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, currencyCode, isActive, items } = req.body;
  const userId = getUserId(req);

  try {
    const updatedPriceList = await prisma.$transaction(async (tx) => {
      const oldPl = await tx.priceList.findUnique({ where: { priceListId: id } });
      if (!oldPl || oldPl.isDeleted) throw new Error("Bảng giá không tồn tại!");

      const pl = await tx.priceList.update({
        where: { priceListId: id },
        data: { name, currencyCode, isActive }
      });

      if (items) {
        await tx.priceListItem.deleteMany({ where: { priceListId: id } });
        if (items.length > 0) {
          await tx.priceListItem.createMany({
            data: items.map((i: any) => ({
              priceListId: id,
              productId: i.productId,
              variantId: i.variantId || null,
              price: Number(i.price),
              minQuantity: Number(i.minQuantity || 1),
              validFrom: i.validFrom ? new Date(i.validFrom) : null,
              validTo: i.validTo ? new Date(i.validTo) : null
            }))
          });
        }
      }
      return pl;
    });

    await logAudit("PriceList", id, "UPDATE", null, updatedPriceList, userId, req.ip);
    res.json(updatedPriceList);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật Bảng giá", error: error.message });
  }
};

export const deletePriceList = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    await prisma.priceList.update({
      where: { priceListId: id },
      data: { isDeleted: true, isActive: false }
    });
    await logAudit("PriceList", id, "DELETE", null, { isDeleted: true }, userId, req.ip);
    res.json({ message: "Đã vô hiệu hóa và xóa bảng giá thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa Bảng giá", error: error.message });
  }
};

// ==========================================
// 4. QUẢN LÝ NGÂN SÁCH (BUDGET CONTROL)
// ==========================================
export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { year, costCenterId } = req.query;
    const budgets = await prisma.budget.findMany({
      where: {
        ...(year && { year: Number(year) }),
        ...(costCenterId && { costCenterId: String(costCenterId) })
      },
      include: { costCenter: { select: { code: true, name: true } } },
      orderBy: { year: 'desc' }
    });
    res.json(budgets);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách Ngân sách", error: error.message });
  }
};

export const createBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const { costCenterId, year, totalAmount } = req.body;
  const userId = getUserId(req);

  try {
    const budget = await prisma.budget.create({
      data: { costCenterId, year: Number(year), totalAmount: Number(totalAmount) }
    });
    await logAudit("Budget", budget.budgetId, "CREATE", null, budget, userId, req.ip);
    res.status(201).json(budget);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cấp Ngân sách (Có thể ngân sách năm này đã tồn tại)", error: error.message });
  }
};

export const updateBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { totalAmount, version } = req.body;
  const userId = getUserId(req);

  try {
    const oldBudget = await prisma.budget.findUnique({ where: { budgetId: id } });
    const budget = await prisma.budget.update({
      where: { budgetId: id },
      data: { 
        totalAmount: totalAmount ? Number(totalAmount) : undefined,
        version: version ? Number(version) : undefined
      }
    });
    await logAudit("Budget", id, "UPDATE", oldBudget, budget, userId, req.ip);
    res.json(budget);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật Ngân sách", error: error.message });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    await prisma.budget.delete({ where: { budgetId: id } });
    await logAudit("Budget", id, "DELETE", null, { deleted: true }, userId, req.ip);
    res.json({ message: "Xóa Ngân sách thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa Ngân sách", error: error.message });
  }
};

// ==========================================
// ĐỘNG CƠ TÍNH GIÁ ĐỘNG (DYNAMIC PRICING ENGINE)
// ==========================================
export const calculateDynamicPrice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { partnerId, partnerType, productId, variantId, quantity } = req.body;
    
    const product = await prisma.products.findUnique({ where: { productId } });
    if (!product) throw new Error("Sản phẩm không tồn tại");

    let basePrice = partnerType === "SUPPLIER" ? Number(product.purchasePrice || 0) : Number(product.price || 0);
    
    if (variantId) {
      const variant = await prisma.productVariant.findUnique({ where: { variantId } });
      if (variant) basePrice += Number(variant.additionalPrice || 0);
    }

    if (!partnerId) {
      res.json({ finalPrice: basePrice, appliedPriceList: null });
      return;
    }

    let priceListId = null;
    if (partnerType === "SUPPLIER") {
      const supplier = await prisma.supplier.findUnique({ where: { supplierId: partnerId } });
      priceListId = supplier?.priceListId;
    } else {
      const customer = await prisma.customer.findUnique({ where: { customerId: partnerId } });
      priceListId = customer?.priceListId;
    }

    if (!priceListId) {
      res.json({ finalPrice: basePrice, appliedPriceList: null });
      return;
    }

    const today = new Date();

    const priceListItems = await prisma.priceListItem.findMany({
      where: {
        priceListId,
        productId,
        ...(variantId ? { variantId } : {}),
        minQuantity: { lte: Number(quantity) }, 
        OR: [
          { validFrom: null, validTo: null },
          { validFrom: { lte: today }, validTo: { gte: today } },
          { validFrom: null, validTo: { gte: today } },
          { validFrom: { lte: today }, validTo: null }
        ]
      },
      orderBy: { minQuantity: 'desc' } 
    });

    if (priceListItems.length > 0) {
      res.json({ finalPrice: Number(priceListItems[0].price), appliedPriceList: priceListId });
    } else {
      res.json({ finalPrice: basePrice, appliedPriceList: null });
    }

  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tính toán giá", error: error.message });
  }
};