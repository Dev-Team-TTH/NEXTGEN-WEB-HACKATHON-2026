// ==========================================
// ENTERPRISE EXPORT UTILITIES
// Bộ công cụ xuất file an toàn, chuẩn xác, hỗ trợ UTF-8 cho tiếng Việt
// ==========================================

import { formatDate, formatDateTime } from "./formatters";

/**
 * 1. HÀM LÕI (INTERNAL HELPER): Tạo và tải file từ Blob
 * Tự động giải phóng bộ nhớ (revokeObjectURL) để chống Memory Leak
 */
const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  
  // Tương thích với các trình duyệt ẩn
  document.body.appendChild(link);
  link.click();
  
  // Dọn dẹp DOM và Memory
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * 2. HÀM XỬ LÝ CHUỖI (INTERNAL HELPER): Làm sạch dữ liệu từng ô
 * Ngăn chặn lỗi vỡ cấu trúc CSV khi dữ liệu chứa dấu phẩy, ngoặc kép hoặc xuống dòng
 */
const sanitizeCellData = (data: any): string => {
  if (data === null || data === undefined) return "";
  
  // Nếu là Date object
  if (data instanceof Date) return formatDateTime(data);
  
  // Chuyển mọi thứ về chuỗi
  let stringData = String(data);
  
  // Nếu dữ liệu có chứa dấu phẩy, ngoặc kép hoặc xuống dòng -> Phải bọc trong dấu ngoặc kép
  if (stringData.includes(",") || stringData.includes('"') || stringData.includes("\n")) {
    // Escape dấu ngoặc kép bên trong bằng cách nhân đôi ("") theo chuẩn RFC 4180
    stringData = `"${stringData.replace(/"/g, '""')}"`;
  }
  
  return stringData;
};

// ==========================================
// PUBLIC EXPORT FUNCTIONS
// ==========================================

/**
 * Xuất mảng Object thành file CSV (Đọc chuẩn tiếng Việt trên MS Excel)
 * * @param data Mảng dữ liệu cần xuất (VD: [{ id: 1, name: "Nguyễn Văn A" }])
 * @param filename Tên file mong muốn (không cần đuôi .csv)
 * @param headers Mapping tiêu đề cột (Tùy chọn). VD: { id: "Mã NV", name: "Họ và Tên" }
 */
export const exportToCSV = <T extends Record<string, any>>(
  data: T[], 
  filename: string, 
  headers?: Partial<Record<keyof T, string>>
): void => {
  if (!data || !data.length) {
    console.warn("Export CSV: Dữ liệu trống.");
    return;
  }

  // Lấy danh sách keys từ object đầu tiên
  const keys = Object.keys(data[0]) as Array<keyof T>;
  
  // Xây dựng hàng Tiêu đề (Header Row)
  const headerRow = keys.map(key => {
    const headerLabel = headers && headers[key] ? headers[key] : key;
    return sanitizeCellData(headerLabel);
  }).join(",");

  // Xây dựng các hàng Dữ liệu (Data Rows)
  const dataRows = data.map(item => {
    return keys.map(key => sanitizeCellData(item[key])).join(",");
  });

  // Gộp Header và Data
  const csvContent = [headerRow, ...dataRows].join("\n");

  // THEO CHUẨN ENTERPRISE: Thêm ký tự BOM (Byte Order Mark) cho UTF-8
  // Microsoft Excel bắt buộc phải có BOM \uFEFF ở đầu file CSV để nhận diện đúng font tiếng Việt.
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  // Tải file
  const safeFilename = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${formatDate(new Date()).replace(/\//g, '')}.csv`;
  downloadFile(blob, safeFilename);
};

/**
 * Xuất dữ liệu Hệ thống ra file JSON (Phục vụ Backup / Migration)
 */
export const exportToJSON = (data: any, filename: string): void => {
  if (!data) return;
  
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  
  const safeFilename = `${filename}_backup_${Date.now()}.json`;
  downloadFile(blob, safeFilename);
};

/**
 * Lấy dữ liệu trực tiếp từ 1 thẻ HTML Table và xuất ra định dạng Excel (.xls)
 * Phù hợp xuất các báo cáo Kế toán có merge cột (colspan/rowspan) mà CSV không làm được.
 * * @param tableId ID của thẻ <table> trên giao diện
 * @param filename Tên file mong muốn
 */
export const exportTableToExcel = (tableId: string, filename: string): void => {
  const table = document.getElementById(tableId);
  if (!table) {
    console.error(`Export Excel: Không tìm thấy Table với ID '${tableId}'`);
    return;
  }

  // Cấu trúc HTML template chuẩn để Excel nhận diện được
  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; }
          td, th { border: 1px solid #ddd; padding: 4px; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <table>${table.innerHTML}</table>
      </body>
    </html>
  `;

  // Thay thế biến worksheet
  const htmlContent = template.replace("{worksheet}", "Report Data");
  
  // Dùng MIME type của Excel spreadsheet
  const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" });
  
  const safeFilename = `${filename}_${formatDate(new Date()).replace(/\//g, '')}.xls`;
  downloadFile(blob, safeFilename);
};

/**
 * Tiện ích in ấn Document (Mở cửa sổ Print của Browser)
 * Phục vụ in Phiếu Nhập Kho, Hóa đơn, Báo cáo...
 * * @param elementId ID của vùng HTML (div) cần in
 * @param documentTitle Tên chứng từ (hiển thị trên header của bản in)
 */
export const printElement = (elementId: string, documentTitle: string = "Document"): void => {
  const printElement = document.getElementById(elementId);
  if (!printElement) {
    console.error(`Print: Không tìm thấy vùng dữ liệu với ID '${elementId}'`);
    return;
  }

  // Tạo một iframe ẩn để không làm ảnh hưởng giao diện hiện tại
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) return;

  // Lấy toàn bộ thẻ <style> và <link> từ trang gốc để giữ nguyên CSS (Tailwind)
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(style => style.outerHTML)
    .join('');

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${documentTitle}</title>
        <meta charset="UTF-8">
        ${styles}
        <style>
          /* CSS tối ưu riêng cho lúc in giấy */
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 20px; }
            .no-print { display: none !important; }
            /* Ẩn URL trang web ở cuối trang khi in trên Chrome */
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body onload="window.print(); window.setTimeout(function(){ window.parent.document.body.removeChild(window.frameElement); }, 500);">
        ${printElement.innerHTML}
      </body>
    </html>
  `);
  iframeDoc.close();
};