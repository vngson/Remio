/**
 * Truy cập biến môi trường.
 *
 * LƯU Ý QUAN TRỌNG: biến `NEXT_PUBLIC_*` chỉ được Next.js thay bằng giá trị thật
 * khi truy cập TĨNH, ví dụ `process.env.NEXT_PUBLIC_SUPABASE_URL`. Nếu truy cập
 * động (`process.env[name]`), trình duyệt sẽ nhận `undefined` và ứng dụng lỗi
 * ngay trên client dù server vẫn chạy bình thường.
 *
 * Vì vậy các getter bên dưới luôn truyền giá trị đã đọc tĩnh vào `requireEnv`,
 * không truyền tên biến.
 */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Thiếu biến môi trường ${name}. Xem .env.example.`);
  }
  return value;
}

export function supabaseUrl(): string {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function supabaseAnonKey(): string {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
}

export function cronSecret(): string {
  return requireEnv("CRON_SECRET", process.env.CRON_SECRET);
}

export function gmailUser(): string {
  return requireEnv("GMAIL_USER", process.env.GMAIL_USER);
}

export function gmailAppPassword(): string {
  return requireEnv("GMAIL_APP_PASSWORD", process.env.GMAIL_APP_PASSWORD);
}
