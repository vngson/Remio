import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migration cần kết nối trực tiếp (hoặc session pooler); transaction pooler
    // không phù hợp để chạy DDL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
