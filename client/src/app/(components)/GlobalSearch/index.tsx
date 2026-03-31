"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, X, FileText, Package, Users, ArrowRight, Loader2, Command, Building
} from "lucide-react";

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG: Bối cảnh Chi nhánh
import { useGetGlobalSearchQuery } from "@/state/api";

// --- UTILS ---
import { formatVND } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

interface GlobalSearchProps {
  onClose: () => void;
}

export default function GlobalSearch({ onClose }: GlobalSearchProps) {
  const router = useRouter();
  
  // 🚀 LẤY NGỮ CẢNH CHI NHÁNH ĐỂ CÁCH LY DỮ LIỆU
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 400); 
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const skipSearch = debouncedTerm.trim().length < 2 || !activeBranchId;

  // 🚀 LÁ CHẮN BẢO MẬT: TIÊM BRANCH ID VÀO QUERY ĐỂ NGĂN CHẶN RÒ RỈ DỮ LIỆU CHÉO
  const { data: searchData, isFetching } = useGetGlobalSearchQuery(
    { query: debouncedTerm, branchId: activeBranchId } as any, 
    { skip: skipSearch }
  );

  const searchResults = useMemo(() => {
    if (skipSearch || !searchData) return { documents: [], products: [], users: [] };

    return {
      documents: Array.isArray(searchData.transactions) ? searchData.transactions : [],
      products: Array.isArray(searchData.products) ? searchData.products : [],
      users: Array.isArray(searchData.users) ? searchData.users : []
    };
  }, [searchData, skipSearch]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleResultClick = (type: string, id: string) => {
    onClose();
    switch (type) {
      case "DOCUMENT": router.push(`/transactions?id=${id}`); break;
      case "PRODUCT": router.push(`/inventory?id=${id}`); break;
      case "USER": router.push(`/users?id=${id}`); break;
      default: break;
    }
  };

  const handleAskAI = () => {
    if (!searchTerm.trim()) return;
    onClose();
    const event = new CustomEvent('open-ai-chat', { detail: { query: searchTerm } });
    window.dispatchEvent(event);
  };

  const hasResults = 
    searchResults.documents.length > 0 || 
    searchResults.products.length > 0 || 
    searchResults.users.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 transition-colors duration-500">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-colors duration-500"
      />

      {/* Main Search Palette */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative w-full max-w-2xl glass-panel rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-colors duration-500"
      >
        {/* Input Header */}
        <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-700/50 shrink-0 transition-colors duration-500 bg-white/50 dark:bg-slate-900/50">
          <Search className="w-6 h-6 text-indigo-500 shrink-0 transition-colors duration-500" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Tìm kiếm mã chứng từ, sản phẩm, nhân sự..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent px-4 text-lg outline-none text-slate-900 dark:text-white placeholder-slate-400 font-medium transition-colors duration-500"
          />
          {isFetching && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0 mx-2 transition-colors duration-500" />}
          <div className="flex items-center gap-2 shrink-0 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4 transition-colors duration-500">
            <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 transition-colors duration-500">ESC để Đóng</span>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors duration-500">
              <X className="w-5 h-5 transition-colors duration-500" />
            </button>
          </div>
        </div>

        {/* 🚀 UI BẢO VỆ: HIỂN THỊ RÕ NGỮ CẢNH ĐANG TÌM KIẾM Ở CHI NHÁNH NÀO */}
        <div className="px-5 py-2 bg-indigo-50 dark:bg-indigo-500/10 border-b border-indigo-100 dark:border-indigo-500/20 shrink-0 flex items-center justify-between transition-colors duration-500">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 transition-colors duration-500">
            <Building className="w-3.5 h-3.5" /> Phạm vi tìm kiếm:
          </span>
          <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 transition-colors duration-500">
            {activeBranchId === "ALL" ? "Tất cả Chi nhánh (Global)" : "Chi nhánh làm việc hiện tại"}
          </span>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 p-2 bg-slate-50/50 dark:bg-transparent transition-colors duration-500">
          
          {!activeBranchId ? (
            <div className="py-12 flex flex-col items-center justify-center text-rose-500 transition-colors duration-500">
              <Building className="w-12 h-12 mb-3 opacity-50 transition-colors duration-500" />
              <p className="text-sm font-bold transition-colors duration-500">Chưa xác định Chi nhánh</p>
              <p className="text-xs mt-1 transition-colors duration-500">Vui lòng đóng bảng tìm kiếm và chọn chi nhánh làm việc.</p>
            </div>
          ) : skipSearch ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 transition-colors duration-500">
              <Command className="w-12 h-12 mb-3 opacity-20 transition-colors duration-500" />
              <p className="text-sm font-medium transition-colors duration-500">Nhập ít nhất 2 ký tự để kích hoạt tìm kiếm máy chủ</p>
            </div>
          ) : !isFetching && !hasResults ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 transition-colors duration-500">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 transition-colors duration-500">Không tìm thấy kết quả nào cho "{searchTerm}"</p>
              
              {/* FALLBACK: TÍCH HỢP AI CHAT */}
              <button onClick={handleAskAI} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-sm rounded-xl transition-colors duration-500 border border-indigo-200 dark:border-indigo-500/30">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                Nhờ AI phân tích từ khóa này
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-2 transition-colors duration-500">
              
              {/* KẾT QUẢ: GIAO DỊCH CHỨNG TỪ */}
              {searchResults.documents.length > 0 && (
                <div className="transition-colors duration-500">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5 transition-colors duration-500">
                    <FileText className="w-3.5 h-3.5 transition-colors duration-500" /> Giao dịch & Chứng từ
                  </h4>
                  <div className="flex flex-col gap-1 transition-colors duration-500">
                    {searchResults.documents.map((doc: any) => (
                      <div 
                        key={doc.documentId || doc.id} 
                        onClick={() => handleResultClick("DOCUMENT", doc.documentId || doc.id)}
                        className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800/80 rounded-xl cursor-pointer group transition-colors duration-500 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
                      >
                        <div className="flex flex-col transition-colors duration-500">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors duration-500 uppercase">
                            {doc.documentNumber}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 transition-colors duration-500">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] transition-colors duration-500">{doc.type}</span> 
                            • Trạng thái: {doc.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 transition-colors duration-500">
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300 transition-colors duration-500">{formatVND(doc.totalAmount)}</span>
                          <ArrowRight className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 duration-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KẾT QUẢ: SẢN PHẨM / VẬT TƯ */}
              {searchResults.products.length > 0 && (
                <div className="transition-colors duration-500">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5 mt-2 transition-colors duration-500">
                    <Package className="w-3.5 h-3.5 transition-colors duration-500" /> Vật tư & Hàng hóa
                  </h4>
                  <div className="flex flex-col gap-1 transition-colors duration-500">
                    {searchResults.products.map((prod: any) => (
                      <div 
                        key={prod.productId || prod.id} 
                        onClick={() => handleResultClick("PRODUCT", prod.productId || prod.id)}
                        className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800/80 rounded-xl cursor-pointer group transition-colors duration-500 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
                      >
                        <div className="flex items-center gap-3 transition-colors duration-500">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-500/20 transition-colors duration-500">
                            <Package className="w-4 h-4 transition-colors duration-500" />
                          </div>
                          <div className="flex flex-col transition-colors duration-500">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors duration-500 truncate max-w-[250px]">
                              {prod.name}
                            </span>
                            <span className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5 transition-colors duration-500">
                              Mã: <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px] transition-colors duration-500">{prod.productCode}</span> 
                              {prod.barcode && ` • Barcode: ${prod.barcode}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 transition-colors duration-500">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-md border uppercase shadow-sm transition-colors duration-500",
                            prod.status === "ACTIVE" 
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                          )}>
                            {prod.status === "ACTIVE" ? "Kinh doanh" : "Tạm ngưng"}
                          </span>
                          <ArrowRight className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 duration-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KẾT QUẢ: NHÂN SỰ */}
              {searchResults.users.length > 0 && (
                <div className="transition-colors duration-500">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5 mt-2 transition-colors duration-500">
                    <Users className="w-3.5 h-3.5 transition-colors duration-500" /> Nhân sự Hệ thống
                  </h4>
                  <div className="flex flex-col gap-1 transition-colors duration-500">
                    {searchResults.users.map((user: any) => (
                      <div 
                        key={user.userId || user.id} 
                        onClick={() => handleResultClick("USER", user.userId || user.id)}
                        className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800/80 rounded-xl cursor-pointer group transition-colors duration-500 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
                      >
                        <div className="flex flex-col transition-colors duration-500">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors duration-500 truncate">
                            {user.fullName}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 transition-colors duration-500">
                            {user.email} {user.phone && `• ${user.phone}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 transition-colors duration-500">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded uppercase border shadow-sm transition-colors duration-500",
                            user.status === "ACTIVE" 
                              ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30" 
                              : "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/30"
                          )}>
                            {user.status || "UNKNOWN"}
                          </span>
                          <ArrowRight className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 duration-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center text-xs text-slate-500 shrink-0 transition-colors duration-500">
          <p className="transition-colors duration-500">Hiển thị tối đa 5 kết quả tốt nhất mỗi loại.</p>
          <AnimatePresence>
            {!isFetching && !skipSearch && (
              <motion.button 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={handleAskAI} 
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors duration-500 flex items-center gap-1"
              >
                Hỏi AI Chatbot ✦
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}