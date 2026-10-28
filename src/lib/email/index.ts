import { createGmailProvider } from "./gmail";
import type { EmailProvider } from "./provider";

let provider: EmailProvider | null = null;

/**
 * Điểm truy cập duy nhất tới dịch vụ gửi mail. Khi vượt giới hạn của Gmail,
 * chỉ cần thêm một implementation mới (Resend, SES…) và đổi ở đây.
 */
export function getEmailProvider(): EmailProvider {
  provider ??= createGmailProvider();
  return provider;
}

export type { EmailMessage, EmailProvider } from "./provider";
