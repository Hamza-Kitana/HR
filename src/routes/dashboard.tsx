import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpLeft,
  Briefcase,
  CalendarDays,
  Clock3,
  FileText,
  type LucideIcon,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell, DataTable, StatusBadge } from "@/components/app/app-shell";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useActivityLog } from "@/lib/activity-log";
import { buildDayAttendance, useAttendance } from "@/lib/attendance";
import { useAuth } from "@/lib/auth";
import { useHrRequests } from "@/lib/hr-requests";
import { useI18n } from "@/lib/i18n";
import {
  currentPayrollMonth,
  formatPayrollMonth,
  money,
  usePayroll,
} from "@/lib/payroll";
import {
  APPLICATION_STAGES,
  useRecruitment,
} from "@/lib/recruitment";
import { useStaff } from "@/lib/staff";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "لوحة التحكم | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: DashboardPage,
  pendingComponent: DashboardPending,
});

function DashboardPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      جارٍ التحميل...
    </div>
  );
}

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDays(iso: string, delta: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortDayLabel(iso: string, _lang: "ar" | "en") {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
  });
}

function longDateLabel(iso: string, _lang: "ar" | "en") {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DashboardPage() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const { staff } = useStaff();
  const { records } = useAttendance();
  const { payslips } = usePayroll();
  const { applications, openings } = useRecruitment();
  const { entries } = useActivityLog();
  const { requests } = useHrRequests();

  const today = todayIso();
  const payrollMonth = currentPayrollMonth();
  const firstName = profile?.full_name?.split(/\s+/)[0] ?? "";

  const activeStaff = useMemo(
    () => staff.filter((s) => s.is_active && s.username !== "sadmin"),
    [staff],
  );

  const todayRows = useMemo(
    () => buildDayAttendance(today, staff, records),
    [today, staff, records],
  );

  const presentToday = todayRows.filter(
    (r) => r.record.status === "present" || r.record.status === "late",
  ).length;
  const lateToday = todayRows.filter((r) => r.record.status === "late").length;
  const absentToday = todayRows.filter((r) => r.record.status === "absent").length;
  const leaveToday = todayRows.filter((r) => r.record.status === "leave").length;
  const presentOnly = todayRows.filter((r) => r.record.status === "present").length;

  const pendingLeaves = requests.filter((r) => r.type === "leave" && r.status === "pending").length;
  const pendingResignations = requests.filter(
    (r) => r.type === "resignation" && r.status === "pending",
  ).length;
  const pendingHr = pendingLeaves + pendingResignations;
  const openJobs = openings.filter((o) => o.status === "open").length;
  const newApps = applications.filter((a) => a.stage === "new").length;

  const monthSlips = payslips.filter((p) => p.month === payrollMonth);
  const paidNet = monthSlips.filter((p) => p.status === "paid").reduce((s, p) => s + p.net, 0);
  const payrollTotal = monthSlips.reduce((s, p) => s + p.net, 0);

  const attendanceRate =
    activeStaff.length > 0 ? Math.round((presentToday / activeStaff.length) * 100) : 0;

  const attendanceWeek = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = shiftDays(today, i - 6);
      const rows = buildDayAttendance(date, staff, records);
      const present = rows.filter(
        (r) => r.record.status === "present" || r.record.status === "late",
      ).length;
      const late = rows.filter((r) => r.record.status === "late").length;
      const absent = rows.filter((r) => r.record.status === "absent").length;
      return {
        day: shortDayLabel(date, lang),
        date,
        present,
        late,
        absent,
      };
    });
  }, [today, staff, records, lang]);

  const attendanceBarConfig = {
    present: { label: lang === "ar" ? "حاضر" : "Present", color: "oklch(0.62 0.14 155)" },
    late: { label: lang === "ar" ? "متأخر" : "Late", color: "oklch(0.72 0.14 75)" },
    absent: { label: lang === "ar" ? "غائب" : "Absent", color: "oklch(0.62 0.18 25)" },
  } satisfies ChartConfig;

  const recruitmentStages = useMemo(() => {
    const total = applications.length || 1;
    return APPLICATION_STAGES.map((s) => {
      const count = applications.filter((a) => a.stage === s.id).length;
      return {
        id: s.id,
        label: lang === "ar" ? s.ar : s.en,
        count,
        pct: Math.round((count / total) * 100),
      };
    });
  }, [applications, lang]);

  const todayMix = [
    {
      key: "present",
      label: lang === "ar" ? "حاضر" : "Present",
      value: presentOnly,
      tone: "bg-success",
    },
    {
      key: "late",
      label: lang === "ar" ? "متأخر" : "Late",
      value: lateToday,
      tone: "bg-amber-500",
    },
    {
      key: "absent",
      label: lang === "ar" ? "غائب" : "Absent",
      value: absentToday,
      tone: "bg-destructive",
    },
    {
      key: "leave",
      label: lang === "ar" ? "إجازة" : "Leave",
      value: leaveToday,
      tone: "bg-sky-500",
    },
  ] as const;

  const mixTotal = todayMix.reduce((s, x) => s + x.value, 0) || 1;

  const recentLogs = entries.slice(0, 6);
  const firstIn = [...todayRows]
    .filter((r) => r.record.checkIn)
    .sort((a, b) => (a.record.checkIn! > b.record.checkIn! ? 1 : -1))[0];

  const quickLinks = [
    { to: "/attendance", label: t("nav.attendance"), icon: Clock3 },
    { to: "/employees", label: t("nav.employees"), icon: Users },
    { to: "/payroll", label: t("nav.payroll"), icon: Wallet },
    { to: "/leaves", label: t("nav.leaves"), icon: CalendarDays },
    { to: "/recruitment", label: t("nav.recruitment"), icon: Briefcase },
    { to: "/contracts", label: t("nav.contracts"), icon: FileText },
  ] as const;

  return (
    <AppShell title="nav.dashboard">
      {/* Welcome */}
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-card shadow-soft animate-fade-up">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_100%_0%,oklch(0.55_0.1_185_/_0.18),transparent_55%),radial-gradient(ellipse_50%_40%_at_0%_100%,oklch(0.5_0.08_230_/_0.1),transparent_50%)]"
        />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-primary">
              {lang === "ar" ? "توقيعي · لوحة التحكم" : "Tawqi3i · Dashboard"}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
              {lang === "ar"
                ? firstName
                  ? `مرحباً، ${firstName}`
                  : "مرحباً بك"
                : firstName
                  ? `Welcome, ${firstName}`
                  : "Welcome back"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {longDateLabel(today, lang)}
              <span className="mx-2 text-border">·</span>
              {formatPayrollMonth(payrollMonth, lang)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-xs font-semibold backdrop-blur transition-colors hover:border-primary/35 hover:bg-primary/5"
                >
                  <Icon className="size-3.5 text-primary" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Primary KPIs */}
      <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 animate-fade-up [animation-delay:60ms]">
        <KpiCard
          icon={Users}
          label={t("dash.employees")}
          value={activeStaff.length}
          hint={lang === "ar" ? "موظفون نشطون" : "Active staff"}
          to="/employees"
        />
        <KpiCard
          icon={UserCheck}
          label={t("dash.presentToday")}
          value={presentToday}
          hint={
            lang === "ar"
              ? `نسبة الحضور ${attendanceRate}% · متأخر ${lateToday}`
              : `${attendanceRate}% rate · ${lateToday} late`
          }
          to="/attendance"
          accent="success"
        />
        <KpiCard
          icon={CalendarDays}
          label={lang === "ar" ? "طلبات بانتظار القرار" : "Pending HR"}
          value={pendingHr}
          hint={
            lang === "ar"
              ? `إجازات ${pendingLeaves} · استقالات ${pendingResignations}`
              : `Leaves ${pendingLeaves} · Resignations ${pendingResignations}`
          }
          to="/leaves"
          accent={pendingHr > 0 ? "warning" : "default"}
        />
        <KpiCard
          icon={Wallet}
          label={lang === "ar" ? "مسير الشهر" : "Month payroll"}
          value={`${money(payrollTotal)}`}
          hint={
            lang === "ar"
              ? `JOD · مدفوع ${money(paidNet)} · ${monthSlips.length} مسير`
              : `JOD · paid ${money(paidNet)} · ${monthSlips.length} slips`
          }
          to="/payroll"
        />
      </div>

      {/* Secondary pulse */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 animate-fade-up [animation-delay:100ms]">
        <PulseStat
          label={lang === "ar" ? "غائبون اليوم" : "Absent today"}
          value={absentToday}
          tone={absentToday > 0 ? "danger" : "muted"}
        />
        <PulseStat
          label={lang === "ar" ? "شواغر مفتوحة" : "Open roles"}
          value={openJobs}
          hint={lang === "ar" ? `${newApps} طلب جديد` : `${newApps} new apps`}
        />
        <PulseStat
          label={lang === "ar" ? "المتقدمون" : "Applicants"}
          value={applications.length}
        />
        <PulseStat
          label={t("dash.firstIn")}
          value={
            firstIn
              ? `${firstIn.employee.full_name.split(" ")[0]}`
              : "—"
          }
          {...(firstIn?.record.checkIn ? { hint: firstIn.record.checkIn } : {})}
        />
      </div>

      {/* Charts + today mix */}
      <div className="mb-6 grid gap-4 xl:grid-cols-5 animate-fade-up [animation-delay:140ms]">
        <Panel className="xl:col-span-3" title={t("dash.attendanceTrend")} subtitle={lang === "ar" ? "آخر 7 أيام" : "Last 7 days"}>
          <ChartContainer config={attendanceBarConfig} className="aspect-[16/9] w-full min-h-[14rem]">
            <BarChart data={attendanceWeek} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="present" stackId="a" fill="var(--color-present)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="late" stackId="a" fill="var(--color-late)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="absent" stackId="a" fill="var(--color-absent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </Panel>

        <Panel
          className="xl:col-span-2"
          title={lang === "ar" ? "توزيع حضور اليوم" : "Today’s mix"}
          subtitle={lang === "ar" ? `${activeStaff.length} موظف نشط` : `${activeStaff.length} active`}
          action={
            <Link to="/attendance" className="text-xs font-semibold text-primary hover:underline">
              {lang === "ar" ? "التفاصيل" : "Details"}
            </Link>
          }
        >
          {mixTotal <= 1 && todayMix.every((x) => x.value === 0) ? (
            <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              {lang === "ar" ? "لا بيانات حضور لهذا اليوم" : "No attendance data for today"}
            </p>
          ) : (
            <div className="space-y-5">
              <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
                {todayMix.map((item) =>
                  item.value > 0 ? (
                    <div
                      key={item.key}
                      className={cn("h-full transition-all", item.tone)}
                      style={{ width: `${(item.value / mixTotal) * 100}%` }}
                      title={`${item.label}: ${item.value}`}
                    />
                  ) : null,
                )}
              </div>
              <ul className="space-y-3">
                {todayMix.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2.5 text-muted-foreground">
                      <span className={cn("size-2.5 rounded-full", item.tone)} />
                      {item.label}
                    </span>
                    <span className="font-display font-bold tabular-nums">
                      {item.value}
                      <span className="ms-1.5 text-xs font-normal text-muted-foreground">
                        {Math.round((item.value / mixTotal) * 100)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="size-3.5 text-primary" />
                  {lang === "ar" ? "نسبة الحضور اليوم" : "Attendance rate today"}
                </div>
                <p className="mt-1 font-display text-2xl font-bold text-primary">{attendanceRate}%</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Recruitment + activity */}
      <div className="mb-6 grid gap-4 xl:grid-cols-5 animate-fade-up [animation-delay:180ms]">
        <Panel
          className="xl:col-span-2"
          title={lang === "ar" ? "مسار التوظيف" : "Recruitment pipeline"}
          subtitle={lang === "ar" ? "حسب مرحلة الطلب" : "By application stage"}
          action={
            <Link to="/recruitment" className="text-xs font-semibold text-primary hover:underline">
              {lang === "ar" ? "التوظيف" : "Recruitment"}
            </Link>
          }
        >
          {applications.length === 0 ? (
            <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              {lang === "ar" ? "لا طلبات توظيف بعد" : "No applications yet"}
            </p>
          ) : (
            <ul className="space-y-3.5">
              {recruitmentStages.map((stage) => (
                <li key={stage.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{stage.label}</span>
                    <span className="font-display text-sm font-bold tabular-nums">{stage.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${Math.max(stage.pct, stage.count > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          className="xl:col-span-3"
          title={t("dash.recentActivity")}
          subtitle={lang === "ar" ? "آخر العمليات" : "Latest actions"}
          action={
            <Link to="/audit" className="text-xs font-semibold text-primary hover:underline">
              {lang === "ar" ? "كل اللوجات" : "All logs"}
            </Link>
          }
        >
          {recentLogs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              {lang === "ar" ? "لا يوجد نشاط بعد." : "No activity yet."}
            </p>
          ) : (
            <ul className="divide-y divide-border/70">
              {recentLogs.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {lang === "ar" ? row.action : row.actionEn}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {lang === "ar" ? row.entity : row.entityEn}
                      {(lang === "ar" ? row.details : row.detailsEn)
                        ? ` · ${lang === "ar" ? row.details : row.detailsEn}`
                        : ""}
                    </p>
                  </div>
                  <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {new Date(row.at).toLocaleString("en-GB", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Today attendance table */}
      <section className="animate-fade-up [animation-delay:220ms]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold">
              {lang === "ar" ? "حضور اليوم" : "Today’s attendance"}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {lang === "ar" ? "أحدث تسجيلات الدخول" : "Latest check-ins"}
            </p>
          </div>
          <Link
            to="/attendance"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {lang === "ar" ? "فتح الحضور" : "Open attendance"}
            <ArrowUpLeft className="size-3.5 rtl:rotate-90" />
          </Link>
        </div>
        <DataTable
          headers={[t("att.employee"), t("att.checkIn"), t("common.status"), t("att.late")]}
          rows={todayRows.slice(0, 8).map(({ employee, record }) => [
            employee.full_name,
            record.checkIn ?? "—",
            <StatusBadge
              key={`${employee.id}-st`}
              tone={
                record.status === "late"
                  ? "warning"
                  : record.status === "present"
                    ? "success"
                    : record.status === "absent"
                      ? "danger"
                      : "info"
              }
            >
              {record.status === "late"
                ? t("att.lateStatus")
                : record.status === "present"
                  ? t("att.present")
                  : record.status === "remote"
                    ? t("att.remote")
                    : record.status === "leave"
                      ? t("att.leave")
                      : record.status === "off"
                        ? lang === "ar"
                          ? "إجازة أسبوعية"
                          : "Off"
                        : t("att.absent")}
            </StatusBadge>,
            record.lateMinutes ? `${record.lateMinutes} ${t("att.minutes")}` : "—",
          ])}
        />
      </section>
    </AppShell>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  to,
  accent = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  to: string;
  accent?: "default" | "success" | "warning";
}) {
  const accentIcon =
    accent === "success"
      ? "bg-success/15 text-success"
      : accent === "warning"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-primary/12 text-primary";

  return (
    <Link
      to={to}
      className="surface-panel group relative block overflow-hidden p-5 transition-colors hover:border-primary/30 hover:bg-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", accentIcon)}>
          <Icon className="size-5" />
        </span>
      </div>
    </Link>
  );
}

function PulseStat({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "muted" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 px-3.5 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-lg font-bold tabular-nums leading-none",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-panel p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
