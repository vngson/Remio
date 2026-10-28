import { formatCivil, weekdayLabel, type CivilDate } from "@/lib/dates";
import { EVENT_CATEGORY_LABELS, type EventCategory } from "@/lib/events/types";
import type { OccurrenceAdjustment } from "@/lib/lunar/occurrences";
import type { LunarDate } from "@/lib/lunar/vn-lunar";

export interface ReminderEmailInput {
  recipientName: string;
  eventTitle: string;
  category: EventCategory;
  eventNote: string | null;
  occurrenceDate: CivilDate;
  lunar: LunarDate;
  daysBefore: number;
  adjustment?: OccurrenceAdjustment;
  appUrl: string;
}

const LUNAR_MONTH_NAMES = [
  "",
  "Giêng",
  "Hai",
  "Ba",
  "Tư",
  "Năm",
  "Sáu",
  "Bảy",
  "Tám",
  "Chín",
  "Mười",
  "Một",
  "Chạp",
];

export function lunarMonthName(month: number): string {
  return LUNAR_MONTH_NAMES[month] ?? `tháng ${month}`;
}

const ADJUSTMENT_NOTES: Record<OccurrenceAdjustment, string> = {
  "feb-29":
    "Năm nay không phải năm nhuận nên ngày 29/02 được tính thành ngày 28/02.",
  "lunar-day-30":
    "Tháng âm lịch này chỉ có 29 ngày nên ngày 30 được tính thành ngày 29.",
  "short-month": "Tháng này không đủ ngày nên được tính vào ngày cuối tháng.",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function countdownLabel(daysBefore: number): string {
  if (daysBefore === 0) {
    return "Hôm nay";
  }
  if (daysBefore === 1) {
    return "Ngày mai";
  }
  return `Còn ${daysBefore} ngày`;
}

export function renderReminderEmail(input: ReminderEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const lunarLabel = `ngày ${input.lunar.day} tháng ${lunarMonthName(
    input.lunar.month,
  )}${input.lunar.leap ? " (nhuận)" : ""}`;
  const solarLabel = `${weekdayLabel(input.occurrenceDate)}, ${formatCivil(
    input.occurrenceDate,
  )}`;
  const countdown = countdownLabel(input.daysBefore);
  const category = EVENT_CATEGORY_LABELS[input.category];
  const adjustmentNote = input.adjustment
    ? ADJUSTMENT_NOTES[input.adjustment]
    : null;

  const subject =
    input.daysBefore === 0
      ? `Hôm nay: ${input.eventTitle}`
      : `${countdown}: ${input.eventTitle} (${formatCivil(
          input.occurrenceDate,
        )})`;

  const lines = [
    `Xin chào ${input.recipientName},`,
    "",
    `${countdown} là ${input.eventTitle}.`,
    "",
    `• Dương lịch: ${solarLabel}`,
    `• Âm lịch: ${lunarLabel}`,
    `• Phân loại: ${category}`,
  ];
  if (input.eventNote) {
    lines.push("", `Ghi chú: ${input.eventNote}`);
  }
  if (adjustmentNote) {
    lines.push("", `Lưu ý: ${adjustmentNote}`);
  }
  lines.push(
    "",
    `Mở Remio để xem chi tiết: ${input.appUrl}/events`,
    "",
    "Bạn nhận được email này vì đã bật nhắc nhở cho sự kiện này trong Remio.",
  );

  const html = `<!doctype html>
<html lang="vi">
  <body style="margin:0;padding:24px;background:#f7f4f0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2724;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr>
        <td style="padding-bottom:16px;font-size:16px;font-weight:700;color:#b03a2e;">Remio</td>
      </tr>
      <tr>
        <td style="background:#ffffff;border-radius:16px;padding:28px;border:1px solid #ece6df;">
          <p style="margin:0 0 8px;font-size:14px;color:#8a8078;">${escapeHtml(countdown)}</p>
          <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;">${escapeHtml(input.eventTitle)}</h1>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f4;border-radius:12px;">
            <tr>
              <td style="padding:16px;">
                <p style="margin:0;font-size:15px;font-weight:600;">${escapeHtml(solarLabel)}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#8a8078;">${escapeHtml(lunarLabel)} · ${escapeHtml(category)}</p>
              </td>
            </tr>
          </table>

          ${
            input.eventNote
              ? `<p style="margin:18px 0 0;font-size:14px;color:#4b443d;">${escapeHtml(input.eventNote)}</p>`
              : ""
          }
          ${
            adjustmentNote
              ? `<p style="margin:14px 0 0;font-size:13px;color:#8a8078;">${escapeHtml(adjustmentNote)}</p>`
              : ""
          }

          <p style="margin:24px 0 0;">
            <a href="${escapeHtml(input.appUrl)}/events" style="display:inline-block;background:#b03a2e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;">Xem trong Remio</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding-top:16px;font-size:12px;color:#8a8078;">
          Bạn nhận được email này vì đã bật nhắc nhở cho sự kiện này trong Remio.
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text: lines.join("\n") };
}
