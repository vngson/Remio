import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cronSecret } from "@/lib/env";
import { processDueReminders } from "@/lib/scheduler/reminders";

function secretMatches(provided: string | null): boolean {
  if (!provided) {
    return false;
  }
  const expected = Buffer.from(cronSecret());
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}

function readSecret(request: Request): string | null {
  const header = request.headers.get("x-cron-secret");
  if (header) {
    return header;
  }
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7);
  }
  return null;
}

/**
 * Endpoint cho cron (Supabase pg_cron + pg_net gọi mỗi 15 phút).
 * Idempotent nhờ `reminders_log`, nên gọi lại nhiều lần vẫn an toàn.
 */
export async function POST(request: Request) {
  if (!secretMatches(readSecret(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueReminders(new Date());
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chạy cron nhắc nhở thất bại", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
