"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Search, X, FileText, Package, Users, ArrowRight, Loader2, Command
} from "lucide-react";

// --- REDUX & API ---
// SỬ DỤNG PARALLEL QUERIES: Không cần chắp vá backend, gọi đa luồng từ các API đã có
import { 
  useGetDocumentsQuery, 
  useGetProductsQuery, 
  useGetUsersQuery 
} from "@/state/api";

// --- UTILS (SIÊU VŨ KHÍ) ---
import { formatVND, formatDate } from "@/utils/formatters";
import { cn } from "@/utils/helpers";

interface GlobalSearchProps {
  onClose: () => void;
}

export default function GlobalSearch({ onClose }: GlobalSearchProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  
  const skipSearch = searchTerm.length < 2;

  // 👉 1. TẬN DỤNG RTK QUERY CACHE & MULTIPLEXING (Gọi song song 3 luồng)
  const { data: rawDocs, isFetching: fetchingDocs } = useGetDocumentsQuery({}, { skip: skipSearch });
  const { data: rawProds, isFetching: fetchingProds } = useGetProductsQuery({ limit: 500 }, { skip: skipSearch });
  const { data: rawUsers, isFetching: fetchingUsers } = useGetUsersQuery({}, { skip: skipSearch });

  const isFetching = fetchingDocs || fetchingProds || fetchingUsers;

  // 👉 2. ENGINE TÌM KIẾM CLIENT-SIDE (Instant Search tốc độ ánh sáng)
  const searchResults = useMemo(() => {
    if (skipSearch) return { documents: [], products: [], users: [] };

    const lowerTerm = searchTerm.toLowerCase();

    // Bóc tách dữ liệu an toàn (Chống lỗi Array/Object)
    const docsArray = Array.isArray(rawDocs) ? rawDocs : (rawDocs as any)?.data || [];
    const prodsArray = Array.isArray(rawProds) ? rawProds : (rawProds as any)?.data || [];
    const usersArray = Array.isArray(rawUsers) ? rawUsers : (rawUsers as any)?.data || [];

    // Lọc & Cắt lấy Top 5 kết quả tốt nhất mỗi loại
    return {
      documents: docsArray.filter((d: any) => 
        d.documentNumber?.toLowerCase().includes(lowerTerm) || 
        d.supplier?.name?.toLowerCase().includes(lowerTerm) ||
        d.customer?.name?.toLowerCase().includes(lowerTerm)
      ).slice(0, 5),
      
      products: prodsArray.filter((p: any) => 
        p.name?.toLowerCase().includes(lowerTerm) || 
        p.productCode?.toLowerCase().includes(lowerTerm)
      ).slice(0, 5),
      
      users: usersArray.filter((u: any) => 
        u.fullName?.toLowerCase().includes(lowerTerm) || 
        u.email?.toLowerCase().includes(lowerTerm)
      ).slice(0, 5)
    };
  }, [rawDocs, rawProds, rawUsers, searchTerm, skipSearch]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus khi mở Modal
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Xử lý phím ESC để đóng
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Xử lý Click kết quả để Điều hướng
  const handleResultClick = (type: string, id: string) => {
    onClose();
    switch (type) {
      case "DOCUMENT": router.push(`/transactions?id=${id}`); break;
      case "PRODUCT": router.push(`/inventory?id=${id}`); break;
      case "USER": router.push(`/users?id=${id}`); break;
      default: break;
    }
  };

  // Bắn lệnh vào AI Chatbot System
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Main Search Palette */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh]"
      >
        {/* Input Header */}
        <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <Search className="w-6 h-6 text-indigo-500 shrink-0" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Tìm kiếm mã chứng từ, sản phẩm, nhân sự..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent px-4 text-lg outline-none text-slate-900 dark:text-white placeholder-slate-400 font-medium"
          />
          {isFetching && <Loader2 className="w-5 h-5 text-slate-400 animate-spin shrink-0 mx-2" />}
          <div className="flex items-center gap-2 shrink-0 ml-2 border-l border-slate-200 dark:border-slate-700 pl-4">
            <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500">ESC để Đóng</span>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 p-2">
          
          {skipSearch ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Command className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Nhập ít nhất 2 ký tự để bắt đầu tìm kiếm đa luồng</p>
            </div>
          ) : !isFetching && !hasResults ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Không tìm thấy kết quả nào cho "{searchTerm}"</p>
              
              {/* FALLBACK: TÍCH HỢP AI CHAT */}
              <button onClick={handleAskAI} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-sm rounded-xl transition-colors border border-indigo-200 dark:border-indigo-500/30">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                Nhờ AI phân tích từ khóa này
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-2">
              
              {/* KẾT QUẢ: GIAO DỊCH CHỨNG TỪ */}
              {searchResults.documents.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Giao dịch & Chứng từ
                  </h4>
                  <div className="flex flex-col gap-1">
                    {searchResults.documents.map((doc: any) => (
                      <div 
                        key={doc.documentId || doc.id} 
                        onClick={() => handleResultClick("DOCUMENT", doc.documentId || doc.id)}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors uppercase">
                            {doc.documentNumber}
                          </span>
                          <span className="text-xs text-slate-500">
                            {doc.type} • Đối tác: {doc.supplier?.name || doc.customer?.name || "Khách lẻ"} • {formatDate(doc.issueDate || doc.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">{formatVND(doc.totalAmount)}</span>
                          <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KẾT QUẢ: SẢN PHẨM / VẬT TƯ */}
              {searchResults.products.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5 mt-2">
                    <Package className="w-3.5 h-3.5" /> Vật tư & Hàng hóa
                  </h4>
                  <div className="flex flex-col gap-1">
                    {searchResults.products.map((prod: any) => (
                      <div 
                        key={prod.productId || prod.id} 
                        onClick={() => handleResultClick("PRODUCT", prod.productId || prod.id)}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Package className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors truncate max-w-[250px]">
                              {prod.name}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">SKU: {prod.productCode}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-500/20">
                            Tồn: {prod.totalStock || 0}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KẾT QUẢ: NHÂN SỰ */}
              {searchResults.users.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5 mt-2">
                    <Users className="w-3.5 h-3.5" /> Nhân sự Hệ thống
                  </h4>
                  <div className="flex flex-col gap-1">
                    {searchResults.users.map((user: any) => (
                      <div 
                        key={user.userId || user.id} 
                        onClick={() => handleResultClick("USER", user.userId || user.id)}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors truncate">
                            {user.fullName}
                          </span>
                          <span className="text-xs text-slate-500">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded uppercase border shadow-sm",
                            user.status === "ACTIVE" 
                              ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30" 
                              : "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/30"
                          )}>
                            {user.status || "UNKNOWN"}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer (Chuyển sang AI) */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F19] flex justify-between items-center text-xs text-slate-500 shrink-0">
          <p>Hiển thị tối đa 5 kết quả mỗi loại.</p>
          <button onClick={handleAskAI} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors">Hỏi AI Chatbot ✦</button>
        </div>
      </motion.div>
    </div>
  );
}