import { Router } from "express";
import { 
  getDocuments, 
  getDocumentById, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  approveDocument 
} from "../controllers/transactionController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// BẮT BUỘC BẢO MẬT TOÀN BỘ ROUTE GIAO DỊCH
router.use(authenticateToken);

// ------------------------------------------------------------------
// API QUẢN LÝ CHỨNG TỪ (DOCUMENTS)
// ------------------------------------------------------------------
router.get("/", getDocuments);
router.get("/:id", getDocumentById);

router.post("/", createDocument);
router.put("/:id", updateDocument);
router.delete("/:id", deleteDocument);

// Route nghiệp vụ WMS & Kế toán Auto-GL
router.post("/:id/approve", approveDocument);

export default router;