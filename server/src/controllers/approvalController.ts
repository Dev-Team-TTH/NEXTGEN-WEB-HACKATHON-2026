import { Request, Response } from "express";
import { PrismaClient, ApprovalStatus, TransactionStatus, ActionType } from "@prisma/client";
import { logAudit } from "../utils/auditLogger";

const prisma = new PrismaClient();

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

      // 2. Tìm Quy trình duyệt (Workflow) tương ứng với Loại chứng từ (Document Type)
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

      // 3. Tạo Yêu cầu phê duyệt (Approval Request)
      const request = await tx.approvalRequest.create({
        data: {
          workflowId: workflow.workflowId,
          documentId: doc.documentId,
          requesterId: userId,
          status: ApprovalStatus.PENDING,
          currentStep: 1, // Bắt đầu từ bước 1
          requestSnapshot: JSON.parse(JSON.stringify(doc)) // Lưu lại trạng thái dữ liệu lúc gửi
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
          action: "SUBMIT",
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

    // 1. Lấy danh sách các Role của User hiện tại
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      select: { roleId: true }
    });
    const roleIds = userRoles.map(ur => ur.roleId);

    if (roleIds.length === 0) {
      res.json([]);
      return;
    }

    // 2. Tối ưu Query: Tìm tất cả các cấu hình Bước duyệt (ApprovalStep) mà User có quyền xử lý
    const validSteps = await prisma.approvalStep.findMany({
      where: { roleId: { in: roleIds } },
      select: { workflowId: true, stepOrder: true }
    });

    if (validSteps.length === 0) {
      res.json([]);
      return;
    }

    // 3. Xây dựng mảng điều kiện OR: Yêu cầu phải thuộc Workflow đó VÀ đang dừng ở đúng Bước (stepOrder) đó
    const stepConditions = validSteps.map(step => ({
      workflowId: step.workflowId,
      currentStep: step.stepOrder
    }));

    // 4. Lấy danh sách Request đang chờ duyệt khớp với điều kiện trên
    const pendingRequests = await prisma.approvalRequest.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        OR: stepConditions
      },
      include: {
        document: { select: { documentNumber: true, type: true, totalAmount: true, createdAt: true } },
        requester: { select: { fullName: true, email: true } },
        workflow: { select: { name: true } } // Đã xóa trường description vì không tồn tại trong DB
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
        requester: { select: { fullName: true, email: true } },
        workflow: { include: { steps: { include: { role: { select: { roleName: true } } }, orderBy: { stepOrder: 'asc' } } } },
        logs: { include: { actioner: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' } }
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
  const { action, comment } = req.body; // action: 'APPROVE' | 'REJECT'
  const actionerId = getUserId(req);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { requestId: id },
        include: { workflow: { include: { steps: { orderBy: { stepOrder: 'asc' } } } }, document: true }
      });

      if (!request) throw new Error("Yêu cầu phê duyệt không tồn tại!");
      if (request.status !== ApprovalStatus.PENDING) throw new Error("Yêu cầu này đã được xử lý trước đó (Không còn ở trạng thái PENDING)!");

      // 1. Kiểm tra quyền của người duyệt (Có khớp Role của Step hiện tại không)
      const currentStepDef = request.workflow?.steps.find(s => s.stepOrder === request.currentStep);
      if (!currentStepDef) throw new Error("Cấu hình bước duyệt bị lỗi hoặc không tồn tại!");

      const hasRole = await tx.userRole.findFirst({
        where: { userId: actionerId, roleId: currentStepDef.roleId }
      });
      if (!hasRole) throw new Error("Truy cập bị từ chối: Bạn không mang Vai trò (Role) được phép duyệt ở bước này!");

      // ------------------------------------
      // LUỒNG 1: TỪ CHỐI (REJECT)
      // ------------------------------------
      if (action === "REJECT") {
        await tx.approvalRequest.update({
          where: { requestId: id },
          data: { status: ApprovalStatus.REJECTED }
        });

        if (request.documentId) {
          // Phiếu bị từ chối, trả về trạng thái REJECTED (Người tạo có thể sửa và Submit lại)
          await tx.document.update({
            where: { documentId: request.documentId },
            data: { status: TransactionStatus.REJECTED }
          });
        }

        await tx.approvalLog.create({
          data: { requestId: id, actionerId, action: "REJECT", comments: comment || "Từ chối phê duyệt", stepOrder: request.currentStep } 
        });

        return { status: "REJECTED" };
      }

      // ------------------------------------
      // LUỒNG 2: CHẤP THUẬN (APPROVE)
      // ------------------------------------
      if (action === "APPROVE") {
        await tx.approvalLog.create({
          data: { requestId: id, actionerId, action: "APPROVE", comments: comment || "Đồng ý phê duyệt", stepOrder: request.currentStep } 
        });

        const totalSteps = request.workflow?.steps.length || 0;

        // Trường hợp A: Vẫn còn bước duyệt tiếp theo (Ví dụ: Trưởng phòng duyệt xong -> Chuyển lên Giám đốc)
        if (request.currentStep < totalSteps) {
          await tx.approvalRequest.update({
            where: { requestId: id },
            data: { currentStep: request.currentStep + 1 } // Tăng stepOrder lên 1
          });
          return { status: "PENDING_NEXT_STEP" };
        } 
        
        // Trường hợp B: ĐÂY LÀ BƯỚC CUỐI CÙNG (Duyệt thành công toàn bộ)
        else {
          await tx.approvalRequest.update({
            where: { requestId: id },
            data: { status: ApprovalStatus.APPROVED } 
          });

          // Cập nhật trạng thái chứng từ gốc thành COMPLETED
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
            // Ghi chú: Nếu là phiếu kho, Frontend/Backend có thể tự động gọi tiếp API Ghi sổ kế toán ở transactionController
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

      // Hủy yêu cầu duyệt
      const cancelledRequest = await tx.approvalRequest.update({
        where: { requestId: id },
        data: { status: ApprovalStatus.CANCELLED }
      });

      // Mở khóa chứng từ, trả về trạng thái DRAFT để sửa
      if (request.documentId) {
        await tx.document.update({
          where: { documentId: request.documentId },
          data: { status: TransactionStatus.DRAFT }
        });
      }

      await tx.approvalLog.create({
        data: { requestId: id, actionerId: userId, action: "CANCEL", comments: "Người tạo chủ động thu hồi", stepOrder: request.currentStep } 
      });

      return cancelledRequest;
    });

    await logAudit("ApprovalRequest", id, ActionType.UPDATE, null, result, userId, req.ip);
    res.json({ message: "Đã thu hồi yêu cầu phê duyệt! Chứng từ đã được mở khóa (DRAFT).", request: result });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi thu hồi yêu cầu phê duyệt", error: error.message });
  }
};