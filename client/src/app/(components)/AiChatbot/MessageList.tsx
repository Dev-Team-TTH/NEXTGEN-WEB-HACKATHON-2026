import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, User, ArrowUpRight, AlertCircle } from "lucide-react";
import { Message } from "./types";
import { cn } from "@/utils/helpers";

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
}

// ==========================================
// TRÌNH PHÂN TÍCH MARKDOWN (SMART-PARSER)
// Đã được nâng cấp: Chống XSS 100% và chuẩn hóa cấu trúc Semantic <ul><li>
// ==========================================
const formatAIText = (text: string) => {
  // 🚀 LÁ CHẮN XSS: Escape toàn bộ thẻ HTML thô trước khi render
  const escapedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = escapedText.split('\n');
  
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  // Hàm gom nhóm các thẻ <li> vào chung một thẻ <ul>
  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="ml-5 mb-2 space-y-1.5 list-disc marker:text-indigo-500 font-medium transition-colors duration-500">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    let formattedLine = line.trim();
    
    // Xử lý dòng trống (Break line)
    if (!formattedLine) {
      flushList();
      elements.push(<div key={`br-${idx}`} className="h-1.5 transition-colors duration-500" />);
      return;
    }

    // Regex xử lý **in đậm** an toàn sau khi đã escape HTML
    const boldRegex = /\*\*(.*?)\*\*/g;
    const processBold = (str: string) => (
      <span dangerouslySetInnerHTML={{ 
        __html: str.replace(boldRegex, '<strong class="font-bold text-indigo-700 dark:text-indigo-300 transition-colors duration-500">$1</strong>') 
      }} />
    );

    // Xử lý danh sách (Bullet points)
    if (formattedLine.startsWith('- ') || formattedLine.startsWith('* ')) {
      formattedLine = formattedLine.substring(2);
      listItems.push(
        <li key={`li-${idx}`} className="leading-relaxed transition-colors duration-500">
          {processBold(formattedLine)}
        </li>
      );
    } else {
      flushList(); // Nếu đang gom list mà gặp text thường thì xuất list ra
      elements.push(
        <p key={`p-${idx}`} className="mb-1.5 last:mb-0 leading-relaxed transition-colors duration-500">
          {processBold(formattedLine)}
        </p>
      );
    }
  });

  flushList(); // Dọn dẹp nốt nếu danh sách nằm ở cuối cùng
  return elements;
};

export default function MessageList({ messages, isTyping }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 bg-slate-50/50 dark:bg-transparent transition-colors duration-500">
      {messages.map((msg) => {
        const isUser = msg.sender === 'user';
        return (
          <div key={msg.id} className={cn("flex gap-3 max-w-[90%] transition-colors duration-500", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}>
            
            {/* Avatar */}
            <div className={cn(
              "w-8 h-8 shrink-0 rounded-full flex items-center justify-center mt-1 shadow-sm border border-slate-200/50 dark:border-white/5 transition-colors duration-500",
              isUser ? "bg-blue-100 dark:bg-blue-500/20" : msg.isError ? "bg-rose-100 dark:bg-rose-500/20" : "bg-indigo-100 dark:bg-indigo-500/20"
            )}>
              {isUser ? (
                <User className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 transition-colors duration-500" />
              ) : msg.isError ? (
                <AlertCircle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400 transition-colors duration-500" />
              ) : (
                <Sparkles className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400 transition-colors duration-500" />
              )}
            </div>

            {/* Khối Nội dung */}
            <div className="flex flex-col gap-2 min-w-0 transition-colors duration-500">
              <div className={cn(
                "p-3.5 rounded-2xl text-[13.5px] shadow-sm font-medium transition-colors duration-500",
                isUser 
                  ? "bg-blue-600 text-white rounded-tr-sm" 
                  : msg.isError 
                    ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded-tl-sm border border-rose-200 dark:border-rose-500/20"
                    : "bg-white dark:bg-[#1E293B] text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200/80 dark:border-white/10"
              )}>
                {formatAIText(msg.text)}
              </div>

              {/* Nút Hành động Thông minh (Smart Actions) */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1 transition-colors duration-500">
                  {msg.actions.map((action, idx) => (
                    <button 
                      key={idx}
                      onClick={() => router.push(action.path)}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-[12px] font-bold text-indigo-700 dark:text-indigo-400 transition-all group duration-500"
                    >
                      <span className="truncate transition-colors duration-500">{action.label}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform duration-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Hiệu ứng Đang tải (Typing) của AI */}
      {isTyping && (
        <div className="flex gap-3 max-w-[85%] mr-auto transition-colors duration-500">
          <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mt-1 shadow-sm border border-slate-200/50 dark:border-white/5 transition-colors duration-500">
            <Sparkles className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400 transition-colors duration-500" />
          </div>
          <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-white/10 flex items-center gap-1.5 shadow-sm transition-colors duration-500">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce transition-colors duration-500" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce transition-colors duration-500" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce transition-colors duration-500" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
}