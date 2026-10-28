import {
  addDays,
  diffDays,
  instantToCivilVN,
  parseTimeOfDay,
  vnWallTimeToInstant,
  type CivilDate,
} from "@/lib/dates";
import type { EventSchedule } from "@/lib/events/types";
import { getOccurrences, type OccurrenceAdjustment } from "@/lib/lunar/occurrences";

/** Khớp với check constraint `events_remind_days_check`. */
export const MAX_REMIND_DAYS_BEFORE = 60;
/** Gửi bù trong vòng 24 giờ nếu cron bị bỏ lỡ. */
export const CATCH_UP_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ReminderSlot {
  occurrenceDate: CivilDate;
  daysBefore: number;
  sendAt: Date;
  adjustment?: OccurrenceAdjustment;
}

/**
 * Các lời nhắc đã tới hạn gửi tại thời điểm `now`.
 *
 * Một lời nhắc tới hạn khi `sendAt <= now` và chưa quá cửa sổ gửi bù 24 giờ.
 * Hàm thuần tuý (không truy cập DB) nên kiểm thử được với đồng hồ giả.
 */
export function computeDueSlots(
  schedule: EventSchedule,
  remindDaysBefore: number[],
  remindTime: string,
  now: Date,
): ReminderSlot[] {
  const todayVn = instantToCivilVN(now);
  const scanFrom = addDays(todayVn, -1);
  const scanTo = addDays(todayVn, MAX_REMIND_DAYS_BEFORE + 2);
  const { hour, minute } = parseTimeOfDay(remindTime);

  const slots: ReminderSlot[] = [];

  for (const occurrence of getOccurrences(schedule, scanFrom, scanTo)) {
    for (const daysBefore of remindDaysBefore) {
      const sendDate = addDays(occurrence.date, -daysBefore);
      // Chỉ quan tâm ngày gửi là hôm nay hoặc hôm qua (cửa sổ gửi bù).
      if (diffDays(todayVn, sendDate) > 1) {
        continue;
      }

      const sendAt = vnWallTimeToInstant(sendDate, hour, minute);
      const elapsed = now.getTime() - sendAt.getTime();
      if (elapsed < 0 || elapsed >= CATCH_UP_WINDOW_MS) {
        continue;
      }

      slots.push({
        occurrenceDate: occurrence.date,
        daysBefore,
        sendAt,
        adjustment: occurrence.adjustment,
      });
    }
  }

  return slots.sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime());
}
