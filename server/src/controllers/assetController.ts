import { Request, Response } from "express";
import { PrismaClient, ActionType, AssetStatus } from "@prisma/client";
import { logAudit } from "../utils/auditLogger";

const prisma = new PrismaClient();

// ==========================================
// 1. LẤY DANH SÁCH & CHI TIẾT TÀI SẢN (READ)
// ==========================================
export const getAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, categoryId, departmentId } = req.query;
    const assets = await prisma.assets.findMany({
      where: {
        isDeleted: false,
        ...(status && { status: status as AssetStatus }),
        ...(categoryId && { categoryId: String(categoryId) }),
        ...(departmentId && { departmentId: String(departmentId) })
      },
      include: {
        category: { select: { name: true, code: true } },
        department: { select: { name: true } },
        costCenter: { select: { name: true } },
        supplier: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách tài sản", error: error.message });
  }
};

export const getAssetById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const asset = await prisma.assets.findUnique({
      where: { assetId: id },
      include: {
        category: true,
        department: true,
        costCenter: true,
        supplier: true,
        uom: true
      }
    });

    if (!asset || asset.isDeleted) {
      res.status(404).json({ message: "Không tìm thấy tài sản!" });
      return;
    }
    res.json(asset);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất chi tiết tài sản", error: error.message });
  }
};

// ==========================================
// 2. TẠO MỚI, CẬP NHẬT & XÓA TÀI SẢN (CRUD)
// ==========================================
export const createAsset = async (req: Request, res: Response): Promise<void> => {
  const {
    assetCode, name, barcode, serialNumber, imageUrl, purchaseDate, purchasePrice,
    depreciationMethod, depreciationMonths, maintenanceCycleMonths,
    categoryId, uomId, departmentId, costCenterId, supplierId
  } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    const newAsset = await prisma.$transaction(async (tx) => {
      const asset = await tx.assets.create({
        data: {
          assetCode, name, barcode, serialNumber, imageUrl,
          purchaseDate: new Date(purchaseDate),
          purchasePrice: Number(purchasePrice),
          currentValue: Number(purchasePrice),
          salvageValue: 0,
          depreciationMethod: depreciationMethod || "STRAIGHT_LINE",
          depreciationMonths: Number(depreciationMonths || 0),
          maintenanceCycleMonths: Number(maintenanceCycleMonths || 0),
          categoryId, uomId, departmentId, costCenterId, supplierId,
          status: "AVAILABLE"
        }
      });

      // Ghi lịch sử vòng đời Tài sản
      await tx.assetHistory.create({
        data: {
          assetId: asset.assetId,
          actionType: "CREATE",
          description: "Khởi tạo tài sản mới lên hệ thống",
          changedById: userId,
          snapshotData: JSON.parse(JSON.stringify(asset))
        }
      });

      return asset;
    });

    await logAudit("Assets", newAsset.assetId, "CREATE", null, newAsset, userId, req.ip);
    res.status(201).json(newAsset);
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo Tài sản", error: error.message });
  }
};

export const updateAsset = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };
  const userId = (req as any).user?.userId || req.body.userId;
  delete updateData.userId; // Loại bỏ userId khỏi data update

  try {
    const updatedAsset = await prisma.$transaction(async (tx) => {
      const oldAsset = await tx.assets.findUnique({ where: { assetId: id } });
      if (!oldAsset || oldAsset.isDeleted) throw new Error("Tài sản không tồn tại!");

      if (updateData.purchasePrice !== undefined) updateData.purchasePrice = Number(updateData.purchasePrice);
      if (updateData.salvageValue !== undefined) updateData.salvageValue = Number(updateData.salvageValue);
      if (updateData.currentValue !== undefined) updateData.currentValue = Number(updateData.currentValue);

      const asset = await tx.assets.update({
        where: { assetId: id },
        data: updateData
      });

      await tx.assetHistory.create({
        data: {
          assetId: id,
          actionType: "UPDATE",
          description: "Cập nhật thông tin tài sản",
          changedById: userId,
          snapshotData: JSON.parse(JSON.stringify(asset))
        }
      });

      return asset;
    });

    await logAudit("Assets", id, "UPDATE", null, updatedAsset, userId, req.ip);
    res.json({ message: "Cập nhật tài sản thành công", asset: updatedAsset });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật tài sản", error: error.message });
  }
};

export const deleteAsset = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.assets.update({
        where: { assetId: id },
        data: { isDeleted: true, status: "LIQUIDATED" }
      });

      await tx.assetHistory.create({
        data: {
          assetId: id,
          actionType: "DELETE",
          description: "Vô hiệu hóa (Xóa mềm) tài sản",
          changedById: userId
        }
      });
    });

    await logAudit("Assets", id, "DELETE", null, { isDeleted: true }, userId, req.ip);
    res.json({ message: "Xóa tài sản thành công" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa tài sản", error: error.message });
  }
};

// ==========================================
// 3. BÀN GIAO & TRẢ TÀI SẢN (ASSIGN / RETURN)
// ==========================================
export const assignAsset = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { assignedToId, note, conditionOut } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    const assignment = await prisma.$transaction(async (tx) => {
      const asset = await tx.assets.findUnique({ where: { assetId: id } });
      if (!asset || asset.status !== "AVAILABLE") throw new Error("Tài sản không ở trạng thái Sẵn sàng để bàn giao!");

      await tx.assets.update({ where: { assetId: id }, data: { status: "IN_USE" } });

      const newAssignment = await tx.assetAssignmentHistory.create({
        data: { assetId: id, assignedToId, assignedById: userId, conditionOut, note }
      });

      await tx.assetHistory.create({
        data: {
          assetId: id, actionType: "ASSIGN",
          description: `Bàn giao tài sản cho người dùng ID: ${assignedToId}`,
          changedById: userId
        }
      });

      return newAssignment;
    });

    await logAudit("AssetAssignment", assignment.assignmentId, "ASSIGN", null, assignment, userId, req.ip);
    res.json({ message: "Bàn giao tài sản thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi bàn giao tài sản", error: error.message });
  }
};

export const returnAsset = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { conditionIn, note } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    await prisma.$transaction(async (tx) => {
      const asset = await tx.assets.findUnique({ where: { assetId: id } });
      if (!asset || asset.status !== "IN_USE") throw new Error("Tài sản này không trong trạng thái Đang sử dụng!");

      // Tìm phiếu bàn giao gần nhất chưa trả
      const assignment = await tx.assetAssignmentHistory.findFirst({
        where: { assetId: id, returnedAt: null },
        orderBy: { assignedAt: 'desc' }
      });

      if (!assignment) throw new Error("Không tìm thấy dữ liệu bàn giao của tài sản này!");

      await tx.assetAssignmentHistory.update({
        where: { assignmentId: assignment.assignmentId },
        data: { returnedAt: new Date(), returnedById: userId, conditionIn, note }
      });

      await tx.assets.update({ where: { assetId: id }, data: { status: "AVAILABLE" } });

      await tx.assetHistory.create({
        data: { assetId: id, actionType: "RETURN", description: `Thu hồi tài sản về kho`, changedById: userId }
      });
    });

    res.json({ message: "Thu hồi tài sản thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi thu hồi tài sản", error: error.message });
  }
};

// ==========================================
// 4. QUẢN LÝ BẢO TRÌ (MAINTENANCE)
// ==========================================
export const logMaintenance = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { type, description, vendorId, cost, startDate, nextDueDate } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    await prisma.$transaction(async (tx) => {
      const maintenance = await tx.assetMaintenance.create({
        data: {
          assetId: id, type, description, vendorId, cost: Number(cost),
          startDate: new Date(startDate),
          nextDueDate: nextDueDate ? new Date(nextDueDate) : null
        }
      });

      await tx.assets.update({
        where: { assetId: id },
        data: { 
          status: "IN_MAINTENANCE",
          nextMaintenanceDate: nextDueDate ? new Date(nextDueDate) : undefined
        }
      });

      await tx.assetHistory.create({
        data: { assetId: id, actionType: "UPDATE", description: "Mang tài sản đi bảo trì", changedById: userId }
      });

      await logAudit("AssetMaintenance", maintenance.maintenanceId, "CREATE", null, maintenance, userId, req.ip);
    });
    res.json({ message: "Ghi nhận đi bảo trì thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi ghi nhận bảo trì", error: error.message });
  }
};

export const completeMaintenance = async (req: Request, res: Response): Promise<void> => {
  const { maintenanceId } = req.params;
  const { actualCost, note } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    await prisma.$transaction(async (tx) => {
      const maintenance = await tx.assetMaintenance.findUnique({ where: { maintenanceId } });
      if (!maintenance) throw new Error("Phiếu bảo trì không tồn tại!");
      if (maintenance.completedDate) throw new Error("Phiếu bảo trì này đã hoàn tất rồi!");

      await tx.assetMaintenance.update({
        where: { maintenanceId },
        data: {
          completedDate: new Date(),
          cost: actualCost !== undefined ? Number(actualCost) : maintenance.cost,
          description: note ? `${maintenance.description} | Note: ${note}` : maintenance.description
        }
      });

      // Trả tài sản về trạng thái AVAILABLE
      await tx.assets.update({
        where: { assetId: maintenance.assetId },
        data: { status: "AVAILABLE" }
      });

      await tx.assetHistory.create({
        data: { assetId: maintenance.assetId, actionType: "UPDATE", description: "Hoàn tất bảo trì, tài sản sẵn sàng", changedById: userId }
      });
    });
    res.json({ message: "Hoàn tất bảo trì thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi hoàn tất bảo trì", error: error.message });
  }
};

// ==========================================
// 5. ĐÁNH GIÁ LẠI & THANH LÝ (REVALUATION & LIQUIDATION)
// ==========================================
export const revaluateAsset = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { newValue, reason, date } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    await prisma.$transaction(async (tx) => {
      const asset = await tx.assets.findUnique({ where: { assetId: id } });
      if (!asset) throw new Error("Tài sản không tồn tại!");
      if (asset.status !== "AVAILABLE" && asset.status !== "IN_USE") throw new Error("Chỉ áp dụng cho tài sản Sẵn sàng hoặc Đang sử dụng!");

      const revalDate = date ? new Date(date) : new Date();

      await tx.assetRevaluation.create({
        data: { assetId: id, date: revalDate, oldValue: asset.currentValue, newValue: Number(newValue), reason }
      });

      await tx.assets.update({ where: { assetId: id }, data: { currentValue: Number(newValue) } });

      await tx.assetHistory.create({
        data: { assetId: id, actionType: "UPDATE", description: `Đánh giá lại tài sản (Giá mới: ${newValue})`, changedById: userId }
      });
    });
    res.json({ message: "Đánh giá lại tài sản thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi đánh giá lại tài sản", error: error.message });
  }
};

export const liquidateAsset = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { liquidationDate, reason, salePrice, buyerName, branchId, fiscalPeriodId } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    await prisma.$transaction(async (tx) => {
      const asset = await tx.assets.findUnique({ where: { assetId: id }, include: { category: true } });
      if (!asset) throw new Error("Tài sản không tồn tại");

      const saleAmt = Number(salePrice);
      const remainingVal = Number(asset.currentValue);
      const profitLoss = saleAmt - remainingVal;

      await tx.assetLiquidation.create({
        data: { assetId: id, liquidationDate: new Date(liquidationDate), reason, salePrice: saleAmt, buyerName, profitLoss }
      });

      await tx.assets.update({ where: { assetId: id }, data: { status: "LIQUIDATED", currentValue: 0 } });

      await tx.assetHistory.create({
        data: { assetId: id, actionType: "UPDATE", description: "Thanh lý tài sản", changedById: userId }
      });

      if (fiscalPeriodId) {
        await tx.journalEntry.create({
          data: {
            branchId, fiscalPeriodId, entryDate: new Date(liquidationDate),
            description: `Thanh lý tài sản ${asset.assetCode}. Lãi/Lỗ: ${profitLoss}`,
            createdById: userId, postingStatus: "POSTED"
          }
        });
      }
    });
    res.json({ message: "Thanh lý tài sản thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi thanh lý tài sản", error: error.message });
  }
};

// ==========================================
// 6. CHẠY KHẤU HAO (DEPRECIATION)
// ==========================================
export const runDepreciation = async (req: Request, res: Response): Promise<void> => {
  const { fiscalPeriodId, branchId } = req.body;
  const userId = (req as any).user?.userId || req.body.userId;

  try {
    await prisma.$transaction(async (tx) => {
      const period = await tx.fiscalPeriod.findUnique({ where: { periodId: fiscalPeriodId } });
      if (!period || period.isClosed) throw new Error("Kỳ kế toán không hợp lệ hoặc đã đóng!");

      const assets = await tx.assets.findMany({
        where: { isDeleted: false, status: { in: ["IN_USE", "AVAILABLE"] }, currentValue: { gt: 0 }, depreciationMonths: { gt: 0 } },
        include: { category: true }
      });

      let totalDepreciation = 0;

      for (const asset of assets) {
        const existingRecord = await tx.assetDepreciationHistory.findUnique({
          where: { assetId_fiscalPeriodId: { assetId: asset.assetId, fiscalPeriodId: fiscalPeriodId } }
        });
        if (existingRecord) continue;

        const depreciationAmt = Number(asset.purchasePrice) / Number(asset.depreciationMonths);
        let actualDeprAmt = depreciationAmt;
        let newCurrentValue = Number(asset.currentValue) - actualDeprAmt;

        if (newCurrentValue < 0) {
          actualDeprAmt = Number(asset.currentValue);
          newCurrentValue = 0;
        }

        totalDepreciation += actualDeprAmt;

        const deprHistory = await tx.assetDepreciationHistory.create({
          data: {
            assetId: asset.assetId, fiscalPeriodId: fiscalPeriodId,
            depreciationAmt: actualDeprAmt, accumulatedAmt: Number(asset.purchasePrice) - newCurrentValue,
            remainingValue: newCurrentValue
          }
        });

        await tx.assets.update({ where: { assetId: asset.assetId }, data: { currentValue: newCurrentValue } });

        const deprAcc = asset.category.depreciationAccountId;
        const accumAcc = asset.category.accumDepreciationAccountId;

        if (deprAcc && accumAcc) {
          const journal = await tx.journalEntry.create({
            data: {
              branchId: branchId, fiscalPeriodId: fiscalPeriodId, entryDate: new Date(),
              description: `Khấu hao tài sản ${asset.assetCode} kỳ ${period.periodNumber}/${period.fiscalYearId}`,
              createdById: userId, postingStatus: "POSTED"
            }
          });

          await tx.journalLine.createMany({
            data: [
              { journalId: journal.journalId, accountId: deprAcc, debit: actualDeprAmt, credit: 0 },
              { journalId: journal.journalId, accountId: accumAcc, debit: 0, credit: actualDeprAmt }
            ]
          });

          await tx.assetDepreciationHistory.update({ where: { historyId: deprHistory.historyId }, data: { journalEntryId: journal.journalId } });
        }
      }
    });
    res.json({ message: "Chạy khấu hao định kỳ và hạch toán thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi chạy khấu hao", error: error.message });
  }
};

// ==========================================
// 7. LỊCH SỬ TÀI SẢN & PHÊ DUYỆT (HISTORY & APPROVAL)
// ==========================================
export const getAssetHistory = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const asset = await prisma.assets.findUnique({
      where: { assetId: id },
      include: {
        histories: { orderBy: { timestamp: 'desc' } }, // Gọi lịch sử AssetHistory mới
        assignments: { orderBy: { assignedAt: 'desc' }, include: { assignedTo: { select: { fullName: true } }, returnedBy: { select: { fullName: true } } } },
        maintenances: { orderBy: { startDate: 'desc' }, include: { vendor: { select: { name: true } } } }
      }
    });

    if (!asset) {
      res.status(404).json({ message: "Không tìm thấy tài sản!" });
      return;
    }

    res.json({
      histories: asset.histories,
      assignments: asset.assignments,
      maintenances: asset.maintenances
    });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất lịch sử tài sản", error: error.message });
  }
};

// Yêu cầu mua tài sản (Approval Request logic)
export const getAssetRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const requests = await prisma.approvalRequest.findMany({
      where: {
        workflow: { module: "ASSET_REQUEST" },
        ...(status && { status: status as any })
      },
      include: {
        requester: { select: { fullName: true, email: true } },
        workflow: true,
        logs: { include: { actioner: { select: { fullName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách yêu cầu tài sản", error: error.message });
  }
};

export const approveAssetRequest = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const actionerId = (req as any).user?.userId || req.body.actionerId;
  const { comments } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({ where: { requestId: id } });
      if (!request || request.status !== "PENDING") throw new Error("Yêu cầu không tồn tại hoặc đã xử lý!");

      await tx.approvalRequest.update({ where: { requestId: id }, data: { status: "APPROVED" } });
      await tx.approvalLog.create({
        data: { requestId: id, actionerId, action: "APPROVE", comments, stepOrder: request.currentStep }
      });
    });
    res.json({ message: "Phê duyệt thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi phê duyệt yêu cầu", error: error.message });
  }
};

export const rejectAssetRequest = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const actionerId = (req as any).user?.userId || req.body.actionerId;
  const { comments } = req.body;

  try {
    if (!comments) throw new Error("Bắt buộc nhập lý do từ chối!");
    await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({ where: { requestId: id } });
      if (!request || request.status !== "PENDING") throw new Error("Yêu cầu không hợp lệ!");

      await tx.approvalRequest.update({ where: { requestId: id }, data: { status: "REJECTED" } });
      await tx.approvalLog.create({
        data: { requestId: id, actionerId, action: "REJECT", comments, stepOrder: request.currentStep }
      });
    });
    res.json({ message: "Từ chối thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi từ chối yêu cầu", error: error.message });
  }
};