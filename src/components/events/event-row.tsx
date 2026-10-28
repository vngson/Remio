import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatCivil,
  parseCivilKey,
  parseTimeOfDay,
} from "@/lib/dates";
import { toggleEventActiveAction } from "@/lib/events/actions";
import type { EventRecord, EventSummary } from "@/lib/events/queries";
import {
  EVENT_CATEGORY_LABELS,
  RECURRENCE_LABELS,
} from "@/lib/events/types";
import { cn } from "@/lib/utils";
import { DeleteEventButton } from "./delete-event-button";

function remindLabel(days: number[], time: string): string {
  const { hour, minute } = parseTimeOfDay(time);
  const clock = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const parts = [...days]
    .sort((a, b) => b - a)
    .map((value) => (value === 0 ? "đúng ngày" : `${value} ngày trước`));
  return `Nhắc ${parts.join(", ")} lúc ${clock}`;
}

function scheduleLabel(event: EventRecord): string {
  if (event.recurrence === "yearly") {
    const kind = event.calendarType === "lunar" ? "âm" : "dương";
    return `${event.day}/${event.month} ${kind} hằng năm`;
  }

  const anchor = event.anchorDate ? parseCivilKey(event.anchorDate) : null;
  const recurrence = RECURRENCE_LABELS[event.recurrence];
  return anchor ? `${recurrence}, từ ${formatCivil(anchor)}` : recurrence;
}

function countdownLabel(daysUntil: number): string {
  if (daysUntil === 0) {
    return "Hôm nay";
  }
  if (daysUntil === 1) {
    return "Ngày mai";
  }
  return `Còn ${daysUntil} ngày`;
}

export function EventRow({ summary }: { summary: EventSummary }) {
  const { event, next } = summary;
  const urgent = next !== null && next.daysUntil <= 1;

  return (
    <article
      className={cn(
        "flex flex-wrap items-start gap-x-8 gap-y-4 border-t border-rule py-5",
        !event.isActive && "opacity-55",
      )}
    >
      <div className="flex min-w-[15rem] flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href={`/events/${event.id}/edit`}
            className="text-base font-medium text-ink underline-offset-4 hover:underline"
          >
            {event.title}
          </Link>
          {event.leapMonth ? <Badge variant="son">Tháng nhuận</Badge> : null}
          {event.isActive ? null : <Badge variant="quiet">Tạm dừng</Badge>}
        </div>

        <p className="label-print text-ink-faint">
          {EVENT_CATEGORY_LABELS[event.category]} · {scheduleLabel(event)}
        </p>

        <p className="text-[0.8125rem] text-ink-soft">
          {remindLabel(event.remindDaysBefore, event.remindTime)}
        </p>
      </div>

      <div className="flex flex-col items-start gap-3 sm:items-end">
        {next ? (
          <div className="flex flex-col gap-1.5 sm:items-end">
            <span className="numeral font-display text-lg text-ink">
              {formatCivil(next.date)}
            </span>
            <span
              className={cn(
                "label-print",
                urgent ? "text-son" : "text-ink-faint",
              )}
            >
              {countdownLabel(next.daysUntil)}
            </span>
          </div>
        ) : (
          <span className="label-print text-ink-faint">Không còn lần nhắc</span>
        )}

        <div className="flex items-center gap-4">
          <form action={toggleEventActiveAction}>
            <input type="hidden" name="id" value={event.id} />
            <input
              type="hidden"
              name="nextActive"
              value={event.isActive ? "false" : "true"}
            />
            <Button
              type="submit"
              variant="quiet"
              size="sm"
              className="h-auto px-0 py-0"
            >
              {event.isActive ? "Tạm dừng" : "Bật lại"}
            </Button>
          </form>

          <Link
            href={`/events/${event.id}/edit`}
            className="text-[0.8125rem] font-medium text-ink-faint underline-offset-4 hover:text-ink hover:underline"
          >
            Sửa
          </Link>

          <DeleteEventButton id={event.id} title={event.title} />
        </div>
      </div>
    </article>
  );
}
