import { jdFromDate, jdToDate } from "./lunar/vn-lunar";

/**
 * Toàn bộ ứng dụng cố định múi giờ Việt Nam (UTC+7, không có DST). Nhờ vậy mọi
 * phép tính "giờ tường" chỉ cần một offset hằng số, không cần thư viện timezone.
 */
export const VN_UTC_OFFSET_HOURS = 7;

const MS_PER_MINUTE = 60_000;

export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export function civilToJd(date: CivilDate): number {
  return jdFromDate(date.day, date.month, date.year);
}

export function jdToCivil(jd: number): CivilDate {
  const [day, month, year] = jdToDate(jd);
  return { year, month, day };
}

export function addDays(date: CivilDate, days: number): CivilDate {
  return jdToCivil(civilToJd(date) + days);
}

export function diffDays(a: CivilDate, b: CivilDate): number {
  return civilToJd(a) - civilToJd(b);
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  return civilToJd(a) - civilToJd(b);
}

export function isSameCivil(a: CivilDate, b: CivilDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Khoá ngày dạng `YYYY-MM-DD`, dùng cho cột `date` trong Postgres. */
export function civilKey(date: CivilDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

export function parseCivilKey(key: string): CivilDate {
  const [year, month, day] = key.slice(0, 10).split("-").map(Number);
  return { year, month, day };
}

/** Tách một chuỗi `HH:mm` hoặc `HH:mm:ss` thành giờ và phút. */
export function parseTimeOfDay(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(":").map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

export function formatTimeOfDay(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

/**
 * Thời điểm UTC tương ứng với giờ tường `hour:minute` ngày `date` ở Việt Nam.
 */
export function vnWallTimeToInstant(
  date: CivilDate,
  hour: number,
  minute: number,
): Date {
  return new Date(
    Date.UTC(date.year, date.month - 1, date.day, hour, minute) -
      VN_UTC_OFFSET_HOURS * 60 * MS_PER_MINUTE,
  );
}

/** Ngày dương lịch tại Việt Nam của một thời điểm tuyệt đối. */
export function instantToCivilVN(instant: Date): CivilDate {
  const shifted = new Date(
    instant.getTime() + VN_UTC_OFFSET_HOURS * 60 * MS_PER_MINUTE,
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** Số phút kể từ nửa đêm giờ Việt Nam của một thời điểm tuyệt đối. */
export function instantToMinutesOfDayVN(instant: Date): number {
  const shifted = new Date(
    instant.getTime() + VN_UTC_OFFSET_HOURS * 60 * MS_PER_MINUTE,
  );
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function daysInSolarMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Thứ trong tuần, 0 = Chủ nhật (theo giờ Việt Nam). */
export function weekdayOf(date: CivilDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

const WEEKDAY_LABELS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

export function weekdayLabel(date: CivilDate): string {
  return WEEKDAY_LABELS[weekdayOf(date)];
}

export function formatCivil(date: CivilDate): string {
  return `${pad(date.day)}/${pad(date.month)}/${date.year}`;
}

export function formatCivilLong(date: CivilDate): string {
  return `${weekdayLabel(date)}, ${date.day} tháng ${date.month}, ${date.year}`;
}

export function formatCivilShort(date: CivilDate): string {
  return `${pad(date.day)}/${pad(date.month)}`;
}

export function monthLabel(month: number): string {
  return `Tháng ${month}`;
}
