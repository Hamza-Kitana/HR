import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell, DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import {
  recordsForEmployee,
  summarizeEmployeeAttendance,
  useAttendance,
  type AttendanceStatus,
} from "@/lib/attendance";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useStaff } from "@/lib/staff";

export const Route = createFileRoute("/me-absences")({
  ssr: false,
  head: () => ({ meta: [{ title: "الغيابات | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: MeAbsencesPage,
});

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

function MeAbsencesPage() {
  const { t, lang } = useI18n();
  const { session } = useAuth();
  const { getStaff } = useStaff();
  const { records } = useAttendance();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filter, setFilter] = useState<"all" | "absent" | "late" | "leave">("all");

  const me = session?.userId ? getStaff(session.userId) : undefined;
  const mine = me ? recordsForEmployee(records, me.id) : [];

  const filtered = useMemo(() => {
    return mine.filter((r) => {
      if (month && !r.date.startsWith(month)) return false;
      if (filter === "all") return true;
      return r.status === filter;
    });
  }, [mine, month, filter]);

  const monthRecords = useMemo(
    () => mine.filter((r) => r.date.startsWith(month)),
    [mine, month],
  );
  const summary = summarizeEmployeeAttendance(monthRecords);

  if (!me) {
    return (
      <AppShell title="nav.myAbsences">
        <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          {t("common.empty")}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="nav.myAbsences">
      <PageHeader
        title="nav.myAbsences"
        description={
          lang === "ar"
            ? "سجل حضورك وغياباتك كما سجّلها النظام — للعرض فقط."
            : "Your attendance and absences as recorded by the system — view only."
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{lang === "ar" ? "الشهر" : "Month"}</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="flex h-10 rounded-xl border border-input bg-background px-3 text-sm"
            dir="ltr"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", lang === "ar" ? "الكل" : "All"],
              ["absent", lang === "ar" ? "غائب" : "Absent"],
              ["late", lang === "ar" ? "متأخر" : "Late"],
              ["leave", lang === "ar" ? "إجازة" : "Leave"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={
                filter === id
                  ? "rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  : "rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard compact label={lang === "ar" ? "حاضر" : "Present"} value={summary.present} />
        <StatCard compact label={lang === "ar" ? "متأخر" : "Late"} value={summary.late} />
        <StatCard compact label={lang === "ar" ? "غائب" : "Absent"} value={summary.absent} />
        <StatCard compact label={lang === "ar" ? "إجازة" : "Leave"} value={summary.leave} />
      </div>

      <DataTable
        headers={[
          t("common.date"),
          t("common.status"),
          lang === "ar" ? "دخول" : "In",
          lang === "ar" ? "خروج" : "Out",
          lang === "ar" ? "تأخير (د)" : "Late (m)",
          lang === "ar" ? "عمل (د)" : "Work (m)",
        ]}
        rows={filtered.map((r) => [
          <span key={`${r.id}-d`} className="font-mono text-sm" dir="ltr">
            {r.date}
          </span>,
          <StatusBadge key={`${r.id}-s`} tone={statusTone(r.status)}>
            {statusLabel(r.status, lang)}
          </StatusBadge>,
          <span key={`${r.id}-in`} className="font-mono text-sm" dir="ltr">
            {r.checkIn ?? "—"}
          </span>,
          <span key={`${r.id}-out`} className="font-mono text-sm" dir="ltr">
            {r.checkOut ?? "—"}
          </span>,
          String(r.lateMinutes || 0),
          String(r.workMinutes || 0),
        ])}
      />
    </AppShell>
  );
}
