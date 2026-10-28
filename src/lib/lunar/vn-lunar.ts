/**
 * Chuyển đổi Âm lịch <-> Dương lịch Việt Nam.
 *
 * Cài đặt theo thuật toán của Hồ Ngọc Đức (Đại học Leipzig, 2004) — thuật toán
 * thiên văn tính ngày sóc (new moon) và kinh độ mặt trời, dùng múi giờ UTC+7
 * cho lịch Việt Nam. Thuật toán thuần tuý, không phụ thuộc thư viện ngoài.
 *
 * Nguồn tham chiếu: http://www.informatik.uni-leipzig.de/~duc/amlich/
 */

export const VN_TIMEZONE = 7;

const PI = Math.PI;
const DR = PI / 180;
const SYNODIC_MONTH = 29.530588853;
/** Julian day của kỷ nguyên dùng trong thuật toán (1900-01-01). */
const JD_EPOCH = 2415021.076998695;

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  leap: boolean;
}

export interface SolarDate {
  day: number;
  month: number;
  year: number;
}

/** Julian day number từ ngày dương lịch. */
export function jdFromDate(day: number, month: number, year: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < 2299161) {
    jd =
      day +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      32083;
  }
  return jd;
}

/** Ngày dương lịch từ Julian day number. */
export function jdToDate(jd: number): [number, number, number] {
  let a: number;
  let b: number;
  let c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return [day, month, year];
}

/** Thời điểm sóc (new moon) thứ k kể từ 1900-01-01, theo Julian day. */
function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;

  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * DR);

  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

  let c1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * DR) + 0.0021 * Math.sin(2 * DR * M);
  c1 -= 0.4068 * Math.sin(Mpr * DR);
  c1 += 0.0161 * Math.sin(DR * 2 * Mpr);
  c1 -= 0.0004 * Math.sin(DR * 3 * Mpr);
  c1 += 0.0104 * Math.sin(DR * 2 * F);
  c1 -= 0.0051 * Math.sin(DR * (M + Mpr));
  c1 -= 0.0074 * Math.sin(DR * (M - Mpr));
  c1 += 0.0004 * Math.sin(DR * (2 * F + M));
  c1 -= 0.0004 * Math.sin(DR * (2 * F - M));
  c1 -= 0.0006 * Math.sin(DR * (2 * F + Mpr));
  c1 += 0.001 * Math.sin(DR * (2 * F - Mpr));
  c1 += 0.0005 * Math.sin(DR * (2 * Mpr + M));

  let deltaT: number;
  if (T < -11) {
    deltaT =
      0.001 +
      0.000839 * T +
      0.0002261 * T2 -
      0.00000845 * T3 -
      0.000000081 * T * T3;
  } else {
    deltaT = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }

  return jd1 + c1 - deltaT;
}

/** Ngày (Julian) bắt đầu tháng âm chứa sóc thứ k, theo múi giờ. */
function newMoonDay(k: number, timeZone: number): number {
  return Math.floor(newMoon(k) + 0.5 + timeZone / 24);
}

/** Kinh độ mặt trời (radian) tại thời điểm jdn. */
function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  const dl =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(DR * M) +
    (0.019993 - 0.000101 * T) * Math.sin(DR * 2 * M) +
    0.00029 * Math.sin(DR * 3 * M);
  let L = (L0 + dl) * DR;
  L -= PI * 2 * Math.floor(L / (PI * 2));
  return L;
}

/** Chỉ số 0..11 của cung hoàng đạo (mỗi cung 30°) mà mặt trời đang ở. */
function sunLongIndex(dayNumber: number, timeZone: number): number {
  return Math.floor((sunLongitude(dayNumber - 0.5 - timeZone / 24) / PI) * 6);
}

/** Julian day bắt đầu tháng 11 âm lịch của năm dương `year`. */
function lunarMonth11(year: number, timeZone: number): number {
  const off = jdFromDate(31, 12, year) - 2415021;
  const k = Math.floor(off / SYNODIC_MONTH);
  let nm = newMoonDay(k, timeZone);
  if (sunLongIndex(nm, timeZone) >= 9) {
    nm = newMoonDay(k - 1, timeZone);
  }
  return nm;
}

/** Độ lệch (số tháng kể từ tháng 11) của tháng nhuận trong năm âm. */
function leapMonthOffset(a11: number, timeZone: number): number {
  const k = Math.floor((a11 - JD_EPOCH) / SYNODIC_MONTH + 0.5);
  let last = 0;
  let i = 1;
  let arc = sunLongIndex(newMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = sunLongIndex(newMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

/** Chuyển ngày dương lịch sang âm lịch. */
export function solarToLunar(
  day: number,
  month: number,
  year: number,
  timeZone: number = VN_TIMEZONE,
): LunarDate {
  const dayNumber = jdFromDate(day, month, year);
  const k = Math.floor((dayNumber - JD_EPOCH) / SYNODIC_MONTH);

  let monthStart = newMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = newMoonDay(k, timeZone);
  }

  let a11 = lunarMonth11(year, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = year;
    a11 = lunarMonth11(year - 1, timeZone);
  } else {
    lunarYear = year + 1;
    b11 = lunarMonth11(year + 1, timeZone);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);

  let leap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = leapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        leap = true;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap };
}

/**
 * Chuyển ngày âm lịch sang dương lịch.
 * Trả về `null` nếu ngày âm không tồn tại (ví dụ yêu cầu tháng nhuận ở năm
 * không có tháng nhuận đó).
 */
export function lunarToSolar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  leap = false,
  timeZone: number = VN_TIMEZONE,
): SolarDate | null {
  let a11: number;
  let b11: number;
  if (lunarMonth < 11) {
    a11 = lunarMonth11(lunarYear - 1, timeZone);
    b11 = lunarMonth11(lunarYear, timeZone);
  } else {
    a11 = lunarMonth11(lunarYear, timeZone);
    b11 = lunarMonth11(lunarYear + 1, timeZone);
  }

  const k = Math.floor(0.5 + (a11 - JD_EPOCH) / SYNODIC_MONTH);
  let off = lunarMonth - 11;
  if (off < 0) {
    off += 12;
  }

  if (b11 - a11 > 365) {
    const leapOff = leapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }
    if (leap && lunarMonth !== leapMonth) {
      return null;
    }
    if (leap || off >= leapOff) {
      off += 1;
    }
  } else if (leap) {
    return null;
  }

  const monthStart = newMoonDay(k + off, timeZone);
  const [day, month, year] = jdToDate(monthStart + lunarDay - 1);
  return { day, month, year };
}

const leapMonthCache = new Map<number, number>();

/**
 * Số tháng nhuận của một năm âm lịch, hoặc 0 nếu năm đó không có tháng nhuận.
 */
export function leapMonthOfYear(
  lunarYear: number,
  timeZone: number = VN_TIMEZONE,
): number {
  const cached = leapMonthCache.get(lunarYear);
  if (cached !== undefined) {
    return cached;
  }

  let result = 0;
  const tet = lunarToSolar(1, 1, lunarYear, false, timeZone);
  if (tet) {
    const tetJd = jdFromDate(tet.day, tet.month, tet.year);
    for (let i = 0; i < 400; i += 1) {
      const [d, m, y] = jdToDate(tetJd + i);
      const lunar = solarToLunar(d, m, y, timeZone);
      if (lunar.leap && lunar.year === lunarYear) {
        result = lunar.month;
        break;
      }
    }
  }

  leapMonthCache.set(lunarYear, result);
  return result;
}

/** Số ngày của một tháng âm lịch (29 hoặc 30). */
export function lunarMonthDays(
  lunarMonth: number,
  lunarYear: number,
  leap = false,
  timeZone: number = VN_TIMEZONE,
): number {
  const start = lunarToSolar(1, lunarMonth, lunarYear, leap, timeZone);
  if (!start) {
    return 0;
  }
  const startJd = jdFromDate(start.day, start.month, start.year);
  const [d, m, y] = jdToDate(startJd + 29);
  const probe = solarToLunar(d, m, y, timeZone);
  return probe.day === 1 ? 29 : 30;
}
