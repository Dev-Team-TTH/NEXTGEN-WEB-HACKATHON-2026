import { useState } from "react";
import { Message, MessageAction } from "./types";

export function useChatLogic() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Xin chào! Tôi là TTH AI Core. Tôi đã được kết nối với toàn bộ cơ sở dữ liệu của doanh nghiệp. Bạn cần tôi báo cáo doanh thu, kiểm tra kho hay tra cứu mã chứng từ nào?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // ==========================================
  // BỘ MÁY XỬ LÝ NGÔN NGỮ TỰ NHIÊN (NLP ENGINE)
  // Phân tích Intent (Ý định) và Entity (Thực thể)
  // ==========================================
  const generateIntelligentResponse = (query: string): { text: string; actions?: MessageAction[] } => {
    const textLower = query.toLowerCase();

    // 1. Intent: Tra cứu chứng từ cụ thể (Trích xuất bằng Regex)
    // Bắt các mã như PNK-001, SO-2023, PRD-999
    const documentRegex = /[a-z]{2,3}-\d{3,}/i; 
    const foundDoc = query.match(documentRegex);
    if (foundDoc) {
      const docId = foundDoc[0].toUpperCase();
      return {
        text: `Hệ thống đã tìm thấy chứng từ **${docId}**. Trạng thái hiện tại: "Đang chờ xử lý". Bạn có muốn xem chi tiết hoặc thực hiện phê duyệt không?`,
        actions: [
          { label: "Xem chi tiết chứng từ", path: `/transactions/${docId}` },
          { label: "Chuyển đến Phê duyệt", path: `/approvals` }
        ]
      };
    }

    // 2. Intent: Báo cáo Tài chính / Doanh thu
    if (textLower.includes("doanh thu") || textLower.includes("tài chính") || textLower.includes("lợi nhuận") || textLower.includes("tiền")) {
      return {
        text: "📊 **Báo cáo Tài chính Nhanh:**\n- Tổng doanh thu tháng này: **1,250,000,000 VNĐ** (Tăng 15% so với kỳ trước).\n- Dòng tiền thuần (Cashflow) đang dương. Đóng góp lớn nhất đến từ mảng Bán lẻ thiết bị CNTT.",
        actions: [
          { label: "Xem Báo cáo Lưu chuyển tiền tệ", path: "/accounting/reports/Cashflow" },
          { label: "Xem Bảng cân đối", path: "/accounting/reports/TrialBalance" }
        ]
      };
    }

    // 3. Intent: Kiểm tra Tồn kho / Cảnh báo
    if (textLower.includes("kho") || textLower.includes("tồn") || textLower.includes("hết") || textLower.includes("vật tư")) {
      return {
        text: "⚠️ **Cảnh báo Tồn kho:** Hiện có **2 mã vật tư** đang rớt xuống dưới định mức an toàn (Minimum Stock):\n\n1. `PRD-CPU01` - Intel Core i9 (Còn: 2)\n2. `PRD-RAM02` - RAM 32GB DDR5 (Còn: 5)\n\nBạn có muốn tự động lập Phiếu Yêu cầu Mua hàng (PR) cho 2 mã này không?",
        actions: [
          { label: "Quản lý Danh mục Vật tư", path: "/inventory" }
        ]
      };
    }

    // 4. Intent: Phê duyệt (Approvals)
    if (textLower.includes("duyệt") || textLower.includes("trình") || textLower.includes("chờ")) {
      return {
        text: "🔔 **Trung tâm Phê duyệt:** Hiện có **5 tờ trình** đang nằm trong hộp thư của bạn. Trong đó có 2 phiếu yêu cầu thanh toán cần duyệt gấp trong hôm nay.",
        actions: [
          { label: "Đi tới Bàn làm việc", path: "/approvals" }
        ]
      };
    }

    // 5. Intent: Nhân sự / Tài khoản
    if (textLower.includes("nhân sự") || textLower.includes("tài khoản") || textLower.includes("quyền") || textLower.includes("phòng ban")) {
      return {
        text: "👥 **Quản trị Tổ chức:** Module Nhân sự cho phép bạn quản lý cấu trúc sơ đồ tổ chức, phân quyền RBAC và kiểm tra Audit Log (Lịch sử thao tác).",
        actions: [
          { label: "Sơ đồ Tổ chức", path: "/users" }
        ]
      };
    }

    // Fallback: Default Response
    return {
      text: "Tôi đã ghi nhận dữ liệu: *" + query + "*. Tuy nhiên, ngữ cảnh này chưa đủ để tôi xuất báo cáo. Hãy cung cấp thêm thông tin chi tiết (VD: 'Báo cáo doanh thu', 'Kiểm tra tồn kho', hoặc kèm mã chứng từ)."
    };
  };

  // ==========================================
  // HÀM XỬ LÝ GỬI TIN NHẮN (MESSAGE HANDLER)
  // ==========================================
  const handleSendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || inputValue;
    if (!textToSend.trim()) return;

    // 1. Hiển thị tin nhắn của User
    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    setIsTyping(true);

    // 2. KÍCH HOẠT TRÍ TUỆ NHÂN TẠO (AI PROCESSING)
    // ----------------------------------------------------
    // TODO: (PRODUCTION READY) Cắm API OpenAI/Gemini tại đây
    // try {
    //   const response = await fetch("https://api.openai.com/v1/chat/completions", { ... });
    //   const data = await response.json();
    //   aiText = data.choices[0].message.content;
    // } catch (e) { ... }
    // ----------------------------------------------------

    // Sử dụng thuật toán AI Simulator Local để xử lý độ trễ
    setTimeout(() => {
      const { text, actions } = generateIntelligentResponse(textToSend);

      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: text,
        actions: actions,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newAiMsg]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800); // Random delay 1.2s - 2.0s tạo cảm giác AI đang suy nghĩ thực sự
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      sender: 'ai',
      text: 'Đã dọn dẹp bộ nhớ ngữ cảnh. Băng thông dữ liệu đã sẵn sàng. Chúng ta tiếp tục nhé!',
      timestamp: new Date()
    }]);
  };

  return {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    handleSendMessage,
    clearChat
  };
}