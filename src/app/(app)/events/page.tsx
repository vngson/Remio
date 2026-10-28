import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { EventRow } from "@/components/events/event-row";
import { buttonVariants } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { requireUser } from "@/lib/auth";
import { compareCivil, instantToCivilVN } from "@/lib/dates";
import { getEventSummaries, type EventSummary } from "@/lib/events/queries";
import { CATEGORIES } from "@/lib/events/schema";
import { EVENT_CATEGORY_LABELS } from "@/lib/events/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sự kiện",
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function applyFilters(
  summaries: EventSummary[],
  query: string,
  category: string,
  status: string,
): EventSummary[] {
  const needle = query.trim().toLowerCase();

  return summaries.filter(({ event }) => {
    if (needle) {
      const haystack = `${event.title} ${event.description ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }
    if (category !== "all" && event.category !== category) {
      return false;
    }
    if (status === "active" && !event.isActive) {
      return false;
    }
    if (status === "paused" && event.isActive) {
      return false;
    }
    return true;
  });
}

function sortSummaries(summaries: EventSummary[]): EventSummary[] {
  return [...summaries].sort((a, b) => {
    if (a.event.isActive !== b.event.isActive) {
      return a.event.isActive ? -1 : 1;
    }
    if (a.next && b.next) {
      return compareCivil(a.next.date, b.next.date);
    }
    if (a.next) {
      return -1;
    }
    if (b.next) {
      return 1;
    }
    return a.event.title.localeCompare(b.event.title, "vi");
  });
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-l-2 border-ngoc py-1 pl-4 text-[0.8125rem] text-ngoc">
      {children}
    </p>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-y border-rule py-12">
      <h2 className="text-xl">
        {filtered ? "Không tìm thấy ngày nào" : "Chưa ghi ngày nào"}
      </h2>
      <p className="max-w-lg text-ink-soft">
        {filtered
          ? "Thử đổi từ khoá hoặc bộ lọc khác."
          : "Thêm ngày sinh nhật, ngày giỗ hay một dịp kỷ niệm để Remio bắt đầu nhắc bạn."}
      </p>
      {filtered ? null : (
        <div>
          <Link
            href="/events/new"
            className={cn(buttonVariants({ variant: "primary" }))}
          >
            Thêm ngày đầu tiên
          </Link>
        </div>
      )}
    </div>
  );
}

async function EventsContent({
  searchParams,
}: Pick<PageProps<"/events">, "searchParams">) {
  const params = await searchParams;
  const user = await requireUser();
  const today = instantToCivilVN(new Date());

  const query = firstValue(params.q) ?? "";
  const category = firstValue(params.category) ?? "all";
  const status = firstValue(params.status) ?? "all";

  const all = await getEventSummaries(user.id, today);
  const visible = sortSummaries(applyFilters(all, query, category, status));
  const isFiltered =
    query.trim().length > 0 || category !== "all" || status !== "all";
  const activeCount = all.filter((item) => item.event.isActive).length;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Sự kiện"
        title="Danh sách ngày"
        description={`${all.length} ngày đã ghi, ${activeCount} đang được nhắc.`}
        action={
          <Link
            href="/events/new"
            className={cn(buttonVariants({ variant: "primary" }))}
          >
            Thêm sự kiện
          </Link>
        }
      />

      {firstValue(params.created) === "1" ? (
        <Notice>Đã thêm sự kiện. Remio sẽ gửi email nhắc đúng lịch.</Notice>
      ) : null}
      {firstValue(params.updated) === "1" ? (
        <Notice>Đã lưu thay đổi.</Notice>
      ) : null}

      {all.length === 0 ? (
        <EmptyState filtered={false} />
      ) : (
        <>
          <form
            action="/events"
            method="get"
            className="flex flex-wrap items-end gap-4 border-y border-rule py-5"
          >
            <Field label="Tìm" htmlFor="q" className="min-w-48 flex-1">
              <Input
                id="q"
                name="q"
                defaultValue={query}
                placeholder="Tên hoặc ghi chú"
              />
            </Field>

            <Field label="Phân loại" htmlFor="category" className="sm:w-40">
              <Select id="category" name="category" defaultValue={category}>
                <option value="all">Tất cả</option>
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {EVENT_CATEGORY_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Trạng thái" htmlFor="status" className="sm:w-36">
              <Select id="status" name="status" defaultValue={status}>
                <option value="all">Tất cả</option>
                <option value="active">Đang nhắc</option>
                <option value="paused">Tạm dừng</option>
              </Select>
            </Field>

            <button
              type="submit"
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Lọc
            </button>
          </form>

          {visible.length === 0 ? (
            <EmptyState filtered={isFiltered} />
          ) : (
            <ul className="flex flex-col">
              {visible.map((summary) => (
                <li key={summary.event.id}>
                  <EventRow summary={summary} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  );
}

export default function EventsPage(props: PageProps<"/events">) {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageHeader eyebrow="Sự kiện" title="Danh sách ngày" />
          <div className="flex flex-col gap-4 pt-6">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-24 animate-pulse border-t border-rule bg-ink/4"
              />
            ))}
          </div>
        </PageContainer>
      }
    >
      <EventsContent searchParams={props.searchParams} />
    </Suspense>
  );
}
