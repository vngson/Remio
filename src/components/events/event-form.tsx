"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Section } from "@/components/ui/surface";
import {
  diffDays,
  formatCivil,
  parseCivilKey,
  weekdayLabel,
  type CivilDate,
} from "@/lib/dates";
import type { EventActionState } from "@/lib/events/actions";
import type { EventRecord } from "@/lib/events/queries";
import { CATEGORIES } from "@/lib/events/schema";
import {
  EVENT_CATEGORY_LABELS,
  RECURRENCE_LABELS,
  type CalendarType,
  type EventSchedule,
  type Recurrence,
} from "@/lib/events/types";
import { getNextOccurrence } from "@/lib/lunar/occurrences";
import { solarToLunar } from "@/lib/lunar/vn-lunar";
import { cn } from "@/lib/utils";

const CALENDAR_OPTIONS = [
  { value: "solar" as const, label: "Dương lịch" },
  { value: "lunar" as const, label: "Âm lịch" },
];

const RECURRENCE_OPTIONS = (["yearly", "once", "monthly", "weekly"] as const).map(
  (value) => ({ value, label: RECURRENCE_LABELS[value] }),
);

const REMIND_PRESETS = [0, 1, 2, 3, 7];

const ADJUSTMENT_NOTES: Record<string, string> = {
  "feb-29": "Năm nay không có 29/02 nên sẽ nhắc vào 28/02.",
  "lunar-day-30": "Tháng âm này chỉ có 29 ngày nên sẽ nhắc vào ngày 29.",
  "short-month": "Tháng này không đủ ngày nên sẽ nhắc vào ngày cuối tháng.",
};

function range(count: number) {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function MonthSelect({
  value,
  onChange,
  lunar,
}: {
  value: number;
  onChange: (value: number) => void;
  lunar: boolean;
}) {
  return (
    <Select
      aria-label="Tháng"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {range(12).map((month) => (
        <option key={month} value={month}>
          {lunar ? `Tháng ${month} âm` : `Tháng ${month}`}
        </option>
      ))}
    </Select>
  );
}

function DaySelect({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  max: number;
}) {
  return (
    <Select
      aria-label="Ngày"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {range(max).map((day) => (
        <option key={day} value={day}>
          Ngày {day}
        </option>
      ))}
    </Select>
  );
}

export interface EventFormProps {
  action: (
    state: EventActionState,
    formData: FormData,
  ) => Promise<EventActionState>;
  event?: EventRecord | null;
  defaultRemindTime: string;
  /** Ngày hôm nay theo giờ Việt Nam, do server truyền xuống. */
  today: CivilDate;
}

export function EventForm({
  action,
  event,
  defaultRemindTime,
  today,
}: EventFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  } satisfies EventActionState);

  const [calendarType, setCalendarType] = useState<CalendarType>(
    event?.calendarType ?? "solar",
  );
  const [recurrence, setRecurrence] = useState<Recurrence>(
    event?.recurrence ?? "yearly",
  );
  const [month, setMonth] = useState(event?.month ?? 1);
  const [day, setDay] = useState(event?.day ?? 1);
  const [anchorDate, setAnchorDate] = useState(event?.anchorDate ?? "");
  const [leapMonth, setLeapMonth] = useState(event?.leapMonth ?? false);
  const [remindTime, setRemindTime] = useState(
    event?.remindTime ?? defaultRemindTime,
  );
  const [remindDays, setRemindDays] = useState<number[]>(
    event?.remindDaysBefore ?? [0],
  );

  function changeCalendarType(next: CalendarType) {
    setCalendarType(next);
    if (next === "lunar") {
      setRecurrence("yearly");
      if (day > 30) {
        setDay(30);
      }
    }
  }

  function toggleRemindDay(value: number) {
    setRemindDays((current) => {
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return next.length > 0 ? next.sort((a, b) => b - a) : current;
    });
  }

  const errors = state.status === "error" ? state.errors : {};

  const preview = useMemo(() => {
    const schedule: EventSchedule = {
      calendarType,
      recurrence,
      month: recurrence === "yearly" ? month : null,
      day: recurrence === "yearly" ? day : null,
      leapMonth: calendarType === "lunar" ? leapMonth : false,
      anchorDate:
        recurrence === "yearly" || !anchorDate ? null : parseCivilKey(anchorDate),
    };
    const occurrence = getNextOccurrence(schedule, today);
    if (!occurrence) {
      return null;
    }
    return {
      date: occurrence.date,
      adjustment: occurrence.adjustment,
      daysUntil: diffDays(occurrence.date, today),
      lunar: solarToLunar(
        occurrence.date.day,
        occurrence.date.month,
        occurrence.date.year,
      ),
    };
  }, [today, calendarType, recurrence, month, day, anchorDate, leapMonth]);

  const isYearly = recurrence === "yearly";
  const isLunar = calendarType === "lunar";

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

      {state.status === "error" ? (
        <p className="rounded-slip border border-son/45 px-4 py-3 text-[0.8125rem] text-son">
          {state.message}
        </p>
      ) : null}

      <Section title="Sự kiện">
        <div className="flex flex-col gap-6">
          <Field label="Tên sự kiện" htmlFor="title" error={errors.title}>
            <Input
              id="title"
              name="title"
              required
              maxLength={120}
              placeholder="Giỗ ông nội, sinh nhật mẹ…"
              defaultValue={event?.title ?? ""}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Loại lịch"
              error={errors.calendarType}
              hint={isLunar ? "Ngày âm được tính lại cho từng năm." : undefined}
            >
              <Segmented
                name="calendarType"
                options={CALENDAR_OPTIONS}
                value={calendarType}
                onChange={changeCalendarType}
              />
            </Field>

            <Field label="Lặp lại" htmlFor="recurrence" error={errors.recurrence}>
              {isLunar ? (
                <>
                  <p className="flex h-10 items-center border-b border-rule text-sm text-ink-soft">
                    Hằng năm
                  </p>
                  <input type="hidden" name="recurrence" value="yearly" />
                </>
              ) : (
                <Select
                  id="recurrence"
                  name="recurrence"
                  value={recurrence}
                  onChange={(changeEvent) =>
                    setRecurrence(changeEvent.target.value as Recurrence)
                  }
                >
                  {RECURRENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          {isYearly ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label={isLunar ? "Ngày âm" : "Ngày"} error={errors.day}>
                  <DaySelect value={day} onChange={setDay} max={isLunar ? 30 : 31} />
                </Field>
                <Field label={isLunar ? "Tháng âm" : "Tháng"} error={errors.month}>
                  <MonthSelect value={month} onChange={setMonth} lunar={isLunar} />
                </Field>
              </div>
              <input type="hidden" name="day" value={day} />
              <input type="hidden" name="month" value={month} />

              {isLunar ? (
                <label className="flex cursor-pointer items-start gap-3 border-t border-rule pt-4">
                  <input
                    type="checkbox"
                    name="leapMonth"
                    checked={leapMonth}
                    onChange={(changeEvent) =>
                      setLeapMonth(changeEvent.target.checked)
                    }
                    className="mt-1 h-4 w-4 accent-[var(--son)]"
                  />
                  <span className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Đây là tháng nhuận</span>
                    <span className="text-ink-faint">
                      Chỉ nhắc vào những năm có tháng {month} nhuận. Các năm
                      không có sẽ bỏ qua.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>
          ) : (
            <Field label="Ngày bắt đầu" htmlFor="anchorDate" error={errors.anchorDate}>
              <Input
                id="anchorDate"
                name="anchorDate"
                type="date"
                value={anchorDate}
                onChange={(changeEvent) => setAnchorDate(changeEvent.target.value)}
              />
            </Field>
          )}

          {preview ? (
            <div className="rounded-slip border border-rule bg-raised p-5">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div className="flex items-end gap-4">
                  <span className="numeral font-display text-[2.75rem] font-medium leading-[0.85] text-ink">
                    {preview.date.day}
                  </span>
                  <span className="flex flex-col gap-1.5 pb-1">
                    <span className="font-display text-lg leading-none">
                      Tháng {preview.date.month}, {preview.date.year}
                    </span>
                    <span className="label-print text-ink-faint">
                      {weekdayLabel(preview.date)}
                    </span>
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  <span className="label-print text-son">
                    {preview.daysUntil === 0
                      ? "Hôm nay"
                      : `Còn ${preview.daysUntil} ngày`}
                  </span>
                  <Badge variant="quiet">
                    Âm {preview.lunar.day}/{preview.lunar.month}
                    {preview.lunar.leap ? " nhuận" : ""}
                  </Badge>
                </div>
              </div>

              <p className="mt-4 border-t border-rule pt-3 text-[0.8125rem] text-ink-faint">
                Lần nhắc tới: {weekdayLabel(preview.date)},{" "}
                {formatCivil(preview.date)}
                {preview.adjustment
                  ? ` · ${ADJUSTMENT_NOTES[preview.adjustment]}`
                  : ""}
              </p>
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Nhắc nhở">
        <div className="flex flex-col gap-6">
          <Field
            label="Nhắc trước bao nhiêu ngày"
            error={errors.remindDaysBefore}
            hint="Bấm để chọn hoặc bỏ chọn. “Đúng ngày” nghĩa là nhắc trong chính ngày đó."
          >
            <div className="flex flex-wrap gap-2">
              {REMIND_PRESETS.map((value) => {
                const active = remindDays.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleRemindDay(value)}
                    className={cn(
                      "h-10 rounded-slip border px-4 text-[0.8125rem] font-medium transition-colors",
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-rule text-ink-soft hover:border-rule-strong hover:text-ink",
                    )}
                  >
                    {value === 0 ? "Đúng ngày" : `${value} ngày trước`}
                  </button>
                );
              })}
            </div>
          </Field>
          {remindDays.map((value) => (
            <input key={value} type="hidden" name="remindDaysBefore" value={value} />
          ))}

          <Field
            label="Giờ gửi email"
            htmlFor="remindTime"
            error={errors.remindTime}
            hint="Giờ Việt Nam. Email được gửi trong khoảng 15 phút quanh giờ này."
          >
            <Input
              id="remindTime"
              name="remindTime"
              type="time"
              value={remindTime}
              onChange={(changeEvent) => setRemindTime(changeEvent.target.value)}
              className="sm:max-w-40"
            />
          </Field>
        </div>
      </Section>

      <Section title="Phân loại">
        <div className="flex flex-col gap-6">
          <Field label="Loại" htmlFor="category" error={errors.category}>
            <Select
              id="category"
              name="category"
              defaultValue={event?.category ?? "other"}
              className="sm:max-w-56"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {EVENT_CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Ghi chú">
        <Field label="Thông tin thêm" htmlFor="description" error={errors.description}>
          <Textarea
            id="description"
            name="description"
            maxLength={500}
            placeholder="Địa điểm, việc cần chuẩn bị, người đi cùng…"
            defaultValue={event?.description ?? ""}
          />
        </Field>
      </Section>

      <div className="flex flex-wrap items-center gap-5 border-t-2 border-rule-strong pt-6">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {event ? "Lưu thay đổi" : "Thêm sự kiện"}
        </Button>
      </div>
    </form>
  );
}
