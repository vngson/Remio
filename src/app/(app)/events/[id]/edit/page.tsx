import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { EventForm } from "@/components/events/event-form";
import { requireUser } from "@/lib/auth";
import { instantToCivilVN } from "@/lib/dates";
import { updateEventAction } from "@/lib/events/actions";
import { getEventById } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Sửa sự kiện",
};

async function EditEventContent({
  params,
}: Pick<PageProps<"/events/[id]/edit">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const event = await getEventById(user.id, id);
  const today = instantToCivilVN(new Date());

  if (!event) {
    notFound();
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title="Sửa sự kiện"
        description={event.title}
      />
      <EventForm
        action={updateEventAction}
        event={event}
        defaultRemindTime={user.defaultRemindTime}
        today={today}
      />
    </PageContainer>
  );
}

export default function EditEventPage(props: PageProps<"/events/[id]/edit">) {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageHeader title="Sửa sự kiện" />
        </PageContainer>
      }
    >
      <EditEventContent params={props.params} />
    </Suspense>
  );
}
