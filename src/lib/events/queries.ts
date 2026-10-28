import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import {
  compareCivil,
  diffDays,
  parseCivilKey,
  type CivilDate,
} from "@/lib/dates";
import {
  getNextOccurrence,
  getOccurrences,
  type Occurrence,
  type OccurrenceAdjustment,
} from "@/lib/lunar/occurrences";
import { solarToLunar, type LunarDate } from "@/lib/lunar/vn-lunar";
import type {
  CalendarType,
  EventCategory,
  EventSchedule,
  Recurrence,
} from "./types";

export interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  calendarType: CalendarType;
  recurrence: Recurrence;
  month: number | null;
  day: number | null;
  leapMonth: boolean;
  /** `YYYY-MM-DD` */
  anchorDate: string | null;
  /** `HH:mm` */
  remindTime: string;
  remindDaysBefore: number[];
  isActive: boolean;
  createdAt: Date;
}

type EventRow = typeof events.$inferSelect;

export function toEventRecord(row: EventRow): EventRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    calendarType: row.calendarType,
    recurrence: row.recurrence,
    month: row.month,
    day: row.day,
    leapMonth: row.leapMonth,
    anchorDate: row.anchorDate,
    remindTime: row.remindTime.slice(0, 5),
    remindDaysBefore: row.remindDaysBefore,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export function toSchedule(event: EventRecord): EventSchedule {
  return {
    calendarType: event.calendarType,
    recurrence: event.recurrence,
    month: event.month,
    day: event.day,
    leapMonth: event.leapMonth,
    anchorDate: event.anchorDate ? parseCivilKey(event.anchorDate) : null,
  };
}

export async function listEvents(userId: string): Promise<EventRecord[]> {
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.userId, userId))
    .orderBy(asc(events.title));
  return rows.map(toEventRecord);
}

export async function getEventById(
  userId: string,
  id: string,
): Promise<EventRecord | null> {
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.userId, userId), eq(events.id, id)))
    .limit(1);
  return row ? toEventRecord(row) : null;
}

async function listActiveEvents(userId: string): Promise<EventRecord[]> {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.userId, userId), eq(events.isActive, true)))
    .orderBy(desc(events.createdAt));
  return rows.map(toEventRecord);
}

export interface UpcomingOccurrence {
  event: EventRecord;
  date: CivilDate;
  adjustment?: OccurrenceAdjustment;
  daysUntil: number;
  lunar: LunarDate;
}

/**
 * Các lần xuất hiện sắp tới trong `withinDays` ngày, đã sắp xếp theo thời gian.
 */
export async function getUpcomingOccurrences(
  userId: string,
  today: CivilDate,
  withinDays: number,
  limit = 60,
): Promise<UpcomingOccurrence[]> {
  const records = await listActiveEvents(userId);
  const result: UpcomingOccurrence[] = [];

  for (const event of records) {
    const occurrence = getNextOccurrence(toSchedule(event), today);
    if (!occurrence) {
      continue;
    }
    const daysUntil = diffDays(occurrence.date, today);
    if (daysUntil > withinDays) {
      continue;
    }
    result.push({
      event,
      date: occurrence.date,
      adjustment: occurrence.adjustment,
      daysUntil,
      lunar: solarToLunar(
        occurrence.date.day,
        occurrence.date.month,
        occurrence.date.year,
      ),
    });
  }

  result.sort((a, b) => {
    const byDate = compareCivil(a.date, b.date);
    return byDate !== 0 ? byDate : a.event.title.localeCompare(b.event.title, "vi");
  });

  return result.slice(0, limit);
}

export interface DatedOccurrence extends Occurrence {
  event: EventRecord;
}

/** Mọi lần xuất hiện của mọi sự kiện đang bật, trong khoảng `[from, to]`. */
export async function getOccurrencesInRange(
  userId: string,
  from: CivilDate,
  to: CivilDate,
): Promise<DatedOccurrence[]> {
  const records = await listActiveEvents(userId);
  const result: DatedOccurrence[] = [];

  for (const event of records) {
    for (const occurrence of getOccurrences(toSchedule(event), from, to)) {
      result.push({ ...occurrence, event });
    }
  }

  return result;
}

export interface EventSummary {
  event: EventRecord;
  next: {
    date: CivilDate;
    adjustment?: OccurrenceAdjustment;
    daysUntil: number;
    lunar: LunarDate;
  } | null;
}

/** Mỗi sự kiện kèm lần xuất hiện kế tiếp, dùng cho danh sách sự kiện. */
export async function getEventSummaries(
  userId: string,
  today: CivilDate,
  horizonYears = 3,
): Promise<EventSummary[]> {
  const records = await listEvents(userId);

  return records.map((event) => {
    const occurrence = getNextOccurrence(toSchedule(event), today, horizonYears);
    if (!occurrence) {
      return { event, next: null };
    }
    return {
      event,
      next: {
        date: occurrence.date,
        adjustment: occurrence.adjustment,
        daysUntil: diffDays(occurrence.date, today),
        lunar: solarToLunar(
          occurrence.date.day,
          occurrence.date.month,
          occurrence.date.year,
        ),
      },
    };
  });
}

export async function countEvents(userId: string): Promise<number> {
  const rows = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.userId, userId));
  return rows.length;
}
