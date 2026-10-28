import { Suspense } from "react";
import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import {
  MonthCalendar,
  type CalendarOccurrence,
} from "@/components/lunar/month-calendar";
import { requireUser } from "@/lib/auth";
import { civilKey, instantToCivilVN, type CivilDate } from "@/lib/dates";
import { getOccurrencesInRange } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Lịch",
};

async function CalendarContent() {
  const user = await requireUser();
  const today = instantToCivilVN(new Date());

  const minMonth: CivilDate = { year: today.year - 1, month: 1, day: 1 };
  const maxMonth: CivilDate = { year: today.year + 1, month: 12, day: 1 };

  const occurrences = await getOccurrencesInRange(user.id, minMonth, {
    year: maxMonth.year,
    month: 12,
    day: 31,
  });

  const items: CalendarOccurrence[] = occurrences.map((occurrence) => ({
    key: civilKey(occurrence.date),
    eventId: occurrence.event.id,
    title: occurrence.event.title,
    isLunar: occurrence.event.calendarType === "lunar",
  }));

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader
        eyebrow="Lịch"
        title="Tờ lịch tháng"
        description="Số lớn là ngày dương, số nhỏ bên cạnh là ngày âm. Ngày có sự kiện được tô đỏ và in tên ngay trong ô."
      />
      <MonthCalendar
        occurrences={items}
        today={today}
        initialMonth={today}
        minMonth={minMonth}
        maxMonth={maxMonth}
      />
    </PageContainer>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <PageContainer className="max-w-4xl">
          <PageHeader eyebrow="Lịch" title="Tờ lịch tháng" />
          <div className="h-[30rem] animate-pulse border border-rule bg-ink/4" />
        </PageContainer>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
