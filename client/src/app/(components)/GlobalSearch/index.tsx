"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, X, Clock, Sparkles, 
  Package, FileText, ArrowRight, CornerDownLeft, Box, CheckCircle2, ArrowUpRight
} from "lucide-react";

// --- KẾT NỐI API THỰC TẾ ---
import { useGetProductsQuery, useGetDocumentsQuery } from "@/state/api";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// Định nghĩa Type chuẩn mực để khắc phục lỗi Implicit Any
interface ActionableItem {
  type: 'ai_query' | 'product' | 'doc';
  path: string;
  id: string;
}

// --- HELPER: HIGHLIGHT TỪ KHÓA ---
const HighlightText = ({ text, highlight }: { text: string, highlight: string }) => {
  if (!highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? <span key={i} className="text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50 dark:bg-blue-500/20 px-0.5 rounded">{part}</span> : <span key={i}>{part}</span>
      )}
    </span>
  );
};

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- KEYBOARD NAVIGATION STATE ---
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const { data: products = [] } = useGetProductsQuery({});
  const { data: documents = [] } = useGetDocumentsQuery({});

  useEffect(() => {
    setIsMounted(true);
    const savedSearches = localStorage.getItem("erp_recent_searches");
    if (savedSearches) setRecentSearches(JSON.parse(savedSearches));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearchTerm(""); 
      setSelectedIndex(-1);
      setIsAIProcessing(false);
    }
  }, [isOpen]);

  // Reset index khi đổi từ khóa
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchTerm]);

  const saveSearchTerm = (term: string) => {
    if (!term.trim()) return;
    const updatedSearches = [term, ...recentSearches.filter(t => t !== term)].slice(0, 6); 
    setRecentSearches(updatedSearches);
    localStorage.setItem("erp_recent_searches", JSON.stringify(updatedSearches));
  };

  const removeRecentSearch = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(t => t !== termToRemove);
    setRecentSearches(updated);
    localStorage.setItem("erp_recent_searches", JSON.stringify(updated));
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 3); 

  const filteredDocs = documents.filter(d => 
    d.documentNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 3); 

  // Xây dựng danh sách Item tổng hợp để phục vụ Keyboard Navigation (Khắc phục lỗi TS 7034 & 7005)
  const actionableItems: ActionableItem[] = [];
  if (searchTerm.trim()) {
    actionableItems.push({ type: 'ai_query', path: '', id: 'ai-btn' });
    filteredProducts.forEach(p => actionableItems.push({ type: 'product', path: `/inventory/products/${p.productCode}`, id: p.productId }));
    filteredDocs.forEach(d => actionableItems.push({ type: 'doc', path: `/transactions/${d.documentNumber}`, id: d.documentId }));
  }

  // --- AI NLP (NATURAL LANGUAGE PROCESSING) SIMULATOR ---
  const aiSuggestions = [];
  const termLower = searchTerm.toLowerCase();
  
  if (termLower.includes('báo cáo') || termLower.includes('doanh thu') || termLower.includes('tài chính') || termLower.includes('lãi')) {
    aiSuggestions.push({ title: 'Phân tích tài chính tháng này', desc: 'Hệ thống sẽ tổng hợp báo cáo P&L.', icon: Sparkles, path: '/accounting/reports' });
  }
  if (termLower.includes('kho') || termLower.includes('hết') || termLower.includes('cảnh báo') || termLower.includes('tồn')) {
    aiSuggestions.push({ title: 'Kiểm tra vật tư sắp cạn kho', desc: 'Lọc các sản phẩm dưới mức Minimum Stock.', icon: Box, path: '/inventory' });
  }
  if (termLower.includes('duyệt') || termLower.includes('đợi') || termLower.includes('chờ')) {
    aiSuggestions.push({ title: 'Phiếu chờ phê duyệt', desc: 'Chuyển đến danh sách cần xử lý.', icon: CheckCircle2, path: '/approvals' });
  }

  // --- LOGIC ĐIỀU HƯỚNG BÀN PHÍM (ENTERPRISE STANDARD) ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    
    if (!searchTerm.trim() || actionableItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < actionableItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const activeItem = selectedIndex >= 0 ? actionableItems[selectedIndex] : actionableItems[0]; // Mặc định chọn cái đầu tiên (Ask AI)
      
      if (activeItem.type === 'ai_query') {
        handleTriggerAI();
      } else {
        handleNavigate(activeItem.path, searchTerm);
      }
    }
  };

  // --- HÀNH ĐỘNG ĐIỀU HƯỚNG & KẾT NỐI CHATBOT ---
  const handleNavigate = (path: string, termToSave?: string) => {
    if (termToSave) saveSearchTerm(termToSave);
    onClose();
    router.push(path);
  };

  const handleTriggerAI = () => {
    if (!searchTerm.trim()) return;
    saveSearchTerm(searchTerm);
    setIsAIProcessing(true);
    
    // Giả lập thời gian AI nạp dữ liệu rồi chuyển giao cho AI Chatbot Widget
    setTimeout(() => {
      setIsAIProcessing(false);
      onClose();
      window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { query: searchTerm } }));
    }, 800);
  };

  if (!isMounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-0 md:pt-[10vh] bg-slate-900/60 dark:bg-[#0B0F19]/80 backdrop-blur-sm"
          onClick={onClose} 
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()} 
            className="w-full md:max-w-3xl h-full md:h-auto md:max-h-[85vh] flex flex-col bg-white dark:bg-gray-900 md:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border-0 md:border border-slate-200/50 dark:border-white/10 overflow-hidden transform-gpu"
          >
            {/* 1. THANH INPUT TÌM KIẾM */}
            <div className="flex items-center px-4 py-3 sm:py-4 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-gray-900 relative z-20 shrink-0">
              <Search className={`w-6 h-6 shrink-0 transition-colors ${searchTerm ? 'text-blue-500' : 'text-slate-400'}`} />
              <input
                ref={inputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập mã vật tư, chứng từ, hoặc hỏi AI..."
                className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-base sm:text-lg font-medium text-slate-900 dark:text-white placeholder-slate-400"
              />
              
              <div className="flex items-center gap-2 shrink-0">
                {searchTerm && (
                  <button onClick={() => { setSearchTerm(""); setSelectedIndex(-1); inputRef.current?.focus(); }} className="p-1.5 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button onClick={onClose} className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-95">
                  ĐÓNG <kbd className="font-sans text-[10px] ml-1">ESC</kbd>
                </button>
                <button onClick={onClose} className="md:hidden p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full active:scale-90 transition-transform">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MÀN HÌNH TẢI AI */}
            {isAIProcessing ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50/50 dark:bg-transparent">
                <div className="relative w-16 h-16 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-500/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin" />
                  <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400 absolute animate-pulse" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Đang chuyển giao ngữ cảnh...</h3>
                <p className="text-sm text-slate-500 font-medium">TTH AI Core đang tiếp nhận câu hỏi của bạn.</p>
              </div>
            ) : (
              /* 2. KHU VỰC KẾT QUẢ / GỢI Ý */
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 bg-slate-50/50 dark:bg-transparent relative pb-[env(safe-area-inset-bottom)]">
                
                {!searchTerm ? (
                  // TRẠNG THÁI RỖNG (CHƯA GÕ)
                  <div className="p-4 sm:p-6 flex flex-col gap-8">
                    <div>
                      <h3 className="text-[11px] font-extrabold text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Trợ lý hệ thống
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button onClick={() => { setSearchTerm("Phân tích tài chính tháng này"); handleTriggerAI(); }} className="flex items-start gap-3.5 p-4 bg-white dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all text-left group">
                          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform"><Sparkles className="w-5 h-5" /></div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Phân tích tài chính</p>
                            <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-1">Tạo báo cáo doanh thu & chi phí.</p>
                          </div>
                        </button>
                        <button onClick={() => handleNavigate('/inventory', 'Kiểm tra tồn kho sắp hết')} className="flex items-start gap-3.5 p-4 bg-white dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-2xl hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 transition-all text-left group">
                          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform"><Box className="w-5 h-5" /></div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Kiểm tra tồn kho</p>
                            <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-1">Lọc vật tư dưới định mức an toàn.</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {recentSearches.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Tìm kiếm gần đây</h3>
                          <button onClick={() => { setRecentSearches([]); localStorage.removeItem("erp_recent_searches"); }} className="text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2 py-1 rounded transition-colors">Xóa tất cả</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map((term, idx) => (
                            <div key={idx} className="flex items-center gap-2 pl-4 pr-1.5 py-1.5 bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-full shadow-sm group hover:border-blue-300 transition-colors cursor-pointer" onClick={() => setSearchTerm(term)}>
                              <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 pt-px">{term}</span>
                              <button onClick={(e) => removeRecentSearch(term, e)} className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-all"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // TRẠNG THÁI ĐANG GÕ (HIỂN THỊ KẾT QUẢ VÀ BẮT BÀN PHÍM)
                  <div className="p-2 sm:p-4 flex flex-col gap-6">
                    
                    {/* Gợi ý NLP */}
                    <div className="flex flex-col gap-2">
                      <h3 className="px-3 text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest">Truy vấn Hệ thống</h3>
                      
                      {aiSuggestions.map((sug, idx) => (
                        <button key={idx} onClick={() => handleNavigate(sug.path, searchTerm)} className="flex items-center gap-3.5 p-3 sm:p-4 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl hover:shadow-md transition-all group text-left">
                          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><sug.icon className="w-5 h-5" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 truncate">Đề xuất: {sug.title}</p>
                            <p className="text-[11px] font-medium text-indigo-700/70 dark:text-indigo-400/70 truncate mt-0.5">{sug.desc}</p>
                          </div>
                          <ArrowUpRight className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600" />
                        </button>
                      ))}

                      {/* Nút Gọi AI Chatbot (Index 0 hoặc -1) */}
                      <button 
                        onClick={handleTriggerAI} 
                        onMouseEnter={() => setSelectedIndex(-1)}
                        className={`flex items-center gap-3 p-4 border rounded-2xl transition-all group text-left w-full
                          ${(selectedIndex === 0 || selectedIndex === -1) 
                            ? 'bg-indigo-50/80 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-400 shadow-md ring-2 ring-indigo-500/20' 
                            : 'bg-white dark:bg-white/5 border-slate-200/50 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-500/50'}`}
                      >
                        <div className={`p-2.5 rounded-xl transition-colors ${selectedIndex <= 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${selectedIndex <= 0 ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>
                            Hỏi Trợ lý AI về <span className="font-extrabold text-indigo-600 dark:text-indigo-400">"{searchTerm}"</span>
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">Nhấn Enter để mở đoạn hội thoại trực tiếp.</p>
                        </div>
                        <CornerDownLeft className={`w-4 h-4 ${selectedIndex <= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                      </button>
                    </div>

                    {/* Kết quả Vật tư */}
                    {filteredProducts.length > 0 && (
                      <div>
                        <h3 className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Vật tư & Sản phẩm</h3>
                        <div className="flex flex-col gap-1.5">
                          {filteredProducts.map((product) => {
                            const itemIndex = actionableItems.findIndex(i => i.id === product.productId);
                            const isActive = selectedIndex === itemIndex;

                            return (
                              <button 
                                key={product.productId} 
                                onClick={() => handleNavigate(`/inventory/products/${product.productCode}`, searchTerm)}
                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                className={`flex items-center gap-4 p-3 rounded-2xl transition-all text-left w-full
                                  ${isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'}`}
                              >
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                                  <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate"><HighlightText text={product.name} highlight={searchTerm} /></p>
                                  <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">Mã: <HighlightText text={product.productCode} highlight={searchTerm} /> • Loại: {product.categoryId}</p>
                                </div>
                                {isActive && <CornerDownLeft className="w-4 h-4 text-emerald-500" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Kết quả Chứng từ */}
                    {filteredDocs.length > 0 && (
                      <div>
                        <h3 className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Chứng từ giao dịch</h3>
                        <div className="flex flex-col gap-1.5">
                          {filteredDocs.map((doc) => {
                            const itemIndex = actionableItems.findIndex(i => i.id === doc.documentId);
                            const isActive = selectedIndex === itemIndex;

                            return (
                              <button 
                                key={doc.documentId} 
                                onClick={() => handleNavigate(`/transactions/${doc.documentNumber}`, searchTerm)}
                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                className={`flex items-center gap-4 p-3 rounded-2xl transition-all text-left w-full
                                  ${isActive ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'}`}
                              >
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Phiếu <HighlightText text={doc.documentNumber} highlight={searchTerm} /></p>
                                  <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">Loại: <span className="uppercase">{doc.type}</span> • Trạng thái: {doc.status}</p>
                                </div>
                                {isActive && <CornerDownLeft className="w-4 h-4 text-blue-500" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. FOOTER HƯỚNG DẪN BÀN PHÍM */}
            <div className="hidden md:flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-gray-900 shrink-0">
              <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 font-sans font-bold shadow-sm">↑↓</kbd> Di chuyển</span>
                <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 font-sans font-bold shadow-sm">Enter</kbd> Chọn / Gọi AI</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 tracking-wider uppercase">
                Powered by <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> TTH AI Core
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}