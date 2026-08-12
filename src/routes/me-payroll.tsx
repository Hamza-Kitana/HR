import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  formatPayrollMonth,
  money,
  payslipBreakdownLines,
  payslipsForEmployee,
  payslipStatusLabel,
  printPayslips,
  usePayroll,
  type Payslip,
} from "@/lib/payroll";
import { useStaff } from "@/lib/staff";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/me-payroll")({
  ssr: false,
  head: () => ({ meta: [{ title: "راتبي | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: MePayrollPage,
});

function MePayrollPage() {
  const { t, lang } = useI18n();
  const { session } = useAuth();
  const { getStaff } = useStaff();
  const { payslips } = usePayroll();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [detailId, setDetailId] = useState<string | null>(null);

  const me = session?.userId ? getStaff(session.userId) : undefined;
  const mine = useMemo(() => {
    if (!me) return [];
    return payslipsForEmployee(payslips, me.id).filter((s) => s.status === "approved" || s.status === "paid");
  }, [me, payslips]);

  const selectedSlips = mine.filter((s) => selected[s.id]);
  const paidTotal = mine.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.net, 0);
  const detail = detailId ? mine.find((s) => s.id === detailId) ?? null : mine[0] ?? null;

  if (!me) {
    return (
      <AppShell title="nav.myPayroll">
        <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          {t("common.empty")}
        </div>
      </AppShell>
    );
  }

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAll(on: boolean) {
    const next: Record<string, boolean> = {};
    if (on) for (const s of mine) next[s.id] = true;
    setSelected(next);
  }

  function handlePrint(slips: Payslip[]) {
    if (!slips.length) {
      toast.error(lang === "ar" ? "اختر شهراً واحداً على الأقل" : "Select at least one month");
      return;
    }
    printPayslips(me!, slips, lang);
  }

  return (
    <AppShell title="nav.myPayroll">
      <PageHeader
        title="nav.myPayroll"
        description={
          lang === "ar"
            ? "كشوف راتبك المؤكَّدة والمدفوعة — تفاصيل الخصم والصافي، واطبع اللي تحتاجه."
            : "Your confirmed and paid payslips — full deduction details and printing."
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatCard compact label={lang === "ar" ? "كشوف متاحة" : "Available slips"} value={mine.length} />
          <StatCard compact label={lang === "ar" ? "محدد للطباعة" : "Selected"} value={selectedSlips.length} />
          <StatCard
            compact
            label={lang === "ar" ? "إجمالي المدفوع" : "Paid total"}
            value={`${money(paidTotal)} JOD`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => toggleAll(true)}>
            {lang === "ar" ? "تحديد الكل" : "Select all"}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => toggleAll(false)}>
            {lang === "ar" ? "إلغاء التحديد" : "Clear"}
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-brand text-brand-foreground shadow-glow"
            onClick={() => handlePrint(selectedSlips)}
          >
            <Printer className="size-4" />
            {lang === "ar" ? "طباعة المحدد" : "Print selected"}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <DataTable
          onRowClick={(idx) => {
            const slip = mine[idx];
            if (slip) setDetailId(slip.id);
          }}
          headers={[
            lang === "ar" ? "اختيار" : "Select",
            lang === "ar" ? "الشهر" : "Month",
            lang === "ar" ? "الصافي" : "Net",
            t("common.status"),
            t("common.actions"),
          ]}
          rows={mine.map((s) => [
            <input
              key={`${s.id}-chk`}
              type="checkbox"
              checked={!!selected[s.id]}
              onChange={() => toggle(s.id)}
              className="size-4 accent-primary"
              data-no-row-click
            />,
            formatPayrollMonth(s.month, lang),
            <span key={`${s.id}-net`} className="font-bold text-primary">
              {money(s.net)} JOD
            </span>,
            <StatusBadge key={`${s.id}-s`} tone={s.status === "paid" ? "success" : "info"}>
              {payslipStatusLabel(s.status, lang)}
            </StatusBadge>,
            <Button
              key={`${s.id}-p`}
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => handlePrint([s])}
            >
              <Printer className="size-3.5" />
              {lang === "ar" ? "طباعة" : "Print"}
            </Button>,
          ])}
        />

        {detail ? (
          <section className="h-fit rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold">
                  {lang === "ar" ? "تفاصيل الراتب" : "Payslip details"}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatPayrollMonth(detail.month, lang)} · {payslipStatusLabel(detail.status, lang)}
                </p>
              </div>
              <StatusBadge tone={detail.status === "paid" ? "success" : "info"}>
                {payslipStatusLabel(detail.status, lang)}
              </StatusBadge>
            </div>

            <ul className="space-y-2.5">
              {payslipBreakdownLines(detail, lang).map((line) => (
                <li
                  key={line.label}
                  className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5 last:border-0 last:pb-0"
                >
                  <span
                    className={cn(
                      "text-sm text-muted-foreground",
                      line.tone === "danger" && "text-destructive",
                      line.tone === "success" && "font-semibold text-foreground",
                    )}
                  >
                    {line.label}
                  </span>
                  <span
                    className={cn(
                      "font-display text-sm font-bold tabular-nums",
                      line.tone === "danger" && "text-destructive",
                      line.tone === "success" && "text-lg text-primary",
                    )}
                    dir="ltr"
                  >
                    {line.value}
                  </span>
                </li>
              ))}
            </ul>

            {detail.absenceDates.length > 0 ? (
              <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-destructive">
                  {lang === "ar" ? "ليش انخصم (تواريخ الغياب)" : "Why deducted (absence dates)"}
                </p>
                <p className="mt-1 text-xs leading-relaxed" dir="ltr">
                  {detail.absenceDates.join(" · ")}
                </p>
              </div>
            ) : detail.absenceDeduction > 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">
                {lang === "ar"
                  ? `خصم غياب: ${detail.absenceDays} يوم`
                  : `Absence deduction: ${detail.absenceDays} days`}
              </p>
            ) : null}

            {detail.note ? (
              <p className="mt-3 rounded-xl bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                {lang === "ar" ? "ملاحظة" : "Note"}: {detail.note}
              </p>
            ) : null}

            <Button
              type="button"
              className="mt-4 w-full rounded-xl"
              variant="outline"
              onClick={() => handlePrint([detail])}
            >
              <Printer className="size-4" />
              {lang === "ar" ? "طباعة هذا الكشف" : "Print this slip"}
            </Button>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {lang === "ar"
              ? "ما في كشوف مؤكَّدة أو نازلة بعد — تظهر هنا لما تؤكدها الإدارة وتنزّل الراتب."
              : "No confirmed or paid slips yet — they appear after HR confirms and disburses."}
          </section>
        )}
      </div>
    </AppShell>
  );
}
