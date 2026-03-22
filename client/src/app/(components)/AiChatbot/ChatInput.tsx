import React, { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Mic, MicOff } from "lucide-react";
import { cn } from "@/utils/helpers";

interface ChatInputProps {
  inputValue: string;
  isTyping: boolean;
  setInputValue: (value: string) => void;
  handleSendMessage: () => void;
}

export default function ChatInput({ inputValue, isTyping, setInputValue, handleSendMessage }: ChatInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ==========================================
  // KHỞI TẠO BỘ NHẬN DIỆN GIỌNG NÓI (WEB SPEECH API)
  // ==========================================
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false; // Ngắt khi ngừng nói
        recognitionRef.current.interimResults = true; // Hiển thị chữ realtime
        recognitionRef.current.lang = "vi-VN"; // Ưu tiên tiếng Việt

        recognitionRef.current.onresult = (event: any) => {
          // 🚀 TỐI ƯU: Nối chuỗi transcript an toàn hơn
          const currentTranscript = Array.from(event.results)
            .map((res: any) => res[0].transcript)
            .join("");
            
          setInputValue(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Lỗi Microphone:", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, [setInputValue]);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói!");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputValue(""); // Xóa text cũ để thu âm mới
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-[#0B0F19] border-t border-slate-100 dark:border-white/5 shrink-0 pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex items-center gap-2">
        
        {/* Nút Đính kèm file */}
        <button className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors shrink-0">
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Nút Micro (Nhận diện giọng nói) */}
        <button 
          onClick={toggleListen}
          className={cn(
            "p-2 rounded-xl transition-all shrink-0 relative",
            isListening 
              ? "text-rose-500 bg-rose-50 dark:bg-rose-500/10" 
              : "text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
          )}
        >
          {isListening ? (
            <>
              <span className="absolute inset-0 rounded-xl bg-rose-400 opacity-40 animate-ping"></span>
              <MicOff className="w-5 h-5 relative z-10" />
            </>
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Đang lắng nghe bạn nói..." : "Yêu cầu AI phân tích dữ liệu..."}
          className={cn(
            "w-full pl-4 pr-12 py-3 border rounded-2xl text-[13.5px] font-medium outline-none transition-all shadow-inner",
            isListening 
              ? "bg-rose-50/50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
              : "bg-slate-50 dark:bg-black/20 border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50"
          )}
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
          TTH AI Agent có thể thay bạn điều hướng hệ thống
        </span>
      </div>
    </div>
  );
}