import { Request, Response } from "express";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";
import { ActionType } from "@prisma/client";

// Hàm hỗ trợ lấy userId an toàn
const getUserId = (req: Request) => (req as any).user?.userId || req.body?.userId;

// ==========================================
// 1. QUẢN LÝ HỆ THỐNG TÀI KHOẢN (CHART OF ACCOUNTS)
// ==========================================
export const getAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, isActive } = req.query;
    const accounts = await prisma.account.findMany({
      where: {
        ...(type && { type: String(type) }),
        ...(isActive !== undefined && { isActive: isActive === 'true' })
      },
      orderBy: { accountCode: 'asc' }
    });
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy Hệ thống Tài khoản", error: error.message });
  }
};

export const createAccount = async (req: Request, res: Response): Promise<void> => {
  const { accountCode, name, type } = req.body;
  const userId = getUserId(req);
  
  try {
    const account = await prisma.account.create({
      data: {
        accountCode,
        name,
        type, // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
        isActive: true
      }
    });
    await logAudit("Account", account.accountId, ActionType.CREATE, null, account, userId, req.ip);
    res.status(201).json(account);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo Tài khoản (Mã tài khoản có thể đã tồn tại)", error: error.message });
  }
};

export const updateAccount = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; // accountId
  const { name, type, isActive } = req.body;
  const userId = getUserId(req);
  
  try {
    const oldAccount = await prisma.account.findUnique({ where: { accountId: id } });
    if (!oldAccount) throw new Error("Tài khoản không tồn tại");

    const account = await prisma.account.update({
      where: { accountId: id },
      data: { name, type, isActive }
    });
    await logAudit("Account", id, ActionType.UPDATE, oldAccount, account, userId, req.ip);
    res.json({ message: "Cập nhật tài khoản thành công", account });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật tài khoản", error: error.message });
  }
};

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    // Kiểm tra xem tài khoản đã phát sinh giao dịch chưa
    const usedInJournals = await prisma.journalLine.findFirst({ where: { accountId: id } });
    if (usedInJournals) {
      // Nếu đã dùng thì chỉ cho phép Vô hiệu hóa (Deactivate)
      const account = await prisma.account.update({
        where: { accountId: id },
        data: { isActive: false }
      });
      await logAudit("Account", id, ActionType.UPDATE, { isActive: true }, { isActive: false }, userId, req.ip);
      res.json({ message: "Tài khoản đã phát sinh giao dịch, hệ thống đã chuyển sang trạng thái Ngừng hoạt động thay vì xóa!", account });
      return;
    }

    // Nếu chưa dùng, cho phép xóa cứng
    await prisma.account.delete({ where: { accountId: id } });
    await logAudit("Account", id, ActionType.DELETE, null, { deleted: true }, userId, req.ip);
    res.json({ message: "Đã xóa Tài khoản thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa tài khoản (Tài khoản có thể đang được cấu hình trong danh mục)", error: error.message });
  }
};

// ==========================================
// 2. QUẢN LÝ NĂM TÀI CHÍNH (FISCAL YEARS)
// ==========================================
export const getFiscalYears = async (req: Request, res: Response): Promise<void> => {
  try {
    const fiscalYears = await prisma.fiscalYear.findMany({
      orderBy: { year: 'desc' },
      include: {
        periods: {
          orderBy: { periodNumber: 'asc' }
        }
      }
    });
    res.json(fiscalYears);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách Năm tài chính", error: error.message });
  }
};

export const createFiscalYear = async (req: Request, res: Response): Promise<void> => {
  const { year, startDate, endDate } = req.body;
  const userId = getUserId(req);

  try {
    const fiscalYear = await prisma.$transaction(async (tx) => {
      // 1. Tạo Năm tài chính
      const newYear = await tx.fiscalYear.create({
        data: {
          year: Number(year),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isClosed: false
        }
      });

      // 2. Tự động sinh ra 12 Kỳ kế toán (Tháng) cho năm đó
      const periodsToCreate = [];
      const yearNum = Number(year);
      for (let month = 1; month <= 12; month++) {
        const periodStart = new Date(yearNum, month - 1, 1);
        const periodEnd = new Date(yearNum, month, 0); // Ngày cuối cùng của tháng

        periodsToCreate.push({
          fiscalYearId: newYear.fiscalYearId,
          periodNumber: month,
          startDate: periodStart,
          endDate: periodEnd,
          isClosed: false
        });
      }

      await tx.fiscalPeriod.createMany({
        data: periodsToCreate
      });

      return newYear;
    });

    await logAudit("FiscalYear", fiscalYear.fiscalYearId, ActionType.CREATE, null, fiscalYear, userId, req.ip);
    res.status(201).json({ message: "Tạo Năm tài chính và 12 Kỳ kế toán thành công!", fiscalYear });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo Năm tài chính (Năm này có thể đã tồn tại)", error: error.message });
  }
};

export const toggleFiscalYearStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isClosed } = req.body; // true = Khóa sổ năm, false = Mở lại năm
  const userId = getUserId(req);

  try {
    const updatedYear = await prisma.$transaction(async (tx) => {
      const oldYear = await tx.fiscalYear.findUnique({ where: { fiscalYearId: id } });
      if (!oldYear) throw new Error("Năm tài chính không tồn tại!");

      if (isClosed) {
        // KIỂM TRA TOÀN VẸN: Đảm bảo toàn bộ 12 tháng đã được khóa sổ
        const openPeriods = await tx.fiscalPeriod.count({
          where: { fiscalYearId: id, isClosed: false }
        });
        if (openPeriods > 0) {
          throw new Error(`Không thể khóa Năm Tài Chính! Vẫn còn ${openPeriods} kỳ kế toán chưa được khóa sổ.`);
        }
      }

      // Khóa/Mở năm
      const year = await tx.fiscalYear.update({
        where: { fiscalYearId: id },
        data: { isClosed: Boolean(isClosed) }
      });

      // Bắt buộc Khóa/Mở toàn bộ 12 tháng bên trong
      await tx.fiscalPeriod.updateMany({
        where: { fiscalYearId: id },
        data: { isClosed: Boolean(isClosed) }
      });

      return year;
    });

    await logAudit("FiscalYear", id, ActionType.UPDATE, { isClosed: !isClosed }, { isClosed: Boolean(isClosed) }, userId, req.ip);
    res.json({ message: isClosed ? "Đã Khóa sổ Toàn bộ Năm tài chính!" : "Đã Mở lại Năm tài chính!", fiscalYear: updatedYear });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Lỗi cập nhật trạng thái Năm tài chính" });
  }
};

// ==========================================
// 3. QUẢN LÝ KỲ KẾ TOÁN (FISCAL PERIODS - MONTHS) VỚI LOGIC SNAPSHOT CẤP ENTERPRISE
// ==========================================
export const getFiscalPeriods = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, isClosed } = req.query;
    
    const whereCondition: any = {};
    if (year) whereCondition.fiscalYear = { year: Number(year) };
    if (isClosed !== undefined) whereCondition.isClosed = isClosed === 'true';

    const periods = await prisma.fiscalPeriod.findMany({
      where: whereCondition,
      include: { fiscalYear: true },
      orderBy: [
        { fiscalYear: { year: 'desc' } },
        { periodNumber: 'asc' }
      ]
    });
    res.json(periods);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách Kỳ kế toán", error: error.message });
  }
};

export const toggleFiscalPeriodStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; // periodId
  const { isClosed } = req.body;
  const userId = getUserId(req);

  try {
    const updatedPeriod = await prisma.$transaction(async (tx) => {
      const oldPeriod = await tx.fiscalPeriod.findUnique({ 
        where: { periodId: id },
        include: { fiscalYear: true }
      });
      if (!oldPeriod) throw new Error("Kỳ kế toán không tồn tại!");

      if (isClosed) {
        // --- 1. TIỀN KIỂM TRA (PRE-CLOSING VALIDATIONS) ---
        
        // A. Kiểm tra kỳ trước đó đã đóng chưa? (Ngoại trừ tháng 1)
        if (oldPeriod.periodNumber > 1) {
          const previousPeriod = await tx.fiscalPeriod.findFirst({
            where: {
              fiscalYearId: oldPeriod.fiscalYearId,
              periodNumber: oldPeriod.periodNumber - 1
            }
          });
          if (previousPeriod && !previousPeriod.isClosed) {
            throw new Error(`Kỳ trước (Kỳ ${previousPeriod.periodNumber}) chưa đóng. Vui lòng chốt sổ tuần tự từng tháng!`);
          }
        }

        // B. Kiểm tra chứng từ còn treo (DRAFT, PENDING_APPROVAL)
        const pendingDocs = await tx.document.count({
          where: {
            fiscalPeriodId: id,
            status: { in: ['DRAFT', 'PENDING_APPROVAL'] }
          }
        });
        if (pendingDocs > 0) {
          throw new Error(`Tồn tại ${pendingDocs} chứng từ chưa hoàn tất (Nháp/Chờ duyệt) trong kỳ này. Phải xử lý xong trước khi chốt sổ!`);
        }

        // C. Kiểm tra sổ nhật ký chung còn DRAFT
        const draftJournals = await tx.journalEntry.count({
          where: {
            fiscalPeriodId: id,
            postingStatus: 'DRAFT'
          }
        });
        if (draftJournals > 0) {
          throw new Error(`Tồn tại ${draftJournals} bút toán nháp chưa được ghi sổ. Vui lòng Ghi sổ (POST) tất cả!`);
        }

        // --- 2. CHỤP SNAPSHOT TỒN KHO CUỐI KỲ (INVENTORY SNAPSHOT) ---
        // Lấy toàn bộ tồn kho hiện tại và đẩy thẳng vào SystemAuditLog dưới dạng JSON
        const inventoryBalances = await tx.inventoryBalance.findMany({
          select: {
            warehouseId: true,
            productId: true,
            variantId: true,
            batchId: true,
            quantity: true,
            totalValue: true,
            avgCost: true
          }
        });

        await tx.systemAuditLog.create({
          data: {
            tableName: "InventorySnapshot",
            recordId: id,
            action: ActionType.CREATE,
            newValues: inventoryBalances as any, 
            userId: userId,
            ipAddress: req.ip
          }
        });

      } else {
        // --- NẾU LÀ MỞ KHÓA (REOPEN) ---
        if (oldPeriod.fiscalYear.isClosed) {
          throw new Error("Không thể mở lại Kỳ này vì Năm tài chính chứa nó đang bị khóa cứng!");
        }
        
        // Log lại hành động nguy hiểm này
        await tx.systemAuditLog.create({
          data: {
            tableName: "FiscalPeriod",
            recordId: id,
            action: ActionType.UPDATE,
            newValues: { warning: "Mở khóa kỳ kế toán có thể làm thay đổi cấu trúc BCTC" } as any,
            userId: userId,
            ipAddress: req.ip
          }
        });
      }

      // Cuối cùng: Cập nhật trạng thái
      return await tx.fiscalPeriod.update({
        where: { periodId: id },
        data: { isClosed: Boolean(isClosed) }
      });
    });

    await logAudit("FiscalPeriod", id, ActionType.UPDATE, { isClosed: !isClosed }, { isClosed: Boolean(isClosed) }, userId, req.ip);
    res.json({ message: isClosed ? "Đã Khóa sổ & Chụp Snapshot Tồn kho thành công!" : "Đã Mở lại Kỳ kế toán!", period: updatedPeriod });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Lỗi cập nhật trạng thái Kỳ kế toán" });
  }
};

// ==========================================
// 4. TIỆN ÍCH NGOẠI TỆ
// ==========================================
export const getActiveExchangeRates = async (req: Request, res: Response): Promise<void> => {
  try {
    const rates = await prisma.exchangeRate.findMany({
      where: { validTo: null },
      include: { currency: true }
    });
    res.json(rates);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy tỷ giá hối đoái", error: error.message });
  }
};