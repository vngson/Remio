// Kiểm tra kết nối Postgres và in ra nguyên nhân cụ thể nếu thất bại.
// Chạy: npm run db:check
import { existsSync } from "node:fs";
import postgres from "postgres";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}

const runtimeUrl = process.env.DATABASE_URL;

if (!runtimeUrl) {
  console.error("Thiếu DATABASE_URL trong .env hoặc .env.local");
  process.exit(1);
}

const target = new URL(runtimeUrl);
console.log(
  `Máy chủ: ${target.hostname}:${target.port} · user: ${target.username}`,
);

async function probe(label, url) {
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });
  const started = Date.now();
  try {
    const [row] = await sql`select current_user, current_database()`;
    console.log(
      `✔ ${label}: OK (${Date.now() - started}ms) · ${row.current_user}@${row.current_database}`,
    );
    return true;
  } catch (error) {
    console.log(`✘ ${label}: ${error.code ?? "?"} ${error.message}`);
    return false;
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {});
  }
}

const runtimeOk = await probe("DATABASE_URL (app dùng khi chạy)", runtimeUrl);

const directUrl = process.env.DIRECT_URL;

if (directUrl) {
  await probe("DIRECT_URL (migration dùng)", directUrl);
} else {
  const sessionUrl = new URL(runtimeUrl);
  sessionUrl.port = "5432";
  console.log(
    "\nChưa có DIRECT_URL. Migration nên chạy qua session pooler — thử cùng máy chủ ở cổng 5432:",
  );
  const sessionOk = await probe("session pooler 5432", sessionUrl.toString());
  if (sessionOk) {
    console.log(
      `\n→ Thêm dòng sau vào .env để migration hoạt động:\n   DIRECT_URL="${sessionUrl.toString()}"`,
    );
  }
}

if (!runtimeOk) {
  console.error(
    [
      "",
      "Gợi ý sửa lỗi:",
      "- 28P01 (password authentication failed): mật khẩu sai. Vào Supabase → Project Settings →",
      "  Database → Reset database password, rồi dán lại mật khẩu mới vào DATABASE_URL.",
      "  Nếu mật khẩu chứa ký tự đặc biệt (@ # ? / : %), phải percent-encode trong URL.",
      "- ENOTFOUND / ETIMEDOUT: sai host, hoặc project đang bị tạm dừng.",
      "- 3D000: sai tên database (thường là 'postgres').",
      "",
      "Lưu ý về cổng: cổng 6543 (transaction pooler) dùng cho ứng dụng khi chạy;",
      "cổng 5432 (session pooler) dùng khi chạy migration/DDL.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
