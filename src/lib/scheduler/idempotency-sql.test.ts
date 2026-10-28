import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { remindersLog } from "@/db/schema";

/**
 * Cơ chế chống gửi trùng nằm ở SQL sinh ra, nên khoá lại bằng test để không bị
 * vô hiệu hoá ngoài ý muốn khi refactor.
 */
function buildClaimSql() {
  const client = postgres("postgres://user:pass@127.0.0.1:1/unused", {
    prepare: false,
    max: 1,
  });
  const db = drizzle(client);

  return db
    .insert(remindersLog)
    .values({
      eventId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      occurrenceDate: "2026-10-30",
      daysBefore: 0,
      channel: "email",
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [
        remindersLog.eventId,
        remindersLog.occurrenceDate,
        remindersLog.daysBefore,
        remindersLog.channel,
      ],
      set: { status: "pending", error: null },
      setWhere: eq(remindersLog.status, "failed"),
    })
    .returning({ id: remindersLog.id })
    .toSQL();
}

describe("SQL giành quyền gửi nhắc nhở", () => {
  it("chèn được, và chỉ ghi đè khi bản ghi trước đó thất bại", () => {
    const sql = buildClaimSql().sql;

    expect(sql).toContain("insert into \"reminders_log\"");
    expect(sql).toContain("on conflict");
    expect(sql).toContain(
      "(\"event_id\",\"occurrence_date\",\"days_before\",\"channel\")",
    );
    expect(sql).toContain("do update set");
    // Điều kiện này bảo đảm lời nhắc đã gửi (status = 'sent') không bị giành lại.
    expect(sql).toMatch(/where\s+"reminders_log"\."status" = \$\d+/);
    expect(sql).toContain("returning \"id\"");
  });
});
