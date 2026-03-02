import { Request, Response } from "express";
import { PrismaClient, PostingStatus, ActionType } from "@prisma/client";
import { logAudit } from "../utils/auditLogger";

const prisma = new PrismaClient();

// Hàm Helper trích xuất userId an toàn
const getUserId = (req: Request) => (req as any).user?.userId || req.body.userId;

// ==========================================
// 1. LẤY DANH SÁCH CHI PHÍ (GET EXPENSES)
// ==========================================
export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, costCenterId, postingStatus, startDate, endDate } = req.query;

    const whereCondition: any = {
      // Logic thông minh: Lấy các Bút toán có chứa ít nhất 1 dòng thuộc Tài khoản CHI PHÍ (EXPENSE)
      lines: { some: { account: { type: "EXPENSE" } } }
    };

    if (branchId) whereCondition.branchId = String(branchId);
    if (postingStatus) whereCondition.postingStatus = postingStatus as PostingStatus;
    if (costCenterId) whereCondition.lines.some.costCenterId = String(costCenterId);
    
    if (startDate || endDate) {
      whereCondition.entryDate = {};
      if (startDate) whereCondition.entryDate.gte = new Date(String(startDate));
      if (endDate) whereCondition.entryDate.lte = new Date(String(endDate));
    }

    const expenses = await prisma.journalEntry.findMany({
      where: whereCondition,
      include: {
        branch: { select: { name: true, code: true } },
        createdBy: { select: { fullName: true } },
        lines: {
          include: {
            account: { select: { accountCode: true, name: true, type: true } },
            costCenter: { select: { code: true, name: true } }
          }
        }
      },
      orderBy: { entryDate: 'desc' }
    });

    res.json(expenses);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách chi phí", error: error.message });
  }
};

export const getExpenseById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const expense = await prisma.journalEntry.findUnique({
      where: { journalId: id },
      include: {
        branch: true,
        fiscalPeriod: true,
        createdBy: { select: { fullName: true } },
        lines: { include: { account: true, costCenter: true } }
      }
    });

    if (!expense) {
      res.status(404).json({ message: "Không tìm thấy khoản chi phí này!" });
      return;
    }
    res.json(expense);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy chi tiết chi phí", error: error.message });
  }
};

// ==========================================
// 2. GHI NHẬN YÊU CẦU CHI PHÍ MỚI (CREATE DRAFT EXPENSE)
// ==========================================
export const createExpense = async (req: Request, res: Response): Promise<void> => {
  const { branchId, fiscalPeriodId, entryDate, reference, description, amount, expenseAccountId, paymentAccountId, costCenterId } = req.body;
  const userId = getUserId(req);

  try {
    const expenseAmount = Number(amount);
    if (expenseAmount <= 0) {
      res.status(400).json({ message: "Số tiền chi phí phải lớn hơn 0!" });
      return;
    }

    const expense = await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra kỳ kế toán
      const period = await tx.fiscalPeriod.findUnique({ where: { periodId: fiscalPeriodId } });
      if (!period || period.isClosed) throw new Error("Kỳ kế toán đã đóng, không thể ghi nhận chi phí vào kỳ này!");

      // 2. Cảnh báo sớm Ngân sách (Budget)
      if (costCenterId) {
        const year = new Date(entryDate).getFullYear();
        const budget = await tx.budget.findUnique({
          where: { costCenterId_year: { costCenterId, year } }
        });
        
        if (budget) {
          const remaining = Number(budget.totalAmount) - Number(budget.usedAmount) - Number(budget.encumberedAmount);
          if (remaining < expenseAmount) {
            throw new Error(`Khoản chi này vượt quá ngân sách còn lại của Trung tâm chi phí! (Ngân sách còn lại: ${remaining})`);
          }
        }
      }

      // 3. Tạo JournalEntry (Mặc định luôn là DRAFT để chờ sếp duyệt)
      const journal = await tx.journalEntry.create({
        data: {
          branchId,
          fiscalPeriodId,
          entryDate: new Date(entryDate),
          reference: reference || `EXP-${Date.now()}`,
          description,
          createdById: userId,
          postingStatus: PostingStatus.DRAFT
        }
      });

      // 4. Hạch toán Kép (Double-Entry): Nợ TK Chi Phí / Có TK Tiền
      await tx.journalLine.createMany({
        data: [
          {
            journalId: journal.journalId,
            accountId: expenseAccountId, // Tài khoản Chi phí (VD: 642)
            costCenterId: costCenterId || null, // Gắn Cost Center cho đầu Nợ
            debit: expenseAmount,
            credit: 0,
            description: `Ghi nhận chi phí: ${description}`
          },
          {
            journalId: journal.journalId,
            accountId: paymentAccountId, // Tài khoản Tiền (VD: 111, 112)
            costCenterId: null, // TK Tiền không phân bổ Cost Center
            debit: 0,
            credit: expenseAmount,
            description: `Thanh toán chi phí: ${description}`
          }
        ]
      });

      return journal;
    });

    await logAudit("JournalEntry", expense.journalId, ActionType.CREATE, null, expense, userId, req.ip);
    res.status(201).json({ message: "Đã tạo phiếu yêu cầu chi phí (DRAFT) thành công!", expense });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi ghi nhận chi phí", error: error.message });
  }
};

// ==========================================
// 3. CẬP NHẬT CHI PHÍ ĐANG NHÁP (UPDATE DRAFT EXPENSE)
// ==========================================
export const updateExpense = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { description, amount, expenseAccountId, paymentAccountId, costCenterId } = req.body;
  const userId = getUserId(req);

  try {
    const updatedExpense = await prisma.$transaction(async (tx) => {
      const existing = await tx.journalEntry.findUnique({ 
        where: { journalId: id }, 
        include: { lines: true } 
      });
      if (!existing) throw new Error("Không tìm thấy phiếu chi phí!");
      if (existing.postingStatus !== PostingStatus.DRAFT) {
        throw new Error("Chỉ được phép sửa phiếu chi phí khi đang ở trạng thái Nháp (DRAFT)!");
      }

      // Nếu có sự thay đổi về tiền hoặc tài khoản, Xóa sạch dòng cũ và tạo lại để đảm bảo tính Cân bằng (Balanced)
      if (amount || expenseAccountId || paymentAccountId || costCenterId !== undefined) {
        await tx.journalLine.deleteMany({ where: { journalId: id } });
        
        const debitLine = existing.lines.find(l => Number(l.debit) > 0);
        const creditLine = existing.lines.find(l => Number(l.credit) > 0);

        const newAmount = amount ? Number(amount) : Number(debitLine?.debit || 0);

        await tx.journalLine.createMany({
          data: [
            {
              journalId: id,
              accountId: expenseAccountId || debitLine!.accountId,
              costCenterId: costCenterId !== undefined ? costCenterId : debitLine!.costCenterId,
              debit: newAmount,
              credit: 0,
              description: description || existing.description
            },
            {
              journalId: id,
              accountId: paymentAccountId || creditLine!.accountId,
              costCenterId: null,
              debit: 0,
              credit: newAmount,
              description: description || existing.description
            }
          ]
        });
      }

      return await tx.journalEntry.update({
        where: { journalId: id },
        data: { description: description || existing.description }
      });
    });

    await logAudit("JournalEntry", id, ActionType.UPDATE, null, updatedExpense, userId, req.ip);
    res.json({ message: "Cập nhật chi phí thành công!", expense: updatedExpense });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật chi phí", error: error.message });
  }
};

// ==========================================
// 4. XÓA CHI PHÍ NHÁP (DELETE)
// ==========================================
export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.journalEntry.findUnique({ where: { journalId: id } });
      if (!existing) throw new Error("Không tìm thấy phiếu chi phí!");
      if (existing.postingStatus !== PostingStatus.DRAFT) {
        throw new Error("Tuyệt đối không được xóa chi phí đã Ghi sổ (POSTED)! Vui lòng dùng nghiệp vụ Đảo bút toán.");
      }

      await tx.journalLine.deleteMany({ where: { journalId: id } });
      await tx.journalEntry.delete({ where: { journalId: id } });
    });

    await logAudit("JournalEntry", id, ActionType.DELETE, null, { deleted: true }, userId, req.ip);
    res.json({ message: "Đã xóa phiếu yêu cầu chi phí Nháp thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa chi phí", error: error.message });
  }
};

// ==========================================
// 5. GHI SỔ VÀ TRỪ NGÂN SÁCH (POST EXPENSE & DEDUCT BUDGET)
// ==========================================
export const postExpense = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.journalEntry.findUnique({ 
        where: { journalId: id },
        include: { lines: true, fiscalPeriod: true }
      });
      
      if (!expense) throw new Error("Không tìm thấy chi phí!");
      if (expense.postingStatus !== PostingStatus.DRAFT) {
        throw new Error("Chi phí này đã được Ghi sổ hoặc Bị hủy trước đó!");
      }
      if (expense.fiscalPeriod?.isClosed) throw new Error("Kỳ kế toán đã khóa, không thể ghi sổ!");

      const year = new Date(expense.entryDate).getFullYear();

      // 1. Duyệt qua tất cả các dòng Nợ (Tài khoản chi phí) có gắn CostCenter để trừ ngân sách
      for (const line of expense.lines) {
        if (Number(line.debit) > 0 && line.costCenterId) {
          const amount = Number(line.debit);
          
          const budget = await tx.budget.findUnique({
            where: { costCenterId_year: { costCenterId: line.costCenterId, year } }
          });

          if (budget) {
            const remaining = Number(budget.totalAmount) - Number(budget.usedAmount) - Number(budget.encumberedAmount);
            if (remaining < amount) {
              throw new Error(`Ngân sách còn lại của phòng ban không đủ để thanh toán dòng chi phí này. (Thiếu: ${amount - remaining})`);
            }

            // Cập nhật usedAmount (Số tiền đã chi thực tế)
            await tx.budget.update({
              where: { budgetId: budget.budgetId },
              data: { usedAmount: Number(budget.usedAmount) + amount }
            });
          }
        }
      }

      // 2. Đổi trạng thái bút toán thành POSTED
      return await tx.journalEntry.update({
        where: { journalId: id },
        data: { postingStatus: PostingStatus.POSTED }
      });
    });

    await logAudit("JournalEntry", id, ActionType.UPDATE, { postingStatus: PostingStatus.DRAFT }, { postingStatus: PostingStatus.POSTED }, userId, req.ip);
    res.json({ message: "Chi phí đã được Ghi sổ và Trừ ngân sách thành công!", expense: result });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi ghi sổ chi phí", error: error.message });
  }
};