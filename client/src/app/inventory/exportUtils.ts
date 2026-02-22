import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Product } from "@/state/api";

export const exportInventoryToExcel = async (filteredProducts: Product[]) => {
  if (!filteredProducts || filteredProducts.length === 0) {
    throw new Error("No data");
  }

  const workbook = new ExcelJS.Workbook();
  // Ẩn Gridlines mặc định để file trông giống bản báo cáo chuyên nghiệp
  const worksheet = workbook.addWorksheet("BaoCaoTonKho", { views: [{ showGridLines: false }] });

  // --- PHẦN 1: THÔNG TIN CHUNG & TIÊU ĐỀ ---
  worksheet.mergeCells('A1:M1'); // Tăng lên M vì thêm 1 cột Ảnh
  const companyCell = worksheet.getCell('A1');
  companyCell.value = 'HỆ THỐNG QUẢN TRỊ KHO TẬP ĐOÀN (ERP)';
  companyCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  companyCell.alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.mergeCells('A2:M2');
  const titleCell = worksheet.getCell('A2');
  titleCell.value = 'BÁO CÁO TỔNG HỢP MASTER DATA & TỒN KHO CÓ HÌNH ẢNH';
  titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF111827' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A3:M3');
  const dateCell = worksheet.getCell('A3');
  dateCell.value = `Thời gian trích xuất: ${new Date().toLocaleString('vi-VN')}`;
  dateCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF4B5563' } };
  dateCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.addRow([]); // Dòng 4 trống

  // --- PHẦN 2: HEADER BẢNG DỮ LIỆU ---
  const headerRow = worksheet.addRow([
    "STT", "Hình Ảnh", "Mã SKU", "Tên Sản Phẩm", "Danh Mục", "Trạng Thái", 
    "Giá Vốn", "Giá Bán", "Lợi Nhuận", "Tồn Kho", "Đơn vị tính", 
    "Vị trí Kho", "Cảnh Báo"
  ]);

  worksheet.columns = [
    { key: "stt", width: 6 },
    { key: "image", width: 15 }, // CỘT 2: Cột chứa hình ảnh
    { key: "id", width: 16 },
    { key: "name", width: 45 },
    { key: "category", width: 22 },
    { key: "status", width: 18 },
    { key: "purchasePrice", width: 15 },
    { key: "price", width: 15 },
    { key: "profit", width: 15 },
    { key: "stock", width: 15 },
    { key: "uom", width: 25 },
    { key: "location", width: 20 },
    { key: "reorder", width: 15 },
  ];

  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }; 
    cell.font = { name: 'Arial', bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });
  headerRow.height = 30;
  worksheet.autoFilter = "A5:M5";

  // --- PHẦN 3: ĐIỀN DỮ LIỆU, TÔ MÀU & NHÚNG ẢNH ---
  let totalStockValue = 0;
  let totalExpectedRevenue = 0;

  filteredProducts.forEach((item, index) => {
    const translateStatus = (st: string) => {
      if (st === "OUT_OF_STOCK") return "Tạm hết hàng";
      if (st === "DISCONTINUED") return "Ngừng KD";
      return "Đang bán";
    };

    const purPrice = item.purchasePrice || 0;
    const sellPrice = item.price || 0;
    const profit = sellPrice - purPrice;
    
    totalStockValue += purPrice * item.stockQuantity;
    totalExpectedRevenue += sellPrice * item.stockQuantity;

    const rate = item.conversionRate || 1;
    const uomText = item.largeUnit && rate > 1 
      ? `${item.baseUnit} (1 ${item.largeUnit} = ${rate})` 
      : item.baseUnit;
    
    const isLowStock = item.stockQuantity <= (item.reorderPoint || 10) && item.status !== "DISCONTINUED";

    // Thêm dòng với cột Image để trống (ta sẽ chèn hình đè lên ô này sau)
    const row = worksheet.addRow([
      index + 1,
      "", // Ô hình ảnh tạm thời để trống text
      item.productId,
      item.name,
      item.category || "Chưa phân loại",
      translateStatus(item.status || "ACTIVE"),
      purPrice,
      sellPrice,
      profit,
      item.stockQuantity,
      uomText,
      item.location || "N/A",
      item.reorderPoint || 10
    ]);

    // Kéo giãn chiều cao dòng để nhét vừa ảnh (Cao 65 điểm Excel)
    row.height = 65;

    // --- THUẬT TOÁN NHÚNG ẢNH VÀO EXCEL ---
    if (item.imageUrl && item.imageUrl.startsWith('data:image')) {
      try {
        // Tách chuỗi Base64: Lấy phần sau dấu phẩy
        const base64Data = item.imageUrl.split(',')[1];
        // Xác định đuôi ảnh (png, jpeg)
        const mimeType = item.imageUrl.match(/data:image\/([a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'png';
        const extension = (mimeType === 'jpeg' || mimeType === 'jpg') ? 'jpeg' : 'png';

        // Đưa ảnh vào bộ nhớ của Workbook
        const imageId = workbook.addImage({
          base64: base64Data,
          extension: extension as any,
        });

        // Neo ảnh vào cột số 2 (Hình Ảnh), tính toán Padding để ảnh nằm giữa ô
        // ExcelJS dùng hệ tọa độ zero-based: col 1 = cột B. row.number - 1 = dòng hiện tại.
        worksheet.addImage(imageId, {
          tl: { col: 1.15, row: row.number - 1 + 0.1 }, // tl: Top-Left (Cách trái 1.15 ô, cách trên 0.1 ô)
          ext: { width: 75, height: 75 }, // Kích thước ảnh xuất ra (Pixel)
          editAs: 'oneCell' // Thuộc tính giúp ảnh di chuyển/xóa theo ô
        });
      } catch (error) {
        console.error("Lỗi chèn ảnh cho sản phẩm: ", item.name, error);
        worksheet.getCell(`B${row.number}`).value = "(Lỗi ảnh)";
      }
    } else {
      // Nếu không có ảnh
      const noImageCell = worksheet.getCell(`B${row.number}`);
      noImageCell.value = "Không có ảnh";
      noImageCell.font = { italic: true, color: { argb: "FF9CA3AF" }, size: 9 };
    }

    // --- ĐỊNH DẠNG CÁC Ô CÒN LẠI TƯƠNG TỰ ---
    row.eachCell((cell, colNumber) => {
      // Căn lề
      if (colNumber === 4) { // Tên Sản Phẩm là cột 4
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      }

      // Format Tiền tệ ($) cho Giá vốn(7), Giá bán(8), Lợi nhuận(9)
      if ([7, 8, 9].includes(colNumber)) cell.numFmt = '"$"#,##0.00';
      // Format Số lượng cho Tồn kho(10), Cảnh báo(13)
      if ([10, 13].includes(colNumber)) cell.numFmt = '#,##0';

      let bgColor = index % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      let fontColor = "FF111827";

      // CẢNH BÁO TỒN KHO: Cột 10
      if (isLowStock && colNumber === 10) { 
        bgColor = "FFFEE2E2"; 
        fontColor = "FFDC2626"; 
        cell.font = { bold: true, color: { argb: fontColor } };
      }
      
      // HÀNG NGỪNG KINH DOANH
      if (item.status === "DISCONTINUED") {
        fontColor = "FF9CA3AF"; 
        if(colNumber !== 10 || !isLowStock) cell.font = { italic: true, color: { argb: fontColor } };
      }

      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // --- PHẦN 4: DÒNG TỔNG KẾT (SUMMARY) CUỐI CÙNG ---
  worksheet.addRow([]); // Dòng trống cách
  
  const summaryRow = worksheet.addRow([
    "", "", "", "TỔNG CỘNG / DỰ KIẾN", "", "", 
    totalStockValue, totalExpectedRevenue, totalExpectedRevenue - totalStockValue, "", "", "", ""
  ]);
  
  summaryRow.height = 25; // Chiều cao dòng tổng

  summaryRow.eachCell((cell, colNumber) => {
    if ([4, 7, 8, 9].includes(colNumber)) {
      cell.font = { bold: true, size: 12, color: { argb: "FF0F172A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      cell.border = {
        top: { style: 'double', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'double', color: { argb: 'FF94A3B8' } }
      };
      if ([7, 8, 9].includes(colNumber)) cell.numFmt = '"$"#,##0.00';
    }
  });
  
  // Merge chữ "TỔNG CỘNG" cho đẹp
  worksheet.mergeCells(`D${summaryRow.number}:F${summaryRow.number}`);
  worksheet.getCell(`D${summaryRow.number}`).alignment = { horizontal: 'right', vertical: 'middle' };

  // --- KẾT XUẤT FILE ---
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `BaoCao_CoHinhAnh_${new Date().getTime()}.xlsx`);
};