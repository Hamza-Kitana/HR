import { useCallback, useEffect, useState } from "react";

import { logActivity } from "./activity-log";
import { loadAttendanceSnapshot, type AttendanceRecord } from "./attendance";
import { weekdayFromDate } from "./shifts";
import type { StaffRecord } from "./staff";

export type PayslipStatus = "draft" | "approved" | "paid";

export type Payslip = {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  basic: number;
  allowances: number;
  /** مجموع الخصومات = غياب + أخرى */
  deductions: number;
  absenceDays: number;
  /** تواريخ الغياب اللي انخصم عليها (للتوضيح) */
  absenceDates: string[];
  /** سعر اليوم المستخدم عند تنفيذ خصم الغياب */
  dailyRate: number;
  absenceDeduction: number;
  otherDeduction: number;
  note: string;
  net: number;
  status: PayslipStatus;
  paidAt?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "tawqi3i.payroll.v1";
const MAX = 2000;

function uid() {
  return `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

export function currentPayrollMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatPayrollMonth(month: string, _lang: "ar" | "en" = "ar") {
  try {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return month;
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
    });
  } catch {
    return month;
  }
}

export function money(n: number) {
  return `${Math.round(n * 100) / 100}`.replace(/\.00$/, "");
}

function normalizePayslip(raw: Partial<Payslip>): Payslip {
  const basic = typeof raw.basic === "number" ? raw.basic : 0;
  const allowances = typeof raw.allowances === "number" ? raw.allowances : 0;
  const absenceDeduction = typeof raw.absenceDeduction === "number" ? raw.absenceDeduction : 0;
  const otherDeduction = typeof raw.otherDeduction === "number" ? raw.otherDeduction : 0;
  const deductions =
    typeof raw.deductions === "number" ? raw.deductions : absenceDeduction + otherDeduction;
  return {
    id: raw.id ?? uid(),
    employeeId: raw.employeeId ?? "",
    employeeName: raw.employeeName ?? "",
    month: raw.month ?? currentPayrollMonth(),
    basic,
    allowances,
    deductions,
    absenceDays: typeof raw.absenceDays === "number" ? raw.absenceDays : 0,
    absenceDates: Array.isArray(raw.absenceDates)
      ? raw.absenceDates.filter((d): d is string => typeof d === "string")
      : [],
    dailyRate: typeof raw.dailyRate === "number" ? raw.dailyRate : 0,
    absenceDeduction,
    otherDeduction,
    note: raw.note ?? "",
    net: Math.max(0, basic + allowances - deductions),
    status: raw.status ?? "draft",
    ...(raw.paidAt ? { paidAt: raw.paidAt } : {}),
    ...(raw.confirmedAt ? { confirmedAt: raw.confirmedAt } : {}),
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
  };
}

function readPayslips(): Payslip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Payslip>[];
    return Array.isArray(parsed) ? parsed.map((p) => normalizePayslip(p)) : [];
  } catch {
    return [];
  }
}

function persist(list: Payslip[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX)));
}

/** أيام دوام الموظف داخل الشهر */
function scheduledDaysInMonth(employee: StaffRecord, month: string): string[] {
  const total = daysInMonth(month);
  const days: string[] = [];
  for (let d = 1; d <= total; d += 1) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const weekday = weekdayFromDate(date);
    if (employee.workDays.includes(weekday)) days.push(date);
  }
  return days;
}

export type AbsenceSummary = {
  month: string;
  scheduledDays: number;
  absentDays: number;
  presentDays: number;
  leaveDays: number;
  lateDays: number;
  dailyRate: number;
  suggestedDeduction: number;
  absentDates: string[];
};

/**
 * يحسب الغياب من سجلات الحضور لشهر معيّن.
 * يوم دوام ماضي بدون حضور أو بحالة غائب = غياب.
 */
export function summarizeAbsences(
  employee: StaffRecord,
  month: string,
  records?: AttendanceRecord[],
): AbsenceSummary {
  const all = records ?? loadAttendanceSnapshot();
  const byDate = new Map(
    all.filter((r) => r.employeeId === employee.id && r.date.startsWith(month)).map((r) => [r.date, r]),
  );
  const scheduled = scheduledDaysInMonth(employee, month);
  const today = new Date().toISOString().slice(0, 10);
  const absentDates: string[] = [];
  let presentDays = 0;
  let leaveDays = 0;
  let lateDays = 0;

  for (const date of scheduled) {
    if (date > today) continue;
    const rec = byDate.get(date);
    if (!rec) {
      absentDates.push(date);
      continue;
    }
    if (rec.status === "absent") {
      absentDates.push(date);
    } else if (rec.status === "leave" || rec.status === "off") {
      leaveDays += 1;
    } else if (rec.status === "late") {
      lateDays += 1;
      presentDays += 1;
    } else if (rec.status === "present" || rec.status === "remote") {
      presentDays += 1;
    } else {
      absentDates.push(date);
    }
  }

  const scheduledPast = scheduled.filter((d) => d <= today).length || scheduled.length || 30;
  const dailyRate = employee.salary > 0 ? employee.salary / Math.max(1, scheduledPast) : 0;
  const absentDays = absentDates.length;
  const suggestedDeduction = Math.round(absentDays * dailyRate * 100) / 100;

  return {
    month,
    scheduledDays: scheduled.length,
    absentDays,
    presentDays,
    leaveDays,
    lateDays,
    dailyRate: Math.round(dailyRate * 100) / 100,
    suggestedDeduction,
    absentDates,
  };
}

export function payslipsForEmployee(slips: Payslip[], employeeId: string) {
  return slips
    .filter((s) => s.employeeId === employeeId)
    .sort((a, b) => b.month.localeCompare(a.month) || b.updatedAt.localeCompare(a.updatedAt));
}

/** تسميات موحّدة لحالة المسير في كل الواجهات */
export function payslipStatusLabel(status: PayslipStatus, lang: "ar" | "en" = "ar") {
  if (status === "paid") return lang === "ar" ? "نازل" : "Paid";
  if (status === "approved") return lang === "ar" ? "مؤكَّد" : "Confirmed";
  return lang === "ar" ? "مسودة" : "Draft";
}

export function payslipStatusTone(status: PayslipStatus): "success" | "info" | "warning" {
  if (status === "paid") return "success";
  if (status === "approved") return "info";
  return "warning";
}

export function usePayroll() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPayslips(readPayslips());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(payslips);
  }, [payslips, hydrated]);

  const upsertPayslip = useCallback(
    (
      employee: StaffRecord,
      input: {
        month: string;
        basic?: number;
        allowances?: number;
        absenceDays?: number;
        absenceDates?: string[];
        dailyRate?: number;
        absenceDeduction?: number;
        otherDeduction?: number;
        note?: string;
        status?: PayslipStatus;
      },
    ) => {
      const month = input.month;
      let saved: Payslip | null = null;
      setPayslips((prev) => {
        const existing = prev.find((p) => p.employeeId === employee.id && p.month === month);
        if (existing?.status === "paid") {
          saved = existing;
          return prev;
        }
        const basic = input.basic ?? existing?.basic ?? employee.salary;
        const allowances = input.allowances ?? existing?.allowances ?? 0;
        const absenceDays = input.absenceDays ?? existing?.absenceDays ?? 0;
        const absenceDates = input.absenceDates ?? existing?.absenceDates ?? [];
        const dailyRate = input.dailyRate ?? existing?.dailyRate ?? 0;
        const absenceDeduction = input.absenceDeduction ?? existing?.absenceDeduction ?? 0;
        const otherDeduction = input.otherDeduction ?? existing?.otherDeduction ?? 0;
        const deductions = absenceDeduction + otherDeduction;
        const status = input.status ?? existing?.status ?? "draft";
        const next = normalizePayslip({
          id: existing?.id ?? uid(),
          employeeId: employee.id,
          employeeName: employee.full_name,
          month,
          basic,
          allowances,
          deductions,
          absenceDays,
          absenceDates,
          dailyRate,
          absenceDeduction,
          otherDeduction,
          note: input.note ?? existing?.note ?? "",
          status,
          ...(status === "approved"
            ? { confirmedAt: existing?.confirmedAt ?? nowIso() }
            : existing?.confirmedAt
              ? { confirmedAt: existing.confirmedAt }
              : {}),
          ...(status === "paid"
            ? { paidAt: existing?.paidAt ?? nowIso() }
            : existing?.paidAt
              ? { paidAt: existing.paidAt }
              : {}),
          createdAt: existing?.createdAt ?? nowIso(),
          updatedAt: nowIso(),
        });
        saved = next;
        const without = prev.filter((p) => !(p.employeeId === employee.id && p.month === month));
        return [next, ...without];
      });

      logActivity({
        module: "payroll",
        action:
          input.status === "approved"
            ? "تأكيد مسير راتب"
            : "تحديث مسير راتب",
        actionEn: input.status === "approved" ? "Payslip confirmed" : "Payslip updated",
        entity: "راتب",
        entityEn: "Payroll",
        details: `${employee.full_name} · ${month}`,
        detailsEn: `${employee.full_name} · ${month}`,
      });

      return saved;
    },
    [],
  );

  /** تنزيل رواتب كل المسيرات المؤكَّدة لشهر معيّن */
  const disburseApprovedForMonth = useCallback((month: string) => {
    let count = 0;
    let total = 0;
    setPayslips((prev) =>
      prev.map((p) => {
        if (p.month !== month || p.status !== "approved") return p;
        count += 1;
        total += p.net;
        return normalizePayslip({ ...p, status: "paid", paidAt: nowIso(), updatedAt: nowIso() });
      }),
    );
    logActivity({
      module: "payroll",
      action: "تنزيل رواتب الشهر",
      actionEn: "Month payroll disbursed",
      entity: "راتب",
      entityEn: "Payroll",
      details: `${month} · ${count} مسير · ${money(total)} JOD`,
      detailsEn: `${month} · ${count} slips · ${money(total)} JOD`,
    });
    return { count, total };
  }, []);

  return { payslips, upsertPayslip, disburseApprovedForMonth, hydrated };
}

/** نص توضيحي لتفاصيل الخصم والصافي */
export function payslipBreakdownLines(slip: Payslip, lang: "ar" | "en" = "ar") {
  const lines: { label: string; value: string; tone?: "muted" | "danger" | "success" }[] = [
    {
      label: lang === "ar" ? "الراتب الأساسي" : "Basic salary",
      value: `${money(slip.basic)} JOD`,
    },
    {
      label: lang === "ar" ? "البدلات" : "Allowances",
      value: `+ ${money(slip.allowances)} JOD`,
      tone: "muted",
    },
  ];
  if (slip.absenceDeduction > 0 || slip.absenceDays > 0) {
    const ratePart =
      slip.dailyRate > 0
        ? lang === "ar"
          ? ` (${slip.absenceDays} يوم × ${money(slip.dailyRate)} JOD)`
          : ` (${slip.absenceDays} days × ${money(slip.dailyRate)} JOD)`
        : lang === "ar"
          ? ` (${slip.absenceDays} يوم)`
          : ` (${slip.absenceDays} days)`;
    lines.push({
      label: (lang === "ar" ? "خصم الغياب" : "Absence deduction") + ratePart,
      value: `− ${money(slip.absenceDeduction)} JOD`,
      tone: "danger",
    });
  }
  if (slip.otherDeduction > 0) {
    lines.push({
      label: lang === "ar" ? "خصومات أخرى" : "Other deductions",
      value: `− ${money(slip.otherDeduction)} JOD`,
      tone: "danger",
    });
  }
  lines.push({
    label: lang === "ar" ? "الصافي المستحق" : "Net pay",
    value: `${money(slip.net)} JOD`,
    tone: "success",
  });
  return lines;
}

export function buildPayslipPrintHtml(opts: {
  employee: StaffRecord;
  slips: Payslip[];
  company?: string;
  lang?: "ar" | "en";
}) {
  const lang = opts.lang ?? "ar";
  const company = opts.company ?? "توقيعي — Tawqi3i";
  const dir = lang === "ar" ? "rtl" : "ltr";
  const rows = opts.slips
    .map(
      (s) => `
      <section class="slip">
        <header>
          <div>
            <h1>${company}</h1>
            <p>${lang === "ar" ? "كشف راتب" : "Payslip"} — ${formatPayrollMonth(s.month, lang)}</p>
          </div>
          <div class="meta">
            <strong>${opts.employee.full_name}</strong><br/>
            ${opts.employee.job_title} · ${opts.employee.department}<br/>
            @${opts.employee.username}
          </div>
        </header>
        <table>
          <tr><td>${lang === "ar" ? "الراتب الأساسي" : "Basic"}</td><td>${money(s.basic)} JOD</td></tr>
          <tr><td>${lang === "ar" ? "البدلات" : "Allowances"}</td><td>${money(s.allowances)} JOD</td></tr>
          <tr><td>${lang === "ar" ? "أيام الغياب" : "Absence days"}</td><td>${s.absenceDays}</td></tr>
          <tr><td>${lang === "ar" ? "سعر اليوم" : "Daily rate"}</td><td>${money(s.dailyRate)} JOD</td></tr>
          <tr><td>${lang === "ar" ? "خصم الغياب" : "Absence deduction"}</td><td>${money(s.absenceDeduction)} JOD</td></tr>
          <tr><td>${lang === "ar" ? "خصومات أخرى" : "Other deductions"}</td><td>${money(s.otherDeduction)} JOD</td></tr>
          <tr><td>${lang === "ar" ? "إجمالي الخصم" : "Total deductions"}</td><td>${money(s.deductions)} JOD</td></tr>
          <tr class="net"><td>${lang === "ar" ? "الصافي المستحق" : "Net pay"}</td><td>${money(s.net)} JOD</td></tr>
        </table>
        ${
          s.absenceDates?.length
            ? `<p class="note">${lang === "ar" ? "تواريخ الغياب" : "Absence dates"}: ${s.absenceDates.join(" · ")}</p>`
            : ""
        }
        ${s.note ? `<p class="note">${lang === "ar" ? "ملاحظة" : "Note"}: ${s.note}</p>` : ""}
        <footer>
          ${lang === "ar" ? "الحالة" : "Status"}:
          ${payslipStatusLabel(s.status, lang)}
          · ${new Date(s.updatedAt).toLocaleString("en-GB")}
        </footer>
      </section>`,
    )
    .join('<div class="page-break"></div>');

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${lang === "ar" ? "كشوف رواتب" : "Payslips"} — ${opts.employee.full_name}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #122; margin: 24px; background: #f6f8fa; }
    .slip { background: #fff; border: 1px solid #d8dee6; border-radius: 16px; padding: 28px; margin-bottom: 24px; }
    header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 22px; color: #0f766e; }
    .meta { text-align: ${lang === "ar" ? "left" : "right"}; font-size: 13px; color: #445; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 10px 4px; border-bottom: 1px solid #eef2f6; font-size: 14px; }
    td:last-child { text-align: ${lang === "ar" ? "left" : "right"}; font-variant-numeric: tabular-nums; font-weight: 600; }
    tr.net td { border-bottom: none; font-size: 18px; color: #0f766e; padding-top: 16px; }
    .note { font-size: 12px; color: #667; margin-top: 12px; }
    footer { margin-top: 18px; font-size: 12px; color: #778; }
    .page-break { page-break-after: always; height: 1px; }
    @media print { body { background: #fff; margin: 0; } .slip { border: none; border-radius: 0; } }
  </style>
</head>
<body>${rows}
<script>window.onload = () => { window.print(); }</script>
</body></html>`;
}

export function printPayslips(employee: StaffRecord, slips: Payslip[], lang: "ar" | "en" = "ar") {
  const html = buildPayslipPrintHtml({ employee, slips, lang });
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
