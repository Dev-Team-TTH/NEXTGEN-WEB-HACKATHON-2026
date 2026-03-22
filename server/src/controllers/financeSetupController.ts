import { Request, Response } from "express";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";
import { ActionType, AccountType } from "@prisma/client";

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
        ...(type && { type: String(type).toUpperCase() as AccountType }),
        ...(isActive !== undefined && { isActive: isActive === 'true' })
      },
      // Include parentAccount để giao diện (UI) vẽ được Sơ đồ Cây
      include: {
        parentAccount: { select: { accountCode: true, name: true } }
      },
      orderBy: { accountCode: 'asc' }
    });
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy Hệ thống Tài khoản", error: error.message });
  }
};

export const createAccount = async (req: Request, res: Response): Promise<void> => {
  const { accountCode, name, type, parentAccountId } = req.body; 
  const userId = getUserId(req);
  
  try {
    // Bắt lỗi an toàn: Đảm bảo type là Enum viết hoa
    const safeType = type ? type.toUpperCase() as AccountType : AccountType.EXPENSE;

    // Nếu có parentAccountId, kiểm tra xem TK cha có tồn tại không
    if (parentAccountId) {
      const parent = await prisma.account.findUnique({ where: { accountId: parentAccountId } });
      if (!parent) {
        res.status(400).json({ message: "Tài khoản cấp trên (Cha) không tồn tại trong hệ thống!" });
        return;
      }
    }

    const account = await prisma.account.create({
      data: {
        accountCode,
        name,
        type: safeType, 
        parentAccountId: parentAccountId || null, // Lưu cấu trúc cây
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
  const { id } = req.params; 
  const { name, type, isActive, parentAccountId } = req.body; 
  const userId = getUserId(req);
  
  try {
    const oldAccount = await prisma.account.findUnique({ where: { accountId: id } });
    if (!oldAccount) throw new Error("Tài khoản không tồn tại");

    // Chống vòng lặp vô hạn (Tài khoản cha là chính nó)
    if (parentAccountId === id) {
      throw new Error("Một tài khoản không thể chọn chính nó làm Tài khoản cấp trên!");
    }

    const safeType = type ? type.toUpperCase() as AccountType : oldAccount.type;

    const account = await prisma.account.update({
      where: { accountId: id },
      data: { 
        name, 
        type: safeType, 
        isActive,
        parentAccountId: parentAccountId !== undefined ? parentAccountId : oldAccount.parentAccountId 
      }
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
    // Kiểm tra xem tài khoản có đang làm tài khoản cha cho tài khoản khác không
    const hasSubAccounts = await prisma.account.findFirst({ where: { parentAccountId: id } });
    if (hasSubAccounts) {
      res.status(400).json({ message: "Không thể xóa! Tài khoản này đang có các Tài khoản cấp dưới trực thuộc." });
      return;
    }

    // Kiểm tra xem tài khoản đã phát sinh giao dịch chưa
    const usedInJournals = await prisma.journalLine.findFirst({ where: { accountId: id } });
    if (usedInJournals) {
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
      const newYear = await tx.fiscalYear.create({
        data: {
          year: Number(year),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isClosed: false
        }
      });

      const periodsToCreate = [];
      const yearNum = Number(year);
      for (let month = 1; month <= 12; month++) {
        const periodStart = new Date(yearNum, month - 1, 1);
        const periodEnd = new Date(yearNum, month, 0); 

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
  const { isClosed } = req.body; 
  const userId = getUserId(req);

  try {
    const updatedYear = await prisma.$transaction(async (tx) => {
      const oldYear = await tx.fiscalYear.findUnique({ where: { fiscalYearId: id } });
      if (!oldYear) throw new Error("Năm tài chính không tồn tại!");

      if (isClosed) {
        const openPeriods = await tx.fiscalPeriod.count({
          where: { fiscalYearId: id, isClosed: false }
        });
        if (openPeriods > 0) {
          throw new Error(`Không thể khóa Năm Tài Chính! Vẫn còn ${openPeriods} kỳ kế toán chưa được khóa sổ.`);
        }
      }

      const year = await tx.fiscalYear.update({
        where: { fiscalYearId: id },
        data: { isClosed: Boolean(isClosed) }
      });

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
// 3. QUẢN LÝ KỲ KẾ TOÁN (FISCAL PERIODS)
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
  const { id } = req.params; 
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

        const pendingDocs = await tx.document.count({
          where: {
            fiscalPeriodId: id,
            status: { in: ['DRAFT', 'PENDING_APPROVAL'] }
          }
        });
        if (pendingDocs > 0) {
          throw new Error(`Tồn tại ${pendingDocs} chứng từ chưa hoàn tất (Nháp/Chờ duyệt) trong kỳ này. Phải xử lý xong trước khi chốt sổ!`);
        }

        const draftJournals = await tx.journalEntry.count({
          where: {
            fiscalPeriodId: id,
            postingStatus: 'DRAFT'
          }
        });
        if (draftJournals > 0) {
          throw new Error(`Tồn tại ${draftJournals} bút toán nháp chưa được ghi sổ. Vui lòng Ghi sổ (POST) tất cả!`);
        }

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
        if (oldPeriod.fiscalYear.isClosed) {
          throw new Error("Không thể mở lại Kỳ này vì Năm tài chính chứa nó đang bị khóa cứng!");
        }
        
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