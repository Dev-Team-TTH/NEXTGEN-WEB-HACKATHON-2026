"use client";

import React, { useState, useEffect } from "react";
import { FileSpreadsheet, ListChecks, GripVertical, Check, X, Download } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

// --- IMPORT CORE ---
import Modal from "@/app/(components)/Modal";
import { exportToCSV } from "@/utils/exportUtils";
import { cn } from "@/utils/helpers";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  filename: string;
}

export default function ExportModal({ isOpen, onClose, data, filename }: ExportModalProps) {
  const [columns, setColumns] = useState<{ id: string; selected: boolean }[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Khởi tạo danh sách cột dựa trên Key của Object Data
  useEffect(() => {
    if (isOpen && data && data.length > 0) {
      const keys = Object.keys(data[0]);
      setColumns(keys.map(k => ({ id: k, selected: true })));
    } else if (isOpen && (!data || data.length === 0)) {
      setColumns([]);
    }
  }, [isOpen, data]);

  const handleToggleAll = () => {
    const allSelected = columns.every(c => c.selected);
    setColumns(columns.map(c => ({ ...c, selected: !allSelected })));
  };

  const handleToggleItem = (id: string) => {
    setColumns(columns.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  // ==========================================
  // DRAG & DROP LOGIC (KÉO THẢ SẮP XẾP)
  // ==========================================
  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragEnter = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) return;
    const newCols = [...columns];
    const draggedItem = newCols[draggedIdx];
    newCols.splice(draggedIdx, 1);
    newCols.splice(idx, 0, draggedItem);
    setDraggedIdx(idx);
    setColumns(newCols);
  };
  const handleDragEnd = () => setDraggedIdx(null);

  // ==========================================
  // THỰC THI XUẤT DỮ LIỆU ĐÃ TÙY CHỈNH
  // ==========================================
  const handleExport = () => {
    const selectedCols = columns.filter(c => c.selected);
    if (selectedCols.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 cột dữ liệu để xuất!");
      return;
    }

    // Dynamic Headers Order
    const headers: any = {};
    selectedCols.forEach(c => {
      headers[c.id] = c.id; 
    });

    exportToCSV(data, filename, headers);
    onClose();
  };

  const selectedCount = columns.filter(c => c.selected).length;

  const modalFooter = (
    <div className="flex w-full items-center justify-between transition-colors duration-500">
      <p className="text-[11px] font-bold text-slate-400 hidden sm:block">
        Mẹo: Kéo thả các cột để thay đổi vị trí xuất hiện trong Excel.
      </p>
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button 
          onClick={onClose} 
          className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-all duration-500 active:scale-95"
        >
          Hủy
        </button>
        <button 
          onClick={handleExport} 
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all duration-500 active:scale-95"
        >
          <Download className="w-4 h-4" /> Xuất File Mới
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tùy chỉnh Dữ liệu Xuất"
      subtitle="Chọn và sắp xếp các cột bạn muốn hiển thị trong báo cáo Excel/CSV."
      icon={<FileSpreadsheet className="w-6 h-6 text-emerald-500" />}
      maxWidth="max-w-md"
      footer={modalFooter}
    >
      <div className="p-6 transition-colors duration-500">
        
        {/* HEADER ĐIỀU KHIỂN */}
        <div className="flex items-center justify-between mb-5 bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm transition-colors duration-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-300">Cột dữ liệu ({selectedCount}/{columns.length})</h4>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400 font-bold mt-0.5">Kéo thả <GripVertical className="inline w-3 h-3"/> để sắp xếp</p>
            </div>
          </div>
          <button 
            onClick={handleToggleAll} 
            className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 px-3 py-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors shadow-sm active:scale-95"
          >
            {selectedCount === columns.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
        </div>

        {/* DANH SÁCH CỘT (DRAG & DROP) */}
        <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto custom-scrollbar pr-2 pb-2">
          {columns.map((col, idx) => (
            <motion.div
              layout
              key={col.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                "flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-grab active:cursor-grabbing transition-all duration-300",
                draggedIdx === idx 
                  ? "opacity-60 scale-95 border-emerald-500 shadow-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/20 z-10" 
                  : "border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md",
                !col.selected && "opacity-60 bg-slate-50 dark:bg-slate-800 border-dashed"
              )}
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-slate-300 dark:text-slate-600 cursor-grab hover:text-emerald-500 transition-colors" />
                <span className={cn("text-sm font-bold transition-colors", col.selected ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500 line-through")}>
                  {col.id}
                </span>
              </div>
              <button 
                onClick={() => handleToggleItem(col.id)} 
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 shadow-inner border", 
                  col.selected 
                    ? "bg-emerald-500 border-emerald-600 text-white" 
                    : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                <Check className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
          {columns.length === 0 && (
            <div className="text-center p-8 text-slate-400 font-bold text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              Không có dữ liệu để tùy chỉnh
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}