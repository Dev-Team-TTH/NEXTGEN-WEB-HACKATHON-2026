"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend"; // THÊM MỚI: Tự động Lazy-load file JSON qua HTTP

// ==========================================
// TTH ENTERPRISE i18n CORE (Fully Automated)
// Kiến trúc Lazy-load: Giảm tải Bundle Size, tự động mapping thư mục
// ==========================================

i18n
  // 1. Tự động tải file ngôn ngữ từ public/locales/{{lng}}/translation.json (Không cần import thủ công)
  .use(HttpBackend)
  // 2. Tự động nhận diện ngôn ngữ trình duyệt hoặc lưu trữ người dùng
  .use(LanguageDetector)
  // 3. Kết nối sâu vào vòng đời React
  .use(initReactI18next)
  .init({
    // --- CẤU HÌNH TỰ ĐỘNG HÓA ---
    backend: {
      // Đường dẫn API gọi tệp JSON ngôn ngữ tương ứng
      loadPath: "/locales/{{lng}}/translation.json",
    },
    
    // Ngôn ngữ dự phòng nếu file ngôn ngữ mục tiêu bị lỗi hoặc không tìm thấy
    fallbackLng: "vi", 
    
    // Khai báo danh sách mã ngôn ngữ hệ thống đang hỗ trợ (Mở rộng thoải mái: "fr", "ja", "ko"...)
    supportedLngs: ["vi", "en"], 

    // --- CẤU HÌNH NGỮ NGHĨA (NATURAL LANGUAGE) ---
    // Tắt tính năng tách key bằng dấu chấm (.) để hỗ trợ Natural Language Key nguyên bản
    // VD: t("Xin chào thế giới") thay vì t("greeting.hello")
    keySeparator: false,
    nsSeparator: false,

    interpolation: {
      // React DOM đã tự động chống tấn công XSS (Cross-site scripting), nên tắt escape để tăng tốc độ parse
      escapeValue: false, 
    },
    
    // --- CẤU HÌNH NHẬN DIỆN VÀ ĐỒNG BỘ ---
    detection: {
      // Ưu tiên đọc từ localStorage trước (để đồng bộ với State Redux), sau đó mới fallback về cài đặt của trình duyệt
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "app_lang",
    },

    // --- CẤU HÌNH UX / HIỆU NĂNG TẢI ---
    react: {
      // Đặt false để ứng dụng tự fallback về tiếng Việt lập tức trong vài mili-giây JSON đang tải
      // (Ngăn chặn lỗi vỡ UI nếu bạn chưa bọc <Suspense> ở Layout gốc)
      useSuspense: false, 
    }
  });

export default i18n;