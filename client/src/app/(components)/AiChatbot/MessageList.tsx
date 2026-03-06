import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, User, ArrowUpRight } from "lucide-react";
import { Message } from "./types";

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
}

// Helper nhỏ để format markdown in đậm cơ bản từ AI (**text**)
const formatAIText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-indigo-700 dark:text-indigo-300">{part.slice(2, -2)}</strong>;
    }
    // Xử lý xuống dòng
    return <span key={idx}>{part.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}</span>;
  });
};

export default function MessageList({ messages, isTyping }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Tự động cuộn
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 bg-slate-50/50 dark:bg-transparent">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex gap-3 max-w-[90%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
          
          {/* Avatar */}
          <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center mt-1 shadow-sm border border-slate-200/50 dark:border-white/5 ${msg.sender === 'user' ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-indigo-100 dark:bg-indigo-500/20'}`}>
            {msg.sender === 'user' ? <User className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" /> : <Sparkles className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />}
          </div>

          {/* Khối Nội dung */}
          <div className="flex flex-col gap-2 min-w-0">
            <div className={`p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm font-medium ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200/80 dark:border-white/10'
            }`}>
              {formatAIText(msg.text)}
            </div>

            {/* Nút Hành động Thông minh (Smart Actions) */}
            {msg.actions && msg.actions.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {msg.actions.map((action, idx) => (
                  <button 
                    key={idx}
                    onClick={() => router.push(action.path)}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-[12px] font-bold text-indigo-700 dark:text-indigo-400 transition-colors group"
                  >
                    <span className="truncate">{action.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Hiệu ứng Đang tải (Typing) */}
      {isTyping && (
        <div className="flex gap-3 max-w-[85%] mr-auto">
          <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mt-1 shadow-sm border border-slate-200/50 dark:border-white/5">
            <Sparkles className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-white/10 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
}