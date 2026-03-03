// i18next-parser.config.js
module.exports = {
  contextSeparator: '_',
  createOldCatalogs: false, // Không tạo file backup rác
  defaultNamespace: 'translation',
  indentation: 2,
  
  // TỰ ĐỘNG XÓA: Nếu bạn xóa 1 dòng code t('...'), nó sẽ tự xóa key đó trong file JSON
  keepRemoved: false, 
  
  // TẮT DẤU CHẤM: Cho phép Key là một câu văn hoàn chỉnh (VD: "Chào mừng trở lại")
  keySeparator: false, 
  namespaceSeparator: false,

  lexers: {
    ts: ['JavascriptLexer'],
    tsx: ['JsxLexer'],
    default: ['JavascriptLexer'],
  },
  
  locales: ['en', 'vi'], // Các ngôn ngữ hệ thống hỗ trợ
  output: 'public/locales/$LOCALE/$NAMESPACE.json', // Nơi lưu file tự động
  input: ['src/**/*.{js,jsx,ts,tsx}'], // Thư mục Bot sẽ quét
  
  sort: true, // Tự động xếp theo bảng chữ cái A-Z cho dễ nhìn
  
  // SIÊU QUAN TRỌNG: Lấy luôn Tiếng Việt làm Default Value cho file vi.json
  useKeysAsDefaultValue: ['vi'], 
};