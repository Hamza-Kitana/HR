import { CalendarDays, Clock3, UserRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/app/app-shell";
import { EmployeeAvatar } from "@/components/app/employee-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  recordsForEmployee,
  summarizeEmployeeAttendance,
  type AttendanceRecord,
  type AttendanceStatus,
  type AttendanceTimeField,
} from "@/lib/attendance";
import { useI18n } from "@/lib/i18n";
import { formatWorkDays, getWorkWindow, minutesToHoursLabel } from "@/lib/shifts";
import type { StaffRecord } from "@/lib/staff";
import { cn } from "@/lib/utils";

function statusLabel(status: AttendanceStatus, lang: "ar" | "en") {
  if (status === "late") return lang === "ar" ? "متأخر" : "Late";
  if (status === "present") return lang === "ar" ? "حاضر" : "Present";
  if (status === "absent") return lang === "ar" ? "غائب" : "Absent";
  if (status === "leave") return lang === "ar" ? "إجازة" : "On leave";
  if (status === "remote") return lang === "ar" ? "عن بعد" : "Remote";
  return lang === "ar" ? "إجازة أسبوعية" : "Day off";
}

function statusTone(status: AttendanceStatus): "success" | "warning" | "danger" | "neutral" | "info" {
  if (status === "late") return "warning";
  if (status === "present") return "success";
  if (status === "absent") return "danger";
  if (status === "leave" || status === "remote") return "info";
  return "neutral";
}

function TimeEdit({
  value,
  canEdit,
  onSave,
}: {
  value: string | null;
  canEdit: boolean;
  onSave: (next: string) => void;
}) {
  if (!canEdit) {
    return (
      <span className="font-mono text-sm" dir="ltr">
        {value ?? "—"}
      </span>
    );
  }
  return (
    <Input
      type="time"
      defaultValue={value ?? ""}
      className="h-8 w-[7rem] rounded-lg"
      dir="ltr"
      onBlur={(e) => {
        const v = e.target.value || "";
        if (v !== (value ?? "")) onSave(v);
      }}
    />
  );
}

export function EmployeeAttendanceDialog({
  employee,
  open,
  onOpenChange,
  canManage,
  records,
  upsertRecord,
  focusDate,
  onOpenProfile,
}: {
  employee: StaffRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  records: AttendanceRecord[];
  upsertRecord: (
    employee: StaffRecord,
    date: string,
    patch: Partial<Pick<AttendanceRecord, AttendanceTimeField | "status" | "notes">>,
  ) => void;
  /** اليوم المعروض في جدول الحضور — يفتح قسم تعديل مباشر لهذا اليوم */
  focusDate?: string;
  onOpenProfile: (employeeId: string) => void;
}) {
  const { t, lang } = useI18n();
  const [monthFilter, setMonthFilter] = useState("");

  const history = useMemo(() => {
    if (!employee) return [] as AttendanceRecord[];
    let list = recordsForEmployee(records, employee.id);
    if (monthFilter) {
      list = list.filter((r) => r.date.startsWith(monthFilter));
    }
    return list;
  }, [employee, records, monthFilter]);

  const summary = useMemo(() => summarizeEmployeeAttendance(history), [history]);
  const workWindow = employee ? getWorkWindow(employee) : null;

  const focusRecord = useMemo(() => {
    if (!employee || !focusDate) return null;
    return (
      records.find((r) => r.employeeId === employee.id && r.date === focusDate) ??
      ({
        id: `${employee.id}:${focusDate}`,
        employeeId: employee.id,
        date: focusDate,
        checkIn: null,
        checkOut: null,
        breakStart: null,
        breakEnd: null,
        status: "absent" as const,
        lateMinutes: 0,
        workMinutes: 0,
        notes: "",
      } satisfies AttendanceRecord)
    );
  }, [employee, focusDate, records]);

  function saveTime(date: string, field: AttendanceTimeField, value: string) {
    if (!employee || !canManage) {
      toast.error(lang === "ar" ? "ما عندك صلاحية تعديل الحضور" : "No permission to edit attendance");
      return;
    }
    upsertRecord(employee, date, { [field]: value.trim() || null });
    toast.success(lang === "ar" ? "تم التحديث" : "Updated");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,56rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5 text-start">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {employee ? (
                <EmployeeAvatar
                  name={employee.full_name}
                  src={employee.avatarUrl}
                  size="lg"
                  rounded="2xl"
                />
              ) : null}
              <div className="min-w-0 space-y-1">
                <DialogTitle className="font-display text-xl">
                  {employee?.full_name ?? (lang === "ar" ? "الحضور والغياب" : "Attendance")}
                </DialogTitle>
                <DialogDescription>
                  {employee
                    ? `${employee.job_title} · ${employee.department}`
                    : lang === "ar"
                      ? "سجل الحضور والغياب"
                      : "Attendance history"}
                </DialogDescription>
              </div>
            </div>
            {employee ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onOpenProfile(employee.id)}
              >
                <UserRound className="size-4" />
                {lang === "ar" ? "معلومات الموظف" : "Employee profile"}
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        {!employee ? (
          <div className="p-6 text-sm text-muted-foreground">{t("common.empty")}</div>
        ) : (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {focusRecord ? (
              <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
                <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
                  <Clock3 className="size-4 text-primary" />
                  {lang === "ar" ? "تسجيل حضور اليوم" : "Log today’s attendance"}
                </h3>
                <p className="mb-4 text-xs text-muted-foreground" dir="ltr">
                  {focusRecord.date}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label={lang === "ar" ? "متى أجا" : "Arrived"}>
                    <TimeEdit
                      key={`focus-in-${focusRecord.date}-${focusRecord.checkIn ?? ""}`}
                      value={focusRecord.checkIn}
                      canEdit={canManage}
                      onSave={(v) => saveTime(focusRecord.date, "checkIn", v)}
                    />
                  </Field>
                  <Field label={lang === "ar" ? "متى راح" : "Left"}>
                    <TimeEdit
                      key={`focus-out-${focusRecord.date}-${focusRecord.checkOut ?? ""}`}
                      value={focusRecord.checkOut}
                      canEdit={canManage}
                      onSave={(v) => saveTime(focusRecord.date, "checkOut", v)}
                    />
                  </Field>
                  <Field label={lang === "ar" ? "بداية البريك" : "Break start"}>
                    <TimeEdit
                      key={`focus-bs-${focusRecord.date}-${focusRecord.breakStart ?? ""}`}
                      value={focusRecord.breakStart}
                      canEdit={canManage}
                      onSave={(v) => saveTime(focusRecord.date, "breakStart", v)}
                    />
                  </Field>
                  <Field label={lang === "ar" ? "نهاية البريك" : "Break end"}>
                    <TimeEdit
                      key={`focus-be-${focusRecord.date}-${focusRecord.breakEnd ?? ""}`}
                      value={focusRecord.breakEnd}
                      canEdit={canManage}
                      onSave={(v) => saveTime(focusRecord.date, "breakEnd", v)}
                    />
                  </Field>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge tone={statusTone(focusRecord.status)}>
                    {statusLabel(focusRecord.status, lang)}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">
                    {lang === "ar" ? "ساعات العمل" : "Hours"}: {minutesToHoursLabel(focusRecord.workMinutes)}
                  </span>
                  {!canManage ? (
                    <span className="text-xs text-muted-foreground">
                      {lang === "ar" ? "عرض فقط" : "View only"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {lang === "ar" ? "عدّل الوقت ثم اخرج من الحقل للحفظ" : "Change time then blur to save"}
                    </span>
                  )}
                </div>
              </section>
            ) : null}

            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Clock3 className="size-4 text-primary" />
                {lang === "ar" ? "دوام الموظف" : "Work schedule"}
              </h3>
              <div className="grid gap-3 sm:grid-cols-4">
                <MiniStat label={lang === "ar" ? "من" : "From"} value={workWindow?.start ?? "—"} mono />
                <MiniStat label={lang === "ar" ? "إلى" : "To"} value={workWindow?.end ?? "—"} mono />
                <MiniStat
                  label={lang === "ar" ? "الساعات" : "Hours"}
                  value={workWindow ? `${workWindow.hours}h` : "—"}
                />
                <MiniStat
                  label={lang === "ar" ? "أيام الدوام" : "Work days"}
                  value={formatWorkDays(employee.workDays, lang)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniStat
                label={lang === "ar" ? "حاضر" : "Present"}
                value={String(summary.present)}
                tone="success"
              />
              <MiniStat
                label={lang === "ar" ? "متأخر" : "Late"}
                value={String(summary.late)}
                tone="warning"
              />
              <MiniStat
                label={lang === "ar" ? "غائب" : "Absent"}
                value={String(summary.absent)}
                tone="danger"
              />
              <MiniStat
                label={lang === "ar" ? "إجازة" : "Leave"}
                value={String(summary.leave)}
                tone="info"
              />
              <MiniStat
                label={lang === "ar" ? "ساعات العمل" : "Worked hours"}
                value={minutesToHoursLabel(summary.totalWorkMinutes)}
              />
              <MiniStat
                label={lang === "ar" ? "دقائق التأخير" : "Late minutes"}
                value={String(summary.totalLateMinutes)}
              />
              <MiniStat
                label={lang === "ar" ? "عن بعد" : "Remote"}
                value={String(summary.remote)}
              />
              <MiniStat
                label={lang === "ar" ? "أيام مسجّلة" : "Logged days"}
                value={String(summary.totalDays)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <CalendarDays className="size-4 text-primary" />
                {lang === "ar" ? "سجل الحضور والغياب" : "Attendance history"}
              </h3>
              <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">{lang === "ar" ? "شهر" : "Month"}</span>
                <Input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="h-8 w-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  dir="ltr"
                />
                {monthFilter ? (
                  <button type="button" className="text-primary" onClick={() => setMonthFilter("")}>
                    {lang === "ar" ? "الكل" : "All"}
                  </button>
                ) : null}
              </label>
            </div>

            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                {lang === "ar"
                  ? "لا يوجد سجلات سابقة — سجّل أوقات اليوم من القسم أعلاه."
                  : "No past records yet — log today’s times in the section above."}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead className="bg-secondary/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 text-start font-semibold">
                        {lang === "ar" ? "التاريخ" : "Date"}
                      </th>
                      <th className="px-3 py-2.5 text-start font-semibold">
                        {lang === "ar" ? "متى أجا" : "Arrived"}
                      </th>
                      <th className="px-3 py-2.5 text-start font-semibold">
                        {lang === "ar" ? "متى راح" : "Left"}
                      </th>
                      <th className="px-3 py-2.5 text-start font-semibold">
                        {lang === "ar" ? "بداية البريك" : "Break start"}
                      </th>
                      <th className="px-3 py-2.5 text-start font-semibold">
                        {lang === "ar" ? "نهاية البريك" : "Break end"}
                      </th>
                      <th className="px-3 py-2.5 text-start font-semibold">{t("common.status")}</th>
                      <th className="px-3 py-2.5 text-start font-semibold">{t("att.hours")}</th>
                      <th className="px-3 py-2.5 text-start font-semibold">
                        {lang === "ar" ? "تأخير" : "Late"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-t border-border",
                          focusDate && row.date === focusDate && "bg-primary/5",
                        )}
                      >
                        <td className="px-3 py-2.5 font-mono text-xs" dir="ltr">
                          {row.date}
                        </td>
                        <td className="px-3 py-2">
                          <TimeEdit
                            value={row.checkIn}
                            canEdit={canManage}
                            onSave={(v) => saveTime(row.date, "checkIn", v)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <TimeEdit
                            value={row.checkOut}
                            canEdit={canManage}
                            onSave={(v) => saveTime(row.date, "checkOut", v)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <TimeEdit
                            value={row.breakStart}
                            canEdit={canManage}
                            onSave={(v) => saveTime(row.date, "breakStart", v)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <TimeEdit
                            value={row.breakEnd}
                            canEdit={canManage}
                            onSave={(v) => saveTime(row.date, "breakEnd", v)}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge tone={statusTone(row.status)}>
                            {statusLabel(row.status, lang)}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2.5">{minutesToHoursLabel(row.workMinutes)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {row.lateMinutes > 0 ? `${row.lateMinutes}m` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "success" | "warning" | "danger" | "info";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-background/70 px-3 py-2.5",
        tone === "success" && "border-emerald-500/25 bg-emerald-500/5",
        tone === "warning" && "border-amber-500/25 bg-amber-500/5",
        tone === "danger" && "border-destructive/25 bg-destructive/5",
        tone === "info" && "border-sky-500/25 bg-sky-500/5",
      )}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold", mono && "font-mono")} dir={mono ? "ltr" : undefined}>
        {value}
      </p>
    </div>
  );
}
