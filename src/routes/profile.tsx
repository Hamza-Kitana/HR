import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, CalendarDays, Clock3, FileText, FileWarning, Send } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { EmployeeAvatar } from "@/components/app/employee-avatar";
import { AppShell, PageHeader, StatusBadge } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import {
  activeContractFor,
  contractStatusLabel,
  contractStatusTone,
  contractTypeLabel,
  useContracts,
} from "@/lib/contracts";
import { formatRequestWhen, useHrRequests, type HrRequest } from "@/lib/hr-requests";
import { useI18n } from "@/lib/i18n";
import { getRoleLabel } from "@/lib/permissions";
import { formatWorkDays, getWorkWindow } from "@/lib/shifts";
import { idDocumentLabel, useStaff } from "@/lib/staff";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({ meta: [{ title: "ملفي الشخصي | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

const LEAVE_TYPES = ["سنوية", "مرضية", "طارئة", "بدون راتب"] as const;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function statusTone(status: HrRequest["status"]): "success" | "warning" | "danger" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  return "danger";
}

function ProfilePage() {
  const { t, lang } = useI18n();
  const { session, roles } = useAuth();
  const { getStaff } = useStaff();
  const { submitLeave, submitResignation, myRequests } = useHrRequests();
  const { contracts } = useContracts();

  const me = session?.userId ? getStaff(session.userId) : undefined;
  const requests = me ? myRequests(me.id) : [];
  const myContract = me ? activeContractFor(contracts, me.id) : undefined;
  const [showFullContract, setShowFullContract] = useState(false);

  const [leaveType, setLeaveType] = useState<string>(LEAVE_TYPES[0]);
  const [leaveFrom, setLeaveFrom] = useState(todayIso());
  const [leaveTo, setLeaveTo] = useState(todayIso());
  const [leaveReason, setLeaveReason] = useState("");
  const [resignDay, setResignDay] = useState(todayIso());
  const [resignReason, setResignReason] = useState("");

  const workWindow = useMemo(() => (me ? getWorkWindow(me) : null), [me]);

  if (!me) {
    return (
      <AppShell title="nav.myProfile">
        <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          {t("common.empty")}
        </div>
      </AppShell>
    );
  }

  function onLeaveSubmit(e: FormEvent) {
    e.preventDefault();
    if (!leaveReason.trim()) {
      toast.error(lang === "ar" ? "اكتب سبب الإجازة" : "Enter leave reason");
      return;
    }
    if (leaveTo < leaveFrom) {
      toast.error(lang === "ar" ? "تاريخ النهاية قبل البداية" : "End date is before start");
      return;
    }
    submitLeave({
      employee: me!,
      leaveType,
      from: leaveFrom,
      to: leaveTo,
      reason: leaveReason,
    });
    setLeaveReason("");
    toast.success(lang === "ar" ? "تم إرسال طلب الإجازة إلى HR" : "Leave request sent to HR");
  }

  function onResignSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resignReason.trim()) {
      toast.error(lang === "ar" ? "اكتب سبب الاستقالة" : "Enter resignation reason");
      return;
    }
    submitResignation({
      employee: me!,
      lastDay: resignDay,
      reason: resignReason,
    });
    setResignReason("");
    toast.success(lang === "ar" ? "تم إرسال طلب الاستقالة إلى HR" : "Resignation sent to HR");
  }

  const selectClass =
    "flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <AppShell title="nav.myProfile">
      <PageHeader
        title="nav.myProfile"
        description={
          lang === "ar"
            ? "حسابك الشخصي — عرض فقط. لتعديل البيانات تواصل مع HR."
            : "Your account — view only. Contact HR to change details."
        }
      />

      <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        {lang === "ar"
          ? "لا يمكنك تعديل بياناتك أو دوامك من هنا. يمكنك فقط تقديم طلب إجازة أو استقالة، وHR يقرر القبول أو الرفض ويصلك إشعار."
          : "You cannot edit your profile or schedule here. You can only submit leave or resignation — HR decides and you get notified."}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <section className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <EmployeeAvatar name={me.full_name} src={me.avatarUrl || null} size="xl" rounded="2xl" />
            <div className="min-w-0 space-y-2">
              <h2 className="font-display text-2xl font-bold">{me.full_name}</h2>
              <p className="text-sm text-muted-foreground">
                @{me.username} · {me.email}
              </p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={me.is_active ? "success" : "neutral"}>
                  {me.is_active ? t("emp.active") : t("emp.inactive")}
                </StatusBadge>
                <StatusBadge tone="info">{me.job_title}</StatusBadge>
                <StatusBadge tone="neutral">{me.department}</StatusBadge>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Info label={t("emp.phone")} value={me.phone} />
            <Info label={lang === "ar" ? "الجنسية" : "Nationality"} value={me.nationality} />
            <Info label={idDocumentLabel(me.nationality, lang)} value={me.national_id} mono />
            <Info label={t("emp.hireDate")} value={me.hire_date || "—"} />
            <Info label={lang === "ar" ? "العنوان" : "Address"} value={me.address} className="sm:col-span-2" />
            <Info
              label={lang === "ar" ? "الراتب" : "Salary"}
              value={`${me.salary.toLocaleString("en-GB")} JOD`}
            />
            <Info label={lang === "ar" ? "ملاحظات" : "Notes"} value={me.notes || "—"} />
          </div>

          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Briefcase className="size-4 text-primary" />
              {lang === "ar" ? "المنصب والقسم" : "Position & department"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label={t("emp.jobTitle")} value={me.job_title} />
              <Info label={t("emp.department")} value={me.department} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {roles.map((role) => (
                <StatusBadge key={role} tone="info">
                  {getRoleLabel(role, lang)}
                </StatusBadge>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Clock3 className="size-4 text-primary" />
              {lang === "ar" ? "أوقات دوامي" : "My work schedule"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label={lang === "ar" ? "من" : "From"} value={workWindow?.start ?? "—"} mono />
              <Info label={lang === "ar" ? "إلى" : "To"} value={workWindow?.end ?? "—"} mono />
              <Info
                label={lang === "ar" ? "الساعات" : "Hours"}
                value={workWindow ? `${workWindow.hours}h` : "—"}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {lang === "ar" ? "أيام الدوام: " : "Work days: "}
              <span className="font-medium text-foreground">{formatWorkDays(me.workDays, lang)}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <FileText className="size-4 text-primary" />
                {lang === "ar" ? "عقد العمل الخاص بي" : "My employment contract"}
              </h3>
              {myContract ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => setShowFullContract((v) => !v)}
                >
                  {showFullContract
                    ? lang === "ar"
                      ? "إخفاء النص"
                      : "Hide text"
                    : lang === "ar"
                      ? "عرض العقد كامل"
                      : "View full contract"}
                </Button>
              ) : null}
            </div>
            {!myContract ? (
              <p className="text-sm text-muted-foreground">
                {lang === "ar" ? "لا يوجد عقد مربوط بحسابك بعد." : "No contract linked to your account yet."}
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={contractStatusTone(myContract.status)}>
                    {contractStatusLabel(myContract.status, lang)}
                  </StatusBadge>
                  <StatusBadge tone="info">{contractTypeLabel(myContract.type, lang)}</StatusBadge>
                  <StatusBadge tone="neutral">{myContract.salary.toLocaleString("en-GB")} JOD</StatusBadge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label={lang === "ar" ? "عنوان العقد" : "Title"} value={myContract.title} />
                  <Info
                    label={lang === "ar" ? "المدة" : "Period"}
                    value={`${myContract.startDate} → ${myContract.endDate || (lang === "ar" ? "مفتوح" : "Open")}`}
                  />
                </div>
                {showFullContract ? (
                  <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-4 text-xs leading-7">
                    {myContract.body}
                  </pre>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
              <CalendarDays className="size-4 text-primary" />
              {lang === "ar" ? "تقديم طلب إجازة" : "Request leave"}
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              {lang === "ar" ? "يصل الطلب لـ HR للموافقة أو الرفض." : "HR will approve or reject."}
            </p>
            <form onSubmit={onLeaveSubmit} className="space-y-3">
              <Field label={t("leave.type")}>
                <select className={selectClass} value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                  {LEAVE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("leave.from")}>
                  <Input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} dir="ltr" />
                </Field>
                <Field label={t("leave.to")}>
                  <Input type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} dir="ltr" />
                </Field>
              </div>
              <Field label={t("leave.reason")}>
                <Input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} required />
              </Field>
              <Button type="submit" className="w-full rounded-xl bg-brand text-brand-foreground shadow-glow">
                <Send className="size-4" />
                {t("leave.request")}
              </Button>
            </form>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
              <FileWarning className="size-4 text-destructive" />
              {lang === "ar" ? "تقديم استقالة" : "Resign"}
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              {lang === "ar" ? "طلب رسمي يصل لـ HR لاتخاذ القرار." : "Official request sent to HR."}
            </p>
            <form onSubmit={onResignSubmit} className="space-y-3">
              <Field label={lang === "ar" ? "آخر يوم عمل" : "Last working day"}>
                <Input type="date" value={resignDay} onChange={(e) => setResignDay(e.target.value)} dir="ltr" />
              </Field>
              <Field label={lang === "ar" ? "سبب الاستقالة" : "Reason"}>
                <Input value={resignReason} onChange={(e) => setResignReason(e.target.value)} required />
              </Field>
              <Button type="submit" variant="destructive" className="w-full rounded-xl">
                <Send className="size-4" />
                {lang === "ar" ? "إرسال طلب الاستقالة" : "Submit resignation"}
              </Button>
            </form>
          </section>
        </div>
      </div>

      <section className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold">
          {lang === "ar" ? "طلباتي وحالتها" : "My requests & status"}
        </h3>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {lang === "ar" ? "لا يوجد طلبات بعد." : "No requests yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-border px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {r.type === "leave"
                        ? lang === "ar"
                          ? `إجازة · ${r.leaveType}`
                          : `Leave · ${r.leaveType}`
                        : lang === "ar"
                          ? "استقالة"
                          : "Resignation"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.type === "leave"
                        ? `${r.from} → ${r.to}`
                        : `${lang === "ar" ? "آخر يوم" : "Last day"}: ${r.lastDay}`}
                      {" · "}
                      {formatRequestWhen(r.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>
                    {r.decisionNote ? (
                      <p className="mt-1 text-xs text-primary">
                        HR: {r.decisionNote}
                        {r.decidedByName ? ` · ${r.decidedByName}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge tone={statusTone(r.status)}>
                    {r.status === "approved"
                      ? t("leave.approved")
                      : r.status === "pending"
                        ? t("leave.pending")
                        : t("leave.rejected")}
                  </StatusBadge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Info({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/80 bg-background/60 px-3 py-2.5", className)}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold", mono && "font-mono")} dir={mono ? "ltr" : undefined}>
        {value}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
