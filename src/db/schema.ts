import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { CalendarType, EventCategory, Recurrence } from "@/lib/events/types";

/**
 * Hồ sơ người dùng, phản chiếu bảng `auth.users` của Supabase.
 * Bản ghi được tạo tự động bởi trigger `handle_new_user`.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  defaultRemindTime: time("default_remind_time").notNull().default("08:00"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").$type<EventCategory>().notNull().default("other"),
    calendarType: text("calendar_type").$type<CalendarType>().notNull(),
    recurrence: text("recurrence").$type<Recurrence>().notNull(),
    /** Tháng của sự kiện lặp hằng năm, theo `calendar_type`. */
    month: smallint("month"),
    /** Ngày của sự kiện lặp hằng năm, theo `calendar_type`. */
    day: smallint("day"),
    /** Chỉ dùng cho âm lịch: sự kiện rơi vào tháng nhuận. */
    leapMonth: boolean("leap_month").notNull().default(false),
    /** Mốc dương lịch cho sự kiện không lặp hằng năm. */
    anchorDate: date("anchor_date"),
    remindTime: time("remind_time").notNull().default("08:00"),
    /** Số ngày nhắc trước, ví dụ `{3,1,0}`. */
    remindDaysBefore: integer("remind_days_before")
      .array()
      .notNull()
      .default([0]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("events_user_active_idx").on(table.userId, table.isActive),
    index("events_scheduler_idx").on(table.isActive, table.recurrence),
  ],
);

/**
 * Nhật ký gửi nhắc nhở. Ràng buộc UNIQUE là cơ chế chống gửi trùng khi cron
 * chạy lặp hoặc chạy song song.
 */
export const remindersLog = pgTable(
  "reminders_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventId: uuid("event_id").notNull(),
    userId: uuid("user_id").notNull(),
    occurrenceDate: date("occurrence_date").notNull(),
    daysBefore: integer("days_before").notNull(),
    channel: text("channel").notNull().default("email"),
    status: text("status").$type<"pending" | "sent" | "failed">().notNull(),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("reminders_log_dedupe_key").on(
      table.eventId,
      table.occurrenceDate,
      table.daysBefore,
      table.channel,
    ),
    index("reminders_log_user_idx").on(table.userId, table.createdAt),
  ],
);
