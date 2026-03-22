import { Request, Response } from "express";
import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

import { AuthRequest } from "../middleware/authMiddleware";

dotenv.config();

const prisma = new PrismaClient();

export interface ChatRequestBody {
  message: string;
  contextData?: any;
  history?: { role: "user" | "model"; parts: { text: string }[] }[];
}

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ [Chatbot Warning]: Chưa cấu hình GEMINI_API_KEY.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

// ==========================================
// 1. CÔNG CỤ FUNCTION CALLING (TRUY VẤN DB TRỰC TIẾP)
// ==========================================
const erpTools: any = [{
  functionDeclarations: [
    {
      name: "query_database_count",
      description: "Truy vấn Database để đếm số lượng bản ghi thực tế. Gọi NGAY LẬP TỨC khi user hỏi 'Có bao nhiêu', 'Số lượng' về tài sản, hàng hoá, tài khoản, nhân sự, v.v.",
      parameters: {
        type: "OBJECT",
        properties: {
          table_name: {
            type: "STRING",
            description: "Từ khóa bảng. Trả về đúng 1 chữ tiếng Anh: 'asset', 'account', 'users', 'product', 'warehouse'."
          }
        },
        required: ["table_name"]
      }
    }
  ]
}];

// ==========================================
// 2. BỘ LỌC BẢO MẬT & HISTORY (TỐI ƯU TOKEN)
// ==========================================
const sanitizeAndLimitContext = (data: any): string => {
  if (!data) return "";
  let rawText = typeof data === 'string' ? data : JSON.stringify(data);
  if (rawText.length > 15000) rawText = rawText.substring(0, 15000) + '\n... [CẮT BỚT]';
  rawText = rawText.replace(/(0[3|5|7|8|9])+([0-9]{8})\b/g, (match) => "*******" + match.slice(-3));
  return rawText;
};

// Việc bỏ qua các phần tử không có 'text' ở đây vô tình tạo ra tính năng Token Saver rất tốt,
// giúp bỏ qua các khối functionCall/functionResponse phức tạp ở lượt trước, giữ ngữ cảnh nhẹ nhàng.
const sanitizeChatHistory = (history: any[] | undefined): Content[] => {
  if (!history || !Array.isArray(history) || history.length === 0) return [];
  const validHistory: Content[] = [];
  let expectedRole = "user"; 

  for (const item of history) {
    if (!item.role || !item.parts || !item.parts[0]?.text) continue;
    if (item.role === expectedRole) {
      validHistory.push({ role: item.role as "user" | "model", parts: [{ text: item.parts[0].text }] });
      expectedRole = expectedRole === "user" ? "model" : "user";
    }
  }
  if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === "user") validHistory.pop();
  return validHistory;
};

// ==========================================
// 3. KỶ LUẬT THÉP & KIẾN TRÚC TƯ DUY AI
// ==========================================
const ERP_SYSTEM_PROMPT = `
Bạn là "TTH AI Core Agent", một Trợ lý Quản trị Doanh nghiệp (ERP).

CÁC BƯỚC TƯ DUY BẮT BUỘC:
1. GỌI DATABASE: Nếu user hỏi "Có bao nhiêu...?", BẮT BUỘC gọi hàm 'query_database_count' để lấy số. KHÔNG ĐƯỢC tự ý trả lời là không có dữ liệu nếu chưa gọi hàm.
2. TRẢ LỜI SỐ LƯỢNG: Nếu kết quả hàm trả về = 0, hãy báo thân thiện: "Hệ thống hiện tại đang có 0 bản ghi. Bạn có thể truy cập trang tương ứng để tạo mới nhé!". 
3. ĐIỀU HƯỚNG TỰ ĐỘNG: LUÔN LUÔN tạo nút (action) dẫn user đến trang quản lý liên quan. (VD: Kế toán -> /accounting, Tài sản -> /assets, Kho -> /inventory, Nhân sự -> /users).

KIẾN TRÚC DỮ LIỆU ĐẦU RA:
Bạn đang hoạt động trong môi trường Native JSON Mode. BẮT BUỘC sinh ra cấu trúc Object JSON sau đây.
{
  "reply": "Nội dung trả lời của bạn. Dùng Markdown in đậm chữ quan trọng.",
  "actions": [
    { "label": "Tên nút", "path": "/duong-dan" }
  ]
}
`;

// ==========================================
// 4. MAIN CONTROLLER
// ==========================================
export const handleChatRequest = async (
  req: AuthRequest & Request<{}, any, ChatRequestBody>, 
  res: Response
): Promise<void> => {
  try {
    const { message, contextData, history } = req.body;

    if (!message) {
      res.status(400).json({ success: false, message: "Vui lòng nhập câu hỏi cho AI." });
      return;
    }

    const sanitizedContext = sanitizeAndLimitContext(contextData);
    const safeHistory = sanitizeChatHistory(history);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: ERP_SYSTEM_PROMPT,
      tools: erpTools,
      generationConfig: { 
        temperature: 0.1, 
        maxOutputTokens: 1024,
        responseMimeType: "application/json" // 🚀 SỬ DỤNG TÍNH NĂNG NATIVE JSON CỦA GOOGLE
      },
    });

    const chatSession = model.startChat({ history: safeHistory });

    const finalPrompt = `[NGỮ CẢNH MÀN HÌNH]:\n${sanitizedContext ? sanitizedContext : "Trống."}\n\n[USER]: ${message}`;

    let result = await chatSession.sendMessage(finalPrompt);

    // 🚀 KIỂM TRA & THỰC THI FUNCTION CALLING (Nếu có)
    const functionCalls = result.response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === "query_database_count") {
        const rawTable = (call.args as any).table_name || "";
        const t = rawTable.toLowerCase();
        let dbCount = 0;
        
        try {
          const getCount = async (models: string[]) => {
            for (const m of models) {
              if (typeof (prisma as any)[m]?.count === 'function') {
                return await (prisma as any)[m].count();
              }
            }
            throw new Error("Model không tồn tại.");
          };

          if (t.includes('asset') || t.includes('tài sản')) dbCount = await getCount(['asset', 'assets', 'Asset']);
          else if (t.includes('account') || t.includes('tài khoản')) dbCount = await getCount(['account', 'accounts', 'Account']);
          else if (t.includes('user') || t.includes('nhân')) dbCount = await getCount(['users', 'user', 'Users']);
          else if (t.includes('product') || t.includes('hàng') || t.includes('vật')) dbCount = await getCount(['product', 'products', 'Product']);
          else if (t.includes('warehouse') || t.includes('kho')) dbCount = await getCount(['warehouse', 'warehouses', 'Warehouse']);
          else dbCount = 0;

        } catch (e: any) {
          console.error("🔥 [LỖI ĐẾM DB]:", e.message);
          dbCount = 0; 
        }

        // Bơm kết quả vào Session, tự động kích hoạt lượt Generate thứ 2 (Và lượt này sẽ tuân thủ application/json)
        result = await chatSession.sendMessage([{
          functionResponse: {
            name: "query_database_count",
            response: { total_count: dbCount }
          }
        }]);
      }
    }

    // 🛡️ PARSE NATIVE JSON CHUẨN XÁC, TỪ BỎ REGEX
    const aiRawReply = result.response.text();
    let finalJson;
    
    try {
      finalJson = JSON.parse(aiRawReply);
    } catch (parseError) {
      console.error("🔥 [JSON Parse Error dù đã bật Native]:", parseError);
      finalJson = { reply: "Lỗi định dạng dữ liệu từ máy chủ AI.", actions: [] };
    }

    // ĐÓNG GÓI CHUẨN THÀNH OBJECT GỬI VỀ FRONTEND
    res.status(200).json({
      success: true,
      data: finalJson 
    });

  } catch (error: any) {
    console.error("🔥 [AI Core Error]:", error);
    
    // 🛡️ ĐÃ KHÔI PHỤC HỆ THỐNG BẮT LỖI (ERROR HANDLING) NHƯ YÊU CẦU
    const errorMessage = error?.message || "";
    
    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      res.status(429).json({ success: false, message: "Hệ thống AI đang quá tải hoặc hết hạn mức, vui lòng thử lại sau vài giây." });
      return;
    }
    
    if (errorMessage.includes("API key not valid")) {
      res.status(401).json({ success: false, message: "Key kết nối Gemini AI không hợp lệ. Vui lòng kiểm tra lại file .env." });
      return;
    }

    if (errorMessage.includes("roles must alternate")) {
      res.status(400).json({ success: false, message: "Lỗi đồng bộ lịch sử hội thoại. Vui lòng tải lại trang (F5) để bắt đầu phiên mới." });
      return;
    }

    res.status(500).json({ success: false, message: "Mất kết nối với lõi xử lý AI." });
  }
};