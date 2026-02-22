import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getDashboardMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. Lấy danh sách sản phẩm phổ biến (có tồn kho cao nhất)
    const popularProducts = await prisma.products.findMany({
      take: 15,
      orderBy: {
        stockQuantity: "desc",
      },
    });

    // [ĐÃ XÓA]: salesSummary và purchaseSummary

    // 2. Lấy tóm tắt chi phí (Expense Summary)
    const expenseSummary = await prisma.expenseSummary.findMany({
      take: 5,
      orderBy: {
        date: "desc",
      },
    });

    // 3. Lấy chi tiết chi phí theo danh mục
    const expenseByCategorySummaryRaw = await prisma.expenseByCategory.findMany(
      {
        take: 5,
        orderBy: {
          date: "desc",
        },
      }
    );
    
    // Prisma trả về kiểu BigInt cho cột amount, ta cần chuyển nó thành string để gửi qua JSON
    const expenseByCategorySummary = expenseByCategorySummaryRaw.map(
      (item) => ({
        ...item,
        amount: item.amount.toString(),
      })
    );

    // Trả về dữ liệu đã được làm sạch
    res.json({
      popularProducts,
      expenseSummary,
      expenseByCategorySummary,
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving dashboard metrics" });
  }
};