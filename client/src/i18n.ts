// src/i18n.ts
"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// ==========================================
// AUTO-LOAD LOCALE FILES (Tự động sinh bởi Máy quét)
// ==========================================
import enTranslation from "../public/locales/en/translation.json";
import viTranslation from "../public/locales/vi/translation.json";

const resources = {
  en: { translation: enTranslation },
  vi: { translation: viTranslation },
};

i18n
  // Tự động nhận diện ngôn ngữ trình duyệt của User
  .use(LanguageDetector)
  // Kết nối với React
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "vi", // Nếu lỗi, mặc định dùng Tiếng Việt
    
    // Tắt tính năng tách key bằng dấu chấm (.) để hỗ trợ Natural Language Key
    keySeparator: false,
    nsSeparator: false,

    interpolation: {
      escapeValue: false, // React đã tự động chống XSS, không cần bật cái này
    },
    
    detection: {
      // Ưu tiên lưu ngôn ngữ trong localStorage để đồng bộ với state Redux
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "app_lang",
    },
  });

export default i18n;