import { Request, Response } from "express";
import { ApprovalStatus, TransactionStatus, ActionType } from "@prisma/client";
import prisma from "../prismaClient";
import { logAudit } from "../utils/auditLogger";

// Hàm Helper trích xuất userId an toàn
const getUserId = (req: Request) => (req as any).user?.userId || req.body.userId;

// ==========================================
// 1. GỬI YÊU CẦU PHÊ DUYỆT (SUBMIT FOR APPROVAL)
// ==========================================
export const submitForApproval = async (req: Request, res: Response): Promise<void> => {
  const { documentId, comment } = req.body;
  const userId = getUserId(req);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra Chứng từ
      const doc = await tx.document.findUnique({ where: { documentId } });
      if (!doc) throw new Error("Không tìm thấy chứng từ!");
      if (doc.status !== TransactionStatus.DRAFT && doc.status !== TransactionStatus.REJECTED) {
        throw new Error("Chỉ có thể gửi duyệt các chứng từ đang ở trạng thái Nháp (DRAFT) hoặc Bị từ chối (REJECTED)!");
      }

      // 2. Tìm Quy trình duyệt (Workflow) tương ứng với Loại chứng từ
      const workflow = await tx.approvalWorkflow.findFirst({
        where: { 
          module: doc.type, 
          isActive: true 
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } }
      });

      if (!workflow || workflow.steps.length === 0) {
        throw new Error(`Chưa có Quy trình phê duyệt nào được kích hoạt cho loại chứng từ [${doc.type}]. Vui lòng liên hệ Admin!`);
      }

      // 3. Tạo Yêu cầu phê duyệt
      const request = await tx.approvalRequest.create({
        data: {
          workflowId: workflow.workflowId,
          documentId: doc.documentId,
          requesterId: userId,
          status: ApprovalStatus.PENDING,
          currentStep: 1, 
          requestSnapshot: JSON.parse(JSON.stringify(doc)) 
        }
      });

      // 4. Cập nhật trạng thái chứng từ thành Chờ duyệt
      await tx.document.update({
        where: { documentId: doc.documentId },
        data: { status: TransactionStatus.PENDING_APPROVAL }
      });

      // 5. Ghi log khởi tạo
      await tx.approvalLog.create({
        data: {
          requestId: request.requestId,
          actionerId: userId,
          action: ActionType.SUBMIT,
          comments: comment || "Trình duyệt chứng từ", 
          stepOrder: 0
        }
      });

      return request;
    });

    await logAudit("ApprovalRequest", result.requestId, ActionType.CREATE, null, result, userId, req.ip);
    res.status(201).json({ message: "Đã gửi yêu cầu phê duyệt thành công!", request: result });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi gửi yêu cầu phê duyệt", error: error.message });
  }
};

// ==========================================
// 2. LẤY DANH SÁCH YÊU CẦU CẦN TÔI DUYỆT (PENDING APPROVALS)
// ==========================================
export const getPendingApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);

    // 🚀 NÂNG CẤP: Lấy roleId trực tiếp từ bảng Users (Quan hệ 1-1 mới)
    const currentUser = await prisma.users.findUnique({
      where: { userId },
      select: { roleId: true }
    });

    if (!currentUser || !currentUser.roleId) {
      res.json([]); // Nhân viên không có Role thì không có quyền duyệt gì cả
      return;
    }

    // 2. Tìm tất cả các cấu hình Bước duyệt mà Role này được gán
    const validSteps = await prisma.approvalStep.findMany({
      where: { roleId: currentUser.roleId },
      select: { workflowId: true, stepOrder: true }
    });

    if (validSteps.length === 0) {
      res.json([]);
      return;
    }

    // 3. Xây dựng mảng điều kiện OR
    const stepConditions = validSteps.map(step => ({
      workflowId: step.workflowId,
      currentStep: step.stepOrder
    }));

    // 4. Lấy danh sách cần duyệt
    const pendingRequests = await prisma.approvalRequest.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        OR: stepConditions
      },
      include: {
        document: { select: { documentNumber: true, type: true, totalAmount: true, createdAt: true } },
        workflow: { select: { name: true } },
        requester: { select: { fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(pendingRequests);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách chờ duyệt", error: error.message });
  }
};

// ==========================================
// 3. LẤY DANH SÁCH YÊU CẦU TÔI ĐÃ GỬI (MY REQUESTS)
// ==========================================
export const getMyRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);

    const myRequests = await prisma.approvalRequest.findMany({
      where: { requesterId: userId },
      include: {
        document: { select: { documentNumber: true, type: true, totalAmount: true } },
        workflow: { select: { name: true } },
        logs: { 
          orderBy: { createdAt: 'desc' }, 
          take: 1, // Lấy hành động mới nhất
          include: { actioner: { select: { fullName: true } } } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(myRequests);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách yêu cầu của bạn", error: error.message });
  }
};

// ==========================================
// 4. XEM CHI TIẾT 1 YÊU CẦU DUYỆT (GET BY ID)
// ==========================================
export const getApprovalById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const request = await prisma.approvalRequest.findUnique({
      where: { requestId: id },
      include: {
        document: { include: { transactions: { include: { product: true } }, taxes: true, landedCosts: true } },
        workflow: { include: { steps: { include: { role: { select: { roleName: true } } }, orderBy: { stepOrder: 'asc' } } } },
        requester: { select: { fullName: true, email: true } },
        logs: { 
          orderBy: { createdAt: 'desc' },
          include: { actioner: { select: { fullName: true, email: true } } }
        }
      }
    });

    if (!request) {
      res.status(404).json({ message: "Không tìm thấy Yêu cầu phê duyệt!" });
      return;
    }
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy chi tiết yêu cầu phê duyệt", error: error.message });
  }
};

// ==========================================
// 5. XỬ LÝ PHÊ DUYỆT / TỪ CHỐI (PROCESS APPROVAL)
// ==========================================
export const processApproval = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { action, comment } = req.body; 
  const actionerId = getUserId(req);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { requestId: id },
        include: { workflow: { include: { steps: { orderBy: { stepOrder: 'asc' } } } }, document: true }
      });

      if (!request) throw new Error("Yêu cầu phê duyệt không tồn tại!");
      if (request.status !== ApprovalStatus.PENDING) throw new Error("Yêu cầu này đã được xử lý trước đó (Không còn ở trạng thái PENDING)!");

      // 1. Kiểm tra quyền của người duyệt
      const currentStepDef = request.workflow?.steps.find(s => s.stepOrder === request.currentStep);
      if (!currentStepDef) throw new Error("Cấu hình bước duyệt bị lỗi hoặc không tồn tại!");

      // 🚀 NÂNG CẤP: Kiểm tra quyền trực tiếp qua roleId của Users
      const currentUser = await tx.users.findUnique({
        where: { userId: actionerId },
        select: { roleId: true }
      });

      if (!currentUser || currentUser.roleId !== currentStepDef.roleId) {
         throw new Error("Truy cập bị từ chối: Bạn không mang Vai trò (Role) được phép duyệt ở bước này!");
      }

      // ------------------------------------
      // LUỒNG 1: TỪ CHỐI (REJECT)
      // ------------------------------------
      if (action === "REJECT") {
        await tx.approvalRequest.update({
          where: { requestId: id },
          data: { status: ApprovalStatus.REJECTED }
        });

        if (request.documentId) {
          await tx.document.update({
            where: { documentId: request.documentId },
            data: { status: TransactionStatus.REJECTED }
          });
        }

        await tx.approvalLog.create({
          data: { requestId: id, actionerId, action: ActionType.REJECT, comments: comment || "Từ chối phê duyệt", stepOrder: request.currentStep } 
        });

        return { status: "REJECTED" };
      }

      // ------------------------------------
      // LUỒNG 2: CHẤP THUẬN (APPROVE)
      // ------------------------------------
      if (action === "APPROVE") {
        await tx.approvalLog.create({
          data: { requestId: id, actionerId, action: ActionType.APPROVE, comments: comment || "Đồng ý phê duyệt", stepOrder: request.currentStep } 
        });

        const totalSteps = request.workflow?.steps.length || 0;

        // Trường hợp A: Vẫn còn bước duyệt tiếp theo
        if (request.currentStep < totalSteps) {
          await tx.approvalRequest.update({
            where: { requestId: id },
            data: { currentStep: request.currentStep + 1 }
          });
          return { status: "PENDING_NEXT_STEP" };
        } 
        // Trường hợp B: ĐÂY LÀ BƯỚC CUỐI CÙNG
        else {
          await tx.approvalRequest.update({
            where: { requestId: id },
            data: { status: ApprovalStatus.APPROVED } 
          });

          if (request.documentId) {
            await tx.document.update({
              where: { documentId: request.documentId },
              data: { 
                status: TransactionStatus.COMPLETED, 
                approvedById: actionerId, 
                approvedAt: new Date(),
                isLocked: true 
              }
            });
          }
          return { status: "FULLY_APPROVED" };
        }
      }
      
      throw new Error("Hành động không hợp lệ (Chỉ chấp nhận 'APPROVE' hoặc 'REJECT')!");
    });

    await logAudit("ApprovalRequest", id, ActionType.UPDATE, null, result, actionerId, req.ip);
    res.json({ message: "Xử lý yêu cầu phê duyệt thành công!", result });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xử lý phê duyệt", error: error.message });
  }
};

// ==========================================
// 6. THU HỒI YÊU CẦU DUYỆT (CANCEL BY REQUESTER)
// ==========================================
export const cancelApprovalRequest = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = getUserId(req);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({ where: { requestId: id } });
      
      if (!request) throw new Error("Không tìm thấy yêu cầu phê duyệt!");
      if (request.requesterId !== userId) throw new Error("Bạn không có quyền thu hồi yêu cầu của người khác!");
      if (request.status !== ApprovalStatus.PENDING) {
        throw new Error("Chỉ có thể thu hồi yêu cầu khi nó đang chờ duyệt (PENDING)!");
      }

      const cancelledRequest = await tx.approvalRequest.update({
        where: { requestId: id },
        data: { status: ApprovalStatus.CANCELLED }
      });

      if (request.documentId) {
        await tx.document.update({
          where: { documentId: request.documentId },
          data: { status: TransactionStatus.DRAFT }
        });
      }

      await tx.approvalLog.create({
        data: { requestId: id, actionerId: userId, action: ActionType.CANCEL, comments: "Người tạo chủ động thu hồi", stepOrder: request.currentStep } 
      });

      return cancelledRequest;
    });

    await logAudit("ApprovalRequest", id, ActionType.UPDATE, null, result, userId, req.ip);
    res.json({ message: "Đã thu hồi yêu cầu phê duyệt! Chứng từ đã được mở khóa (DRAFT).", request: result });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi thu hồi yêu cầu phê duyệt", error: error.message });
  }
};