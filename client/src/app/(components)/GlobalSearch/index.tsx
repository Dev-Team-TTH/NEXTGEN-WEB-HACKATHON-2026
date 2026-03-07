"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, User, Package, FileText, Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGetGlobalSearchQuery } from "@/state/api";

// --- DEBOUNCE HOOK (CHỐNG SPAM API) ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input ngay khi mở Search
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Delay 500ms trước khi gọi API để người dùng gõ xong
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Gọi API Thực tế
  const { data: searchResults, isFetching } = useGetGlobalSearchQuery(debouncedSearchTerm, {
    skip: debouncedSearchTerm.length < 2, // Chỉ tìm khi gõ từ 2 ký tự trở lên
  });

  const hasResults = searchResults && (
    (searchResults.users?.length > 0) || 
    (searchResults.products?.length > 0) || 
    (searchResults.transactions?.length > 0)
  );

  // Xử lý Route khi click
  const handleNavigate = (path: string) => {
    router.push(path);
    onClose(); // Đóng thanh search sau khi chuyển trang
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: -20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: -20, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
        onClick={(e) => e.stopPropagation()} // Chống click nhầm ra ngoài
      >
        {/* THANH INPUT TÌM KIẾM */}
        <div className="relative flex items-center px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30">
          <Search className="w-6 h-6 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm người dùng, hàng hóa, mã giao dịch..."
            className="flex-1 bg-transparent px-4 text-lg font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
          />
          <div className="flex items-center gap-3">
            {isFetching && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
            <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KẾT QUẢ TÌM KIẾM */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-4 bg-slate-50 dark:bg-[#0B0F19]">
          {searchTerm.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-semibold text-lg">Gõ từ khóa để bắt đầu tìm kiếm đa hệ thống</p>
            </div>
          ) : isFetching ? (
            <div className="flex flex-col gap-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800/50 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : !hasResults ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-semibold text-lg text-slate-600 dark:text-slate-300">Không tìm thấy kết quả nào cho "{searchTerm}"</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* Kết quả: NHÂN SỰ */}
              {searchResults.users && searchResults.users.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-2">Định danh & Nhân sự</h3>
                  {searchResults.users.map((user: any) => (
                    <div 
                      key={user.userId} 
                      onClick={() => handleNavigate('/users')}
                      className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">{user.fullName}</span>
                          <span className="text-xs text-slate-500">{user.email}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  ))}
                </div>
              )}

              {/* Kết quả: HÀNG HÓA KHO */}
              {searchResults.products && searchResults.products.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-2">Hàng hóa (Inventory)</h3>
                  {searchResults.products.map((product: any) => (
                    <div 
                      key={product.productId} 
                      onClick={() => handleNavigate('/inventory')}
                      className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-md cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">{product.name}</span>
                          <span className="text-xs font-mono text-slate-500">SKU: {product.sku} | Tồn kho: {product.stockQuantity}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  ))}
                </div>
              )}

              {/* Kết quả: GIAO DỊCH */}
              {searchResults.transactions && searchResults.transactions.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-2">Hóa đơn & Giao dịch</h3>
                  {searchResults.transactions.map((tx: any) => (
                    <div 
                      key={tx.transactionId} 
                      onClick={() => handleNavigate('/transactions')}
                      className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-amber-300 dark:hover:border-amber-500/50 hover:shadow-md cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">{tx.reference}</span>
                          <span className="text-xs font-semibold text-slate-500 uppercase">{tx.type} • {tx.status}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors" />
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}