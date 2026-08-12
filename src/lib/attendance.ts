import { useCallback, useEffect, useState } from "react";

import { logActivity } from "./activity-log";
import { getWorkWindow, timeToMinutes, weekdayFromDate } from "./shifts";
import type { StaffRecord } from "./staff";

export type AttendanceStatus = "present" | "late" | "absent" | "leave" | "remote" | "off";

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  /** متى أجا */
  checkIn: string | null;
  /** متى راح */
  checkOut: string | null;
  /** بداية البريك */
  breakStart: string | null;
  /** نهاية البريك */
  breakEnd: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  workMinutes: number;
  notes: string;
};

const STORAGE_KEY = "tawqi3i.attendance.v2";
const LEGACY_KEY = "tawqi3i.attendance.v1";

function recordId(employeeId: string, date: string) {
  return `${employeeId}:${date}`;
}

function normalizeRecord(raw: Partial<AttendanceRecord> & { id?: string }): AttendanceRecord {
  return {
    id: raw.id ?? recordId(raw.employeeId ?? "unknown", raw.date ?? ""),
    employeeId: raw.employeeId ?? "",
    date: raw.date ?? "",
    checkIn: raw.checkIn ?? null,
    checkOut: raw.checkOut ?? null,
    breakStart: raw.breakStart ?? null,
    breakEnd: raw.breakEnd ?? null,
    status: raw.status ?? "absent",
    lateMinutes: typeof raw.lateMinutes === "number" ? raw.lateMinutes : 0,
    workMinutes: typeof raw.workMinutes === "number" ? raw.workMinutes : 0,
    notes: raw.notes ?? "",
  };
}

function computeFromTimes(
  checkIn: string | null,
  checkOut: string | null,
  breakStart: string | null,
  breakEnd: string | null,
  shiftStart: string,
  expectedHours: number,
  forcedStatus?: AttendanceStatus,
): Pick<AttendanceRecord, "status" | "lateMinutes" | "workMinutes"> {
  if (forcedStatus === "leave" || forcedStatus === "remote" || forcedStatus === "off") {
    return {
      status: forcedStatus,
      lateMinutes: 0,
      workMinutes: forcedStatus === "remote" ? expectedHours * 60 : 0,
    };
  }

  if (!checkIn) {
    return { status: "absent", lateMinutes: 0, workMinutes: 0 };
  }

  const inMin = timeToMinutes(checkIn);
  const startMin = timeToMinutes(shiftStart) ?? 8 * 60;
  const lateMinutes = inMin !== null && inMin > startMin ? inMin - startMin : 0;

  let workMinutes = 0;
  if (checkOut) {
    const outMin = timeToMinutes(checkOut);
    if (inMin !== null && outMin !== null) {
      workMinutes = Math.max(0, outMin - inMin);
      const bStart = breakStart ? timeToMinutes(breakStart) : null;
      const bEnd = breakEnd ? timeToMinutes(breakEnd) : null;
      if (bStart !== null && bEnd !== null && bEnd > bStart) {
        workMinutes = Math.max(0, workMinutes - (bEnd - bStart));
      }
    }
  }

  return {
    status: lateMinutes > 0 ? "late" : "present",
    lateMinutes,
    workMinutes,
  };
}

function seedAttendance(): AttendanceRecord[] {
  return [];
}

function readAttendance(): AttendanceRecord[] {
  if (typeof window === "undefined") return seedAttendance();
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return seedAttendance();
    const parsed = JSON.parse(raw) as Partial<AttendanceRecord>[];
    if (!Array.isArray(parsed)) return seedAttendance();
    return parsed.map((item) => normalizeRecord(item));
  } catch {
    return seedAttendance();
  }
}

/** Snapshot for other modules (payroll, reports) */
export function loadAttendanceSnapshot(): AttendanceRecord[] {
  return readAttendance();
}

function persist(records: AttendanceRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.localStorage.removeItem(LEGACY_KEY);
}

export function buildDayAttendance(
  date: string,
  staff: StaffRecord[],
  records: AttendanceRecord[],
): Array<{ employee: StaffRecord; record: AttendanceRecord; scheduled: boolean }> {
  const weekday = weekdayFromDate(date);
  const byId = new Map(records.filter((r) => r.date === date).map((r) => [r.employeeId, r]));

  return staff
    .filter((s) => s.is_active && s.username !== "sadmin")
    .filter((s) => s.workDays.includes(weekday) || byId.has(s.id))
    .map((employee) => {
      const existing = byId.get(employee.id);
      const scheduled = employee.workDays.includes(weekday);
      if (existing) {
        return { employee, record: normalizeRecord(existing), scheduled };
      }
      const blank = normalizeRecord({
        id: recordId(employee.id, date),
        employeeId: employee.id,
        date,
        checkIn: null,
        checkOut: null,
        breakStart: null,
        breakEnd: null,
        status: scheduled ? "absent" : "off",
        lateMinutes: 0,
        workMinutes: 0,
        notes: "",
      });
      return { employee, record: blank, scheduled };
    })
    .sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name, "ar"));
}

export type AttendanceTimeField = "checkIn" | "checkOut" | "breakStart" | "breakEnd";

export function recordsForEmployee(records: AttendanceRecord[], employeeId: string): AttendanceRecord[] {
  return records
    .filter((r) => r.employeeId === employeeId)
    .map((r) => normalizeRecord(r))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export type EmployeeAttendanceSummary = {
  totalDays: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  remote: number;
  off: number;
  totalLateMinutes: number;
  totalWorkMinutes: number;
};

export function summarizeEmployeeAttendance(records: AttendanceRecord[]): EmployeeAttendanceSummary {
  const summary: EmployeeAttendanceSummary = {
    totalDays: records.length,
    present: 0,
    late: 0,
    absent: 0,
    leave: 0,
    remote: 0,
    off: 0,
    totalLateMinutes: 0,
    totalWorkMinutes: 0,
  };
  for (const r of records) {
    if (r.status === "present") summary.present += 1;
    else if (r.status === "late") summary.late += 1;
    else if (r.status === "absent") summary.absent += 1;
    else if (r.status === "leave") summary.leave += 1;
    else if (r.status === "remote") summary.remote += 1;
    else summary.off += 1;
    summary.totalLateMinutes += r.lateMinutes || 0;
    summary.totalWorkMinutes += r.workMinutes || 0;
  }
  return summary;
}

export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>(() => seedAttendance());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRecords(readAttendance());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(records);
  }, [records, hydrated]);

  const upsertRecord = useCallback(
    (
      employee: StaffRecord,
      date: string,
      patch: Partial<
        Pick<AttendanceRecord, AttendanceTimeField | "status" | "notes">
      >,
    ) => {
      const window = getWorkWindow(employee);
      setRecords((prev) => {
        const id = recordId(employee.id, date);
        const current = prev.find((r) => r.id === id);
        const checkIn = patch.checkIn !== undefined ? patch.checkIn : (current?.checkIn ?? null);
        const checkOut = patch.checkOut !== undefined ? patch.checkOut : (current?.checkOut ?? null);
        const breakStart =
          patch.breakStart !== undefined ? patch.breakStart : (current?.breakStart ?? null);
        const breakEnd = patch.breakEnd !== undefined ? patch.breakEnd : (current?.breakEnd ?? null);
        const statusHint = patch.status ?? current?.status;
        const computed = computeFromTimes(
          checkIn,
          checkOut,
          breakStart,
          breakEnd,
          window.start,
          employee.workHours || window.hours,
          statusHint === "leave" || statusHint === "remote" || statusHint === "off"
            ? statusHint
            : undefined,
        );

        const nextRecord = normalizeRecord({
          id,
          employeeId: employee.id,
          date,
          checkIn,
          checkOut,
          breakStart,
          breakEnd,
          status: computed.status,
          lateMinutes: computed.lateMinutes,
          workMinutes: computed.workMinutes,
          notes: patch.notes !== undefined ? patch.notes : (current?.notes ?? ""),
        });

        const without = prev.filter((r) => r.id !== id);
        return [...without, nextRecord];
      });
      const fieldHint = Object.keys(patch).join(", ");
      logActivity({
        module: "attendance",
        action: "تحديث حضور",
        actionEn: "Attendance updated",
        entity: "حضور وغياب",
        entityEn: "Attendance",
        details: `${employee.full_name} · ${date} · ${fieldHint}`,
        detailsEn: `${employee.full_name} · ${date} · ${fieldHint}`,
      });
    },
    [],
  );

  return { records, upsertRecord, hydrated };
}
