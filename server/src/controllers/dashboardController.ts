import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/authMiddleware";

const prisma = new PrismaClient();

export const getDashboardMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query; // Dashboard có thể lọc theo từng chi nhánh
    const userId = req.user?.userId;

    // ==========================================
    // 1. TỔNG GIÁ TRỊ TỒN KHO & TOP SẢN PHẨM 
    // ==========================================
    // Tính tổng giá trị tồn kho toàn hệ thống (hoặc theo chi nhánh)
    const inventoryBalances = await prisma.inventoryBalance.aggregate({
      where: branchId ? { warehouse: { branchId: String(branchId) } } : {},
      _sum: { totalValue: true },
    });
    const totalInventoryValue = Number(inventoryBalances._sum.totalValue || 0);

    // FIX NGHIỆP VỤ: Lấy Top sản phẩm bán chạy dựa trên lịch sử giao dịch xuất bán (SALES_ISSUE)
    const salesTransactions = await prisma.inventoryTransaction.groupBy({
      by: ['productId'],
      where: {
        movementDirection: "OUT",
        document: { type: "SALES_ISSUE" }, // Chỉ tính các phiếu xuất bán hàng
        ...(branchId && { branchId: String(branchId) })
      },
      _sum: { quantity: true, totalCost: true },
      orderBy: { _sum: { quantity: 'desc' } }, // Top bán chạy nhất theo số lượng
      take: 10,
    });

    const popularProducts = await Promise.all(
      salesTransactions.map(async (tx) => {
        const product = await prisma.products.findUnique({ 
          where: { productId: tx.productId }, 
          select: { name: true, productCode: true, imageUrl: true } 
        });
        return {
          ...product,
          totalSoldQuantity: tx._sum.quantity || 0,
          totalSalesCostValue: Number(tx._sum.totalCost || 0) // Giá vốn hàng bán của lượng đã xuất
        };
      })
    );

    // ==========================================
    // 2. DÒNG TIỀN THU / CHI & SỐ DƯ TIỀN TẶT (CASH FLOW)
    // ==========================================
    // Ở hệ thống thực tế, query dựa trên accountCode bắt đầu bằng "111" (Tiền mặt) hoặc "112" (Tiền gửi NH)
    const cashFlow = await prisma.journalLine.aggregate({
      where: {
        journal: { postingStatus: "POSTED", ...(branchId && { branchId: String(branchId) }) },
        account: { type: "ASSET", accountCode: { startsWith: "11" } }
      },
      _sum: { debit: true, credit: true }
    });

    const totalCashIn = Number(cashFlow._sum.debit || 0);
    const totalCashOut = Number(cashFlow._sum.credit || 0);
    const currentCashBalance = totalCashIn - totalCashOut;

    // ==========================================
    // 3. CÔNG NỢ PHẢI THU (AR) & PHẢI TRẢ (AP)
    // ==========================================
    const receivables = await prisma.document.aggregate({
      where: { 
        type: "SALES_ISSUE", 
        status: "COMPLETED", 
        paymentStatus: { not: "PAID" }, 
        ...(branchId && { branchId: String(branchId) }) 
      },
      _sum: { totalAmount: true, paidAmount: true }
    });
    
    const payables = await prisma.document.aggregate({
      where: { 
        type: "PURCHASE_RECEIPT", 
        status: "COMPLETED", 
        paymentStatus: { not: "PAID" }, 
        ...(branchId && { branchId: String(branchId) }) 
      },
      _sum: { totalAmount: true, paidAmount: true }
    });

    const totalAR = Number(receivables._sum.totalAmount || 0) - Number(receivables._sum.paidAmount || 0);
    const totalAP = Number(payables._sum.totalAmount || 0) - Number(payables._sum.paidAmount || 0);

    // ==========================================
    // 4. DOANH THU & CHI PHÍ THÁNG HIỆN TẠI
    // ==========================================
    const currentMonth = new Date();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    // Doanh thu (Kế toán: Tăng ghi Có, Giảm ghi Nợ -> Doanh thu = Có - Nợ)
    const revenueQuery = await prisma.journalLine.aggregate({
      where: {
        journal: { postingStatus: "POSTED", entryDate: { gte: firstDay }, ...(branchId && { branchId: String(branchId) }) },
        account: { type: "REVENUE" }
      },
      _sum: { debit: true, credit: true }
    });
    const totalRevenue = Number(revenueQuery._sum.credit || 0) - Number(revenueQuery._sum.debit || 0);

    // Chi phí (Kế toán: Tăng ghi Nợ, Giảm ghi Có -> Chi phí = Nợ - Có)
    const expenseQuery = await prisma.journalLine.aggregate({
      where: {
        journal: { postingStatus: "POSTED", entryDate: { gte: firstDay }, ...(branchId && { branchId: String(branchId) }) },
        account: { type: "EXPENSE" }
      },
      _sum: { debit: true, credit: true }
    });
    const totalExpense = Number(expenseQuery._sum.debit || 0) - Number(expenseQuery._sum.credit || 0);

    // ==========================================
    // 5. CÔNG VIỆC CẦN XỬ LÝ & HOẠT ĐỘNG GẦN ĐÂY
    // ==========================================
    let pendingApprovalsCount = 0;
    if (userId) {
      const userRoles = await prisma.userRole.findMany({
        where: { userId }, select: { roleId: true }
      });
      const roleIds = userRoles.map(ur => ur.roleId);

      pendingApprovalsCount = await prisma.approvalRequest.count({
        where: {
          status: "PENDING",
          workflow: { steps: { some: { roleId: { in: roleIds } } } }
        }
      });
    }

    const recentActivities = await prisma.document.findMany({
      where: branchId ? { branchId: String(branchId) } : {},
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { 
        documentId: true, documentNumber: true, type: true, 
        status: true, totalAmount: true, createdAt: true 
      }
    });

    // ==========================================
    // 6. TRẢ VỀ PAYLOAD CHO FRONTEND
    // ==========================================
    res.json({
      summary: {
        totalInventoryValue,
        currentCashBalance,
        totalAccountsReceivable: totalAR,
        totalAccountsPayable: totalAP
      },
      financials: {
        totalCashIn,
        totalCashOut,
        currentMonth: {
          revenue: totalRevenue,
          expense: totalExpense,
          netProfit: totalRevenue - totalExpense
        }
      },
      tasks: {
        pendingApprovals: pendingApprovalsCount
      },
      popularProducts,
      recentActivities
    });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất Dashboard", error: error.message });
  }
};