"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { instantToCivilVN } from "@/lib/dates";
import { getEmailProvider } from "@/lib/email";
import { renderReminderEmail } from "@/lib/email/templates/reminder";
import { siteUrl } from "@/lib/env";
import { solarToLunar } from "@/lib/lunar/vn-lunar";

export type SettingsState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function updateRemindTimeAction(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const value = String(formData.get("defaultRemindTime") ?? "");

  if (!TIME_PATTERN.test(value)) {
    return { status: "error", message: "Giờ nhắc không hợp lệ." };
  }

  await db
    .update(profiles)
    .set({ defaultRemindTime: `${value}:00` })
    .where(eq(profiles.id, user.id));

  refresh();
  return { status: "success", message: "Đã lưu giờ nhắc mặc định." };
}

export async function sendTestEmailAction(): Promise<SettingsState> {
  const user = await requireUser();
  const today = instantToCivilVN(new Date());

  const template = renderReminderEmail({
    recipientName: user.fullName ?? user.email,
    eventTitle: "Email thử từ Remio",
    category: "other",
    eventNote:
      "Nếu bạn nhận được email này thì cấu hình Gmail SMTP đã hoạt động. Email nhắc thật sẽ có nội dung tương tự.",
    occurrenceDate: today,
    lunar: solarToLunar(today.day, today.month, today.year),
    daysBefore: 0,
    appUrl: siteUrl(),
  });

  try {
    await getEmailProvider().send({ to: user.email, ...template });
    return {
      status: "success",
      message: `Đã gửi email thử tới ${user.email}. Kiểm tra cả hộp thư rác nếu chưa thấy.`,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Lỗi không xác định";
    return { status: "error", message: `Gửi thất bại: ${detail}` };
  }
}
