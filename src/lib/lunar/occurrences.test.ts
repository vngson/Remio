import { describe, expect, it } from "vitest";
import type { CivilDate } from "@/lib/dates";
import type { EventSchedule } from "@/lib/events/types";
import { lunarMonthDays } from "./vn-lunar";
import { getNextOccurrence, getOccurrences } from "./occurrences";

const d = (year: number, month: number, day: number): CivilDate => ({
  year,
  month,
  day,
});

function schedule(partial: Partial<EventSchedule>): EventSchedule {
  return {
    calendarType: "solar",
    recurrence: "yearly",
    month: null,
    day: null,
    leapMonth: false,
    anchorDate: null,
    ...partial,
  };
}

const dates = (items: { date: CivilDate }[]) => items.map((item) => item.date);

describe("sự kiện lặp hằng năm theo dương lịch", () => {
  it("trả về đúng một ngày mỗi năm", () => {
    const event = schedule({ month: 11, day: 20 });
    expect(dates(getOccurrences(event, d(2025, 1, 1), d(2027, 12, 31)))).toEqual([
      d(2025, 11, 20),
      d(2026, 11, 20),
      d(2027, 11, 20),
    ]);
  });

  it("29/02 lùi về 28/02 ở năm không nhuận", () => {
    const event = schedule({ month: 2, day: 29 });
    const result = getOccurrences(event, d(2024, 1, 1), d(2026, 12, 31));

    expect(dates(result)).toEqual([d(2024, 2, 29), d(2025, 2, 28), d(2026, 2, 28)]);
    expect(result[0].adjustment).toBeUndefined();
    expect(result[1].adjustment).toBe("feb-29");
  });

  it("chỉ trả về ngày nằm trong khoảng yêu cầu", () => {
    const event = schedule({ month: 6, day: 15 });
    expect(dates(getOccurrences(event, d(2025, 7, 1), d(2027, 5, 31)))).toEqual([
      d(2026, 6, 15),
    ]);
  });
});

describe("sự kiện lặp hằng năm theo âm lịch", () => {
  it("ngày Tết mùng 1 tháng Giêng", () => {
    const event = schedule({ calendarType: "lunar", month: 1, day: 1 });
    expect(dates(getOccurrences(event, d(2024, 1, 1), d(2025, 12, 31)))).toEqual([
      d(2024, 2, 10),
      d(2025, 1, 29),
    ]);
  });

  it("rằm Trung thu 15/8", () => {
    const event = schedule({ calendarType: "lunar", month: 8, day: 15 });
    expect(dates(getOccurrences(event, d(2024, 1, 1), d(2025, 12, 31)))).toEqual([
      d(2024, 9, 17),
      d(2025, 10, 6),
    ]);
  });

  it("tháng nhuận chỉ xảy ra ở năm có tháng nhuận đó", () => {
    const event = schedule({
      calendarType: "lunar",
      month: 2,
      day: 10,
      leapMonth: true,
    });
    const result = getOccurrences(event, d(2023, 1, 1), d(2025, 12, 31));

    expect(result).toHaveLength(1);
    expect(result[0].date.year).toBe(2023);
    // Mùng 10 tháng 2 nhuận 2023 rơi vào tháng 3 dương lịch.
    expect(result[0].date.month).toBe(3);
  });

  it("ngày 30 âm lùi về 29 khi tháng chỉ có 29 ngày", () => {
    let target: CivilDate | null = null;
    for (let year = 2024; year <= 2026 && !target; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        if (lunarMonthDays(month, year) === 29) {
          target = d(year, month, 1);
          break;
        }
      }
    }
    expect(target).not.toBeNull();

    const event = schedule({
      calendarType: "lunar",
      month: target!.month,
      day: 30,
    });
    const result = getOccurrences(
      event,
      d(target!.year, 1, 1),
      d(target!.year, 12, 31),
    );

    expect(result).toHaveLength(1);
    expect(result[0].adjustment).toBe("lunar-day-30");
    expect(result[0].date.day).toBeGreaterThanOrEqual(1); // tháng dương tương ứng
  });
});

describe("các kiểu lặp khác", () => {
  it("sự kiện một lần", () => {
    const event = schedule({ recurrence: "once", anchorDate: d(2025, 8, 12) });
    expect(dates(getOccurrences(event, d(2025, 1, 1), d(2025, 12, 31)))).toEqual([
      d(2025, 8, 12),
    ]);
    expect(getOccurrences(event, d(2026, 1, 1), d(2026, 12, 31))).toEqual([]);
  });

  it("lặp hằng tháng, kẹp ngày vào tháng thiếu", () => {
    const event = schedule({ recurrence: "monthly", anchorDate: d(2025, 1, 31) });
    const result = getOccurrences(event, d(2025, 1, 1), d(2025, 4, 30));

    expect(dates(result)).toEqual([
      d(2025, 1, 31),
      d(2025, 2, 28),
      d(2025, 3, 31),
      d(2025, 4, 30),
    ]);
    expect(result[1].adjustment).toBe("short-month");
    expect(result[3].adjustment).toBe("short-month");
  });

  it("lặp hằng tuần", () => {
    const event = schedule({ recurrence: "weekly", anchorDate: d(2025, 3, 3) });
    expect(dates(getOccurrences(event, d(2025, 3, 1), d(2025, 3, 31)))).toEqual([
      d(2025, 3, 3),
      d(2025, 3, 10),
      d(2025, 3, 17),
      d(2025, 3, 24),
      d(2025, 3, 31),
    ]);
  });
});

describe("getNextOccurrence", () => {
  it("tìm ngày gần nhất từ hôm nay", () => {
    const event = schedule({ month: 3, day: 8 });
    expect(getNextOccurrence(event, d(2025, 1, 1))?.date).toEqual(d(2025, 3, 8));
    expect(getNextOccurrence(event, d(2025, 3, 9))?.date).toEqual(d(2026, 3, 8));
  });

  it("trả về null với sự kiện một lần đã qua", () => {
    const event = schedule({ recurrence: "once", anchorDate: d(2020, 1, 1) });
    expect(getNextOccurrence(event, d(2025, 1, 1))).toBeNull();
  });

  it("tôn trọng giới hạn kết quả", () => {
    const event = schedule({ recurrence: "weekly", anchorDate: d(2020, 1, 1) });
    expect(getOccurrences(event, d(2020, 1, 1), d(2030, 1, 1), 3)).toHaveLength(3);
  });
});
