import { z } from "zod";
import { parseCivilKey } from "@/lib/dates";
import type { CalendarType, EventCategory, Recurrence } from "./types";

export const CALENDAR_TYPES = ["solar", "lunar"] as const;
export const RECURRENCES = ["yearly", "once", "monthly", "weekly"] as const;
export const CATEGORIES = [
  "birthday",
  "anniversary",
  "death_anniversary",
  "holiday",
  "other",
] as const;

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Nhập tên sự kiện").max(120, "Tên quá dài"),
    description: optionalText,
    category: z.enum(CATEGORIES),
    calendarType: z.enum(CALENDAR_TYPES),
    recurrence: z.enum(RECURRENCES),
    month: z.coerce.number().int().min(1).max(12).optional(),
    day: z.coerce.number().int().min(1).max(31).optional(),
    leapMonth: z.boolean(),
    anchorDate: z.string().optional(),
    remindTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ nhắc không hợp lệ"),
    remindDaysBefore: z
      .array(z.coerce.number().int().min(0).max(60))
      .min(1, "Chọn ít nhất một lần nhắc"),
  })
  .superRefine((value, ctx) => {
    if (value.calendarType === "lunar" && value.recurrence !== "yearly") {
      ctx.addIssue({
        code: "custom",
        path: ["recurrence"],
        message: "Sự kiện âm lịch chỉ hỗ trợ lặp hằng năm",
      });
      return;
    }

    if (value.recurrence === "yearly") {
      if (value.month === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["month"],
          message: "Chọn tháng",
        });
      }
      if (value.day === undefined) {
        ctx.addIssue({ code: "custom", path: ["day"], message: "Chọn ngày" });
      }
      const maxDay = value.calendarType === "lunar" ? 30 : 31;
      if (value.day !== undefined && value.day > maxDay) {
        ctx.addIssue({
          code: "custom",
          path: ["day"],
          message:
            value.calendarType === "lunar"
              ? "Tháng âm lịch chỉ có tối đa 30 ngày"
              : "Ngày không hợp lệ",
        });
      }
      return;
    }

    if (!value.anchorDate) {
      ctx.addIssue({
        code: "custom",
        path: ["anchorDate"],
        message: "Chọn ngày bắt đầu",
      });
      return;
    }
    if (Number.isNaN(parseCivilKey(value.anchorDate).day)) {
      ctx.addIssue({
        code: "custom",
        path: ["anchorDate"],
        message: "Ngày không hợp lệ",
      });
    }
  });

export interface EventInput {
  title: string;
  description: string | null;
  category: EventCategory;
  calendarType: CalendarType;
  recurrence: Recurrence;
  month: number | null;
  day: number | null;
  leapMonth: boolean;
  anchorDate: string | null;
  remindTime: string;
  remindDaysBefore: number[];
}

export type EventFormErrors = Partial<Record<string, string>>;

export type EventFormParseResult =
  | { ok: true; data: EventInput }
  | { ok: false; errors: EventFormErrors; message: string };

export function parseEventForm(formData: FormData): EventFormParseResult {
  const raw = {
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? undefined,
    category: formData.get("category") ?? "other",
    calendarType: formData.get("calendarType") ?? "solar",
    recurrence: formData.get("recurrence") ?? "yearly",
    month: formData.get("month") ?? undefined,
    day: formData.get("day") ?? undefined,
    leapMonth: formData.get("leapMonth") === "on",
    anchorDate: formData.get("anchorDate") ?? undefined,
    remindTime: formData.get("remindTime") ?? "08:00",
    remindDaysBefore: formData.getAll("remindDaysBefore"),
  };

  const result = eventFormSchema.safeParse(raw);

  if (!result.success) {
    const errors: EventFormErrors = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return {
      ok: false,
      errors,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
    };
  }

  const value = result.data;
  const isYearly = value.recurrence === "yearly";

  return {
    ok: true,
    data: {
      title: value.title,
      description: value.description ?? null,
      category: value.category,
      calendarType: value.calendarType,
      recurrence: value.recurrence,
      month: isYearly ? (value.month ?? null) : null,
      day: isYearly ? (value.day ?? null) : null,
      leapMonth: value.calendarType === "lunar" ? value.leapMonth : false,
      anchorDate: isYearly ? null : (value.anchorDate ?? null),
      remindTime: value.remindTime,
      remindDaysBefore: [...new Set(value.remindDaysBefore)].sort((a, b) => b - a),
    },
  };
}
