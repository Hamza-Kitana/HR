import { createFileRoute } from "@tanstack/react-router";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Clock3,
  FileText,
  IdCard,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AppShell, StatusBadge } from "@/components/app/app-shell";
import { EmployeeAvatar } from "@/components/app/employee-avatar";
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
import { useHrRequests } from "@/lib/hr-requests";
import { useI18n } from "@/lib/i18n";
import { getRoleLabel } from "@/lib/permissions";
import { formatWorkDays, getWorkWindow } from "@/lib/shifts";
import { idDocumentLabel, useStaff } from "@/lib/staff";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/me-profile")({
  ssr: false,
  head: () => ({ meta: [{ title: "ملفي الشخصي | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: MeProfilePage,
});

function MeProfilePage() {
  const { t, lang } = useI18n();
  const { session, roles } = useAuth();
  const { getStaff } = useStaff();
  const { submitContactChange } = useHrRequests();
  const { contracts } = useContracts();

  const me = session?.userId ? getStaff(session.userId) : undefined;
  const myContract = me ? activeContractFor(contracts, me.id) : undefined;
  const [showFullContract, setShowFullContract] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [contactReason, setContactReason] = useState("");

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

  function onContactSubmit(e: FormEvent) {
    e.preventDefault();
    const result = submitContactChange({
      employee: me!,
      ...(newEmail.trim() ? { newEmail: newEmail.trim() } : {}),
      ...(newPhone.trim() ? { newPhone: newPhone.trim() } : {}),
      reason: contactReason,
    });
    if ("error" in result) {
      const messages: Record<string, { ar: string; en: string }> = {
        no_change: { ar: "أدخل إيميل أو هاتف مختلف عن الحالي", en: "Enter a different email or phone" },
        invalid_email: { ar: "صيغة الإيميل غير صحيحة", en: "Invalid email" },
        invalid_phone: { ar: "رقم الهاتف قصير جداً", en: "Phone number too short" },
        pending_exists: {
          ar: "عندك طلب تعديل معلّق — انتظر قرار HR",
          en: "You already have a pending contact request",
        },
      };
      const msg = messages[result.error] ?? { ar: "تعذّر إرسال الطلب", en: "Could not submit" };
      toast.error(lang === "ar" ? msg.ar : msg.en);
      return;
    }
    toast.success(lang === "ar" ? "تم إرسال طلب التعديل لـ HR" : "Change request sent to HR");
    setNewEmail("");
    setNewPhone("");
    setContactReason("");
  }

  const roleText =
    roles.map((r) => getRoleLabel(r, lang)).join(" · ") ||
    (lang === "ar" ? "موظف عادي" : "Regular employee");

  return (
    <AppShell title="nav.myProfile">
      {/* Identity band */}
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,oklch(0.72_0.08_185/0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 grid-noise opacity-30" />
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <EmployeeAvatar name={me.full_name} src={me.avatarUrl || null} size="xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                {me.full_name}
              </h1>
              <StatusBadge tone={me.is_active ? "success" : "neutral"}>
                {me.is_active ? t("emp.active") : t("emp.inactive")}
              </StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground sm:text-base">
              {me.job_title}
              <span className="mx-2 text-border">·</span>
              {me.department}
            </p>
            <p className="font-mono text-xs text-muted-foreground" dir="ltr">
              @{me.username}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Personal + contact details */}
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-7">
          <header className="mb-5 flex items-center gap-2 border-b border-border/70 pb-4">
            <Briefcase className="size-4 text-primary" />
            <h2 className="text-sm font-bold">{lang === "ar" ? "البيانات الشخصية" : "Personal details"}</h2>
          </header>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border/60 sm:grid-cols-2">
            <Detail icon={Briefcase} label={t("emp.jobTitle")} value={me.job_title} />
            <Detail icon={Building2} label={t("emp.department")} value={me.department} />
            <Detail icon={CalendarDays} label={t("emp.hireDate")} value={me.hire_date} mono />
            <Detail
              icon={IdCard}
              label={lang === "ar" ? "الجنسية" : "Nationality"}
              value={me.nationality || "—"}
            />
            <Detail
              icon={IdCard}
              label={idDocumentLabel(me.nationality, lang)}
              value={me.national_id || "—"}
              mono
            />
            <Detail icon={Phone} label={t("emp.phone")} value={me.phone || "—"} mono />
            <Detail icon={Mail} label="Email" value={me.email || "—"} mono />
            <Detail
              icon={MapPin}
              label={lang === "ar" ? "العنوان" : "Address"}
              value={me.address || "—"}
              className="sm:col-span-2"
            />
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {lang === "ar" ? "الصفة في النظام: " : "System role: "}
            <span className="font-semibold text-foreground">{roleText}</span>
          </p>
        </section>

        {/* Schedule + login */}
        <div className="space-y-6">
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-7">
            <header className="mb-5 flex items-center gap-2 border-b border-border/70 pb-4">
              <Clock3 className="size-4 text-primary" />
              <h2 className="text-sm font-bold">{lang === "ar" ? "دوام العمل" : "Work schedule"}</h2>
            </header>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label={lang === "ar" ? "من" : "From"} value={workWindow?.start ?? me.workStart} />
              <MiniStat label={lang === "ar" ? "إلى" : "To"} value={workWindow?.end ?? me.workEnd} />
              <MiniStat label={lang === "ar" ? "الساعات" : "Hours"} value={String(me.workHours)} />
              <MiniStat
                label={lang === "ar" ? "الأيام" : "Days"}
                value={formatWorkDays(me.workDays, lang)}
                className="col-span-2"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 sm:p-7">
            <header className="mb-4 flex items-center gap-2 border-b border-border/70 pb-4">
              <KeyRound className="size-4 text-primary" />
              <h2 className="text-sm font-bold">{lang === "ar" ? "حساب الدخول" : "Login account"}</h2>
            </header>
            <p className="font-mono text-lg font-bold tracking-wide" dir="ltr">
              @{me.username}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {lang === "ar"
                ? "استخدم كلمة المرور المعطاة عند إنشاء الحساب. لإعادة التعيين تواصل مع الموارد البشرية."
                : "Use the password issued when your account was created. Ask HR to reset it if needed."}
            </p>
          </section>
        </div>

        {/* Contact change request */}
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-7 xl:col-span-2">
          <header className="mb-2 flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Mail className="size-4 text-primary" />
                {lang === "ar" ? "طلب تغيير الإيميل أو الهاتف" : "Request email / phone change"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {lang === "ar"
                  ? "الطلب يذهب لـ HR — بعد الموافقة تتحدث بياناتك مباشرة."
                  : "The request goes to HR — your details update right after approval."}
              </p>
            </div>
          </header>

          <form onSubmit={onContactSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {lang === "ar" ? "الإيميل الجديد" : "New email"}
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={me.email}
                  className="h-11 rounded-xl ps-9"
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-muted-foreground" dir="ltr">
                {lang === "ar" ? "الحالي:" : "Current:"} {me.email || "—"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {lang === "ar" ? "الهاتف الجديد" : "New phone"}
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder={me.phone}
                  className="h-11 rounded-xl ps-9"
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-muted-foreground" dir="ltr">
                {lang === "ar" ? "الحالي:" : "Current:"} {me.phone || "—"}
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">
                {lang === "ar" ? "سبب التعديل (اختياري)" : "Reason (optional)"}
              </Label>
              <Input
                value={contactReason}
                onChange={(e) => setContactReason(e.target.value)}
                className="h-11 rounded-xl"
                placeholder={lang === "ar" ? "مثال: تغيير رقم الخط الشخصي" : "e.g. personal number changed"}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="rounded-xl bg-brand px-6 text-brand-foreground shadow-glow">
                <Send className="size-4" />
                {lang === "ar" ? "إرسال الطلب لـ HR" : "Send request to HR"}
              </Button>
            </div>
          </form>
        </section>

        {/* Contract */}
        {myContract ? (
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-7 xl:col-span-2">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <FileText className="size-4 text-primary" />
                {lang === "ar" ? "عقد العمل" : "Employment contract"}
              </h2>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={contractStatusTone(myContract.status)}>
                  {contractStatusLabel(myContract.status, lang)}
                </StatusBadge>
                <StatusBadge tone="neutral">{contractTypeLabel(myContract.type, lang)}</StatusBadge>
              </div>
            </header>
            <p className="mb-4 font-mono text-sm text-muted-foreground" dir="ltr">
              {myContract.startDate}
              {myContract.endDate ? ` → ${myContract.endDate}` : ""}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setShowFullContract((v) => !v)}
            >
              {showFullContract
                ? lang === "ar"
                  ? "إخفاء نص العقد"
                  : "Hide contract text"
                : lang === "ar"
                  ? "عرض نص العقد"
                  : "Show contract text"}
            </Button>
            {showFullContract && myContract.body ? (
              <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-border bg-secondary/25 p-4 text-xs leading-relaxed">
                {myContract.body}
              </pre>
            ) : null}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  mono,
  className,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-3 bg-card px-4 py-3.5", className)}>
      <Icon className="mt-0.5 size-4 shrink-0 text-primary/80" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p
          className={cn("mt-0.5 truncate text-sm font-semibold", mono && "font-mono")}
          dir={mono ? "ltr" : undefined}
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-secondary/40 px-3.5 py-3", className)}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold" dir="ltr">
        {value}
      </p>
    </div>
  );
}
