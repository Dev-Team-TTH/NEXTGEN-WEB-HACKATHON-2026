import { Request, Response } from "express";
import { PaymentStatus, PostingStatus, ActionType } from "@prisma/client";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";

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

    // KIỂM TRA LOGIC KẾ TOÁN KÉP (DOUBLE-ENTRY VALIDATION)
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

    // Xử lý sai số thập phân trong Javascript
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      res.status(400).json({ message: `Bút toán không cân bằng! Tổng Nợ (${totalDebit}) khác Tổng Có (${totalCredit})` });
      return;
    }

    const journal = await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra kỳ kế toán
      const period = await tx.fiscalPeriod.findUnique({ where: { periodId: fiscalPeriodId } });
      if (!period) throw new Error("Kỳ kế toán không tồn tại!");
      if (period.isClosed) throw new Error("Kỳ kế toán này đã bị Khóa. Không thể ghi nhận bút toán!");

      // 2. Tạo Sổ nhật ký chung
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

      // ==========================================
      // [TÍNH NĂNG MỚI] 2.1 KIỂM SOÁT NGÂN SÁCH (BUDGET CONTROL)
      // ==========================================
      const entryYear = new Date(entryDate).getFullYear();

      for (const line of lines) {
        // Chỉ kiểm tra ngân sách nếu dòng này có gắn CostCenter và là số Nợ (Tăng chi phí)
        if (line.costCenterId && Number(line.debit) > 0) {
          
          // Lấy thông tin Tài khoản để biết đây có phải là Tài khoản Chi phí (EXPENSE) không
          const account = await tx.account.findUnique({ where: { accountId: line.accountId } });

          if (account && account.type === "EXPENSE") {
            // Tìm cấu hình Ngân sách của Trung tâm chi phí này trong năm nay
            const budget = await tx.budget.findUnique({
              where: { 
                costCenterId_year: { costCenterId: line.costCenterId, year: entryYear } 
              }
            });

            if (!budget) {
              throw new Error(`Phòng ban / TT Chi phí [${line.costCenterId}] chưa được cấp Ngân sách cho năm ${entryYear}! Không thể ghi nhận chi phí.`);
            }

            const debitAmount = Number(line.debit);
            const newUsedAmount = Number(budget.usedAmount) + debitAmount;
            const budgetLimit = Number(budget.totalAmount);

            // Nếu vượt ngân sách -> Chặn!
            if (newUsedAmount > budgetLimit) {
              throw new Error(`Khoản chi này vượt quá Ngân sách cho phép! (Ngân sách: ${budgetLimit}, Đã dùng: ${budget.usedAmount}, Cần chi thêm: ${debitAmount})`);
            }

            // Nếu hợp lệ -> Trừ tiền vào quỹ ngân sách
            await tx.budget.update({
              where: { budgetId: budget.budgetId },
              data: { usedAmount: newUsedAmount }
            });
          }
        }
      }

      // 3. Tạo các dòng Nợ/Có (Journal Lines)
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
    res.status(400).json({ message: "Lỗi tạo Bút toán", error: error.message });
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
    // Kiểm tra cân bằng kế toán kép nếu có gửi lines mới lên
    if (lines && lines.length > 0) {
      let totalDebit = 0;
      let totalCredit = 0;
      for (const line of lines) {
        totalDebit += Number(line.debit || 0);
        totalCredit += Number(line.credit || 0);
      }
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        res.status(400).json({ message: `Bút toán không cân bằng! Tổng Nợ (${totalDebit}) khác Tổng Có (${totalCredit})` });
        return;
      }
    }

    const updatedJournal = await prisma.$transaction(async (tx) => {
      const existing = await tx.journalEntry.findUnique({ where: { journalId: id } });
      if (!existing) throw new Error("Không tìm thấy bút toán!");
      if (existing.postingStatus !== PostingStatus.DRAFT) {
        throw new Error("Chỉ được chỉnh sửa bút toán khi ở trạng thái Nháp (DRAFT)!");
      }

      // Kiểm tra kỳ kế toán mới (nếu có thay đổi)
      if (fiscalPeriodId && fiscalPeriodId !== existing.fiscalPeriodId) {
        const period = await tx.fiscalPeriod.findUnique({ where: { periodId: fiscalPeriodId } });
        if (!period || period.isClosed) throw new Error("Kỳ kế toán mới đã bị Khóa!");
      }

      // Cập nhật các dòng Nợ/Có (Xóa cũ thêm mới để đảm bảo sạch dữ liệu)
      if (lines && lines.length > 0) {
        await tx.journalLine.deleteMany({ where: { journalId: id } });
        await tx.journalLine.createMany({
          data: lines.map((line: any) => ({
            journalId: id,
            accountId: line.accountId,
            costCenterId: line.costCenterId || null,
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            description: line.description
          }))
        });
      }

      // Cập nhật Header
      const journal = await tx.journalEntry.update({
        where: { journalId: id },
        data: {
          branchId: branchId || existing.branchId,
          fiscalPeriodId: fiscalPeriodId || existing.fiscalPeriodId,
          entryDate: entryDate ? new Date(entryDate) : existing.entryDate,
          reference: reference !== undefined ? reference : existing.reference,
          description: description || existing.description
        }
      });
      return journal;
    });

    await logAudit("JournalEntry", id, "UPDATE", null, updatedJournal, userId, req.ip);
    res.json(updatedJournal);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật Bút toán", error: error.message });
  }
};

// ==========================================
// 4. XÓA BÚT TOÁN (DELETE DRAFT)
// ==========================================
export const deleteJournalEntry = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.journalEntry.findUnique({ where: { journalId: id } });
      if (!existing) throw new Error("Không tìm thấy bút toán!");
      if (existing.postingStatus !== PostingStatus.DRAFT) {
        throw new Error("Tuyệt đối không được xóa bút toán đã Ghi sổ hoặc Bị đảo! Vui lòng dùng nghiệp vụ Đảo bút toán.");
      }

      // Bảng JournalLine thiết lập onDelete: Cascade, nhưng xóa thủ công để chắc chắn
      await tx.journalLine.deleteMany({ where: { journalId: id } });
      await tx.journalEntry.delete({ where: { journalId: id } });
    });

    await logAudit("JournalEntry", id, "DELETE", null, { deleted: true }, userId, req.ip);
    res.json({ message: "Đã xóa bút toán Nháp thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa Bút toán", error: error.message });
  }
};

// ==========================================
// 5. GHI SỔ BÚT TOÁN (POST JOURNAL ENTRY)
// ==========================================
export const postJournalEntry = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    const journal = await prisma.$transaction(async (tx) => {
      const existing = await tx.journalEntry.findUnique({ 
        where: { journalId: id },
        include: { fiscalPeriod: true } 
      });
      
      if (!existing) throw new Error("Không tìm thấy bút toán!");
      if (existing.postingStatus !== PostingStatus.DRAFT) throw new Error("Chỉ được Ghi sổ các bút toán đang ở trạng thái Nháp!");
      if (existing.fiscalPeriod?.isClosed) throw new Error("Kỳ kế toán chứa bút toán này đã Khóa!");

      return await tx.journalEntry.update({
        where: { journalId: id },
        data: { postingStatus: PostingStatus.POSTED }
      });
    });

    await logAudit("JournalEntry", id, "UPDATE", { postingStatus: "DRAFT" }, { postingStatus: "POSTED" }, userId, req.ip);
    res.json({ message: "Ghi sổ bút toán thành công!", journal });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi ghi sổ Bút toán", error: error.message });
  }
};

// ==========================================
// 6. ĐẢO BÚT TOÁN (REVERSE JOURNAL ENTRY - IFRS Standard)
// ==========================================
export const reverseJournalEntry = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { entryDate, description, fiscalPeriodId } = req.body;
  const userId = getUserId(req);

  try {
    const reversedJournal = await prisma.$transaction(async (tx) => {
      const original = await tx.journalEntry.findUnique({ 
        where: { journalId: id },
        include: { lines: true }
      });
      
      if (!original) throw new Error("Không tìm thấy bút toán gốc!");
      if (original.postingStatus !== PostingStatus.POSTED) throw new Error("Chỉ có thể Đảo các bút toán đã GHI SỔ (POSTED)!");
      if (original.reversalEntryId) throw new Error("Bút toán này đã được Đảo trước đó rồi!");

      const periodToUse = fiscalPeriodId || original.fiscalPeriodId;
      const period = await tx.fiscalPeriod.findUnique({ where: { periodId: periodToUse } });
      if (!period || period.isClosed) throw new Error("Kỳ kế toán để ghi bút toán đảo đã bị Khóa!");

      // 1. Tạo bút toán đảo ngược mới (Sinh ra luôn là POSTED)
      const reversal = await tx.journalEntry.create({
        data: {
          branchId: original.branchId,
          fiscalPeriodId: periodToUse,
          entryDate: entryDate ? new Date(entryDate) : new Date(),
          reference: `ĐẢO-${original.reference || original.journalId.substring(0,8)}`,
          description: description || `Đảo bút toán cho: ${original.description}`,
          createdById: userId,
          postingStatus: PostingStatus.POSTED 
        }
      });

      // 2. Sinh các line ngược (Nợ -> Có, Có -> Nợ)
      await tx.journalLine.createMany({
        data: original.lines.map((line) => ({
          journalId: reversal.journalId,
          accountId: line.accountId,
          costCenterId: line.costCenterId,
          debit: line.credit, // Đảo Nợ -> Có
          credit: line.debit, // Đảo Có -> Nợ
          description: `Đảo: ${line.description || ''}`
        }))
      });

      // 3. Cập nhật bút toán gốc thành REVERSED và trỏ ID đến bút toán đảo
      await tx.journalEntry.update({
        where: { journalId: id },
        data: { 
          postingStatus: PostingStatus.REVERSED,
          reversalEntryId: reversal.journalId 
        }
      });

      return reversal;
    });

    await logAudit("JournalEntry", id, "UPDATE", { postingStatus: "POSTED" }, { postingStatus: "REVERSED", reversalId: reversedJournal.journalId }, userId, req.ip);
    res.json({ message: "Nghiệp vụ Đảo bút toán thành công!", reversalJournal: reversedJournal });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi đảo bút toán", error: error.message });
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
    paymentExchangeRate, // [NEW] Tỷ giá thực tế ngày thanh toán
    arApAccountId,       // [NEW] Tài khoản Công nợ (131 hoặc 331)
    fxGainAccountId,     // [NEW] Tài khoản Doanh thu HĐ Tài chính (VD: 515)
    fxLossAccountId      // [NEW] Tài khoản Chi phí Tài chính (VD: 635)
  } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    const paymentAmount = Number(amount); // Số tiền theo đồng tiền của Chứng từ (Ngoại tệ hoặc VND)
    if (paymentAmount <= 0) {
      res.status(400).json({ message: "Số tiền thanh toán phải lớn hơn 0" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Lấy thông tin chứng từ
      const doc = await tx.document.findUnique({ 
        where: { documentId },
        include: { customer: true, supplier: true }
      });
      if (!doc) throw new Error("Không tìm thấy chứng từ!");
      if (doc.status !== "COMPLETED") throw new Error("Chỉ có thể thanh toán chứng từ đã Hoàn tất!");
      if (doc.paymentStatus === "PAID") throw new Error("Chứng từ này đã được thanh toán đủ!");

      const totalDocAmount = Number(doc.totalAmount);
      const currentPaid = Number(doc.paidAmount);
      const newPaidAmount = currentPaid + paymentAmount;

      if (newPaidAmount - totalDocAmount > 0.001) {
        throw new Error(`Số tiền thanh toán vượt quá nợ còn lại! (Còn nợ: ${totalDocAmount - currentPaid})`);
      }

      const newPaymentStatus = Math.abs(totalDocAmount - newPaidAmount) <= 0.001 ? "PAID" : "PARTIAL";

      // ==============================================================
      // [TÍNH NĂNG MỚI]: THUẬT TOÁN CHÊNH LỆCH TỶ GIÁ (FX GAINS / LOSSES)
      // ==============================================================
      const originalRate = Number(doc.exchangeRate || 1);
      const currentRate = Number(paymentExchangeRate || originalRate);
      
      let fxDifferenceBase = 0; // Số tiền chênh lệch (tính bằng Base Currency - VNĐ)
      let isFxGain = false;
      let isFxLoss = false;

      // Nếu tỷ giá thanh toán khác tỷ giá gốc
      if (currentRate !== originalRate) {
        fxDifferenceBase = paymentAmount * Math.abs(currentRate - originalRate);

        if (doc.type.includes("PURCHASE")) { 
          // Mang tính chất CHI TIỀN (AP)
          if (currentRate > originalRate) isFxLoss = true; // Mua ngoại tệ đắt hơn -> Lỗ
          else isFxGain = true;                            // Mua ngoại tệ rẻ hơn -> Lãi
        } else if (doc.type.includes("SALES")) { 
          // Mang tính chất THU TIỀN (AR)
          if (currentRate > originalRate) isFxGain = true; // Bán ngoại tệ được giá hơn -> Lãi
          else isFxLoss = true;                            // Bán ngoại tệ mất giá -> Lỗ
        }
      }

      let journalId = null;
      // Nếu có truyền Kỳ kế toán và cấu hình Tài khoản, sẽ sinh Bút toán Sổ cái tự động
      if (fiscalPeriodId && (cashAccountId || bankAccountId) && arApAccountId) {
        const period = await tx.fiscalPeriod.findUnique({ where: { periodId: fiscalPeriodId } });
        if (period?.isClosed) throw new Error("Kỳ kế toán để ghi sổ đã bị Khóa!");

        const paymentAccount = paymentMethod === "CASH" ? cashAccountId : bankAccountId;
        
        const journal = await tx.journalEntry.create({
          data: {
            branchId: branchId || doc.branchId,
            fiscalPeriodId, documentId, entryDate: new Date(),
            description: `Thanh toán ${paymentMethod} cho ${doc.documentNumber} (Tỷ giá: ${currentRate})`,
            createdById: userId, postingStatus: "POSTED"
          }
        });
        journalId = journal.journalId;

        // Tính toán số tiền quy ra VNĐ
        const baseAmountToClear = paymentAmount * originalRate; // Tiền VNĐ để xóa nợ gốc
        const actualBaseAmountPaid = paymentAmount * currentRate; // Tiền VNĐ thực tế ra/vào túi

        const journalLines = [];

        if (doc.type.includes("PURCHASE")) {
           // TRẢ TIỀN NHÀ CUNG CẤP (Nợ Công nợ / Có Tiền mặt)
           journalLines.push({ journalId, accountId: arApAccountId, debit: baseAmountToClear, credit: 0, description: "Giảm công nợ NCC theo tỷ giá gốc" });
           journalLines.push({ journalId, accountId: paymentAccount, debit: 0, credit: actualBaseAmountPaid, description: "Chi tiền thanh toán thực tế" });
           
           if (isFxLoss && fxDifferenceBase > 0) {
             journalLines.push({ journalId, accountId: fxLossAccountId, debit: fxDifferenceBase, credit: 0, description: "Lỗ chênh lệch tỷ giá" });
           } else if (isFxGain && fxDifferenceBase > 0) {
             journalLines.push({ journalId, accountId: fxGainAccountId, debit: 0, credit: fxDifferenceBase, description: "Lãi chênh lệch tỷ giá" });
           }
        } else {
           // THU TIỀN KHÁCH HÀNG (Nợ Tiền mặt / Có Công nợ)
           journalLines.push({ journalId, accountId: paymentAccount, debit: actualBaseAmountPaid, credit: 0, description: "Thu tiền thanh toán thực tế" });
           journalLines.push({ journalId, accountId: arApAccountId, debit: 0, credit: baseAmountToClear, description: "Giảm công nợ KH theo tỷ giá gốc" });

           if (isFxLoss && fxDifferenceBase > 0) {
             journalLines.push({ journalId, accountId: fxLossAccountId, debit: fxDifferenceBase, credit: 0, description: "Lỗ chênh lệch tỷ giá" });
           } else if (isFxGain && fxDifferenceBase > 0) {
             journalLines.push({ journalId, accountId: fxGainAccountId, debit: 0, credit: fxDifferenceBase, description: "Lãi chênh lệch tỷ giá" });
           }
        }

        // Check an toàn: Đảm bảo Kế toán Kép Nợ = Có tuyệt đối
        const totalDebit = journalLines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = journalLines.reduce((sum, line) => sum + line.credit, 0);
        if (Math.abs(totalDebit - totalCredit) > 0.001) {
           throw new Error(`Lỗi thuật toán Kế toán kép: Nợ (${totalDebit}) khác Có (${totalCredit})`);
        }

        await tx.journalLine.createMany({ data: journalLines });
      }

      // 4. Tạo Lịch sử Giao dịch Thanh toán
      const paymentTx = await tx.paymentTransaction.create({
        data: {
          documentId, journalEntryId: journalId,
          amount: paymentAmount, paymentMethod, reference, note, processedById: userId
        }
      });

      // 5. Cập nhật trạng thái chứng từ gốc
      await tx.document.update({
        where: { documentId },
        data: { paidAmount: newPaidAmount, paymentStatus: newPaymentStatus }
      });

      await logAudit("PaymentTransaction", paymentTx.paymentId, "CREATE", null, { amount: paymentAmount, fxDiff: fxDifferenceBase }, userId, req.ip);
    });

    res.json({ message: "Ghi nhận thanh toán và chênh lệch tỷ giá thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xử lý thanh toán", error: error.message });
  }
};

// ==========================================
// 8. BÁO CÁO TÀI CHÍNH (FINANCIAL REPORTS)
// ==========================================

// Báo cáo Lưu chuyển tiền tệ (Cashflow)
export const getCashflowReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, startDate, endDate } = req.query;
    
    // 1. Khởi tạo điều kiện an toàn cho Journal
    const journalCondition: any = {
      postingStatus: "POSTED"
    };

    if (branchId) {
      journalCondition.branchId = String(branchId);
    }

    if (startDate && endDate) {
      const start = new Date(String(startDate));
      const end = new Date(String(endDate));
      
      // Chống lỗi Invalid Date
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        journalCondition.entryDate = { gte: start, lte: end };
      }
    }

    // 2. Tìm các dòng nhật ký liên quan đến tiền (111: Tiền mặt, 112: Tiền gửi NH)
    const cashLines = await prisma.journalLine.findMany({
      where: {
        account: { accountCode: { startsWith: "11" } },
        journal: journalCondition // Đưa điều kiện đã tách gọn vào đây
      },
      include: { 
        journal: { select: { entryDate: true } },
        account: { select: { accountCode: true, name: true } } // Select thêm để log dễ debug nếu cần
      }
    });

    // 3. Gom nhóm theo tháng (YYYY-MM)
    const groupedData: Record<string, { cashIn: number, cashOut: number }> = {};
    
    cashLines.forEach(line => {
      // Đảm bảo entryDate tồn tại trước khi parse
      if (!line.journal?.entryDate) return; 

      const period = line.journal.entryDate.toISOString().substring(0, 7); // Lấy "YYYY-MM"
      if (!groupedData[period]) groupedData[period] = { cashIn: 0, cashOut: 0 };
      
      // Nguyên lý kế toán: Tài sản (Tiền) Nợ -> Tăng (Thu vào), Có -> Giảm (Chi ra)
      groupedData[period].cashIn += Number(line.debit || 0); 
      groupedData[period].cashOut += Number(line.credit || 0); 
    });

    // 4. Trả kết quả mảng đã sort
    const result = Object.keys(groupedData).map(period => ({
      period,
      cashIn: groupedData[period].cashIn,
      cashOut: groupedData[period].cashOut,
      netCash: groupedData[period].cashIn - groupedData[period].cashOut
    })).sort((a, b) => a.period.localeCompare(b.period));

    res.json(result);
  } catch (error: any) {
    console.error("[Cashflow Error]:", error); // In lỗi thực tế ra Terminal để debug
    res.status(500).json({ message: "Lỗi tạo Báo cáo Dòng tiền", error: error.message });
  }
};

// Bảng Cân đối Số phát sinh (Trial Balance) ĐÃ FIX LỖI 🚀
export const getTrialBalanceReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, fiscalPeriodId } = req.query;
    
    // 1. Lấy thông tin Kỳ kế toán để xác định Ngày bắt đầu (Làm mốc tính Số dư Đầu kỳ)
    let periodStartDate: Date | null = null;
    if (fiscalPeriodId) {
      const period = await prisma.fiscalPeriod.findUnique({ where: { periodId: String(fiscalPeriodId) } });
      if (period) periodStartDate = period.startDate;
    }

    // 2. TÍNH TOÁN SỐ DƯ ĐẦU KỲ (Lũy kế các bút toán POSTED trước kỳ này)
    const openingLines = periodStartDate ? await prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        journal: {
          postingStatus: "POSTED",
          entryDate: { lt: periodStartDate },
          ...(branchId && { branchId: String(branchId) })
        }
      },
      _sum: { debit: true, credit: true }
    }) : [];

    const openingMap = new Map();
    openingLines.forEach(line => {
      openingMap.set(line.accountId, {
        debit: Number(line._sum.debit || 0),
        credit: Number(line._sum.credit || 0)
      });
    });

    // 3. TÍNH TOÁN SỐ PHÁT SINH TRONG KỲ
    const periodLines = await prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        journal: {
          postingStatus: "POSTED",
          ...(branchId && { branchId: String(branchId) }),
          ...(fiscalPeriodId && { fiscalPeriodId: String(fiscalPeriodId) }) // Phát sinh thuộc kỳ này
        }
      },
      _sum: { debit: true, credit: true }
    });

    // 4. LẮP RÁP DỮ LIỆU BÁO CÁO KẾ TOÁN CHUẨN MỰC
    const accounts = await prisma.account.findMany({ 
      where: { isActive: true },
      select: { accountId: true, accountCode: true, name: true, type: true } 
    });

    const result = accounts.map(acc => {
      const opening = openingMap.get(acc.accountId) || { debit: 0, credit: 0 };
      const period = periodLines.find(l => l.accountId === acc.accountId) || { _sum: { debit: 0, credit: 0 } };
      
      // Xử lý logic Đầu kỳ theo Bản chất tài khoản
      let openingDebit = 0; let openingCredit = 0;
      if (acc.type === "ASSET" || acc.type === "EXPENSE") { // Dư Nợ
        const bal = opening.debit - opening.credit;
        if (bal > 0) openingDebit = bal; else openingCredit = Math.abs(bal);
      } else { // Dư Có (LIABILITY, EQUITY, REVENUE)
        const bal = opening.credit - opening.debit;
        if (bal > 0) openingCredit = bal; else openingDebit = Math.abs(bal);
      }

      const periodDebit = Number(period._sum.debit || 0);
      const periodCredit = Number(period._sum.credit || 0);

      // Xử lý logic Cuối kỳ
      let closingDebit = 0; let closingCredit = 0;
      if (acc.type === "ASSET" || acc.type === "EXPENSE") {
         const closingBal = openingDebit - openingCredit + periodDebit - periodCredit;
         if (closingBal > 0) closingDebit = closingBal; else closingCredit = Math.abs(closingBal);
      } else {
         const closingBal = openingCredit - openingDebit + periodCredit - periodDebit;
         if (closingBal > 0) closingCredit = closingBal; else closingDebit = Math.abs(closingBal);
      }

      return {
        accountId: acc.accountId,
        accountCode: acc.accountCode,
        accountName: acc.name,
        openingDebit, openingCredit,
        periodDebit, periodCredit,
        closingDebit, closingCredit
      };
    }).sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi tạo Bảng cân đối số phát sinh", error: error.message });
  }
};