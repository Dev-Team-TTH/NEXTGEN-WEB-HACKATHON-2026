import { useState } from "react";
import { Message, MessageAction } from "./types";
import { useAppDispatch } from "@/app/redux";
import { api } from "@/state/api";
import { formatVND } from "@/utils/formatters";

export function useChatLogic() {
  const dispatch = useAppDispatch();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Xin chào! Tôi là TTH AI Core (Local Mode). Dữ liệu của bạn được bảo mật tuyệt đối 100% trên server nội bộ. \n\nTôi có thể giúp bạn truy xuất nhanh:\n- 📊 Báo cáo doanh thu / dòng tiền\n- 📦 Cảnh báo tồn kho\n- ✍️ Kiểm tra phiếu chờ duyệt',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // ==========================================
  // BỘ MÁY XỬ LÝ LỆNH NỘI BỘ (LOCAL RETRIEVAL ENGINE)
  // Fetch data thật từ Backend thông qua RTK Query
  // ==========================================
  const processIntelligentQuery = async (query: string): Promise<{ text: string; actions?: MessageAction[] }> => {
    const textLower = query.toLowerCase();

    try {
      // --------------------------------------------------
      // 1. INTENT: BÁO CÁO TÀI CHÍNH / DOANH THU THẬT
      // --------------------------------------------------
      if (textLower.includes("doanh thu") || textLower.includes("tài chính") || textLower.includes("dòng tiền")) {
        // Fetch data thật từ Backend (không lưu cache để luôn lấy số mới nhất)
        const response = await dispatch(api.endpoints.getDashboardMetrics.initiate(undefined, { forceRefetch: true })).unwrap();
        
        const revenue = response.financials?.currentMonth?.revenue || 0;
        const netProfit = response.financials?.currentMonth?.netProfit || 0;
        const cashBalance = response.summary?.currentCashBalance || 0;

        return {
          text: `📊 **Báo cáo Tài chính Real-time:**\n\n- Doanh thu tháng hiện tại: **${formatVND(revenue)}**\n- Lợi nhuận ròng: **${formatVND(netProfit)}**\n- Quỹ tiền mặt & TGNH hiện có: **${formatVND(cashBalance)}**`,
          actions: [
            { label: "Xem Báo cáo Dòng tiền", path: "/accounting/reports/Cashflow" },
            { label: "Xem Bảng điều khiển", path: "/dashboard" }
          ]
        };
      }

      // --------------------------------------------------
      // 2. INTENT: CẢNH BÁO TỒN KHO THẬT
      // --------------------------------------------------
      if (textLower.includes("kho") || textLower.includes("tồn") || textLower.includes("cảnh báo")) {
        const alerts = await dispatch(api.endpoints.getLowStockAlerts.initiate(undefined, { forceRefetch: true })).unwrap();
        
        if (!alerts || alerts.length === 0) {
          return { text: "✅ Tình trạng kho hàng ổn định. Không có mã vật tư nào rớt xuống dưới mức cảnh báo an toàn (Reorder Point)." };
        }

        // Lấy top 3 sản phẩm cảnh báo khẩn cấp nhất
        const topAlerts = alerts.slice(0, 3).map((item, index) => 
          `${index + 1}. \`${item.productCode}\` - ${item.productName} (Còn: **${item.currentAvailableQty}** | Định mức: ${item.reorderPoint})`
        ).join('\n');

        return {
          text: `⚠️ **Phát hiện ${alerts.length} mã vật tư dưới mức an toàn:**\n\n${topAlerts}\n\nBạn có muốn điều hướng đến phân hệ Kho để xử lý ngay không?`,
          actions: [
            { label: "Đi tới Quản lý Kho", path: "/inventory" }
          ]
        };
      }

      // --------------------------------------------------
      // 3. INTENT: PHÊ DUYỆT (APPROVALS) THẬT
      // --------------------------------------------------
      if (textLower.includes("duyệt") || textLower.includes("chờ") || textLower.includes("nhiệm vụ")) {
        const pending = await dispatch(api.endpoints.getPendingApprovals.initiate(undefined, { forceRefetch: true })).unwrap();
        
        if (!pending || pending.length === 0) {
          return { text: "🎉 Thật tuyệt! Bạn không có tờ trình hay chứng từ nào đang chờ phê duyệt lúc này." };
        }

        return {
          text: `🔔 **Trung tâm Phê duyệt:** Bạn đang có **${pending.length} yêu cầu** cần xử lý. Hãy ưu tiên kiểm tra Bàn làm việc để không làm nghẽn quy trình của doanh nghiệp.`,
          actions: [
            { label: "Mở Bàn làm việc (Approvals)", path: "/approvals" }
          ]
        };
      }

      // --------------------------------------------------
      // 4. INTENT: TÌM KIẾM CHỨNG TỪ (REGEX MAP)
      // --------------------------------------------------
      const documentRegex = /[a-z]{2,3}-\d{3,}/i; 
      const foundDoc = query.match(documentRegex);
      if (foundDoc) {
        const docId = foundDoc[0].toUpperCase();
        // Có thể gọi thêm API getDocumentById ở đây nếu cần lấy trạng thái thật
        return {
          text: `🔍 Đã ghi nhận mã chứng từ **${docId}**. Bạn muốn thao tác gì với chứng từ này?`,
          actions: [
            { label: "Xem chi tiết chứng từ", path: `/transactions/${docId}` }
          ]
        };
      }

      // --------------------------------------------------
      // FALLBACK: KHÔNG HIỂU LỆNH
      // --------------------------------------------------
      return {
        text: `Hệ thống ERP nội bộ chưa nhận diện được lệnh: *"**${query}**"*. \n\n💡 **Gợi ý các câu lệnh hợp lệ:**\n- "Báo cáo doanh thu tháng này"\n- "Cảnh báo tồn kho"\n- "Tôi có bao nhiêu phiếu chờ duyệt?"`
      };

    } catch (error) {
      console.error("Lỗi khi Bot truy xuất dữ liệu nội bộ:", error);
      return {
        text: "❌ Lỗi truy xuất hệ thống. Vui lòng kiểm tra lại kết nối mạng hoặc phiên đăng nhập của bạn."
      };
    }
  };

  // ==========================================
  // HÀM XỬ LÝ GỬI TIN NHẮN (MESSAGE HANDLER)
  // ==========================================
  const handleSendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || inputValue;
    if (!textToSend.trim()) return;

    // 1. Gắn tin nhắn của User vào giao diện
    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    setIsTyping(true);

    // 2. GIẢ LẬP ĐỘ TRỄ SUY NGHĨ (UX) & XỬ LÝ LỆNH NỘI BỘ
    setTimeout(async () => {
      // Đợi fetch data thật từ DB thông qua hàm processIntelligentQuery
      const { text, actions } = await processIntelligentQuery(textToSend);

      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: text,
        actions: actions,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newAiMsg]);
      setIsTyping(false);
    }, 600); // Rút ngắn delay xuống 600ms vì đây là truy vấn local, cần phản hồi nhanh gọn
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      sender: 'ai',
      text: 'Đã dọn dẹp bộ nhớ ngữ cảnh. Băng thông dữ liệu đã sẵn sàng. Bạn cần tôi truy xuất số liệu gì tiếp theo?',
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