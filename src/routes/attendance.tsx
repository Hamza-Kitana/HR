import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { EmployeeAttendanceDialog } from "@/components/app/employee-attendance-dialog";
import { EmployeeNameCell } from "@/components/app/employee-avatar";
import { EmployeeDetailSheet } from "@/components/app/employee-detail-sheet";
import { AppShell, DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildDayAttendance, useAttendance, type AttendanceStatus } from "@/lib/attendance";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { minutesToHoursLabel, WEEKDAY_LABELS, weekdayFromDate } from "@/lib/shifts";
import { useStaff } from "@/lib/staff";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "الحضور | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: AttendancePage,
});

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

function TimeText({ value }: { value: string | null }) {
  return (
    <span className="font-mono text-sm tabular-nums text-muted-foreground" dir="ltr">
      {value ?? "—"}
    </span>
  );
}

function AttendancePage() {
  const { t, lang } = useI18n();
  const { can, isSuperAdmin } = useAuth();
  const { staff, getStaff } = useStaff();
  const { records, upsertRecord } = useAttendance();
  const [date, setDate] = useState(todayIso);
  const [attendanceEmpId, setAttendanceEmpId] = useState<string | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [profileEmpId, setProfileEmpId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  /** فقط من عنده رول إدارة الحضور يقدر يعدّل — الباقي يشوف فقط */
  const canManage = isSuperAdmin || can("hr.attendance.manage");

  const dayRows = useMemo(() => buildDayAttendance(date, staff, records), [date, staff, records]);
  const selectedAttendanceEmp = attendanceEmpId ? getStaff(attendanceEmpId) ?? null : null;

  const weekday = weekdayFromDate(date);
  const weekdayLabel = WEEKDAY_LABELS.find((d) => d.day === weekday);
  const weekdayName = weekdayLabel ? (lang === "ar" ? weekdayLabel.ar : weekdayLabel.en) : "";

  const presentCount = dayRows.filter((r) => r.record.status === "present" || r.record.status === "late").length;
  const absentCount = dayRows.filter((r) => r.record.status === "absent").length;
  const firstIn = [...dayRows]
    .filter((r) => r.record.checkIn)
    .sort((a, b) => (a.record.checkIn! > b.record.checkIn! ? 1 : -1))[0];

  function openAttendance(empId: string) {
    setAttendanceEmpId(empId);
    setAttendanceOpen(true);
  }

  function openProfile(empId: string) {
    setProfileEmpId(empId);
    setProfileOpen(true);
  }

  return (
    <AppShell title="nav.attendance">
      <PageHeader
        title="nav.attendance"
        description={
          lang === "ar"
            ? canManage
              ? "اضغط على الموظف لفتح سجل حضوره وتسجيل الأوقات من الداخل."
              : "اضغط على الموظف لعرض سجل حضوره وغيابه. التعديل يحتاج رول إدارة الحضور."
            : canManage
              ? "Click an employee to open attendance and edit times inside the dialog."
              : "Click an employee to view attendance history. Editing requires attendance manage role."
        }
        action={
          <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <CalendarDays className="size-4 text-primary" />
            <span className="text-muted-foreground">{lang === "ar" ? "اليوم" : "Day"}</span>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 w-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              dir="ltr"
            />
          </label>
        }
      />

      <div className="mb-4 rounded-xl border border-border bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        {lang === "ar"
          ? `يوم ${date} (${weekdayName}) — اضغط أي مكان بالسطر لفتح الحضور وتعديل الأوقات من الداخل`
          : `${date} (${weekdayName}) — click a row to open attendance and edit times inside`}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={lang === "ar" ? "المجدولون" : "Scheduled"} value={dayRows.length} />
        <StatCard label={t("att.present")} value={presentCount} />
        <StatCard
          label={t("dash.firstIn")}
          value={firstIn ? `${firstIn.employee.full_name.split(" ")[0]} · ${firstIn.record.checkIn}` : "—"}
          {...(absentCount ? { hint: `${lang === "ar" ? "غائبون" : "Absent"}: ${absentCount}` } : {})}
        />
      </div>

      <DataTable
        onRowClick={(idx) => {
          const emp = dayRows[idx]?.employee;
          if (emp) openAttendance(emp.id);
        }}
        headers={[
          t("att.employee"),
          lang === "ar" ? "متى أجا" : "Arrived",
          lang === "ar" ? "متى راح" : "Left",
          lang === "ar" ? "بداية البريك" : "Break start",
          lang === "ar" ? "نهاية البريك" : "Break end",
          t("common.status"),
          t("att.hours"),
          t("common.actions"),
        ]}
        rows={dayRows.map(({ employee, record }) => [
          <EmployeeNameCell
            key={`${employee.id}-name`}
            name={employee.full_name}
            src={employee.avatarUrl}
            subtitle={`${employee.job_title} · ${employee.department}`}
          />,
          <TimeText key={`${employee.id}-in`} value={record.checkIn} />,
          <TimeText key={`${employee.id}-out`} value={record.checkOut} />,
          <TimeText key={`${employee.id}-bs`} value={record.breakStart} />,
          <TimeText key={`${employee.id}-be`} value={record.breakEnd} />,
          <StatusBadge key={`${employee.id}-st`} tone={statusTone(record.status)}>
            {statusLabel(record.status, lang)}
          </StatusBadge>,
          minutesToHoursLabel(record.workMinutes),
          <div key={`${employee.id}-actions`} className="flex flex-wrap gap-1.5" data-no-row-click>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => openAttendance(employee.id)}
            >
              {lang === "ar" ? "سجل الحضور" : "Attendance"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-lg"
              onClick={() => openProfile(employee.id)}
            >
              <UserRound className="size-3.5" />
              {lang === "ar" ? "المعلومات" : "Profile"}
            </Button>
          </div>,
        ])}
      />

      <EmployeeAttendanceDialog
        employee={selectedAttendanceEmp}
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        canManage={canManage}
        records={records}
        upsertRecord={upsertRecord}
        focusDate={date}
        onOpenProfile={(id) => {
          openProfile(id);
        }}
      />

      <EmployeeDetailSheet
        employeeId={profileEmpId}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </AppShell>
  );
}
