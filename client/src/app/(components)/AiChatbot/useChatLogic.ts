import { useState } from "react";
import { Message } from "./types";
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG: Kéo Context từ Redux

const getAuthToken = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken") || "";
  }
  return "";
};

export function useChatLogic() {
  // 🚀 LÁ CHẮN BẢO VỆ NGỮ CẢNH: Lấy ID Chi nhánh hiện tại
  const activeBranchId = useAppSelector((state: any) => state.global?.activeBranchId);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Xin chào! Tôi là **TTH AI Core Agent**. Tôi đã được trang bị khả năng **Truy vấn Database trực tiếp**.\n\nHãy thử hỏi tôi: *"Có bao nhiêu tài sản cố định?"* hoặc *"Hệ thống có bao nhiêu tài khoản?"*',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const scrapePageContext = () => {
    if (typeof window === "undefined") return "";
    const currentPath = window.location.pathname;
    let visibleData = "";

    const dataTable = document.querySelector('table');
    let tableContext = "";
    if (dataTable) {
      const headers = Array.from(dataTable.querySelectorAll('th')).map(th => th.innerText.trim()).filter(text => text).join(' | ');
      const rows = Array.from(dataTable.querySelectorAll('tbody tr')).slice(0, 30).map(tr => {
        return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim()).join(' | ');
      });
      tableContext = `[CẤU TRÚC BẢNG TRÊN MÀN HÌNH]\nCác Cột: ${headers}\nDữ liệu (30 dòng đầu):\n${rows.join('\n')}\n\n`;
    }

    const mainContent = document.querySelector('main');
    let textContext = mainContent ? mainContent.innerText : document.body.innerText;
    textContext = textContext.replace(/\s+/g, ' ').trim();

    visibleData = (tableContext + textContext).substring(0, 6000);
    return JSON.stringify({ route: currentPath, screenData: visibleData });
  };

  const handleSendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || inputValue;
    if (!textToSend.trim()) return;

    const newUserMsg: Message = { id: Date.now().toString(), sender: 'user', text: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      // 🚀 FIX LỖI TOKEN OVERFLOW: Chỉ lấy tối đa 10 tin nhắn gần nhất để làm Context
      const historyPayload = messages
        .filter(m => m.id !== 'init-1' && !m.isError) 
        .slice(-10) 
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      const contextData = scrapePageContext();
      const token = getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';
      
      const response = await fetch(`${apiUrl}/chatbot/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: textToSend, 
          contextData: contextData,
          history: historyPayload,
          branchId: activeBranchId // 🚀 TIÊM NGỮ CẢNH: Giúp AI filter DB theo đúng Chi nhánh!
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Lỗi kết nối đến máy chủ AI");
      }

      // 🎯 DỮ LIỆU TỪ BACKEND ĐÃ LÀ 1 OBJECT CHUẨN
      const aiData = result.data;
      
      let aiText = "Tôi đã xử lý xong.";
      let aiActions = [];

      // Phân tách an toàn
      if (typeof aiData === "object" && aiData !== null) {
         aiText = aiData.reply || aiText;
         aiActions = aiData.actions || [];
      } else if (typeof aiData === "string") {
         aiText = aiData;
      }

      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiText,
        actions: aiActions,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newAiMsg]);

    } catch (error: any) {
      console.error("[Chatbot Error]:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `❌ **Lỗi Hệ Thống:** ${error.message || "Kết nối API thất bại."}\n\nVui lòng thử lại.`,
        isError: true,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([{ id: Date.now().toString(), sender: 'ai', text: '✨ Đã làm sạch bộ nhớ. Hãy ra lệnh mới cho tôi bằng văn bản hoặc giọng nói!', timestamp: new Date() }]);
  };

  return { messages, inputValue, setInputValue, isTyping, handleSendMessage, clearChat };
}