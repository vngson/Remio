import { Suspense } from "react";
import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { EventForm } from "@/components/events/event-form";
import { requireUser } from "@/lib/auth";
import { instantToCivilVN } from "@/lib/dates";
import { createEventAction } from "@/lib/events/actions";

export const metadata: Metadata = {
  title: "Thêm sự kiện",
};

async function NewEventContent() {
  const user = await requireUser();
  const today = instantToCivilVN(new Date());

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title="Thêm sự kiện"
        description="Chọn dương lịch hoặc âm lịch, Remio sẽ tính lại ngày cho từng năm và nhắc bạn qua email."
      />
      <EventForm
        action={createEventAction}
        defaultRemindTime={user.defaultRemindTime}
        today={today}
      />
    </PageContainer>
  );
}

export default function NewEventPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageHeader title="Thêm sự kiện" />
        </PageContainer>
      }
    >
      <NewEventContent />
    </Suspense>
  );
}
