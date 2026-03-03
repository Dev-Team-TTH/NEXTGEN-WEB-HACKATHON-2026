import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Khởi tạo công cụ tương thích Flat Config của ESLint 9
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Kế thừa các bộ quy tắc chuẩn nhất của Next.js và TypeScript
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;