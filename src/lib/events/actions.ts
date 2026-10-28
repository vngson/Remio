"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseEventForm, type EventFormErrors } from "./schema";

export type EventActionState =
  | { status: "idle" }
  | { status: "error"; message: string; errors: EventFormErrors };

export async function createEventAction(
  _prevState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const user = await requireUser();
  const parsed = parseEventForm(formData);

  if (!parsed.ok) {
    return { status: "error", message: parsed.message, errors: parsed.errors };
  }

  await db.insert(events).values({ ...parsed.data, userId: user.id });
  redirect("/events?created=1");
}

export async function updateEventAction(
  _prevState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { status: "error", message: "Thiếu sự kiện cần cập nhật.", errors: {} };
  }

  const parsed = parseEventForm(formData);
  if (!parsed.ok) {
    return { status: "error", message: parsed.message, errors: parsed.errors };
  }

  await db
    .update(events)
    .set(parsed.data)
    .where(and(eq(events.id, id), eq(events.userId, user.id)));

  redirect("/events?updated=1");
}

export async function deleteEventAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await db
      .delete(events)
      .where(and(eq(events.id, id), eq(events.userId, user.id)));
  }
  refresh();
}

export async function toggleEventActiveAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("nextActive") === "true";

  if (id) {
    await db
      .update(events)
      .set({ isActive: nextActive })
      .where(and(eq(events.id, id), eq(events.userId, user.id)));
  }
  refresh();
}
