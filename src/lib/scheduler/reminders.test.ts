import { describe, expect, it } from "vitest";
import type { CivilDate } from "@/lib/dates";
import type { EventSchedule } from "@/lib/events/types";
import { computeDueSlots } from "./slots";

/** 08:00 giờ Việt Nam = 01:00 UTC cùng ngày (VN cố định UTC+7). */
function vnInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
}

const yearlySolar = (month: number, day: number): EventSchedule => ({
  calendarType: "solar",
  recurrence: "yearly",
  month,
  day,
  leapMonth: false,
  anchorDate: null,
});

const yearlyLunar = (
  month: number,
  day: number,
  leapMonth = false,
): EventSchedule => ({
  calendarType: "lunar",
  recurrence: "yearly",
  month,
  day,
  leapMonth,
  anchorDate: null,
});

const dateKey = (date: CivilDate) =>
  `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;

describe("computeDueSlots — sự kiện dương lịch 30/10 nhắc lúc 08:00", () => {
  const schedule = yearlySolar(10, 30);
  const days = [0, 1, 3];

  it("chưa tới giờ thì không gửi gì", () => {
    expect(computeDueSlots(schedule, days, "08:00", vnInstant(2026, 10, 26, 9))).toEqual(
      [],
    );
  });

  it("gửi đúng lúc tới hạn (nhắc trước 3 ngày)", () => {
    const slots = computeDueSlots(
      schedule,
      days,
      "08:00",
      vnInstant(2026, 10, 27, 8),
    );
    expect(slots).toHaveLength(1);
    expect(slots[0].daysBefore).toBe(3);
    expect(dateKey(slots[0].occurrenceDate)).toBe("2026-10-30");
    expect(slots[0].sendAt.getTime()).toBe(vnInstant(2026, 10, 27, 8).getTime());
  });

  it("không gửi lại sau khi đã quá cửa sổ 24 giờ", () => {
    expect(computeDueSlots(schedule, days, "08:00", vnInstant(2026, 10, 28, 8))).toEqual(
      [],
    );
  });

  it("gửi bù trong vòng 24 giờ khi cron bị bỏ lỡ", () => {
    const slots = computeDueSlots(
      schedule,
      days,
      "08:00",
      vnInstant(2026, 10, 27, 23, 30),
    );
    expect(slots.map((slot) => slot.daysBefore)).toEqual([3]);
  });

  it("gửi đúng ngày khi tới hạn", () => {
    const slots = computeDueSlots(
      schedule,
      days,
      "08:00",
      vnInstant(2026, 10, 30, 9),
    );
    expect(slots).toHaveLength(1);
    expect(slots[0].daysBefore).toBe(0);
    expect(dateKey(slots[0].occurrenceDate)).toBe("2026-10-30");
  });

  it("hết hạn sau 24 giờ kể từ giờ gửi", () => {
    expect(computeDueSlots(schedule, days, "08:00", vnInstant(2026, 10, 31, 9))).toEqual(
      [],
    );
  });

  it("giờ gửi muộn hơn trong ngày chưa được kích hoạt", () => {
    const morning = computeDueSlots(
      schedule,
      [0],
      "20:00",
      vnInstant(2026, 10, 30, 9),
    );
    expect(morning).toEqual([]);

    const evening = computeDueSlots(
      schedule,
      [0],
      "20:00",
      vnInstant(2026, 10, 30, 20, 10),
    );
    expect(evening).toHaveLength(1);
  });
});

describe("computeDueSlots — sự kiện âm lịch", () => {
  it("ngày Tết 1/1 âm 2026 rơi vào 17/02/2026 dương lịch", () => {
    const slots = computeDueSlots(
      yearlyLunar(1, 1),
      [0, 1],
      "08:00",
      vnInstant(2026, 2, 16, 8),
    );

    expect(slots).toHaveLength(1);
    expect(slots[0].daysBefore).toBe(1);
    expect(dateKey(slots[0].occurrenceDate)).toBe("2026-02-17");
  });

  it("không gửi cho ngày Tết của năm trước", () => {
    expect(
      computeDueSlots(yearlyLunar(1, 1), [0], "08:00", vnInstant(2026, 7, 1, 9)),
    ).toEqual([]);
  });

  it("ngày 30 âm ở tháng 29 ngày được đánh dấu điều chỉnh", () => {
    // Tháng Chạp năm Ất Tỵ (2025) chỉ có 29 ngày; mùng 1 tháng Chạp là 19/01/2026.
    const slots = computeDueSlots(
      yearlyLunar(12, 30),
      [0],
      "08:00",
      vnInstant(2026, 2, 16, 9),
    );

    expect(slots).toHaveLength(1);
    expect(slots[0].adjustment).toBe("lunar-day-30");
    expect(dateKey(slots[0].occurrenceDate)).toBe("2026-02-16");
  });

  it("bỏ qua năm không có tháng nhuận tương ứng", () => {
    const slots = computeDueSlots(
      yearlyLunar(2, 10, true),
      [0],
      "08:00",
      vnInstant(2024, 3, 15, 9),
    );
    expect(slots).toEqual([]);
  });
});
