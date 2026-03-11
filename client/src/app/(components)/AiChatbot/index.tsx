"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Minus, Maximize2, RefreshCcw, X } from "lucide-react";

// --- IMPORT CUSTOM HOOK & COMPONENTS ---
import { useChatLogic } from "./useChatLogic";
import FloatingButton from "./FloatingButton";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import { cn } from "@/utils/helpers"; // IMPORT SIÊU VŨ KHÍ

export default function AIChatbot() {
  // --- TRẠNG THÁI GIAO DIỆN CHUNG ---
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // --- KẾT NỐI HOOK LOGIC CHAT ---
  const { 
    messages, inputValue, setInputValue, 
    isTyping, handleSendMessage, clearChat 
  } = useChatLogic();

  // --- HIỆU ỨNG KHỞI TẠO ---
  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => setShowTooltip(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // --- LẮNG NGHE LỆNH TỪ GLOBAL SEARCH ---
  useEffect(() => {
    const handleOpenAIChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string }>;
      const { query } = customEvent.detail;
      
      setIsOpen(true);
      setIsMinimized(false);
      setShowTooltip(false);
      
      if (query) {
        handleSendMessage(query);
      }
    };

    window.addEventListener('open-ai-chat', handleOpenAIChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenAIChat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <FloatingButton 
        isOpen={isOpen} 
        showTooltip={showTooltip} 
        onOpen={() => { setIsOpen(true); setIsMinimized(false); setShowTooltip(false); }} 
        onCloseTooltip={() => setShowTooltip(false)} 
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            layout 
            initial={{ opacity: 0, y: 50, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "fixed z-[9999] flex flex-col bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-3xl shadow-[0_20px_80px_rgba(0,0,0,0.3)] overflow-hidden transform-gpu origin-bottom-right transition-all duration-300 ease-out",
              isMinimized 
                ? "bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 sm:w-[350px] rounded-2xl border border-slate-200/50 dark:border-white/10" 
                : "top-0 left-0 right-0 bottom-0 h-[100dvh] w-full rounded-none sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[75vh] sm:max-h-[800px] sm:rounded-[2rem] sm:border border-slate-200/50 dark:border-white/10"
            )}
          >
            {/* HEADER CHAT WINDOW */}
            <div 
              className={cn(
                "flex items-center justify-between px-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 cursor-pointer select-none shrink-0 transition-all duration-300",
                isMinimized 
                  ? "py-3 sm:py-4" 
                  : "py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4" 
              )}
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white leading-tight flex items-center gap-2 truncate">
                    TTH AI Core 
                    <span className="flex h-2 w-2 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </h3>
                  <p className="text-[11px] font-medium text-indigo-100 mt-0.5 truncate">Trợ lý Phân tích Hệ thống</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-white/80 shrink-0 ml-2">
                {!isMinimized && (
                  <button onClick={(e) => { e.stopPropagation(); clearChat(); }} className="p-2 hover:bg-white/20 hover:text-white rounded-lg transition-colors" title="Làm mới">
                    <RefreshCcw className="w-4 h-4" />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-2 hover:bg-white/20 hover:text-white rounded-lg transition-colors">
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-2 hover:bg-rose-500 hover:text-white rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* BODY CHAT */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  className="flex flex-col flex-1 overflow-hidden"
                >
                  <MessageList messages={messages} isTyping={isTyping} />
                  <ChatInput 
                    inputValue={inputValue} 
                    setInputValue={setInputValue} 
                    isTyping={isTyping} 
                    handleSendMessage={handleSendMessage} 
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}