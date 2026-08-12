import { createFileRoute } from "@tanstack/react-router";
import { Banknote } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import { EmployeeNameCell } from "@/components/app/employee-avatar";
import { EmployeePayrollDialog } from "@/components/app/employee-payroll-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useAttendance } from "@/lib/attendance";
import { useI18n } from "@/lib/i18n";
import {
  currentPayrollMonth,
  formatPayrollMonth,
  money,
  payslipStatusLabel,
  payslipStatusTone,
  summarizeAbsences,
  usePayroll,
} from "@/lib/payroll";
import { useStaff } from "@/lib/staff";

export const Route = createFileRoute("/payroll")({
  head: () => ({ meta: [{ title: "الرواتب | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: PayrollPage,
});

function PayrollPage() {
  const { t, lang } = useI18n();
  const { can, isSuperAdmin } = useAuth();
  const { staff, getStaff } = useStaff();
  const { records } = useAttendance();
  const { payslips, upsertPayslip, disburseApprovedForMonth } = usePayroll();
  const [month, setMonth] = useState(currentPayrollMonth());
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const canManage = isSuperAdmin || can("hr.payroll.manage");

  const employees = useMemo(
    () =>
      staff
        .filter((s) => s.is_active && s.username !== "sadmin")
        .sort((a, b) => a.full_name.localeCompare(b.full_name, "ar")),
    [staff],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(query) ||
        e.username.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query) ||
        e.job_title.toLowerCase().includes(query),
    );
  }, [employees, q]);

  const monthSlips = useMemo(
    () => payslips.filter((p) => p.month === month),
    [payslips, month],
  );
  const approvedSlips = monthSlips.filter((p) => p.status === "approved");
  const paidSlips = monthSlips.filter((p) => p.status === "paid");
  const draftSlips = monthSlips.filter((p) => p.status === "draft");
  const paidNet = paidSlips.reduce((s, p) => s + p.net, 0);
  const approvedNet = approvedSlips.reduce((s, p) => s + p.net, 0);

  const selected = selectedId ? getStaff(selectedId) ?? null : null;

  function openEmployee(id: string) {
    setSelectedId(id);
    setOpen(true);
  }

  function handleDisburseAll() {
    if (!canManage) {
      toast.error(lang === "ar" ? "ما عندك صلاحية تنزيل الرواتب" : "No permission to disburse");
      return;
    }
    if (approvedSlips.length === 0) {
      toast.error(
        lang === "ar"
          ? "ما في مسيرات مؤكَّدة للتنزيل — أكّد مسير كل موظف أولاً"
          : "No confirmed slips — confirm each employee first",
      );
      return;
    }
    const ok = window.confirm(
      lang === "ar"
        ? `تنزيل رواتب ${approvedSlips.length} موظف مؤكَّد لشهر ${formatPayrollMonth(month, lang)}؟\nالإجمالي: ${money(approvedNet)} JOD`
        : `Disburse ${approvedSlips.length} confirmed salaries for ${formatPayrollMonth(month, lang)}?\nTotal: ${money(approvedNet)} JOD`,
    );
    if (!ok) return;
    const result = disburseApprovedForMonth(month);
    toast.success(
      lang === "ar"
        ? `تم تنزيل ${result.count} راتب · ${money(result.total)} JOD`
        : `Disbursed ${result.count} salaries · ${money(result.total)} JOD`,
    );
  }

  return (
    <AppShell title="nav.payroll">
      <PageHeader
        title="nav.payroll"
        description={
          lang === "ar"
            ? "راجع كل موظف، نفّذ خصم الغياب عند الحاجة، أكّد المسير — ثم نزّل الرواتب للكل بكبسة واحدة."
            : "Review each employee, apply absence if needed, confirm — then disburse all with one click."
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <span className="text-muted-foreground">{lang === "ar" ? "شهر العرض" : "Month"}</span>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-8 w-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                dir="ltr"
              />
            </label>
            {canManage ? (
              <Button
                type="button"
                className="rounded-xl bg-brand text-brand-foreground shadow-glow"
                disabled={approvedSlips.length === 0}
                onClick={handleDisburseAll}
              >
                <Banknote className="size-4" />
                {lang === "ar"
                  ? `تنزيل الراتب للكل (${approvedSlips.length})`
                  : `Disburse all (${approvedSlips.length})`}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-border bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        {lang === "ar"
          ? `سير العمل: فتح الموظف → تنفيذ خصم الغياب (اختياري) → تأكيد المسير → من هنا «تنزيل الراتب للكل» للمعتمدين فقط.`
          : `Flow: open employee → apply absence (optional) → confirm slip → use “Disburse all” for confirmed only.`}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={lang === "ar" ? "الموظفون" : "Employees"} value={employees.length} />
        <StatCard label={lang === "ar" ? "مسودات" : "Drafts"} value={draftSlips.length} />
        <StatCard
          label={lang === "ar" ? "مؤكَّدة (جاهزة)" : "Confirmed"}
          value={approvedSlips.length}
          hint={`${money(approvedNet)} JOD`}
        />
        <StatCard label={lang === "ar" ? "نازلة / مدفوعة" : "Paid"} value={paidSlips.length} />
        <StatCard
          label={lang === "ar" ? "صافي مدفوع" : "Paid net"}
          value={`${money(paidNet)} JOD`}
        />
      </div>

      <div className="mb-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={lang === "ar" ? "بحث عن موظف..." : "Search employee..."}
          className="max-w-md rounded-xl"
        />
      </div>

      <DataTable
        onRowClick={(idx) => {
          const emp = filtered[idx];
          if (emp) openEmployee(emp.id);
        }}
        headers={[
          t("att.employee"),
          lang === "ar" ? "الراتب الأساسي" : "Base salary",
          lang === "ar" ? "غياب الشهر" : "Absences",
          lang === "ar" ? "خصم مقترح" : "Suggested",
          lang === "ar" ? "صافي المسير" : "Slip net",
          t("common.status"),
        ]}
        rows={filtered.map((emp) => {
          const abs = summarizeAbsences(emp, month, records);
          const monthSlip = payslips.find((p) => p.employeeId === emp.id && p.month === month);
          return [
            <EmployeeNameCell
              key={emp.id}
              name={emp.full_name}
              src={emp.avatarUrl}
              subtitle={`${emp.job_title} · ${emp.department}`}
            />,
            <span key={`${emp.id}-sal`} className="font-semibold" dir="ltr">
              {money(emp.salary)} JOD
            </span>,
            <span
              key={`${emp.id}-abs`}
              className={abs.absentDays > 0 ? "font-semibold text-destructive" : undefined}
            >
              {abs.absentDays}{" "}
              <span className="text-xs text-muted-foreground">
                {lang === "ar" ? "يوم" : "days"}
              </span>
            </span>,
            <span key={`${emp.id}-sug`} dir="ltr">
              {money(abs.suggestedDeduction)} JOD
            </span>,
            monthSlip ? (
              <span key={`${emp.id}-net`} className="font-semibold" dir="ltr">
                {money(monthSlip.net)} JOD
              </span>
            ) : (
              "—"
            ),
            monthSlip ? (
              <StatusBadge key={`${emp.id}-st`} tone={payslipStatusTone(monthSlip.status)}>
                {payslipStatusLabel(monthSlip.status, lang)}
              </StatusBadge>
            ) : (
              <StatusBadge key={`${emp.id}-st`} tone="neutral">
                {lang === "ar" ? "بدون مسير" : "No slip"}
              </StatusBadge>
            ),
          ];
        })}
      />

      <EmployeePayrollDialog
        employee={selected}
        open={open}
        onOpenChange={setOpen}
        canManage={canManage}
        payslips={payslips}
        upsertPayslip={upsertPayslip}
        defaultMonth={month}
      />
    </AppShell>
  );
}
