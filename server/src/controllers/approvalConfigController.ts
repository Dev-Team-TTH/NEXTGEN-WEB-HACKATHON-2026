import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../utils/auditLogger";

const prisma = new PrismaClient();

// ==========================================
// 1. LẤY DANH SÁCH QUY TRÌNH DUYỆT (GET ALL)
// ==========================================
export const getWorkflows = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, module } = req.query;
    
    const workflows = await prisma.approvalWorkflow.findMany({
      where: {
        ...(branchId && { branchId: String(branchId) }),
        ...(module && { module: String(module) })
      },
      include: {
        branch: { select: { name: true, code: true } },
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { role: { select: { roleName: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(workflows);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy danh sách Workflow", error: error.message });
  }
};

// ==========================================
// 2. LẤY CHI TIẾT MỘT QUY TRÌNH (GET BY ID)
// ==========================================
export const getWorkflowById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { workflowId: id },
      include: {
        branch: { select: { name: true, code: true } },
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { role: { select: { roleName: true, description: true } } }
        }
      }
    });

    if (!workflow) {
      res.status(404).json({ message: "Không tìm thấy Quy trình duyệt!" });
      return;
    }

    res.json(workflow);
  } catch (error: any) {
    res.status(500).json({ message: "Lỗi lấy chi tiết Workflow", error: error.message });
  }
};

// ==========================================
// 3. TẠO MỚI QUY TRÌNH DUYỆT & CÁC BƯỚC (CREATE)
// ==========================================
export const createWorkflow = async (req: Request, res: Response): Promise<void> => {
  const { branchId, module, name, steps, userId } = req.body;
  // steps có dạng: [{ stepOrder: 1, roleId: "..." }, { stepOrder: 2, roleId: "..." }]

  try {
    const newWorkflow = await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra xem module này ở branch này đã có workflow chưa (Tránh trùng lặp logic)
      const existing = await tx.approvalWorkflow.findFirst({
        where: { branchId: branchId || null, module }
      });
      if (existing) {
        throw new Error(`Chi nhánh này đã có quy trình duyệt cho nghiệp vụ ${module}! Vui lòng cập nhật quy trình cũ thay vì tạo mới.`);
      }

      // 2. Tạo Workflow Header
      const workflow = await tx.approvalWorkflow.create({
        data: { 
          branchId: branchId || null, 
          module, 
          name 
        }
      });

      // 3. Tạo các bước duyệt (Approval Steps)
      if (steps && steps.length > 0) {
        await tx.approvalStep.createMany({
          data: steps.map((s: any) => ({
            workflowId: workflow.workflowId,
            stepOrder: Number(s.stepOrder),
            roleId: s.roleId
          }))
        });
      }

      return workflow;
    });

    await logAudit("ApprovalWorkflow", newWorkflow.workflowId, "CREATE", null, newWorkflow, userId, req.ip);
    res.status(201).json({ message: "Tạo Quy trình duyệt thành công", workflow: newWorkflow });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi tạo Workflow", error: error.message });
  }
};

// ==========================================
// 4. CẬP NHẬT QUY TRÌNH DUYỆT (UPDATE WORKFLOW & STEPS)
// ==========================================
export const updateWorkflow = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { branchId, module, name, steps, userId } = req.body;

  try {
    const updatedWorkflow = await prisma.$transaction(async (tx) => {
      const oldWorkflow = await tx.approvalWorkflow.findUnique({ where: { workflowId: id } });
      if (!oldWorkflow) {
        throw new Error("Không tìm thấy Quy trình duyệt để cập nhật!");
      }

      // 1. Cập nhật thông tin Header
      const workflow = await tx.approvalWorkflow.update({
        where: { workflowId: id },
        data: {
          branchId: branchId !== undefined ? branchId : oldWorkflow.branchId,
          module: module || oldWorkflow.module,
          name: name || oldWorkflow.name
        }
      });

      // 2. Cập nhật lại các bước duyệt (Nếu client gửi danh sách steps mới)
      // Logic chuẩn nhất là Xóa toàn bộ step cũ và Insert lại step mới để đảm bảo tính thứ tự
      if (steps && Array.isArray(steps)) {
        await tx.approvalStep.deleteMany({ where: { workflowId: id } });
        
        if (steps.length > 0) {
          await tx.approvalStep.createMany({
            data: steps.map((s: any) => ({
              workflowId: id,
              stepOrder: Number(s.stepOrder),
              roleId: s.roleId
            }))
          });
        }
      }

      return workflow;
    });

    await logAudit("ApprovalWorkflow", id, "UPDATE", null, updatedWorkflow, userId, req.ip);
    res.json({ message: "Cập nhật Quy trình duyệt thành công!", workflow: updatedWorkflow });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi cập nhật Workflow", error: error.message });
  }
};

// ==========================================
// 5. XÓA QUY TRÌNH DUYỆT (DELETE)
// ==========================================
export const deleteWorkflow = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      // Kiểm tra xem có Request nào đang PENDING xài workflow này không
      const activeRequests = await tx.approvalRequest.findFirst({
        where: { workflowId: id, status: "PENDING" }
      });
      if (activeRequests) {
        throw new Error("Không thể xóa Quy trình này vì đang có chứng từ chờ duyệt sử dụng nó!");
      }

      // Prisma đã thiết lập onDelete: Cascade cho ApprovalStep nên chỉ cần xóa Header
      await tx.approvalWorkflow.delete({
        where: { workflowId: id }
      });
    });

    await logAudit("ApprovalWorkflow", id, "DELETE", null, { deleted: true }, userId, req.ip);
    res.json({ message: "Xóa Quy trình duyệt thành công!" });
  } catch (error: any) {
    res.status(400).json({ message: "Lỗi xóa Workflow", error: error.message });
  }
};