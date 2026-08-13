import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, FileWarning, Send } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AppShell, DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  formatRequestWhen,
  requestTypeLabel,
  useHrRequests,
  type HrRequest,
} from "@/lib/hr-requests";
import { useI18n } from "@/lib/i18n";
import { useStaff } from "@/lib/staff";

export const Route = createFileRoute("/me-requests")({
  ssr: false,
  head: () => ({ meta: [{ title: "طلباتي | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: MeRequestsPage,
});

const LEAVE_TYPES = ["سنوية", "مرضية", "طارئة", "بدون راتب"] as const;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MeRequestsPage() {
  const { t, lang } = useI18n();
  const { session } = useAuth();
  const { getStaff } = useStaff();
  const { submitLeave, submitResignation, myRequests } = useHrRequests();

  const me = session?.userId ? getStaff(session.userId) : undefined;
  const requests = useMemo(() => (me ? myRequests(me.id) : []), [me, myRequests]);

  const [tab, setTab] = useState<"leave" | "resignation">("leave");
  const [leaveType, setLeaveType] = useState<string>(LEAVE_TYPES[0]);
  const [leaveFrom, setLeaveFrom] = useState(todayIso());
  const [leaveTo, setLeaveTo] = useState(todayIso());
  const [leaveReason, setLeaveReason] = useState("");
  const [resignDay, setResignDay] = useState(todayIso());
  const [resignReason, setResignReason] = useState("");

  const pending = requests.filter((r) => r.status === "pending").length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;

  if (!me) {
    return (
      <AppShell title="nav.myRequests">
        <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          {t("common.empty")}
        </div>
      </AppShell>
    );
  }

  function onLeave(e: FormEvent) {
    e.preventDefault();
    if (!leaveReason.trim()) {
      toast.error(lang === "ar" ? "اكتب سبب الإجازة" : "Enter leave reason");
      return;
    }
    if (leaveTo < leaveFrom) {
      toast.error(lang === "ar" ? "تاريخ النهاية قبل البداية" : "End date before start");
      return;
    }
    submitLeave({
      employee: me!,
      leaveType,
      from: leaveFrom,
      to: leaveTo,
      reason: leaveReason,
    });
    toast.success(lang === "ar" ? "تم إرسال طلب الإجازة" : "Leave request submitted");
    setLeaveReason("");
  }

  function onResign(e: FormEvent) {
    e.preventDefault();
    if (!resignReason.trim()) {
      toast.error(lang === "ar" ? "اكتب سبب الاستقالة" : "Enter resignation reason");
      return;
    }
    submitResignation({ employee: me!, lastDay: resignDay, reason: resignReason });
    toast.success(lang === "ar" ? "تم إرسال طلب الاستقالة" : "Resignation submitted");
    setResignReason("");
  }

  return (
    <AppShell title="nav.myRequests">
      <PageHeader
        title="nav.myRequests"
        description={
          lang === "ar"
            ? "قدّم طلب إجازة أو استقالة وتابع حالة كل طلباتك."
            : "Submit leave or resignation and track every request."
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-2">
        <StatCard compact label={lang === "ar" ? "معلّق" : "Pending"} value={pending} />
        <StatCard compact label={t("leave.approved")} value={approved} />
        <StatCard compact label={t("leave.rejected")} value={rejected} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("leave")}
              className={
                tab === "leave"
                  ? "flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  : "flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground"
              }
            >
              <CalendarDays className="size-4" />
              {lang === "ar" ? "إجازة" : "Leave"}
            </button>
            <button
              type="button"
              onClick={() => setTab("resignation")}
              className={
                tab === "resignation"
                  ? "flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  : "flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground"
              }
            >
              <FileWarning className="size-4" />
              {lang === "ar" ? "استقالة" : "Resignation"}
            </button>
          </div>

          {tab === "leave" ? (
            <form onSubmit={onLeave} className="space-y-3">
              <Field label={t("leave.type")}>
                <select
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={lang === "ar" ? "من" : "From"}>
                  <Input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} dir="ltr" className="h-11 rounded-xl" />
                </Field>
                <Field label={lang === "ar" ? "إلى" : "To"}>
                  <Input type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} dir="ltr" className="h-11 rounded-xl" />
                </Field>
              </div>
              <Field label={t("leave.reason")}>
                <Textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} rows={3} className="rounded-xl" />
              </Field>
              <Button type="submit" className="rounded-xl bg-brand text-brand-foreground shadow-glow">
                <Send className="size-4" />
                {lang === "ar" ? "إرسال طلب إجازة" : "Submit leave"}
              </Button>
            </form>
          ) : (
            <form onSubmit={onResign} className="space-y-3">
              <Field label={lang === "ar" ? "آخر يوم عمل" : "Last working day"}>
                <Input type="date" value={resignDay} onChange={(e) => setResignDay(e.target.value)} dir="ltr" className="h-11 rounded-xl" />
              </Field>
              <Field label={t("leave.reason")}>
                <Textarea value={resignReason} onChange={(e) => setResignReason(e.target.value)} rows={3} className="rounded-xl" />
              </Field>
              <Button type="submit" variant="destructive" className="rounded-xl">
                <Send className="size-4" />
                {lang === "ar" ? "إرسال طلب استقالة" : "Submit resignation"}
              </Button>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-bold">{lang === "ar" ? "حالة الطلبات" : "Request status"}</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            {lang === "ar"
              ? "يشمل الإجازات والاستقالات وتعديل بيانات التواصل."
              : "Includes leave, resignation, and contact-change requests."}
          </p>
          <DataTable
            headers={[
              lang === "ar" ? "النوع" : "Type",
              lang === "ar" ? "التفاصيل" : "Details",
              t("common.status"),
              lang === "ar" ? "التاريخ" : "Date",
            ]}
            rows={requests.map((r) => [
              requestTypeLabel(r.type, lang),
              <span key={`${r.id}-d`} className="text-xs text-muted-foreground">
                {requestDetails(r, lang)}
              </span>,
              <StatusBadge
                key={`${r.id}-s`}
                tone={r.status === "approved" ? "success" : r.status === "pending" ? "warning" : "danger"}
              >
                {r.status === "approved"
                  ? t("leave.approved")
                  : r.status === "pending"
                    ? t("leave.pending")
                    : t("leave.rejected")}
              </StatusBadge>,
              formatRequestWhen(r.createdAt),
            ])}
          />
        </section>
      </div>
    </AppShell>
  );
}

function requestDetails(r: HrRequest, lang: "ar" | "en") {
  if (r.type === "leave") return `${r.leaveType ?? ""} · ${r.from} → ${r.to}`;
  if (r.type === "resignation") return `${lang === "ar" ? "آخر يوم" : "Last day"} ${r.lastDay ?? "—"}`;
  const parts: string[] = [];
  if (r.newEmail) parts.push(`${lang === "ar" ? "إيميل" : "Email"} → ${r.newEmail}`);
  if (r.newPhone) parts.push(`${lang === "ar" ? "هاتف" : "Phone"} → ${r.newPhone}`);
  return parts.join(" · ") || r.reason;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
