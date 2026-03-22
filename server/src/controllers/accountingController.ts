import { Request, Response } from "express";
import { PaymentStatus, PostingStatus, ActionType, AccountType } from "@prisma/client";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";
import { enforceFiscalLock } from "../utils/fiscalLockHelper"; 

// Hàm Helper trích xuất userId
const getUserId = (req: Request) => (req as any).user?.userId || req.body.userId;

// ==========================================
// 1. TRUY VẤN SỔ NHẬT KÝ CHUNG / SỔ CÁI (JOURNAL ENTRIES)
// ==========================================
export const getJournalEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, fiscalPeriodId, postingStatus, startDate, endDate } = req.query;

    const whereCondition: any = {};
    if (branchId) whereCondition.branchId = String(branchId);
    if (fiscalPeriodId) whereCondition.fiscalPeriodId = String(fiscalPeriodId);
    if (postingStatus) whereCondition.postingStatus = postingStatus as PostingStatus;
    
    if (startDate || endDate) {
      whereCondition.entryDate = {};
      if (startDate) whereCondition.entryDate.gte = new Date(String(startDate));
      if (endDate) whereCondition.entryDate.lte = new Date(String(endDate));
    }

    const journals = await prisma.journalEntry.findMany({
      where: whereCondition,
      include: {
        branch: { select: { name: true, code: true } },
        fiscalPeriod: { select: { periodNumber: true, fiscalYear: { select: { year: true } } } },
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

    res.json(journals);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất sổ nhật ký", error: error.message });
  }
};

export const getJournalEntryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const journal = await prisma.journalEntry.findUnique({
      where: { journalId: id },
      include: {
        branch: true,
        fiscalPeriod: { include: { fiscalYear: true } },
        createdBy: { select: { fullName: true, email: true } },
        document: { select: { documentNumber: true, type: true } },
        lines: {
          include: { account: true, costCenter: true }
        },
        reversalEntry: { select: { journalId: true, reference: true } },
        reversedBy: { select: { journalId: true, reference: true } }
      }
    });

    if (!journal) {
      res.status(404).json({ message: "Không tìm thấy Bút toán!" });
      return;
    }
    res.json(journal);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất chi tiết bút toán", error: error.message });
  }
};

// ==========================================
// 2. TẠO BÚT TOÁN THỦ CÔNG (CREATE JOURNAL ENTRY & BUDGET CONTROL)
// ==========================================
export const createJournalEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, fiscalPeriodId, entryDate, reference, description, lines, postingStatus } = req.body;
    const userId = getUserId(req);

    let totalDebit = 0;
    let totalCredit = 0;

    if (!lines || lines.length < 2) {
      res.status(400).json({ message: "Bút toán phải có ít nhất 2 dòng (1 Nợ, 1 Có)!" });
      return;
    }

    for (const line of lines) {
      totalDebit += Number(line.debit || 0);
      totalCredit += Number(line.credit || 0);
    }

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      res.status(400).json({ message: `Bút toán không cân bằng! Tổng Nợ (${totalDebit}) khác Tổng Có (${totalCredit})` });
      return;
    }

    const journal = await prisma.$transaction(async (tx) => {
      await enforceFiscalLock(tx, fiscalPeriodId);

      const newJournal = await tx.journalEntry.create({
        data: {
          branchId,
          fiscalPeriodId,
          entryDate: new Date(entryDate),
          reference,
          description,
          createdById: userId,
          postingStatus: postingStatus || PostingStatus.DRAFT
        }
      });

      const entryYear = new Date(entryDate).getFullYear();

      for (const line of lines) {
        if (line.costCenterId && Number(line.debit) > 0) {
          const account = await tx.account.findUnique({ where: { accountId: line.accountId } });

          // 🚀 Đồng bộ chuẩn với Enum AccountType
          if (account && account.type === AccountType.EXPENSE) {
            const budget = await tx.budget.findUnique({
              where: { costCenterId_year: { costCenterId: line.costCenterId, year: entryYear } }
            });

            if (!budget) {
              throw new Error(`Phòng ban / TT Chi phí [${line.costCenterId}] chưa được cấp Ngân sách cho năm ${entryYear}!`);
            }

            const debitAmount = Number(line.debit);
            const newUsedAmount = Number(budget.usedAmount) + debitAmount;
            const budgetLimit = Number(budget.totalAmount);

            if (newUsedAmount > budgetLimit) {
              throw new Error(`Khoản chi vượt quá Ngân sách! (Ngân sách: ${budgetLimit}, Đã dùng: ${budget.usedAmount}, Cần chi: ${debitAmount})`);
            }

            await tx.budget.update({
              where: { budgetId: budget.budgetId },
              data: { usedAmount: newUsedAmount }
            });
          }
        }
      }

      await tx.journalLine.createMany({
        data: lines.map((line: any) => ({
          journalId: newJournal.journalId,
          accountId: line.accountId,
          costCenterId: line.costCenterId || null,
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          description: line.description
        }))
      });

      return newJournal;
    });

    await logAudit("JournalEntry", journal.journalId, "CREATE", null, journal, userId, req.ip);
    res.status(201).json(journal);
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Lỗi tạo Bút toán" });
  }
};

// ==========================================
// 3. CẬP NHẬT BÚT TOÁN (UPDATE DRAFT)
// ==========================================
export const updateJournalEntry = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { branchId, fiscalPeriodId, entryDate, reference, description, lines } = req.body;
  const userId = getUserId(req);

  try {
    if (lines && lines.length > 0) {
      let totalDebit = 0; let totalCredit = 0;
      for (const line of lines) { totalDebit += Number(line.debit || 0); totalCredit += Number(line.credit || 0); }
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        res.status(400).json({ message: `Bút toán không cân bằng!` }); return;
      }
    }

    const updatedJournal = await prisma.$transaction(async (tx) => {
      const existing = await tx.journalEntry.findUnique({ where: { journalId: id } });
      if (!existing) throw new Error("Không tìm thấy bút toán!");
      if (existing.postingStatus !== PostingStatus.DRAFT) throw new Error("Chỉ sửa được bút toán Nháp!");

      await enforceFiscalLock(tx, existing.fiscalPeriodId); 
      if (fiscalPeriodId && fiscalPeriodId !== existing.fiscalPeriodId) {
        await enforceFiscalLock(tx, fiscalPeriodId); 
      }

      if (lines && lines.length > 0) {
        await tx.journalLine.deleteMany({ where: { journalId: id } });
        await tx.journalLine.createMany({
          data: lines.map((line: any) => ({
            journalId: id, accountId: line.accountId, costCenterId: line.costCenterId || null,
            debit: Number(line.debit || 0), credit: Number(line.credit || 0), description: line.description
          }))
        });
      }

      return await tx.journalEntry.update({
        where: { journalId: id },
        data: {
          branchId: branchId || existing.branchId,
          fiscalPeriodId: fiscalPeriodId || existing.fiscalPeriodId,
          entryDate: entryDate ? new Date(entryDate) : existing.entryDate,
          reference: reference !== undefined ? reference : existing.reference,
          description: description || existing.description
        }
      });
    });

    await logAudit("JournalEntry", id, "UPDATE", null, updatedJournal, userId, req.ip);
    res.json(updatedJournal);
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Lỗi cập nhật Bút toán" });
  }
};

// ==========================================
// 4. XÓA BÚT TOÁN
// ==========================================
export const deleteJournalEntry = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.journalEntry.findUnique({ where: { journalId: id } });
      if (!existing) throw new Error("Không tìm thấy bút toán!");
      if (existing.postingStatus !== PostingStatus.DRAFT) throw new Error("Chỉ được xóa bút toán Nháp!");

      await enforceFiscalLock(tx, existing.fiscalPeriodId);

      await tx.journalLine.deleteMany({ where: { journalId: id } });
      await tx.journalEntry.delete({ where: { journalId: id } });
    });

    await logAudit("JournalEntry", id, "DELETE", null, { deleted: true }, userId, req.ip);
    res.json({ message: "Đã xóa bút toán Nháp thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Lỗi xóa Bút toán" });
  }
};

// ==========================================
// 5. GHI SỔ BÚT TOÁN
// ==========================================
export const postJournalEntry = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    const journal = await prisma.$transaction(async (tx) => {
      const existing = await tx.journalEntry.findUnique({ where: { journalId: id } });
      if (!existing) throw new Error("Không tìm thấy bút toán!");
      if (existing.postingStatus !== PostingStatus.DRAFT) throw new Error("Chỉ Ghi sổ bút toán Nháp!");

      await enforceFiscalLock(tx, existing.fiscalPeriodId);

      return await tx.journalEntry.update({
        where: { journalId: id },
        data: { postingStatus: PostingStatus.POSTED }
      });
    });

    await logAudit("JournalEntry", id, "UPDATE", { postingStatus: "DRAFT" }, { postingStatus: "POSTED" }, userId, req.ip);
    res.json({ message: "Ghi sổ bút toán thành công!", journal });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Lỗi ghi sổ Bút toán" });
  }
};

// ==========================================
// 6. ĐẢO SỔ BÚT TOÁN
// ==========================================
export const reverseJournalEntry = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { entryDate, description, fiscalPeriodId } = req.body;
  const userId = getUserId(req);

  try {
    const reversedJournal = await prisma.$transaction(async (tx) => {
      const original = await tx.journalEntry.findUnique({ 
        where: { journalId: id }, include: { lines: true }
      });
      
      if (!original) throw new Error("Không tìm thấy bút toán gốc!");
      if (original.postingStatus !== PostingStatus.POSTED) throw new Error("Chỉ Đảo bút toán đã GHI SỔ!");
      if (original.reversalEntryId) throw new Error("Bút toán này đã được Đảo!");

      const periodToUse = fiscalPeriodId || original.fiscalPeriodId;
      
      await enforceFiscalLock(tx, periodToUse);

      const reversal = await tx.journalEntry.create({
        data: {
          branchId: original.branchId,
          fiscalPeriodId: periodToUse,
          entryDate: entryDate ? new Date(entryDate) : new Date(),
          reference: `ĐẢO-${original.reference || original.journalId.substring(0,8)}`,
          description: description || `Đảo bút toán: ${original.description}`,
          createdById: userId,
          postingStatus: PostingStatus.POSTED 
        }
      });

      await tx.journalLine.createMany({
        data: original.lines.map((line) => ({
          journalId: reversal.journalId, accountId: line.accountId, costCenterId: line.costCenterId,
          debit: line.credit, credit: line.debit, description: `Đảo: ${line.description || ''}`
        }))
      });

      await tx.journalEntry.update({
        where: { journalId: id },
        data: { postingStatus: PostingStatus.REVERSED, reversalEntryId: reversal.journalId }
      });

      return reversal;
    });

    await logAudit("JournalEntry", id, "UPDATE", { postingStatus: "POSTED" }, { postingStatus: "REVERSED", reversalId: reversedJournal.journalId }, userId, req.ip);
    res.json({ message: "Nghiệp vụ Đảo bút toán thành công!", reversalJournal: reversedJournal });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Lỗi đảo bút toán" });
  }
};

// ==========================================
// 7. THANH TOÁN CHỨNG TỪ (AP / AR PAYMENT)
// ==========================================
export const processPayment = async (req: Request, res: Response): Promise<void> => {
  const { documentId } = req.params;
  const { 
    amount, paymentMethod, reference, note, 
    cashAccountId, bankAccountId, branchId, fiscalPeriodId,
    paymentExchangeRate, arApAccountId, fxGainAccountId, fxLossAccountId
  } = req.body;
  const userId = getUserId(req);

  try {
    const paymentAmount = Number(amount); 
    if (paymentAmount <= 0) { res.status(400).json({ message: "Số tiền phải > 0" }); return; }

    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({ where: { documentId }});
      if (!doc) throw new Error("Không tìm thấy chứng từ!");
      if (doc.status !== "COMPLETED") throw new Error("Chỉ thanh toán chứng từ Hoàn tất!");
      if (doc.paymentStatus === "PAID") throw new Error("Chứng từ đã thanh toán đủ!");

      const totalDocAmount = Number(doc.totalAmount);
      const currentPaid = Number(doc.paidAmount);
      const newPaidAmount = currentPaid + paymentAmount;

      if (newPaidAmount - totalDocAmount > 0.001) throw new Error(`Vượt quá nợ còn lại!`);
      const newPaymentStatus = Math.abs(totalDocAmount - newPaidAmount) <= 0.001 ? "PAID" : "PARTIAL";

      const originalRate = Number(doc.exchangeRate || 1);
      const currentRate = Number(paymentExchangeRate || originalRate);
      let fxDifferenceBase = paymentAmount * Math.abs(currentRate - originalRate);
      let isFxGain = false; let isFxLoss = false;

      if (currentRate !== originalRate) {
        if (doc.type.includes("PURCHASE")) { 
          if (currentRate > originalRate) isFxLoss = true; else isFxGain = true;                            
        } else if (doc.type.includes("SALES")) { 
          if (currentRate > originalRate) isFxGain = true; else isFxLoss = true;                            
        }
      }

      let journalId = null;
      if (fiscalPeriodId && (cashAccountId || bankAccountId) && arApAccountId) {
        
        await enforceFiscalLock(tx, fiscalPeriodId);

        const paymentAccount = paymentMethod === "CASH" ? cashAccountId : bankAccountId;
        const journal = await tx.journalEntry.create({
          data: {
            branchId: branchId || doc.branchId, fiscalPeriodId, documentId, entryDate: new Date(),
            description: `Thanh toán ${paymentMethod} cho ${doc.documentNumber}`,
            createdById: userId, postingStatus: "POSTED"
          }
        });
        journalId = journal.journalId;

        const baseAmountToClear = paymentAmount * originalRate; 
        const actualBaseAmountPaid = paymentAmount * currentRate; 
        const journalLines = [];

        if (doc.type.includes("PURCHASE")) {
           journalLines.push({ journalId, accountId: arApAccountId, debit: baseAmountToClear, credit: 0, description: "Giảm công nợ NCC" });
           journalLines.push({ journalId, accountId: paymentAccount, debit: 0, credit: actualBaseAmountPaid, description: "Chi tiền" });
           if (isFxLoss && fxDifferenceBase > 0) journalLines.push({ journalId, accountId: fxLossAccountId, debit: fxDifferenceBase, credit: 0, description: "Lỗ tỷ giá" });
           else if (isFxGain && fxDifferenceBase > 0) journalLines.push({ journalId, accountId: fxGainAccountId, debit: 0, credit: fxDifferenceBase, description: "Lãi tỷ giá" });
        } else {
           journalLines.push({ journalId, accountId: paymentAccount, debit: actualBaseAmountPaid, credit: 0, description: "Thu tiền" });
           journalLines.push({ journalId, accountId: arApAccountId, debit: 0, credit: baseAmountToClear, description: "Giảm công nợ KH" });
           if (isFxLoss && fxDifferenceBase > 0) journalLines.push({ journalId, accountId: fxLossAccountId, debit: fxDifferenceBase, credit: 0, description: "Lỗ tỷ giá" });
           else if (isFxGain && fxDifferenceBase > 0) journalLines.push({ journalId, accountId: fxGainAccountId, debit: 0, credit: fxDifferenceBase, description: "Lãi tỷ giá" });
        }

        const tDebit = journalLines.reduce((s, l) => s + l.debit, 0);
        const tCredit = journalLines.reduce((s, l) => s + l.credit, 0);
        if (Math.abs(tDebit - tCredit) > 0.001) throw new Error(`Lỗi Kép: Nợ khác Có`);

        await tx.journalLine.createMany({ data: journalLines });
      }

      const paymentTx = await tx.paymentTransaction.create({
        data: {
          documentId, journalEntryId: journalId, amount: paymentAmount, 
          paymentMethod, reference, note, processedById: userId
        }
      });

      await tx.document.update({
        where: { documentId }, data: { paidAmount: newPaidAmount, paymentStatus: newPaymentStatus }
      });

      await logAudit("PaymentTransaction", paymentTx.paymentId, "CREATE", null, { amount: paymentAmount }, userId, req.ip);
    });

    res.json({ message: "Ghi nhận thanh toán và chênh lệch tỷ giá thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Lỗi xử lý thanh toán" });
  }
};

// ==========================================
// 8. BÁO CÁO TÀI CHÍNH (FINANCIAL REPORTS)
// ==========================================
export const getCashflowReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const journalCondition: any = { postingStatus: "POSTED" };

    if (branchId) journalCondition.branchId = String(branchId);
    if (startDate && endDate) {
      const start = new Date(String(startDate));
      const end = new Date(String(endDate));
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        journalCondition.entryDate = { gte: start, lte: end };
      }
    }

    const cashLines = await prisma.journalLine.findMany({
      where: {
        account: { accountCode: { startsWith: "11" } },
        journal: journalCondition 
      },
      include: { 
        journal: { select: { entryDate: true } },
        account: { select: { accountCode: true, name: true } } 
      }
    });

    const groupedData: Record<string, { cashIn: number, cashOut: number }> = {};
    cashLines.forEach(line => {
      if (!line.journal?.entryDate) return; 
      const period = line.journal.entryDate.toISOString().substring(0, 7); 
      if (!groupedData[period]) groupedData[period] = { cashIn: 0, cashOut: 0 };
      
      groupedData[period].cashIn += Number(line.debit || 0); 
      groupedData[period].cashOut += Number(line.credit || 0); 
    });

    const result = Object.keys(groupedData).map(period => ({
      period,
      cashIn: groupedData[period].cashIn,
      cashOut: groupedData[period].cashOut,
      netCash: groupedData[period].cashIn - groupedData[period].cashOut
    })).sort((a, b) => a.period.localeCompare(b.period));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi tạo Báo cáo Dòng tiền", error: error.message });
  }
};

export const getTrialBalanceReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, fiscalPeriodId } = req.query;
    
    let periodStartDate: Date | null = null;
    if (fiscalPeriodId) {
      const period = await prisma.fiscalPeriod.findUnique({ where: { periodId: String(fiscalPeriodId) } });
      if (period) periodStartDate = period.startDate;
    }

    const openingLines = periodStartDate ? await prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        journal: {
          postingStatus: "POSTED", entryDate: { lt: periodStartDate },
          ...(branchId && { branchId: String(branchId) })
        }
      },
      _sum: { debit: true, credit: true }
    }) : [];

    const openingMap = new Map();
    openingLines.forEach(line => {
      openingMap.set(line.accountId, { debit: Number(line._sum.debit || 0), credit: Number(line._sum.credit || 0) });
    });

    const periodLines = await prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        journal: {
          postingStatus: "POSTED",
          ...(branchId && { branchId: String(branchId) }),
          ...(fiscalPeriodId && { fiscalPeriodId: String(fiscalPeriodId) }) 
        }
      },
      _sum: { debit: true, credit: true }
    });

    const accounts = await prisma.account.findMany({ 
      where: { isActive: true },
      select: { accountId: true, accountCode: true, name: true, type: true } 
    });

    const result = accounts.map(acc => {
      const opening = openingMap.get(acc.accountId) || { debit: 0, credit: 0 };
      const period = periodLines.find(l => l.accountId === acc.accountId) || { _sum: { debit: 0, credit: 0 } };
      
      let openingDebit = 0; let openingCredit = 0;
      
      // 🚀 AN TOÀN: Dùng phép so sánh chuỗi tương đương Enum của Prisma
      if (acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE) { 
        const bal = opening.debit - opening.credit;
        if (bal > 0) openingDebit = bal; else openingCredit = Math.abs(bal);
      } else { 
        const bal = opening.credit - opening.debit;
        if (bal > 0) openingCredit = bal; else openingDebit = Math.abs(bal);
      }

      const periodDebit = Number(period._sum.debit || 0);
      const periodCredit = Number(period._sum.credit || 0);

      let closingDebit = 0; let closingCredit = 0;
      if (acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE) {
         const closingBal = openingDebit - openingCredit + periodDebit - periodCredit;
         if (closingBal > 0) closingDebit = closingBal; else closingCredit = Math.abs(closingBal);
      } else {
         const closingBal = openingCredit - openingDebit + periodCredit - periodDebit;
         if (closingBal > 0) closingCredit = closingBal; else closingDebit = Math.abs(closingBal);
      }

      return {
        accountId: acc.accountId, accountCode: acc.accountCode, accountName: acc.name, type: acc.type,
        openingDebit, openingCredit, periodDebit, periodCredit, closingDebit, closingCredit
      };
    }).sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi tạo Bảng cân đối số phát sinh", error: error.message });
  }
};