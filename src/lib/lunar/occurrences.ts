import {
  addDays,
  compareCivil,
  daysInSolarMonth,
  type CivilDate,
} from "@/lib/dates";
import type { EventSchedule } from "@/lib/events/types";
import { lunarMonthDays, lunarToSolar } from "./vn-lunar";

/**
 * Ghi chú khi ngày xảy ra phải điều chỉnh so với cấu hình của người dùng.
 */
export type OccurrenceAdjustment = "feb-29" | "lunar-day-30" | "short-month";

export interface Occurrence {
  date: CivilDate;
  adjustment?: OccurrenceAdjustment;
}

function collect(
  limit: number | undefined,
  occurrences: Occurrence[],
  value: Occurrence,
): boolean {
  occurrences.push(value);
  return limit !== undefined && occurrences.length >= limit;
}

function onceOccurrences(
  schedule: EventSchedule,
  from: CivilDate,
  to: CivilDate,
): Occurrence[] {
  const anchor = schedule.anchorDate;
  if (!anchor) {
    return [];
  }
  if (compareCivil(anchor, from) < 0 || compareCivil(anchor, to) > 0) {
    return [];
  }
  return [{ date: anchor }];
}

function weeklyOccurrences(
  schedule: EventSchedule,
  from: CivilDate,
  to: CivilDate,
  limit?: number,
): Occurrence[] {
  const anchor = schedule.anchorDate;
  if (!anchor) {
    return [];
  }

  const occurrences: Occurrence[] = [];
  let cursor = anchor;
  while (compareCivil(cursor, from) < 0) {
    cursor = addDays(cursor, 7);
  }
  while (compareCivil(cursor, to) <= 0) {
    if (collect(limit, occurrences, { date: cursor })) {
      return occurrences;
    }
    cursor = addDays(cursor, 7);
  }
  return occurrences;
}

function monthlyOccurrences(
  schedule: EventSchedule,
  from: CivilDate,
  to: CivilDate,
  limit?: number,
): Occurrence[] {
  const anchor = schedule.anchorDate;
  if (!anchor) {
    return [];
  }

  const occurrences: Occurrence[] = [];
  const lastMonth = { year: to.year, month: to.month };

  for (let year = from.year; year <= lastMonth.year; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      if (year === lastMonth.year && month > lastMonth.month) {
        break;
      }
      const daysInMonth = daysInSolarMonth(year, month);
      const day = Math.min(anchor.day, daysInMonth);
      const date: CivilDate = { year, month, day };
      if (compareCivil(date, from) < 0 || compareCivil(date, to) > 0) {
        continue;
      }
      const adjustment = anchor.day > daysInMonth ? "short-month" : undefined;
      if (collect(limit, occurrences, { date, adjustment })) {
        return occurrences;
      }
    }
  }
  return occurrences;
}

function solarYearlyOccurrences(
  schedule: EventSchedule,
  from: CivilDate,
  to: CivilDate,
  limit?: number,
): Occurrence[] {
  const { month, day } = schedule;
  if (month === null || day === null) {
    return [];
  }

  const occurrences: Occurrence[] = [];
  for (let year = from.year; year <= to.year; year += 1) {
    const daysInMonth = daysInSolarMonth(year, month);
    const adjusted = Math.min(day, daysInMonth);
    const date: CivilDate = { year, month, day: adjusted };
    if (compareCivil(date, from) < 0 || compareCivil(date, to) > 0) {
      continue;
    }
    // 29/02 là trường hợp riêng của năm nhuận dương lịch; các ngày 31 rơi vào
    // tháng thiếu thì chỉ là "tháng ngắn".
    const adjustment =
      adjusted === day
        ? undefined
        : month === 2 && day === 29
          ? "feb-29"
          : "short-month";
    if (collect(limit, occurrences, { date, adjustment })) {
      return occurrences;
    }
  }
  return occurrences;
}

function lunarYearlyOccurrences(
  schedule: EventSchedule,
  from: CivilDate,
  to: CivilDate,
  limit?: number,
): Occurrence[] {
  const { month, day, leapMonth } = schedule;
  if (month === null || day === null) {
    return [];
  }

  const occurrences: Occurrence[] = [];
  // Tháng 11, 12 âm của năm âm `ly` có thể rơi vào tháng 1, 2 dương của năm
  // `ly + 1`, nên quét rộng hơn khoảng cần tìm rồi lọc lại.
  for (let lunarYear = from.year - 1; lunarYear <= to.year + 1; lunarYear += 1) {
    const daysInMonth = lunarMonthDays(month, lunarYear, leapMonth);
    if (daysInMonth === 0) {
      // Năm âm đó không có tháng nhuận này.
      continue;
    }
    const adjusted = Math.min(day, daysInMonth);
    const solar = lunarToSolar(adjusted, month, lunarYear, leapMonth);
    if (!solar) {
      continue;
    }
    const date: CivilDate = solar;
    if (compareCivil(date, from) < 0 || compareCivil(date, to) > 0) {
      continue;
    }
    const adjustment = adjusted !== day ? "lunar-day-30" : undefined;
    if (collect(limit, occurrences, { date, adjustment })) {
      return occurrences;
    }
  }
  return occurrences;
}

/**
 * Sinh các ngày sự kiện rơi vào khoảng `[from, to]` (bao gồm hai đầu).
 */
export function getOccurrences(
  schedule: EventSchedule,
  from: CivilDate,
  to: CivilDate,
  limit?: number,
): Occurrence[] {
  if (compareCivil(from, to) > 0) {
    return [];
  }

  switch (schedule.recurrence) {
    case "once":
      return onceOccurrences(schedule, from, to);
    case "weekly":
      return weeklyOccurrences(schedule, from, to, limit);
    case "monthly":
      return monthlyOccurrences(schedule, from, to, limit);
    case "yearly":
      return schedule.calendarType === "lunar"
        ? lunarYearlyOccurrences(schedule, from, to, limit)
        : solarYearlyOccurrences(schedule, from, to, limit);
  }
}

/** Ngày xảy ra kế tiếp tính từ `from` (bao gồm chính ngày `from`). */
export function getNextOccurrence(
  schedule: EventSchedule,
  from: CivilDate,
  horizonYears = 5,
): Occurrence | null {
  const to: CivilDate = { year: from.year + horizonYears, month: 12, day: 31 };
  return getOccurrences(schedule, from, to, 1)[0] ?? null;
}
