/**
 * TTH ERP - ENTERPRISE EXPORT UTILITIES
 * Bộ công cụ xuất file nội bộ an toàn, chuẩn xác, hỗ trợ UTF-8 cho tiếng Việt.
 * Được bọc thép chống Memory Leak (Tràn RAM) khi xuất dữ liệu lớn.
 */

import { formatDate, formatDateTime } from "./formatters";

// ==========================================
// 1. INTERNAL HELPERS (HÀM LÕI ẨN)
// ==========================================

/**
 * Tạo và tải file từ Blob.
 * Tự động giải phóng bộ nhớ (revokeObjectURL) ngay lập tức để chống Memory Leak.
 */
const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  
  // Tương thích với các trình duyệt ẩn, bắt buộc phải append vào DOM
  document.body.appendChild(link);
  link.click();
  
  // Dọn dẹp DOM và Memory ngay sau khi click
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Làm sạch dữ liệu từng ô Excel/CSV.
 * Ngăn chặn lỗi vỡ cấu trúc khi dữ liệu chứa dấu phẩy, ngoặc kép, xuống dòng, hoặc là Object lồng nhau.
 */
const sanitizeCellData = (data: unknown): string => {
  if (data === null || data === undefined) return "";
  
  // Xử lý Ngày tháng
  if (data instanceof Date) return formatDateTime(data);
  
  // Xử lý Object/Array lồng nhau (Chống lỗi in ra [object Object])
  if (typeof data === 'object') {
    try {
      const jsonString = JSON.stringify(data);
      return `"${jsonString.replace(/"/g, '""')}"`;
    } catch (e) {
      return "[Complex Data]";
    }
  }
  
  // Chuyển mọi thứ về chuỗi cơ bản
  let stringData = String(data);
  
  // Theo chuẩn RFC 4180: Nếu chuỗi có dấu phẩy, ngoặc kép hoặc newline -> Bọc trong ngoặc kép và escape
  if (stringData.includes(",") || stringData.includes('"') || stringData.includes("\n")) {
    stringData = `"${stringData.replace(/"/g, '""')}"`;
  }
  
  return stringData;
};

// ==========================================
// 2. PUBLIC EXPORT FUNCTIONS (HÀM XUẤT RA NGOÀI)
// ==========================================

/**
 * Xuất mảng Object thành file CSV (Đọc chuẩn tiếng Việt trên MS Excel).
 * Tự động chèn BOM (Byte Order Mark) để chống lỗi font.
 * * @param data Mảng dữ liệu cần xuất (VD: [{ id: 1, name: "Nguyễn Văn A" }])
 * @param filename Tên file mong muốn (không cần đuôi .csv)
 * @param headers Mapping tiêu đề cột (Tùy chọn). VD: { id: "Mã NV", name: "Họ và Tên" }
 */
export const exportToCSV = <T extends Record<string, any>>(
  data: T[], 
  filename: string, 
  headers?: Partial<Record<keyof T, string>>
): void => {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn("Export CSV: Dữ liệu truyền vào trống hoặc không hợp lệ.");
      return;
    }

    // Lấy danh sách keys từ object đầu tiên
    const keys = Object.keys(data[0]) as Array<keyof T>;
    
    // Xây dựng hàng Tiêu đề (Header Row)
    const headerRow = keys.map(key => {
      const headerLabel = headers && headers[key] ? headers[key] : String(key);
      return sanitizeCellData(headerLabel);
    }).join(",");

    // Xây dựng các hàng Dữ liệu (Data Rows)
    const dataRows = data.map(item => {
      return keys.map(key => sanitizeCellData(item[key])).join(",");
    });

    // Gộp Header và Data
    const csvContent = [headerRow, ...dataRows].join("\n");

    // THEO CHUẨN ENTERPRISE: Thêm ký tự BOM (Byte Order Mark) cho UTF-8
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

    // Format tên file an toàn (Bỏ ký tự đặc biệt, thêm timestamp)
    const safeFilename = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${formatDate(new Date()).replace(/\//g, '')}.csv`;
    downloadFile(blob, safeFilename);
  } catch (error) {
    console.error("Lỗi nghiêm trọng khi xuất CSV:", error);
  }
};

/**
 * Xuất dữ liệu Hệ thống ra file JSON nguyên bản (Phục vụ Backup / Migration)
 * * @param data Bất kỳ cấu trúc dữ liệu nào (Mảng, Object...)
 * @param filename Tên file mong muốn
 */
export const exportToJSON = <T>(data: T, filename: string): void => {
  try {
    if (!data) return;
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    
    const safeFilename = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_backup_${Date.now()}.json`;
    downloadFile(blob, safeFilename);
  } catch (error) {
    console.error("Lỗi khi xuất file JSON:", error);
  }
};

/**
 * Lấy dữ liệu trực tiếp từ 1 thẻ HTML Table và xuất ra định dạng Excel (.xls).
 * Bắt buộc dùng cho các báo cáo Kế toán có cấu trúc gộp ô (colspan/rowspan) phức tạp.
 * * @param tableId ID của thẻ <table> trên giao diện (Không kèm dấu #)
 * @param filename Tên file mong muốn
 */
export const exportTableToExcel = (tableId: string, filename: string): void => {
  try {
    const table = document.getElementById(tableId);
    if (!table) {
      console.error(`Export Excel: Không tìm thấy Table với ID '${tableId}' trên DOM.`);
      return;
    }

    // Cấu trúc HTML template chuẩn để Microsoft Excel nhận diện được
    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; }
            td, th { border: 1px solid #dddddd; padding: 6px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>${table.innerHTML}</table>
        </body>
      </html>
    `;

    // Thay thế biến worksheet name
    const htmlContent = template.replace("{worksheet}", "Data Report");
    
    // Dùng MIME type tiêu chuẩn của Excel spreadsheet cũ
    const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    
    const safeFilename = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${formatDate(new Date()).replace(/\//g, '')}.xls`;
    downloadFile(blob, safeFilename);
  } catch (error) {
    console.error("Lỗi khi xuất Table ra Excel:", error);
  }
};

/**
 * Tiện ích in ấn Document (Mở cửa sổ Print của Browser một cách âm thầm).
 * Phục vụ in Phiếu Nhập Kho, Hóa đơn, Ủy nhiệm chi mà không làm hỏng giao diện hiện tại.
 * * @param elementId ID của vùng HTML (div) cần in
 * @param documentTitle Tên chứng từ (Hiển thị trên header của bản in giấy)
 */
export const printElement = (elementId: string, documentTitle: string = "Document"): void => {
  try {
    const printContent = document.getElementById(elementId);
    if (!printContent) {
      console.error(`Print: Không tìm thấy vùng dữ liệu với ID '${elementId}'`);
      return;
    }

    // Khởi tạo một iframe ẩn hoàn toàn
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }

    // Clone toàn bộ thẻ <style> và <link> từ trang gốc để giữ nguyên CSS (Tailwind)
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <title>${documentTitle}</title>
          <meta charset="UTF-8">
          ${styles}
          <style>
            /* CSS tối ưu riêng cho lúc in giấy (Print Media Query) */
            @media print {
              body { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
                background-color: white !important;
                margin: 0;
                padding: 20px;
              }
              .no-print { display: none !important; }
              /* Ẩn tiêu đề URL và số trang do trình duyệt tự sinh */
              @page { margin: 1cm; size: auto; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            // Tự động gọi lệnh in khi iframe load xong, sau đó tự hủy iframe để giải phóng DOM
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                // Xóa iframe sau khi hộp thoại in đóng lại
                setTimeout(function() {
                  if (window.parent && window.parent.document.body.contains(window.frameElement)) {
                    window.parent.document.body.removeChild(window.frameElement);
                  }
                }, 500);
              }, 200); // Trì hoãn 200ms để đảm bảo CSS load xong
            };
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();
  } catch (error) {
    console.error("Lỗi khi thực thi lệnh in:", error);
  }
};