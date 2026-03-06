import React from "react";
import { Send, Paperclip } from "lucide-react";

interface ChatInputProps {
  inputValue: string;
  isTyping: boolean;
  setInputValue: (value: string) => void;
  handleSendMessage: () => void;
}

export default function ChatInput({ inputValue, isTyping, setInputValue, handleSendMessage }: ChatInputProps) {
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-[#0B0F19] border-t border-slate-100 dark:border-white/5 shrink-0 pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex items-center gap-2">
        <button className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors shrink-0">
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Yêu cầu AI phân tích dữ liệu..."
          className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 rounded-2xl text-[13.5px] font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
        />
        <button 
          onClick={() => handleSendMessage()}
          disabled={!inputValue.trim() || isTyping}
          className="absolute right-1.5 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-all shadow-md active:scale-95 disabled:active:scale-100"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </div>
      <div className="text-center mt-3">
        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
          Trí tuệ nhân tạo có thể mắc lỗi. Hãy kiểm tra lại số liệu.
        </span>
      </div>
    </div>
  );
}