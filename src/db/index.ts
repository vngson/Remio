import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Thiếu biến môi trường DATABASE_URL");
}

const globalForDb = globalThis as unknown as {
  remioSqlClient?: ReturnType<typeof postgres>;
};

/**
 * Supabase pooler ở chế độ transaction (cổng 6543) không hỗ trợ prepared
 * statements, và serverless cần giới hạn số connection mỗi instance.
 */
const client =
  globalForDb.remioSqlClient ??
  postgres(connectionString, { prepare: false, max: 1 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.remioSqlClient = client;
}

export const db = drizzle(client, { schema });
