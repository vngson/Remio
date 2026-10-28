import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/surface";
import { requireUser } from "@/lib/auth";
import {
  civilKey,
  formatCivilLong,
  instantToCivilVN,
  weekdayLabel,
} from "@/lib/dates";
import { getUpcomingOccurrences, listEvents } from "@/lib/events/queries";
import { EVENT_CATEGORY_LABELS } from "@/lib/events/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tổng quan",
};

const WITHIN_DAYS = 120;

function countdownLabel(daysUntil: number): string {
  if (daysUntil === 0) {
    return "Hôm nay";
  }
  if (daysUntil === 1) {
    return "Ngày mai";
  }
  return `Còn ${daysUntil} ngày`;
}

function IndexStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-baseline gap-3">
      <span className="numeral font-display text-2xl text-ink">{value}</span>
      <span className="label-print text-ink-faint">{label}</span>
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-16 animate-pulse border-y border-rule bg-ink/4" />
      <div className="h-40 animate-pulse border border-rule bg-ink/4" />
    </div>
  );
}

async function DashboardContent() {
  const user = await requireUser();
  const today = instantToCivilVN(new Date());

  const [records, upcoming] = await Promise.all([
    listEvents(user.id),
    getUpcomingOccurrences(user.id, today, WITHIN_DAYS, 40),
  ]);

  const activeCount = records.filter((record) => record.isActive).length;
  const withinAWeek = upcoming.filter((item) => item.daysUntil <= 7).length;

  const todayItems = upcoming.filter((item) => item.daysUntil === 0);
  const futureItems = upcoming.filter((item) => item.daysUntil > 0);

  const groups: {
    key: string;
    date: (typeof futureItems)[number]["date"];
    daysUntil: number;
    items: typeof futureItems;
  }[] = [];

  for (const item of futureItems) {
    const key = civilKey(item.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({
        key,
        date: item.date,
        daysUntil: item.daysUntil,
        items: [item],
      });
    }
  }

  const firstName = user.fullName?.trim().split(/\s+/).slice(-1)[0];

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        eyebrow="Tổng quan"
        title={formatCivilLong(today)}
        description={
          firstName ? `Xin chào ${firstName}.` : "Đây là những ngày sắp tới."
        }
        action={
          <Link
            href="/events/new"
            className={cn(buttonVariants({ variant: "primary" }))}
          >
            Thêm sự kiện
          </Link>
        }
      />

      {records.length === 0 ? (
        <div className="flex flex-col gap-4 border-y border-rule py-10">
          <h2 className="text-xl">Chưa có ngày nào được ghi</h2>
          <p className="max-w-lg text-ink-soft">
            Thêm ngày giỗ, sinh nhật hay lễ Tết theo âm lịch hoặc dương lịch.
            Remio tính lại ngày cho từng năm và gửi email nhắc bạn trước ngày
            đó.
          </p>
          <div>
            <Link
              href="/events/new"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Thêm ngày đầu tiên
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-10 gap-y-4 border-y border-rule py-4">
            <IndexStat label="Đã ghi" value={records.length} />
            <IndexStat label="Đang nhắc" value={activeCount} />
            <IndexStat label="Trong 7 ngày" value={withinAWeek} />
          </div>

          <Section title="Hôm nay" meta={civilKey(today).split("-").reverse().join("/")}>
            {todayItems.length === 0 ? (
              <p className="text-ink-faint">
                Không có ngày nào trong hôm nay.
              </p>
            ) : (
              <ul className="flex flex-col">
                {todayItems.map((item) => (
                  <li
                    key={`${item.event.id}-${civilKey(item.date)}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule py-4 first:border-t-0"
                  >
                    <Link
                      href={`/events/${item.event.id}/edit`}
                      className="min-w-0 flex-1 text-base font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {item.event.title}
                    </Link>
                    <Badge variant="quiet">
                      {EVENT_CATEGORY_LABELS[item.event.category]}
                    </Badge>
                    <span className="label-print text-ink-faint">
                      Nhắc {item.event.remindTime}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Sắp tới" meta={`${WITHIN_DAYS} ngày`}>
            {groups.length === 0 ? (
              <p className="text-ink-faint">
                Không có ngày nào trong {WITHIN_DAYS} ngày tới.
              </p>
            ) : (
              <div className="flex flex-col gap-7">
                {groups.map((group) => (
                  <div key={group.key} className="flex flex-col">
                    <div className="flex items-baseline justify-between gap-4 border-b border-rule-strong pb-2">
                      <span className="font-display text-lg text-ink">
                        {weekdayLabel(group.date)}, {group.date.day} tháng{" "}
                        {group.date.month}
                      </span>
                      <span className="label-print text-son">
                        {countdownLabel(group.daysUntil)}
                      </span>
                    </div>

                    <ul className="flex flex-col">
                      {group.items.map((item) => (
                        <li
                          key={`${item.event.id}-${group.key}`}
                          className="flex items-center gap-4 border-b border-rule py-3"
                        >
                          <Link
                            href={`/events/${item.event.id}/edit`}
                            className="min-w-0 flex-1 truncate text-ink underline-offset-4 hover:underline"
                          >
                            {item.event.title}
                          </Link>
                          {item.event.calendarType === "lunar" ? (
                            <span className="label-print shrink-0 text-ink-faint">
                              Âm {item.lunar.day}/{item.lunar.month}
                            </span>
                          ) : null}
                          <span className="numeral label-print hidden shrink-0 text-ink-faint sm:inline">
                            Nhắc {item.event.remindTime}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </PageContainer>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <PageContainer className="max-w-3xl">
          <PageHeader eyebrow="Tổng quan" title="Đang tải" />
          <DashboardSkeleton />
        </PageContainer>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
