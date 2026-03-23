import { Response } from "express";
import { TransactionType, MovementDirection, TransactionStatus, ActionType } from "@prisma/client";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";
import { AuthRequest } from "../middleware/authMiddleware";

const getUserId = (req: AuthRequest) => req.user?.userId || req.body.userId;

// ==========================================
// 1. LẤY DANH SÁCH CHỨNG TỪ
// ==========================================
export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branchId, type, status, paymentStatus, startDate, endDate } = req.query;

    const whereCondition: any = {};
    if (branchId) whereCondition.branchId = String(branchId);
    if (type) whereCondition.type = type as TransactionType;
    if (status) whereCondition.status = status as TransactionStatus;
    if (paymentStatus) whereCondition.paymentStatus = paymentStatus;
    
    if (startDate || endDate) {
      whereCondition.createdAt = {};
      if (startDate) whereCondition.createdAt.gte = new Date(String(startDate));
      if (endDate) whereCondition.createdAt.lte = new Date(String(endDate));
    }

    const documents = await prisma.document.findMany({
      where: whereCondition,
      include: {
        supplier: { select: { name: true, code: true } },
        customer: { select: { name: true, code: true } },
        createdBy: { select: { fullName: true, email: true } },
        approvedBy: { select: { fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất danh sách chứng từ", error: error.message });
  }
};

export const getDocumentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findUnique({
      where: { documentId: id },
      include: {
        supplier: true,
        customer: true,
        transactions: {
          include: {
            product: { select: { productCode: true, name: true, uom: { select: { name: true } } } },
            variant: { select: { sku: true, attributes: true } },
            batch: { select: { batchNumber: true, expiryDate: true } },
            fromWarehouse: { select: { name: true } },
            fromBin: { select: { name: true } },
            toWarehouse: { select: { name: true } },
            toBin: { select: { name: true } }
          }
        },
        taxes: { include: { tax: true } },
        landedCosts: true,
        payments: true
      }
    });

    if (!document) {
      res.status(404).json({ message: "Không tìm thấy chứng từ!" });
      return;
    }
    res.json(document);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi truy xuất chi tiết chứng từ", error: error.message });
  }
};

// ==========================================
// 2. TẠO PHIẾU GIAO DỊCH
// ==========================================
export const createDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      documentNumber, branchId, type, note, supplierId, customerId, referenceDoc,
      currencyCode, exchangeRate, taxes, landedCosts, transactions
    } = req.body;
    const userId = getUserId(req);

    const productIds = transactions ? transactions.map((t: any) => t.productId) : [];
    const productsInfo = await prisma.products.findMany({
      where: { productId: { in: productIds } },
      include: { uomConversions: true }
    });

    const itemsTotal = transactions ? transactions.reduce((sum: number, tx: any) => sum + (Number(tx.quantity) * Number(tx.unitCost)), 0) : 0;
    
    // 🚀 BẢO VỆ DATABASE TẦNG 1: Gộp nhóm Thuế (Tax Grouping) chống lỗi Unique Constraint
    let taxesTotal = 0;
    const groupedTaxes: Record<string, number> = {};
    if (taxes && taxes.length > 0) {
      taxes.forEach((t: any) => {
        const amt = Number(t.taxAmount);
        groupedTaxes[t.taxId] = (groupedTaxes[t.taxId] || 0) + amt;
        taxesTotal += amt;
      });
    }

    const landedTotal = landedCosts ? landedCosts.reduce((sum: number, lc: any) => sum + Number(lc.amount), 0) : 0;
    const documentTotalAmount = itemsTotal + taxesTotal + landedTotal;

    const newDocument = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          documentNumber, branchId, type: type as TransactionType, 
          note, supplierId, customerId, referenceDoc,
          currencyCode: currencyCode || "VND",
          exchangeRate: Number(exchangeRate || 1.0),
          totalAmount: documentTotalAmount,
          createdById: userId,
          status: TransactionStatus.DRAFT,
          paymentStatus: "UNPAID",
          paidAmount: 0
        }
      });

      // 🚀 Thực thi tạo Thuế từ Object đã gộp nhóm an toàn
      const taxDataArray = Object.entries(groupedTaxes).map(([taxId, taxAmount]) => ({
        documentId: doc.documentId, taxId, taxAmount
      }));
      if (taxDataArray.length > 0) {
        await tx.documentTax.createMany({ data: taxDataArray });
      }

      if (landedCosts && landedCosts.length > 0) {
        await tx.landedCost.createMany({
          data: landedCosts.map((lc: any) => ({ documentId: doc.documentId, description: lc.description, amount: Number(lc.amount) }))
        });
      }

      if (transactions && transactions.length > 0) {
        const txData = transactions.map((t: any) => {
          let baseQuantity = Number(t.quantity);
          let baseUnitCost = Number(t.unitCost);

          if (t.uomId) {
            const product = productsInfo.find(p => p.productId === t.productId);
            if (product && product.uomId !== t.uomId) {
              const conversion = product.uomConversions.find(c => c.fromUomId === t.uomId && c.toUomId === product.uomId);
              if (conversion) {
                baseQuantity = baseQuantity * Number(conversion.conversionFactor);
                baseUnitCost = baseUnitCost / Number(conversion.conversionFactor);
              } else {
                const revConversion = product.uomConversions.find(c => c.toUomId === t.uomId && c.fromUomId === product.uomId);
                if (revConversion) {
                  baseQuantity = baseQuantity / Number(revConversion.conversionFactor);
                  baseUnitCost = baseUnitCost * Number(revConversion.conversionFactor);
                } else {
                  throw new Error(`Không tìm thấy hệ số quy đổi ĐVT hợp lệ cho sản phẩm [${product.name}].`);
                }
              }
            }
          }

          let movement: MovementDirection = MovementDirection.OUT;
          if (type === "PURCHASE_RECEIPT" || type === "RETURN" || type === "PURCHASE_ORDER") {
            movement = MovementDirection.IN;
          }

          return {
            documentId: doc.documentId,
            branchId,
            movementDirection: movement,
            fromWarehouseId: t.fromWarehouseId || null,
            toWarehouseId: t.toWarehouseId || null,
            fromBinId: t.fromBinId || null,
            toBinId: t.toBinId || null,
            productId: t.productId,
            variantId: t.variantId || null,
            batchId: t.batchId || null,
            quantity: baseQuantity,        
            unitCost: baseUnitCost,        
            totalCost: baseQuantity * baseUnitCost,
          };
        });

        await tx.inventoryTransaction.createMany({ data: txData });
      }
      return doc;
    });

    await logAudit("Document", newDocument.documentId, ActionType.CREATE, null, newDocument, userId, req.ip);
    res.status(201).json(newDocument);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi tạo Phiếu giao dịch", error: error.message });
  }
};

// ==========================================
// 3. CẬP NHẬT CHỨNG TỪ
// ==========================================
export const updateDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { note, supplierId, customerId, referenceDoc, currencyCode, exchangeRate, transactions, taxes, landedCosts } = req.body;
  const userId = getUserId(req);

  try {
    const productIds = transactions ? transactions.map((t: any) => t.productId) : [];
    const productsInfo = await prisma.products.findMany({
      where: { productId: { in: productIds } },
      include: { uomConversions: true }
    });

    const updatedDocument = await prisma.$transaction(async (tx) => {
      const existingDoc = await tx.document.findUnique({ where: { documentId: id } });
      if (!existingDoc) throw new Error("Không tìm thấy chứng từ!");
      
      if (existingDoc.status !== TransactionStatus.DRAFT) {
        throw new Error("Chỉ có thể sửa chứng từ khi đang ở trạng thái Nháp (DRAFT)!");
      }

      await tx.inventoryTransaction.deleteMany({ where: { documentId: id } });
      await tx.documentTax.deleteMany({ where: { documentId: id } });
      await tx.landedCost.deleteMany({ where: { documentId: id } });

      const itemsTotal = transactions ? transactions.reduce((sum: number, tx: any) => sum + (Number(tx.quantity) * Number(tx.unitCost)), 0) : 0;
      
      // 🚀 BẢO VỆ DATABASE TẦNG 2: Gộp nhóm Thuế khi Update
      let taxesTotal = 0;
      const groupedTaxes: Record<string, number> = {};
      if (taxes && taxes.length > 0) {
        taxes.forEach((t: any) => {
          const amt = Number(t.taxAmount);
          groupedTaxes[t.taxId] = (groupedTaxes[t.taxId] || 0) + amt;
          taxesTotal += amt;
        });
      }

      const landedTotal = landedCosts ? landedCosts.reduce((sum: number, lc: any) => sum + Number(lc.amount), 0) : 0;
      const newTotalAmount = itemsTotal + taxesTotal + landedTotal;

      const taxDataArray = Object.entries(groupedTaxes).map(([taxId, taxAmount]) => ({
        documentId: id, taxId, taxAmount
      }));
      if (taxDataArray.length > 0) {
        await tx.documentTax.createMany({ data: taxDataArray });
      }

      if (landedCosts && landedCosts.length > 0) {
        await tx.landedCost.createMany({ data: landedCosts.map((lc: any) => ({ documentId: id, description: lc.description, amount: Number(lc.amount) })) });
      }

      if (transactions && transactions.length > 0) {
        const txData = transactions.map((t: any) => {
          let baseQuantity = Number(t.quantity);
          let baseUnitCost = Number(t.unitCost);

          if (t.uomId) {
            const product = productsInfo.find(p => p.productId === t.productId);
            if (product && product.uomId !== t.uomId) {
              const conversion = product.uomConversions.find(c => c.fromUomId === t.uomId && c.toUomId === product.uomId);
              if (conversion) {
                baseQuantity = baseQuantity * Number(conversion.conversionFactor);
                baseUnitCost = baseUnitCost / Number(conversion.conversionFactor);
              } else {
                const revConversion = product.uomConversions.find(c => c.toUomId === t.uomId && c.fromUomId === product.uomId);
                if (revConversion) {
                  baseQuantity = baseQuantity / Number(revConversion.conversionFactor);
                  baseUnitCost = baseUnitCost * Number(revConversion.conversionFactor);
                } else {
                  throw new Error(`Không tìm thấy hệ số quy đổi ĐVT hợp lệ cho sản phẩm [${product.name}]`);
                }
              }
            }
          }

          let movement: MovementDirection = MovementDirection.OUT;
          if (existingDoc.type === "PURCHASE_RECEIPT" || existingDoc.type === "RETURN" || existingDoc.type === "PURCHASE_ORDER") {
            movement = MovementDirection.IN;
          }
          return {
            documentId: id, branchId: existingDoc.branchId, movementDirection: movement,
            fromWarehouseId: t.fromWarehouseId || null, toWarehouseId: t.toWarehouseId || null,
            fromBinId: t.fromBinId || null, toBinId: t.toBinId || null,
            productId: t.productId, variantId: t.variantId || null, batchId: t.batchId || null,
            quantity: baseQuantity, unitCost: baseUnitCost, totalCost: baseQuantity * baseUnitCost
          };
        });

        await tx.inventoryTransaction.createMany({ data: txData });
      }

      return await tx.document.update({
        where: { documentId: id },
        data: {
          note, supplierId, customerId, referenceDoc,
          currencyCode: currencyCode || existingDoc.currencyCode,
          exchangeRate: exchangeRate ? Number(exchangeRate) : existingDoc.exchangeRate,
          totalAmount: newTotalAmount,
          status: TransactionStatus.DRAFT 
        }
      });
    });

    await logAudit("Document", id, ActionType.UPDATE, null, updatedDocument, userId, req.ip);
    res.json({ message: "Cập nhật chứng từ thành công!", document: updatedDocument });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật chứng từ", error: error.message });
  }
};

// ==========================================
// 4. HỦY CHỨNG TỪ 
// ==========================================
export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    await prisma.$transaction(async (tx) => {
      const existingDoc = await tx.document.findUnique({ where: { documentId: id } });
      if (!existingDoc) throw new Error("Không tìm thấy chứng từ!");

      if (existingDoc.status === TransactionStatus.COMPLETED) {
        throw new Error("Chứng từ đã Hoàn tất, không thể xóa!");
      }

      await tx.document.update({
        where: { documentId: id },
        data: { status: TransactionStatus.CANCELLED, isLocked: true }
      });
      
      await tx.approvalRequest.updateMany({
        where: { documentId: id, status: "PENDING" },
        data: { status: "CANCELLED" }
      });
    });

    await logAudit("Document", id, ActionType.UPDATE, { status: TransactionStatus.DRAFT }, { status: TransactionStatus.CANCELLED }, userId, req.ip);
    res.json({ message: "Đã hủy chứng từ thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi hủy chứng từ", error: error.message });
  }
};

// ==========================================
// 5. PHÊ DUYỆT PHIẾU KHO & GHI SỔ (APPROVE, ALLOCATE & POSTING)
// ==========================================
export const approveDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { fiscalPeriodId } = req.body;
  const userId = getUserId(req);

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({
        where: { documentId: id },
        include: { transactions: { include: { product: { include: { category: true } } } } }
      });

      if (!doc) throw new Error("Không tìm thấy chứng từ!");
      if (doc.status !== TransactionStatus.DRAFT && doc.status !== TransactionStatus.PENDING_APPROVAL) {
        throw new Error("Chỉ được duyệt chứng từ ở trạng thái Nháp hoặc Chờ duyệt!");
      }

      // ==============================================================
      // LUỒNG 1: ĐƠN ĐẶT HÀNG MUA (PO)
      // ==============================================================
      if (doc.type === "PURCHASE_ORDER") {
        const finalizedDoc = await tx.document.update({
          where: { documentId: id },
          data: {
            status: TransactionStatus.COMPLETED,
            approvedById: userId, approvedAt: new Date(),
            isLocked: true,
            documentSnapshot: JSON.parse(JSON.stringify(doc))
          }
        });
        await logAudit("Document", id, ActionType.APPROVE, null, finalizedDoc, userId, req.ip);
        return; 
      }

      // ==============================================================
      // LUỒNG 2: ĐƠN BÁN HÀNG (SO) - GIỮ CHỖ TỒN KHO
      // ==============================================================
      if (doc.type === "SALES_ORDER") {
        for (const item of doc.transactions) {
          const targetWarehouseId = item.fromWarehouseId!;
          const targetBinId = item.fromBinId;

          const currentBalance = await tx.inventoryBalance.findUnique({
             where: {
              warehouseId_binId_productId_variantId_batchId: {
                warehouseId: targetWarehouseId, binId: targetBinId || "DEFAULT", 
                productId: item.productId, variantId: item.variantId || "DEFAULT", batchId: item.batchId || "DEFAULT"
              }
            }
          });

          const availableQty = (currentBalance?.quantity || 0) - (currentBalance?.lockedQty || 0);
          if (availableQty < item.quantity) {
            throw new Error(`Sản phẩm [${item.product.name}] không đủ tồn kho khả dụng để lập đơn bán! (Tồn khả dụng: ${availableQty})`);
          }

          await tx.inventoryBalance.upsert({
            where: {
              warehouseId_binId_productId_variantId_batchId: {
                warehouseId: targetWarehouseId, binId: targetBinId || "DEFAULT", 
                productId: item.productId, variantId: item.variantId || "DEFAULT", batchId: item.batchId || "DEFAULT"
              }
            },
            create: {
              warehouseId: targetWarehouseId, binId: targetBinId || "DEFAULT", 
              productId: item.productId, variantId: item.variantId || "DEFAULT", batchId: item.batchId || "DEFAULT",
              quantity: 0, lockedQty: item.quantity, avgCost: 0, totalValue: 0
            },
            update: { lockedQty: { increment: item.quantity } }
          });
        }

        const finalizedDoc = await tx.document.update({
          where: { documentId: id },
          data: {
            status: TransactionStatus.COMPLETED,
            approvedById: userId, approvedAt: new Date(),
            isLocked: true,
            documentSnapshot: JSON.parse(JSON.stringify(doc))
          }
        });
        await logAudit("Document", id, ActionType.APPROVE, null, finalizedDoc, userId, req.ip);
        return;
      }

      // ==============================================================
      // LUỒNG 3: PHIẾU XUẤT/NHẬP KHO THỰC TẾ (CÓ GHI SỔ KẾ TOÁN)
      // ==============================================================
      
      // 🚀 BẢO VỆ DATABASE TẦNG 3: Chặn đứt việc Giao dịch Kho mà không có Kỳ Kế Toán
      if (doc.type === "PURCHASE_RECEIPT" || doc.type === "SALES_ISSUE" || doc.type === "RETURN" || doc.type === "ADJUSTMENT") {
        if (!fiscalPeriodId) {
          throw new Error("LỖI KẾ TOÁN KÉP: Giao dịch làm thay đổi tồn kho bắt buộc phải cung cấp Kỳ Kế Toán (Fiscal Period) để hệ thống tự động ghi Sổ cái (Auto-GL).");
        }
      }

      if (fiscalPeriodId) {
        const period = await tx.fiscalPeriod.findUnique({ where: { periodId: fiscalPeriodId } });
        if (period?.isClosed) throw new Error("Kỳ kế toán này đã bị Khóa. Không thể ghi nhận giao dịch!");
      }

      const glGrouped: Record<string, { inventoryAccount: string, cogsAccount: string, totalAmount: number }> = {};

      const landedCosts = await tx.landedCost.findMany({ where: { documentId: id } });
      const totalLandedCost = landedCosts.reduce((sum, lc) => sum + Number(lc.amount), 0);
      
      const totalItemsValue = doc.transactions.reduce((sum, item) => {
        if (item.movementDirection === MovementDirection.IN) {
            return sum + (item.quantity * Number(item.unitCost));
        }
        return sum;
      }, 0);

      for (const item of doc.transactions) {
        const invAcc = item.product.category.inventoryAccountId;
        const cogsAcc = item.product.category.cogsAccountId;
        
        if (!invAcc || !cogsAcc) {
          throw new Error(`Sản phẩm ${item.product.name} chưa được cấu hình tài khoản kế toán trong Danh mục!`);
        }

        const targetWarehouseId = item.movementDirection === MovementDirection.IN ? item.toWarehouseId! : item.fromWarehouseId!;
        const targetBinId = item.movementDirection === MovementDirection.IN ? item.toBinId : item.fromBinId;

        const currentBalance = await tx.inventoryBalance.findUnique({
          where: {
            warehouseId_binId_productId_variantId_batchId: {
              warehouseId: targetWarehouseId, binId: targetBinId || "DEFAULT",
              productId: item.productId, variantId: item.variantId || "DEFAULT", batchId: item.batchId || "DEFAULT"
            }
          }
        });

        let finalNewQty = 0;
        let finalNewAvgCost = 0;
        let transactionTotalCost = 0;

        if (item.movementDirection === MovementDirection.OUT) {
          if (!currentBalance || currentBalance.quantity < item.quantity) {
            throw new Error(`Sản phẩm ${item.product.name} không đủ tồn kho để xuất! (Tồn thực tế: ${currentBalance?.quantity || 0})`);
          }

          const oldAvgCost = Number(currentBalance.avgCost);
          transactionTotalCost = item.quantity * oldAvgCost; 
          finalNewAvgCost = oldAvgCost;

          let lockedToDecrement = 0;
          if (doc.type === "SALES_ISSUE" || doc.type === "ADJUSTMENT") {
            lockedToDecrement = Math.min(currentBalance.lockedQty, item.quantity);
          }

          const updatedBal = await tx.inventoryBalance.update({
            where: {
              warehouseId_binId_productId_variantId_batchId: {
                warehouseId: targetWarehouseId, binId: targetBinId || "DEFAULT", 
                productId: item.productId, variantId: item.variantId || "DEFAULT", batchId: item.batchId || "DEFAULT"
              }
            },
            data: {
              quantity: { decrement: item.quantity },
              lockedQty: { decrement: lockedToDecrement },
              totalValue: { decrement: transactionTotalCost }
            }
          });

          if (updatedBal.quantity < 0) {
             throw new Error(`Phát hiện xâm lấn dữ liệu! Tồn kho ${item.product.name} bị thay đổi bởi giao dịch khác.`);
          }
          finalNewQty = updatedBal.quantity;

        } else if (item.movementDirection === MovementDirection.IN) {
          let baseItemTotalCost = item.quantity * Number(item.unitCost);
          let allocatedLandedCost = 0;

          if (totalItemsValue > 0 && totalLandedCost > 0) {
            const itemWeight = baseItemTotalCost / totalItemsValue;
            allocatedLandedCost = itemWeight * totalLandedCost;
          }

          transactionTotalCost = baseItemTotalCost + allocatedLandedCost;

          if (currentBalance) {
            const oldQty = currentBalance.quantity;
            const oldTotalValue = Number(currentBalance.totalValue);
            const newQty = oldQty + item.quantity;
            const newTotalValue = oldTotalValue + transactionTotalCost;
            finalNewAvgCost = newQty > 0 ? newTotalValue / newQty : 0; 

            const updatedBal = await tx.inventoryBalance.update({
              where: {
                warehouseId_binId_productId_variantId_batchId: {
                  warehouseId: targetWarehouseId, binId: targetBinId || "DEFAULT", 
                  productId: item.productId, variantId: item.variantId || "DEFAULT", batchId: item.batchId || "DEFAULT"
                }
              },
              data: {
                quantity: { increment: item.quantity },
                totalValue: { increment: transactionTotalCost },
                avgCost: finalNewAvgCost 
              }
            });
            finalNewQty = updatedBal.quantity;
          } else {
             finalNewQty = item.quantity;
             finalNewAvgCost = item.quantity > 0 ? transactionTotalCost / item.quantity : 0;

             await tx.inventoryBalance.create({
              data: {
                warehouseId: targetWarehouseId, binId: targetBinId || "DEFAULT", 
                productId: item.productId, variantId: item.variantId || "DEFAULT", batchId: item.batchId || "DEFAULT",
                quantity: finalNewQty, lockedQty: 0, avgCost: finalNewAvgCost, totalValue: transactionTotalCost
              }
            });
          }
        }

        await tx.inventoryTransaction.update({
          where: { transactionId: item.transactionId },
          data: { 
            quantityBefore: currentBalance ? currentBalance.quantity : 0, 
            quantityAfter: finalNewQty, 
            movingAvgCost: finalNewAvgCost, 
            totalCost: transactionTotalCost 
          }
        });

        const groupKey = `${invAcc}_${cogsAcc}`;
        if (!glGrouped[groupKey]) {
          glGrouped[groupKey] = { inventoryAccount: invAcc, cogsAccount: cogsAcc, totalAmount: 0 };
        }
        glGrouped[groupKey].totalAmount += transactionTotalCost;
      }
      
      if (totalLandedCost > 0) {
        await tx.landedCost.updateMany({
          where: { documentId: id },
          data: { isAllocated: true }
        });
      }

      // TỰ ĐỘNG GHI SỔ KẾ TOÁN (AUTO-GL) ĐẢM BẢO TOÀN VẸN 100%
      if (fiscalPeriodId && Object.keys(glGrouped).length > 0) {
        const journal = await tx.journalEntry.create({
          data: {
            branchId: doc.branchId, fiscalPeriodId, documentId: doc.documentId,
            entryDate: new Date(), description: `Hạch toán kho cho phiếu ${doc.documentNumber}`,
            createdById: userId, postingStatus: "POSTED"
          }
        });

        const journalLines = [];
        for (const key in glGrouped) {
          const group = glGrouped[key];
          if (doc.type === "PURCHASE_RECEIPT" || doc.type === "RETURN") {
            journalLines.push({ journalId: journal.journalId, accountId: group.inventoryAccount, debit: group.totalAmount, credit: 0 });
            journalLines.push({ journalId: journal.journalId, accountId: group.cogsAccount, debit: 0, credit: group.totalAmount });
          } else if (doc.type === "SALES_ISSUE") {
            journalLines.push({ journalId: journal.journalId, accountId: group.cogsAccount, debit: group.totalAmount, credit: 0 });
            journalLines.push({ journalId: journal.journalId, accountId: group.inventoryAccount, debit: 0, credit: group.totalAmount });
          }
        }

        if (journalLines.length > 0) await tx.journalLine.createMany({ data: journalLines });
        await tx.inventoryTransaction.updateMany({
          where: { documentId: doc.documentId },
          data: { journalEntryId: journal.journalId }
        });
      }

      const finalizedDoc = await tx.document.update({
        where: { documentId: id },
        data: {
          status: TransactionStatus.COMPLETED, approvedById: userId, approvedAt: new Date(),
          isLocked: true, fiscalPeriodId: fiscalPeriodId || null, documentSnapshot: JSON.parse(JSON.stringify(doc))
        }
      });

      await logAudit("Document", id, ActionType.APPROVE, null, finalizedDoc, userId, req.ip);
    });

    res.json({ message: "Phê duyệt chứng từ thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi phê duyệt chứng từ", error: error.message });
  }
};