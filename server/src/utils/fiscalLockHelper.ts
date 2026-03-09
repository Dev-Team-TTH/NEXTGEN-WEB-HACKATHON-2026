/**
 * [UTILITY ENTERPRISE]: Trạm kiểm soát Khóa sổ Kế toán tập trung.
 * Chặn đứng MỌI thao tác làm thay đổi số liệu nếu kỳ đã bị chốt.
 */
export const enforceFiscalLock = async (
  prismaClient: any, // Có thể truyền `prisma` gốc hoặc `tx` (Transaction Client)
  fiscalPeriodId: string | null | undefined
): Promise<void> => {
  if (!fiscalPeriodId) return; // Bỏ qua nếu chứng từ không có kỳ kế toán

  const period = await prismaClient.fiscalPeriod.findUnique({
    where: { periodId: fiscalPeriodId }
  });

  if (!period) {
    throw new Error("LỖI HỆ THỐNG: Kỳ kế toán tham chiếu không tồn tại!");
  }

  // BỨC TƯỜNG THÉP (HARD LOCK)
  // Tương lai có thể thêm logic: if (period.isClosed && userRole !== 'SUPER_ADMIN')
  if (period.isClosed) {
    throw new Error(`THAO TÁC BỊ TỪ CHỐI: Kỳ kế toán (Tháng ${period.periodNumber}/${period.fiscalYear?.year || ''}) đã bị KHÓA. Nghiêm cấm thay đổi BCTC!`);
  }
};