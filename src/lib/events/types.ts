import type { CivilDate } from "../dates";

export type CalendarType = "solar" | "lunar";

export type Recurrence = "yearly" | "once" | "monthly" | "weekly";

export type EventCategory =
  | "birthday"
  | "anniversary"
  | "death_anniversary"
  | "holiday"
  | "other";

export interface EventSchedule {
  calendarType: CalendarType;
  recurrence: Recurrence;
  /** Tháng của sự kiện lặp hằng năm (1-12), theo `calendarType`. */
  month: number | null;
  /** Ngày của sự kiện lặp hằng năm (1-31 dương hoặc 1-30 âm). */
  day: number | null;
  /** Chỉ dùng cho âm lịch: sự kiện rơi vào tháng nhuận. */
  leapMonth: boolean;
  /** Mốc dương lịch cho sự kiện không lặp hằng năm. */
  anchorDate: CivilDate | null;
}

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  birthday: "Sinh nhật",
  anniversary: "Kỷ niệm",
  death_anniversary: "Ngày giỗ",
  holiday: "Ngày lễ",
  other: "Khác",
};

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  yearly: "Hằng năm",
  once: "Một lần",
  monthly: "Hằng tháng",
  weekly: "Hằng tuần",
};
