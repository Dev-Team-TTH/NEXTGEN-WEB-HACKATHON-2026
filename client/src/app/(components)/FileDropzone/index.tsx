"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, File, X, CheckCircle2, Loader2, Image as ImageIcon } from "lucide-react";
import { useUploadFileMutation } from "@/state/api";
import { toast } from "react-hot-toast";

// --- UTILS ---
import { cn } from "@/utils/helpers";

interface FileDropzoneProps {
  onUploadSuccess: (url: string) => void;
  label?: string;
  accept?: string; // vd: "image/*" hoặc ".pdf,.doc"
  maxSizeMB?: number;
}

export default function FileDropzone({
  onUploadSuccess,
  label = "Kéo thả file vào đây, hoặc click để chọn",
  accept = "*/*",
  maxSizeMB = 5,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [uploadFile, { isLoading }] = useUploadFileMutation();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    // Kiểm tra dung lượng
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File quá lớn. Vui lòng chọn file dưới ${maxSizeMB}MB`);
      return;
    }

    // Nếu là ảnh, tạo URL preview tạm thời
    if (file.type.startsWith("image/")) {
      const tempUrl = URL.createObjectURL(file);
      setPreviewUrl(tempUrl);
    } else {
      setPreviewUrl(null);
    }

    // Nạp dữ liệu vào FormData
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await uploadFile(formData).unwrap();
      
      // Xử lý URL tĩnh từ backend
      const fullUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '')}${response.url}`;
      setUploadedUrl(fullUrl);
      onUploadSuccess(fullUrl);
      toast.success("Tải file lên thành công!");
      
    } catch (error: any) {
      console.error("Lỗi upload:", error);
      toast.error(error?.data?.message || "Đã xảy ra lỗi khi tải file lên");
      setPreviewUrl(null);
    }
  };

  const resetUpload = () => {
    setUploadedUrl(null);
    setPreviewUrl(null);
  };

  return (
    <div className="w-full transition-colors duration-500">
      <AnimatePresence mode="wait">
        {!uploadedUrl ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "relative w-full h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden",
              isDragging 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-inner" 
                : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 transition-colors duration-500" 
              onChange={handleFileChange}
              accept={accept}
              disabled={isLoading}
            />

            {isLoading ? (
              <div className="flex flex-col items-center gap-3 text-blue-500 transition-colors duration-500">
                <Loader2 className="w-8 h-8 animate-spin transition-colors duration-500" />
                <span className="text-sm font-semibold transition-colors duration-500">Đang tải lên máy chủ...</span>
              </div>
            ) : previewUrl ? (
              // Trạng thái đang preview ảnh chờ tải xong
               <div className="relative w-full h-full transition-colors duration-500">
                 <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-50 grayscale transition-colors duration-500" />
                 <div className="absolute inset-0 flex items-center justify-center transition-colors duration-500">
                    <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-md transition-colors duration-500" />
                 </div>
               </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400 pointer-events-none transition-colors duration-500">
                <div className={cn("p-3 rounded-full transition-colors duration-500", isDragging ? "bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400" : "bg-white dark:bg-slate-800 shadow-sm")}>
                  <UploadCloud className="w-6 h-6 transition-colors duration-500" />
                </div>
                <p className="text-sm font-medium px-4 text-center transition-colors duration-500">
                  {label}
                </p>
                <p className="text-[10px] uppercase tracking-wide opacity-70 transition-colors duration-500">
                  Kích thước tối đa {maxSizeMB}MB
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full relative bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 border border-emerald-200 dark:border-emerald-500/30 transition-colors duration-500"
          >
            <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center overflow-hidden border border-emerald-200 dark:border-emerald-800/50 transition-colors duration-500">
               {previewUrl ? (
                 <img src={previewUrl} alt="Uploaded" className="w-full h-full object-cover transition-colors duration-500" />
               ) : (
                 <File className="w-6 h-6 transition-colors duration-500" />
               )}
            </div>
            <div className="flex-1 min-w-0 transition-colors duration-500">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors duration-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 transition-colors duration-500" /> Tải lên thành công!
              </p>
              <a href={uploadedUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block w-full mt-0.5 transition-colors duration-500">
                Xem file đính kèm
              </a>
            </div>
            <button 
              onClick={resetUpload}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors z-20 duration-500"
              title="Xóa và tải lại"
            >
              <X className="w-4 h-4 transition-colors duration-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}