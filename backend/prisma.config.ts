// backend/prisma.config.ts
import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Chỉ giữ lại đúng dòng này
    url: process.env.DATABASE_URL, 
  },
});