import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. LẤY DANH SÁCH TÀI SẢN (Dành cho trang Assets)
export const getAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const assets = await prisma.assets.findMany({
      orderBy: { purchaseDate: 'desc' },
    });

    const currentDate = new Date();

    const processedAssets = assets.map(asset => {
      let realCurrentValue = asset.currentValue;
      
      if (asset.depreciationMonths && asset.depreciationMonths > 0) {
        const monthsElapsed = (currentDate.getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        const depreciationPerMonth = asset.purchasePrice / asset.depreciationMonths;
        realCurrentValue = Math.max(0, asset.purchasePrice - (depreciationPerMonth * monthsElapsed));
      }

      const isMaintenanceOverdue = asset.nextMaintenance ? new Date(asset.nextMaintenance) < currentDate : false;

      return {
        ...asset,
        currentValue: realCurrentValue, 
        isMaintenanceOverdue            
      };
    });

    res.status(200).json(processedAssets);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách tài sản." });
  }
};

// 2. YÊU CẦU MUA/THÊM TÀI SẢN MỚI
export const createAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, purchaseDate, price, purchasePrice, currentValue, status, location, assignedTo, imageUrl, depreciationMonths, maintenanceCycle } = req.body;
    const finalPrice = price !== undefined ? price : purchasePrice;

    let nextMaintenance = null;
    if (maintenanceCycle && Number(maintenanceCycle) > 0) {
      nextMaintenance = new Date(purchaseDate);
      nextMaintenance.setMonth(nextMaintenance.getMonth() + Number(maintenanceCycle));
    }

    const request = await prisma.assetRequest.create({
      data: {
        requestType: "CREATE",
        name, category, assetStatus: status || "ACTIVE", location: location || null, assignedTo: assignedTo || null,
        purchaseDate: new Date(purchaseDate),
        purchasePrice: Number(finalPrice),
        currentValue: Number(currentValue !== undefined ? currentValue : finalPrice),
        imageUrl: imageUrl || null,
        depreciationMonths: depreciationMonths ? Number(depreciationMonths) : 0,
        maintenanceCycle: maintenanceCycle ? Number(maintenanceCycle) : 0,
        nextMaintenance
      },
    });
    res.status(201).json({ message: "Đã gửi phiếu yêu cầu Mua tài sản!", request });
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi tạo yêu cầu.", error: error.message });
  }
};

// 3. YÊU CẦU CẬP NHẬT / BÀN GIAO TÀI SẢN
export const updateAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, category, status, location, assignedTo, currentValue, imageUrl, depreciationMonths, maintenanceCycle } = req.body;

    const request = await prisma.assetRequest.create({
      data: {
        requestType: "UPDATE",
        assetId: id,
        name, category, assetStatus: status, location, assignedTo,
        currentValue: currentValue !== undefined ? Number(currentValue) : undefined,
        imageUrl,
        depreciationMonths: depreciationMonths !== undefined ? Number(depreciationMonths) : undefined,
        maintenanceCycle: maintenanceCycle !== undefined ? Number(maintenanceCycle) : undefined,
      }
    });
    res.status(200).json({ message: "Đã gửi phiếu yêu cầu Cập nhật/Bàn giao!", request });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo yêu cầu." });
  }
};

// 4. YÊU CẦU XÓA / THANH LÝ TÀI SẢN
export const deleteAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.assetRequest.create({
      data: { requestType: "DELETE", assetId: id }
    });
    res.status(200).json({ message: "Đã gửi phiếu yêu cầu Thanh lý tài sản!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo yêu cầu." });
  }
};

// 5. LẤY DANH SÁCH PHIẾU YÊU CẦU
export const getAssetRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await prisma.assetRequest.findMany({
      include: { asset: true },
      orderBy: { timestamp: 'desc' }
    });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách yêu cầu tài sản" });
  }
};

// 6. QUẢN LÝ BẤM DUYỆT (ĐÃ FIX LỖI LOGIC)
export const approveAssetRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    const approverName = approvedBy || "Giám Đốc";

    await prisma.$transaction(async (tx) => {
      const request = await tx.assetRequest.findUnique({ where: { requestId: id } });
      if (!request || request.status !== "PENDING") throw new Error("Yêu cầu không hợp lệ!");

      if (request.requestType === "CREATE") {
        const newAsset = await tx.assets.create({
          data: {
            name: request.name!, category: request.category!, status: request.assetStatus!,
            location: request.location, assignedTo: request.assignedTo,
            purchaseDate: request.purchaseDate!, purchasePrice: request.purchasePrice!, currentValue: request.currentValue!,
            imageUrl: request.imageUrl,
            depreciationMonths: request.depreciationMonths,
            maintenanceCycle: request.maintenanceCycle,
            nextMaintenance: request.nextMaintenance
          }
        });
        
        await tx.assetHistory.create({
          data: {
            assetId: newAsset.assetId,
            actionType: "CREATED",
            description: `Nhập mới tài sản. Phân loại: ${newAsset.category}, Nguyên giá: $${newAsset.purchasePrice}`,
            changedBy: approverName
          }
        });
      } 
      else if (request.requestType === "UPDATE" && request.assetId) {
        const updateData: any = {};
        let actionStr = "UPDATED";
        let descStr = "Cập nhật thông tin tài sản định kỳ.";

        // ĐÃ FIX: Nhận toàn bộ các thay đổi độc lập nhau
        if (request.name !== null) updateData.name = request.name;
        if (request.category !== null) updateData.category = request.category;
        if (request.location !== null) updateData.location = request.location;
        if (request.currentValue !== null) updateData.currentValue = request.currentValue;
        if (request.imageUrl !== null) updateData.imageUrl = request.imageUrl;
        if (request.depreciationMonths !== null) updateData.depreciationMonths = request.depreciationMonths;
        if (request.maintenanceCycle !== null) updateData.maintenanceCycle = request.maintenanceCycle;
        if (request.assignedTo !== null) updateData.assignedTo = request.assignedTo;
        if (request.assetStatus !== null) updateData.status = request.assetStatus;

        // Ưu tiên xác định Log theo hành động quan trọng nhất
        if (request.assetStatus === "Hỏng hóc") {
          actionStr = "BROKEN"; descStr = "Báo hỏng / Chờ thanh lý.";
        } else if (request.assetStatus === "Đang bảo trì") {
          actionStr = "MAINTENANCE"; descStr = "Đưa vào bảo trì / Sửa chữa.";
        } else if (request.assignedTo && request.assignedTo.trim() !== "") {
          actionStr = "HANDOVER"; descStr = `Bàn giao tài sản cho: ${request.assignedTo}`;
        } else if (request.assignedTo === "") {
          actionStr = "RETURNED"; descStr = "Thu hồi tài sản về Kho (Không ai sử dụng).";
        }

        await tx.assets.update({ where: { assetId: request.assetId }, data: updateData });

        await tx.assetHistory.create({
          data: { assetId: request.assetId, actionType: actionStr, description: descStr, changedBy: approverName }
        });
      }
      else if (request.requestType === "DELETE" && request.assetId) {
        await tx.assets.delete({ where: { assetId: request.assetId } });
      }

      await tx.assetRequest.update({
        where: { requestId: id },
        data: { status: "APPROVED", approvedBy: approverName, approvedAt: new Date() }
      });
    });

    res.status(200).json({ message: "Đã duyệt phiếu tài sản!" });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Lỗi khi duyệt" });
  }
};

// 7. QUẢN LÝ BẤM TỪ CHỐI
export const rejectAssetRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    await prisma.assetRequest.update({
      where: { requestId: id },
      data: { status: "REJECTED", approvedBy: approvedBy || "Giám Đốc", approvedAt: new Date() }
    });

    res.status(200).json({ message: "Đã từ chối phiếu!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi từ chối" });
  }
};

// 8. LẤY NHẬT KÝ VÒNG ĐỜI
export const getAssetHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const history = await prisma.assetHistory.findMany({
      where: { assetId: id },
      orderBy: { timestamp: 'desc' }
    });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy lịch sử tài sản." });
  }
};