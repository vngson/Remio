import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, profiles, remindersLog } from "@/db/schema";
import { civilKey } from "@/lib/dates";
import { getEmailProvider } from "@/lib/email";
import { renderReminderEmail } from "@/lib/email/templates/reminder";
import { siteUrl } from "@/lib/env";
import {
  toEventRecord,
  toSchedule,
  type EventRecord,
} from "@/lib/events/queries";
import { solarToLunar, type LunarDate } from "@/lib/lunar/vn-lunar";
import { computeDueSlots, type ReminderSlot } from "./slots";

/** Trần số email mỗi lần chạy, tránh vượt hạn mức của nhà cung cấp. */
const MAX_PER_RUN = 40;

export interface DueReminder extends ReminderSlot {
  event: EventRecord;
  userId: string;
  recipientEmail: string;
  recipientName: string;
  lunar: LunarDate;
}

function recipientNameOf(fullName: string | null, email: string): string {
  if (fullName && fullName.trim().length > 0) {
    return fullName;
  }
  return email.split("@")[0] ?? "bạn";
}

/** Mọi lời nhắc của các sự kiện đang bật, đã tới hạn gửi tại thời điểm `now`. */
export async function findDueReminders(now: Date): Promise<DueReminder[]> {
  const rows = await db
    .select({ event: events, profile: profiles })
    .from(events)
    .innerJoin(profiles, eq(profiles.id, events.userId))
    .where(eq(events.isActive, true));

  const due: DueReminder[] = [];

  for (const row of rows) {
    const event = toEventRecord(row.event);
    const slots = computeDueSlots(
      toSchedule(event),
      event.remindDaysBefore,
      event.remindTime,
      now,
    );

    for (const slot of slots) {
      due.push({
        ...slot,
        event,
        userId: row.event.userId,
        recipientEmail: row.profile.email,
        recipientName: recipientNameOf(row.profile.fullName, row.profile.email),
        lunar: solarToLunar(
          slot.occurrenceDate.day,
          slot.occurrenceDate.month,
          slot.occurrenceDate.year,
        ),
      });
    }
  }

  return due.sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime());
}

/**
 * Giành quyền gửi cho một lời nhắc. Trả về `null` nếu đã gửi hoặc đang xử lý.
 *
 * Ràng buộc UNIQUE trên bảng `reminders_log` là điểm chốt chống gửi trùng: hai
 * lần chạy song song chỉ một lần chèn được. Bản ghi ở trạng thái `failed` được
 * phép giành lại để thử gửi tiếp ở lần chạy sau.
 */
async function claimReminder(
  reminder: DueReminder,
): Promise<{ id: number } | null> {
  const rows = await db
    .insert(remindersLog)
    .values({
      eventId: reminder.event.id,
      userId: reminder.userId,
      occurrenceDate: civilKey(reminder.occurrenceDate),
      daysBefore: reminder.daysBefore,
      channel: "email",
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [
        remindersLog.eventId,
        remindersLog.occurrenceDate,
        remindersLog.daysBefore,
        remindersLog.channel,
      ],
      set: { status: "pending", error: null },
      setWhere: eq(remindersLog.status, "failed"),
    })
    .returning({ id: remindersLog.id });

  return rows[0] ?? null;
}

async function markSent(logId: number, providerMessageId: string) {
  await db
    .update(remindersLog)
    .set({
      status: "sent",
      providerMessageId,
      sentAt: new Date(),
      error: null,
    })
    .where(eq(remindersLog.id, logId));
}

async function markFailed(logId: number, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await db
    .update(remindersLog)
    .set({ status: "failed", error: message.slice(0, 500) })
    .where(eq(remindersLog.id, logId));
}

export interface ProcessResult {
  due: number;
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Chạy một lượt nhắc nhở: tìm lời nhắc tới hạn, giành quyền gửi rồi gửi email.
 * Idempotent — gọi lại cùng thời điểm không gửi trùng.
 */
export async function processDueReminders(
  now: Date = new Date(),
): Promise<ProcessResult> {
  const allDue = await findDueReminders(now);
  const batch = allDue.slice(0, MAX_PER_RUN);
  const result: ProcessResult = {
    due: allDue.length,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  if (batch.length === 0) {
    return result;
  }

  const provider = getEmailProvider();
  const appUrl = siteUrl();

  for (const reminder of batch) {
    const claimed = await claimReminder(reminder);
    if (!claimed) {
      result.skipped += 1;
      continue;
    }

    try {
      const template = renderReminderEmail({
        recipientName: reminder.recipientName,
        eventTitle: reminder.event.title,
        category: reminder.event.category,
        eventNote: reminder.event.description,
        occurrenceDate: reminder.occurrenceDate,
        lunar: reminder.lunar,
        daysBefore: reminder.daysBefore,
        adjustment: reminder.adjustment,
        appUrl,
      });

      const { id } = await provider.send({
        to: reminder.recipientEmail,
        ...template,
      });

      await markSent(claimed.id, id);
      result.sent += 1;
    } catch (error) {
      console.error(`Gửi nhắc thất bại cho sự kiện ${reminder.event.id}`, error);
      await markFailed(claimed.id, error);
      result.failed += 1;
    }
  }

  return result;
}
