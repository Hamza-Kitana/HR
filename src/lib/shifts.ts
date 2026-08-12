export type ShiftId = "morning" | "standard" | "evening" | "part";

export type ShiftDef = {
  id: ShiftId;
  ar: string;
  en: string;
  start: string;
  end: string;
  hours: number;
};

/** Jordan office shifts */
export const SHIFTS: ShiftDef[] = [
  { id: "morning", ar: "صباحي", en: "Morning", start: "08:00", end: "16:00", hours: 8 },
  { id: "standard", ar: "اعتيادي", en: "Standard", start: "09:00", end: "17:00", hours: 8 },
  { id: "evening", ar: "مسائي", en: "Evening", start: "14:00", end: "22:00", hours: 8 },
  { id: "part", ar: "جزئي", en: "Part-time", start: "09:00", end: "13:00", hours: 4 },
];

/** JS getDay(): 0 Sun … 6 Sat — Jordan office default Sun–Thu */
export const WEEKDAY_LABELS = [
  { day: 0, ar: "أحد", en: "Sun" },
  { day: 1, ar: "إثنين", en: "Mon" },
  { day: 2, ar: "ثلاثاء", en: "Tue" },
  { day: 3, ar: "أربعاء", en: "Wed" },
  { day: 4, ar: "خميس", en: "Thu" },
  { day: 5, ar: "جمعة", en: "Fri" },
  { day: 6, ar: "سبت", en: "Sat" },
] as const;

export const DEFAULT_WORK_DAYS = [0, 1, 2, 3, 4] as const;

export function getShift(id: string | undefined): ShiftDef {
  return SHIFTS.find((s) => s.id === id) ?? SHIFTS[0]!;
}

export function isValidShiftId(id: string): id is ShiftId {
  return SHIFTS.some((s) => s.id === id);
}

export function weekdayFromDate(date: string): number {
  // noon avoids DST edge cases
  return new Date(`${date}T12:00:00`).getDay();
}

export function formatWorkDays(days: number[], lang: "ar" | "en"): string {
  const set = new Set(days);
  return WEEKDAY_LABELS.filter((d) => set.has(d.day))
    .map((d) => (lang === "ar" ? d.ar : d.en))
    .join(lang === "ar" ? "، " : ", ");
}

/** "HH:MM" → minutes from midnight */
export function timeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function minutesToHoursLabel(total: number): string {
  if (total <= 0) return "—";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** Duration in hours between start and end (supports overnight, e.g. 22:00→06:00) */
export function hoursBetween(start: string, end: string): number | null {
  const a = timeToMinutes(start);
  const b = timeToMinutes(end);
  if (a === null || b === null) return null;
  let diff = b - a;
  if (diff <= 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

export function isValidTime(time: string): boolean {
  return timeToMinutes(time) !== null;
}

/** Prefer employee custom times; fall back to shift template */
export function getWorkWindow(person: {
  workStart?: string;
  workEnd?: string;
  shiftId?: string;
  workHours?: number;
}): { start: string; end: string; hours: number } {
  const shift = getShift(person.shiftId);
  const start = person.workStart && isValidTime(person.workStart) ? person.workStart : shift.start;
  const end = person.workEnd && isValidTime(person.workEnd) ? person.workEnd : shift.end;
  const computed = hoursBetween(start, end);
  const hours =
    typeof person.workHours === "number" && person.workHours > 0
      ? person.workHours
      : (computed ?? shift.hours);
  return { start, end, hours };
}
