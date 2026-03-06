import cron from "node-cron";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// API tỷ giá mở của Vietcombank (Định dạng XML)
const VCB_EXCHANGE_RATE_API = "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx";

export const fetchAndSaveExchangeRates = async () => {
  try {
    console.log("[CRON] Bắt đầu tự động cập nhật Tỷ giá ngoại tệ...");

    // 1. Gọi API lấy dữ liệu từ Vietcombank
    const response = await axios.get(VCB_EXCHANGE_RATE_API);
    const xmlData = response.data;

    // 2. Chuyển đổi XML sang JSON
    const jsonData = await parseStringPromise(xmlData);
    const rates = jsonData.ExrateList.Exrate;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đưa về đầu ngày để so sánh lịch sử

    // 3. Quét danh sách tiền tệ đang có trong hệ thống (Loại trừ VND)
    const activeCurrencies = await prisma.currency.findMany({
      where: { currencyCode: { not: "VND" } }
    });

    let updatedCount = 0;

    for (const currency of activeCurrencies) {
      // Tìm tỷ giá tương ứng trong danh sách trả về của Vietcombank
      const vcbRate = rates.find((r: any) => r.$.CurrencyCode === currency.currencyCode);
      
      if (vcbRate) {
        // Lấy "Tỷ giá Bán" (Sell) làm chuẩn hạch toán
        const rawRate = vcbRate.$.Sell; 
        const parsedRate = Number(rawRate.replace(/,/g, "")); // Xóa dấu phẩy nghìn

        if (parsedRate > 0) {
          // Kiểm tra xem ngày hôm nay đã cập nhật tỷ giá cho đồng tiền này chưa
          const existingRate = await prisma.exchangeRate.findFirst({
            where: { 
              currencyCode: currency.currencyCode,
              validFrom: { gte: today } 
            }
          });

          if (existingRate) {
            // Nếu đã có rồi, chỉ cần cập nhật lại giá trị phòng khi có sai lệch
            await prisma.exchangeRate.update({
              where: { rateId: existingRate.rateId },
              data: { rate: parsedRate }
            });
          } else {
            // Nghiệp vụ Kế toán: Khóa tỷ giá cũ (Cập nhật validTo cho tỷ giá trước đó)
            await prisma.exchangeRate.updateMany({
              where: { 
                currencyCode: currency.currencyCode,
                validTo: null 
              },
              data: { validTo: today }
            });

            // Tạo mới tỷ giá của ngày hôm nay
            await prisma.exchangeRate.create({
              data: {
                currencyCode: currency.currencyCode,
                rate: parsedRate,
                validFrom: today
              }
            });
          }

          updatedCount++;
        }
      }
    }

    console.log(`[CRON] Thành công! Đã cập nhật tỷ giá cho ${updatedCount} loại ngoại tệ.`);

  } catch (error: any) {
    console.error("[CRON - ERROR] Lỗi khi cập nhật tỷ giá:", error.message);
  }
};

// ==========================================
// CẤU HÌNH LỊCH TRÌNH CHẠY (SCHEDULER)
// ==========================================
export const startCronJobs = () => {
  // Chạy vào lúc 08:05 sáng mỗi ngày (5 8 * * *)
  cron.schedule("5 8 * * *", () => {
    fetchAndSaveExchangeRates();
  }, {
    timezone: "Asia/Ho_Chi_Minh" // Múi giờ Việt Nam
  });

  console.log("⏰ Đã kích hoạt Bot tự động cập nhật tỷ giá (Chạy 8h05 sáng mỗi ngày).");
};