import { describe, expect, it } from "vitest";
import {
  jdFromDate,
  jdToDate,
  leapMonthOfYear,
  lunarMonthDays,
  lunarToSolar,
  solarToLunar,
} from "./vn-lunar";

describe("julian day", () => {
  it("chuyển đổi qua lại ổn định", () => {
    const jd = jdFromDate(10, 2, 2024);
    expect(jdToDate(jd)).toEqual([10, 2, 2024]);
  });
});

describe("solarToLunar — các mốc đã biết", () => {
  it.each([
    ["1 tháng Giêng 2023 (Tết Quý Mão)", 22, 1, 2023, { day: 1, month: 1, year: 2023, leap: false }],
    ["1 tháng Giêng 2024 (Tết Giáp Thìn)", 10, 2, 2024, { day: 1, month: 1, year: 2024, leap: false }],
    ["1 tháng Giêng 2025 (Tết Ất Tỵ)", 29, 1, 2025, { day: 1, month: 1, year: 2025, leap: false }],
    ["1 tháng Giêng 2026 (Tết Bính Ngọ)", 17, 2, 2026, { day: 1, month: 1, year: 2026, leap: false }],
    ["Rằm Trung thu 2023 (15/8 âm)", 29, 9, 2023, { day: 15, month: 8, year: 2023, leap: false }],
    ["Rằm Trung thu 2024 (15/8 âm)", 17, 9, 2024, { day: 15, month: 8, year: 2024, leap: false }],
    ["Giao thừa 2024 (30 tháng Chạp năm Quý Mão)", 9, 2, 2024, { day: 30, month: 12, year: 2023, leap: false }],
  ])("%s", (_label, d, m, y, expected) => {
    expect(solarToLunar(d as number, m as number, y as number)).toEqual(expected);
  });
});

describe("ngày Tết 2020-2035", () => {
  // Bảng ngày Tết đã được đối chiếu chéo với implementation Hồ Ngọc Đức độc lập
  // và khớp với lịch công bố.
  const tet = [
    [2020, 25, 1],
    [2021, 12, 2],
    [2022, 1, 2],
    [2023, 22, 1],
    [2024, 10, 2],
    [2025, 29, 1],
    [2026, 17, 2],
    [2027, 6, 2],
    [2028, 26, 1],
    [2029, 13, 2],
    [2030, 2, 2],
    [2031, 23, 1],
    [2032, 11, 2],
    [2033, 31, 1],
    [2034, 19, 2],
    [2035, 8, 2],
  ] as const;

  it.each(tet)("Tết %i là %i/%i dương lịch", (lunarYear, day, month) => {
    expect(lunarToSolar(1, 1, lunarYear)).toEqual({ day, month, year: lunarYear });
    expect(solarToLunar(day, month, lunarYear)).toEqual({
      day: 1,
      month: 1,
      year: lunarYear,
      leap: false,
    });
  });
});

describe("lunarToSolar", () => {
  it("đảo ngược được solarToLunar", () => {
    expect(lunarToSolar(1, 1, 2024)).toEqual({ day: 10, month: 2, year: 2024 });
    expect(lunarToSolar(15, 8, 2024)).toEqual({ day: 17, month: 9, year: 2024 });
    expect(lunarToSolar(30, 12, 2023)).toEqual({ day: 9, month: 2, year: 2024 });
  });

  it("trả về null khi yêu cầu tháng nhuận không tồn tại", () => {
    expect(lunarToSolar(1, 5, 2024, true)).toBeNull();
  });
});

describe("tháng nhuận", () => {
  it("khớp bảng tháng nhuận đã công bố", () => {
    // Đã đối chiếu chéo với một implementation Hồ Ngọc Đức độc lập.
    expect(leapMonthOfYear(2020)).toBe(4);
    expect(leapMonthOfYear(2023)).toBe(2);
    expect(leapMonthOfYear(2024)).toBe(0);
    expect(leapMonthOfYear(2025)).toBe(6);
    expect(leapMonthOfYear(2028)).toBe(5);
    expect(leapMonthOfYear(2031)).toBe(3);
    expect(leapMonthOfYear(2033)).toBe(11);
    expect(leapMonthOfYear(2036)).toBe(6);
  });

  it("chuyển được sang dương lịch khi yêu cầu đúng tháng nhuận", () => {
    const leapMonth = leapMonthOfYear(2023);
    const solar = lunarToSolar(1, leapMonth, 2023, true);
    expect(solar).not.toBeNull();
    expect(solarToLunar(solar!.day, solar!.month, solar!.year)).toEqual({
      day: 1,
      month: leapMonth,
      year: 2023,
      leap: true,
    });
  });
});

describe("số ngày trong tháng âm", () => {
  it("luôn là 29 hoặc 30 và khớp với ngày thực tế", () => {
    for (let year = 2020; year <= 2030; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const days = lunarMonthDays(month, year);
        expect([29, 30]).toContain(days);

        const lastDay = lunarToSolar(days, month, year);
        expect(lastDay).not.toBeNull();
        expect(solarToLunar(lastDay!.day, lastDay!.month, lastDay!.year)).toMatchObject({
          day: days,
          month,
          year,
        });

        // Ngày kế tiếp phải là mùng 1 của tháng kế tiếp.
        const nextJd = jdFromDate(lastDay!.day, lastDay!.month, lastDay!.year) + 1;
        const [nd, nm, ny] = jdToDate(nextJd);
        expect(solarToLunar(nd, nm, ny).day).toBe(1);
      }
    }
  });
});

describe("tính nhất quán toàn cục", () => {
  it("mỗi ngày trong 2020-2030 đều round-trip đúng", () => {
    const start = jdFromDate(1, 1, 2020);
    const end = jdFromDate(31, 12, 2030);

    for (let jd = start; jd <= end; jd += 1) {
      const [d, m, y] = jdToDate(jd);
      const lunar = solarToLunar(d, m, y);
      const back = lunarToSolar(lunar.day, lunar.month, lunar.year, lunar.leap);
      expect(back).toEqual({ day: d, month: m, year: y });
    }
  });

  it("ngày âm tăng liên tục và reset về 1 khi sang tháng", () => {
    const start = jdFromDate(1, 1, 2021);
    let prev = solarToLunar(...(jdToDate(start) as [number, number, number]));

    for (let jd = start + 1; jd <= jdFromDate(31, 12, 2025); jd += 1) {
      const [d, m, y] = jdToDate(jd);
      const cur = solarToLunar(d, m, y);
      if (cur.day === 1) {
        expect(prev.day).toBeGreaterThanOrEqual(29);
      } else {
        expect(cur.day).toBe(prev.day + 1);
      }
      prev = cur;
    }
  });
});
