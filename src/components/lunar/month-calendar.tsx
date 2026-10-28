"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/surface";
import {
  civilKey,
  daysInSolarMonth,
  formatCivil,
  isSameCivil,
  weekdayLabel,
  weekdayOf,
  type CivilDate,
} from "@/lib/dates";
import { solarToLunar } from "@/lib/lunar/vn-lunar";
import { cn } from "@/lib/utils";

export interface CalendarOccurrence {
  key: string;
  eventId: string;
  title: string;
  isLunar: boolean;
}

const WEEKDAY_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const MONTH_NAMES = [
  "",
  "Tháng Một",
  "Tháng Hai",
  "Tháng Ba",
  "Tháng Tư",
  "Tháng Năm",
  "Tháng Sáu",
  "Tháng Bảy",
  "Tháng Tám",
  "Tháng Chín",
  "Tháng Mười",
  "Tháng Mười Một",
  "Tháng Chạp",
];

function shiftMonth(date: CivilDate, delta: number): CivilDate {
  const zeroBased = date.month - 1 + delta;
  const year = date.year + Math.floor(zeroBased / 12);
  const month = (((zeroBased % 12) + 12) % 12) + 1;
  return { year, month, day: 1 };
}

export function MonthCalendar({
  occurrences,
  today,
  initialMonth,
  minMonth,
  maxMonth,
}: {
  occurrences: CalendarOccurrence[];
  today: CivilDate;
  initialMonth: CivilDate;
  minMonth: CivilDate;
  maxMonth: CivilDate;
}) {
  const [month, setMonth] = useState<CivilDate>({
    year: initialMonth.year,
    month: initialMonth.month,
    day: 1,
  });
  const [selected, setSelected] = useState<CivilDate>(today);

  const byKey = useMemo(() => {
    const map = new Map<string, CalendarOccurrence[]>();
    for (const occurrence of occurrences) {
      const list = map.get(occurrence.key);
      if (list) {
        list.push(occurrence);
      } else {
        map.set(occurrence.key, [occurrence]);
      }
    }
    return map;
  }, [occurrences]);

  const cells = useMemo(() => {
    const first: CivilDate = { year: month.year, month: month.month, day: 1 };
    const offset = (weekdayOf(first) + 6) % 7;
    const total = daysInSolarMonth(month.year, month.month);
    const result: (CivilDate | null)[] = [];
    for (let index = 0; index < offset; index += 1) {
      result.push(null);
    }
    for (let day = 1; day <= total; day += 1) {
      result.push({ year: month.year, month: month.month, day });
    }
    while (result.length % 7 !== 0) {
      result.push(null);
    }
    return result;
  }, [month]);

  /** Đổi tháng thì đưa ngày đang chọn về đúng tháng đang xem. */
  function changeMonth(delta: number) {
    const next = shiftMonth(month, delta);
    setMonth(next);
    if (selected.year !== next.year || selected.month !== next.month) {
      const todayIsInNext = today.year === next.year && today.month === next.month;
      setSelected(todayIsInNext ? today : { ...next, day: 1 });
    }
  }

  const selectedKey = civilKey(selected);
  const selectedOccurrences = byKey.get(selectedKey) ?? [];
  const selectedLunar = solarToLunar(selected.day, selected.month, selected.year);
  const monthLunar = solarToLunar(1, month.month, month.year);

  const atMin = month.year === minMonth.year && month.month === minMonth.month;
  const atMax = month.year === maxMonth.year && month.month === maxMonth.month;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4 border-b border-rule pb-4">
        <Button
          variant="quiet"
          size="icon"
          aria-label="Tháng trước"
          disabled={atMin}
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Button>

        <div className="flex flex-col items-center gap-1.5">
          <span className="font-display text-2xl text-ink">
            {MONTH_NAMES[month.month]}
          </span>
          <span className="label-print text-ink-faint">
            {month.year} · âm {monthLunar.month}/{monthLunar.year}
          </span>
        </div>

        <Button
          variant="quiet"
          size="icon"
          aria-label="Tháng sau"
          disabled={atMax}
          onClick={() => changeMonth(1)}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="border-l border-t border-rule">
        <div className="grid grid-cols-7">
          {WEEKDAY_HEADERS.map((label, index) => (
            <div
              key={label}
              className={cn(
                "label-print border-b border-r border-rule py-2 text-center",
                index === 6 ? "text-son" : "text-ink-faint",
              )}
            >
              {label}
            </div>
          ))}

          {cells.map((cell, index) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[4.75rem] border-b border-r border-rule bg-ink/3 sm:min-h-[6.25rem]"
                />
              );
            }

            const key = civilKey(cell);
            const lunar = solarToLunar(cell.day, cell.month, cell.year);
            const dayOccurrences = byKey.get(key) ?? [];
            const hasEvents = dayOccurrences.length > 0;
            const isToday = isSameCivil(cell, today);
            const isSelected = isSameCivil(cell, selected);

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(cell)}
                aria-label={`${weekdayLabel(cell)}, ${formatCivil(cell)}`}
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-[4.75rem] flex-col gap-1 border-b border-r border-rule p-1.5 text-left transition-colors sm:min-h-[6.25rem] sm:p-2",
                  hasEvents ? "bg-son/10" : "hover:bg-ink/3",
                  isSelected && "ring-2 ring-inset ring-ink/45",
                )}
              >
                <span className="flex w-full items-center justify-between gap-1">
                  <span
                    className={cn(
                      "numeral font-display inline-flex h-6 min-w-6 items-center justify-center px-1 text-lg leading-none",
                      isToday
                        ? "bg-son font-semibold text-on-son"
                        : hasEvents
                          ? "font-semibold text-son"
                          : "text-ink",
                    )}
                  >
                    {cell.day}
                  </span>
                  <span className="label-print text-[0.5625rem] text-ink-faint">
                    {lunar.day === 1 ? `${lunar.day}/${lunar.month}` : lunar.day}
                    {lunar.leap ? "n" : ""}
                  </span>
                </span>

                {hasEvents ? (
                  <span className="label-print mt-auto text-[0.5625rem] text-ink sm:hidden">
                    {dayOccurrences.length} ngày
                  </span>
                ) : null}

                <span className="mt-auto hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {dayOccurrences.slice(0, 2).map((occurrence) => (
                    <span
                      key={occurrence.eventId}
                      className="truncate text-[0.625rem] leading-snug text-ink"
                    >
                      {occurrence.title}
                    </span>
                  ))}
                  {dayOccurrences.length > 2 ? (
                    <span className="label-print text-[0.5625rem] text-ink-faint">
                      +{dayOccurrences.length - 2}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Section
        title={formatCivil(selected)}
        meta={weekdayLabel(selected)}
        action={
          <Badge variant="quiet">
            Âm {selectedLunar.day}/{selectedLunar.month}
            {selectedLunar.leap ? " nhuận" : ""}
          </Badge>
        }
      >
        {selectedOccurrences.length === 0 ? (
          <p className="text-ink-faint">Không có ngày nào được ghi.</p>
        ) : (
          <ul className="flex flex-col">
            {selectedOccurrences.map((occurrence) => (
              <li
                key={`${occurrence.eventId}-${occurrence.key}`}
                className="flex items-center gap-4 border-t border-rule py-3 first:border-t-0"
              >
                <span className="min-w-0 flex-1 truncate text-ink">
                  {occurrence.title}
                </span>
                <span className="label-print shrink-0 text-ink-faint">
                  {occurrence.isLunar ? "Âm lịch" : "Dương lịch"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
