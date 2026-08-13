import { Calculator, CheckCircle2, Printer, Wallet } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { Label } from "@/components/ui/label";
import { useAttendance } from "@/lib/attendance";
import { useI18n } from "@/lib/i18n";
import {
  currentPayrollMonth,
  formatPayrollMonth,
  money,
  printPayslips,
  payslipBreakdownLines,
  payslipsForEmployee,
  payslipStatusLabel,
  payslipStatusTone,
  summarizeAbsences,
  type Payslip,
  type PayslipStatus,
} from "@/lib/payroll";
import { useStaff, type StaffRecord } from "@/lib/staff";
import { cn } from "@/lib/utils";

export function EmployeePayrollDialog({
  employee,
  open,
  onOpenChange,
  canManage,
  payslips,
  upsertPayslip,
  defaultMonth,
}: {
  employee: StaffRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  payslips: Payslip[];
  upsertPayslip: ReturnType<typeof import("@/lib/payroll").usePayroll>["upsertPayslip"];
  defaultMonth?: string;
}) {
  const { t, lang } = useI18n();
  const { updateStaff } = useStaff();
  const { records } = useAttendance();

  const [month, setMonth] = useState(defaultMonth ?? currentPayrollMonth());
  const [basic, setBasic] = useState("0");
  const [allowances, setAllowances] = useState("0");
  const [otherDeduction, setOtherDeduction] = useState("0");
  const [absenceDeduction, setAbsenceDeduction] = useState("0");
  const [appliedAbsenceDays, setAppliedAbsenceDays] = useState(0);
  const [appliedAbsenceDates, setAppliedAbsenceDates] = useState<string[]>([]);
  const [appliedDailyRate, setAppliedDailyRate] = useState(0);
  const [note, setNote] = useState("");
  const [printCount, setPrintCount] = useState("3");

  const history = useMemo(
    () => (employee ? payslipsForEmployee(payslips, employee.id) : []),
    [employee, payslips],
  );

  const existing = useMemo(
    () => history.find((p) => p.month === month),
    [history, month],
  );

  const locked = existing?.status === "paid";

  const liveAbsence = useMemo(() => {
    if (!employee) return null;
    return summarizeAbsences(employee, month, records);
  }, [employee, month, records]);

  useEffect(() => {
    if (defaultMonth && open) setMonth(defaultMonth);
  }, [defaultMonth, open]);

  useEffect(() => {
    if (!employee || !open) return;
    const slip = payslipsForEmployee(payslips, employee.id).find((p) => p.month === month);
    setBasic(String(slip?.basic ?? employee.salary));
    setAllowances(String(slip?.allowances ?? 0));
    setOtherDeduction(String(slip?.otherDeduction ?? 0));
    // لا تملأ خصم الغياب تلقائياً — فقط من المسير المحفوظ أو صفر
    setAbsenceDeduction(String(slip?.absenceDeduction ?? 0));
    setAppliedAbsenceDays(slip?.absenceDays ?? 0);
    setAppliedAbsenceDates(slip?.absenceDates ?? []);
    setAppliedDailyRate(slip?.dailyRate ?? 0);
    setNote(slip?.note ?? "");
  }, [employee?.id, month, open, payslips]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!employee) return null;

  const basicN = Number(basic) || 0;
  const allowancesN = Number(allowances) || 0;
  const absenceDeductionN = Number(absenceDeduction) || 0;
  const otherDeductionN = Number(otherDeduction) || 0;
  const totalDeduction = absenceDeductionN + otherDeductionN;
  const net = Math.max(0, basicN + allowancesN - totalDeduction);
  const deductionApplied = absenceDeductionN > 0;

  const previewSlip: Payslip = {
    id: existing?.id ?? "preview",
    employeeId: employee.id,
    employeeName: employee.full_name,
    month,
    basic: basicN,
    allowances: allowancesN,
    deductions: totalDeduction,
    absenceDays: deductionApplied ? appliedAbsenceDays || (liveAbsence?.absentDays ?? 0) : 0,
    absenceDates: deductionApplied ? appliedAbsenceDates : [],
    dailyRate: deductionApplied ? appliedDailyRate || (liveAbsence?.dailyRate ?? 0) : 0,
    absenceDeduction: absenceDeductionN,
    otherDeduction: otherDeductionN,
    note,
    net,
    status: existing?.status ?? "draft",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: existing?.updatedAt ?? new Date().toISOString(),
  };

  function saveBaseSalary() {
    if (!canManage || locked) return;
    updateStaff(employee!.id, { salary: basicN });
    toast.success(lang === "ar" ? "تم تحديث الراتب الأساسي للموظف" : "Base salary updated");
  }

  function applyAbsenceDeduction() {
    if (!canManage || locked) {
      toast.error(lang === "ar" ? "ما عندك صلاحية تنفيذ الخصم" : "No permission to apply deduction");
      return;
    }
    if (!liveAbsence || liveAbsence.absentDays <= 0) {
      toast.error(lang === "ar" ? "ما في أيام غياب لهذا الشهر" : "No absences this month");
      return;
    }
    const amount = liveAbsence.suggestedDeduction;
    setAbsenceDeduction(String(amount));
    setAppliedAbsenceDays(liveAbsence.absentDays);
    setAppliedAbsenceDates([...liveAbsence.absentDates]);
    setAppliedDailyRate(liveAbsence.dailyRate);
    const autoNote =
      lang === "ar"
        ? `خصم غياب: ${liveAbsence.absentDays} يوم × ${money(liveAbsence.dailyRate)} JOD = ${money(amount)} JOD`
        : `Absence deduction: ${liveAbsence.absentDays} days × ${money(liveAbsence.dailyRate)} JOD = ${money(amount)} JOD`;
    setNote(autoNote);
    const otherN = Number(otherDeduction) || 0;
    const basicVal = Number(basic) || 0;
    const allowVal = Number(allowances) || 0;
    upsertPayslip(employee!, {
      month,
      basic: basicVal,
      allowances: allowVal,
      absenceDays: liveAbsence.absentDays,
      absenceDates: liveAbsence.absentDates,
      dailyRate: liveAbsence.dailyRate,
      absenceDeduction: amount,
      otherDeduction: otherN,
      note: autoNote,
      status: existing?.status === "approved" ? "approved" : "draft",
    });
    toast.success(
      lang === "ar"
        ? `تم تنفيذ خصم الغياب: ${money(amount)} JOD (${liveAbsence.absentDays} يوم)`
        : `Absence deduction applied: ${money(amount)} JOD (${liveAbsence.absentDays} days)`,
    );
  }

  function clearAbsenceDeduction() {
    if (!canManage || locked) return;
    setAbsenceDeduction("0");
    setAppliedAbsenceDays(0);
    setAppliedAbsenceDates([]);
    setAppliedDailyRate(0);
    if (note.includes("خصم غياب") || note.toLowerCase().includes("absence")) setNote("");
    toast.message(
      lang === "ar" ? "تم إلغاء خصم الغياب من الحقل — احفظ المسير لتثبيته" : "Cleared — save slip to persist",
    );
  }

  function savePayslip(status: PayslipStatus = existing?.status ?? "draft") {
    if (!canManage) {
      toast.error(lang === "ar" ? "ما عندك صلاحية تعديل الرواتب" : "No payroll edit permission");
      return;
    }
    if (locked) {
      toast.error(lang === "ar" ? "المسير مدفوع ولا يمكن تعديله" : "Paid slip is locked");
      return;
    }
    if (status === "paid") {
      toast.error(
        lang === "ar"
          ? "تنزيل الراتب من صفحة الرواتب بعد تأكيد كل موظف"
          : "Disburse from payroll page after confirming each employee",
      );
      return;
    }
    upsertPayslip(employee!, {
      month,
      basic: basicN,
      allowances: allowancesN,
      absenceDays: deductionApplied ? appliedAbsenceDays || (liveAbsence?.absentDays ?? 0) : 0,
      absenceDates: deductionApplied ? appliedAbsenceDates : [],
      dailyRate: deductionApplied ? appliedDailyRate || (liveAbsence?.dailyRate ?? 0) : 0,
      absenceDeduction: absenceDeductionN,
      otherDeduction: otherDeductionN,
      note,
      status,
    });
    if (basicN !== employee!.salary) {
      updateStaff(employee!.id, { salary: basicN });
    }
    toast.success(
      status === "approved"
        ? lang === "ar"
          ? "تم تأكيد المسير — جاهز لتنزيل الراتب من الصفحة الرئيسية"
          : "Confirmed — ready for batch disbursement"
        : lang === "ar"
          ? "تم حفظ المسودة"
          : "Draft saved",
    );
  }

  function handlePrint() {
    const count = Math.min(12, Math.max(1, Number(printCount) || 1));
    const slips = history.slice(0, count);
    if (slips.length === 0) {
      const ok = printPayslips(employee!, [previewSlip], lang);
      if (!ok) toast.error(lang === "ar" ? "اسمح بالنوافذ المنبثقة للطباعة" : "Allow popups to print");
      return;
    }
    const ok = printPayslips(employee!, slips, lang);
    if (!ok) toast.error(lang === "ar" ? "اسمح بالنوافذ المنبثقة للطباعة" : "Allow popups to print");
  }

  const fieldClass = "h-10 rounded-xl";
  const editable = canManage && !locked;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[min(96vw,58rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 text-start sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-start gap-4">
            <EmployeeAvatar name={employee.full_name} src={employee.avatarUrl} size="lg" rounded="2xl" />
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle className="font-display text-xl">{employee.full_name}</DialogTitle>
              <DialogDescription>
                {employee.job_title} · {employee.department}
              </DialogDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                <StatusBadge tone="info">{money(employee.salary)} JOD</StatusBadge>
                {existing ? (
                  <StatusBadge tone={payslipStatusTone(existing.status)}>
                    {formatPayrollMonth(existing.month, lang)} · {payslipStatusLabel(existing.status, lang)}
                    {existing.status === "approved"
                      ? lang === "ar"
                        ? " — جاهز للتنزيل"
                        : " — ready"
                      : ""}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">
                    {lang === "ar" ? "لا مسير لهذا الشهر بعد" : "No slip this month yet"}
                  </StatusBadge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Wallet className="size-4 text-primary" />
                {lang === "ar" ? "شهر المسير" : "Payroll month"}
              </h3>
              <Label className="text-xs text-muted-foreground">{lang === "ar" ? "الشهر" : "Month"}</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={cn(fieldClass, "mt-1.5")}
                dir="ltr"
              />
              <p className="mt-3 text-xs text-muted-foreground">{formatPayrollMonth(month, lang)}</p>
              {locked ? (
                <p className="mt-3 rounded-xl bg-success/10 px-3 py-2 text-xs text-success">
                  {lang === "ar"
                    ? "هذا المسير نازل/مدفوع — مقفول عن التعديل."
                    : "This slip is paid — locked for editing."}
                </p>
              ) : (
                <p className="mt-3 rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  {lang === "ar"
                    ? "١) عدّل واحفظ مسودة ٢) نفّذ خصم الغياب إن لزم ٣) أكّد المسير — التنزيل الجماعي من صفحة الرواتب."
                    : "1) Edit & save draft 2) Apply absence if needed 3) Confirm — batch disburse from payroll page."}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Calculator className="size-4 text-amber-700 dark:text-amber-300" />
                {lang === "ar" ? "الغياب والخصم المقترح" : "Absences & suggested deduction"}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Mini
                  label={lang === "ar" ? "أيام دوام" : "Scheduled"}
                  value={String(liveAbsence?.scheduledDays ?? 0)}
                />
                <Mini
                  label={lang === "ar" ? "غايب" : "Absent"}
                  value={String(liveAbsence?.absentDays ?? 0)}
                  danger
                />
                <Mini
                  label={lang === "ar" ? "سعر اليوم" : "Daily rate"}
                  value={`${money(liveAbsence?.dailyRate ?? 0)}`}
                />
                <Mini
                  label={lang === "ar" ? "خصم مقترح" : "Suggested"}
                  value={`${money(liveAbsence?.suggestedDeduction ?? 0)}`}
                  danger
                />
              </div>

              {liveAbsence && liveAbsence.absentDates.length > 0 ? (
                <div className="mt-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {lang === "ar" ? "تواريخ الغياب" : "Absence dates"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" dir="ltr">
                    {liveAbsence.absentDates.join(" · ")}
                  </p>
                </div>
              ) : null}

              {!deductionApplied && (liveAbsence?.absentDays ?? 0) > 0 ? (
                <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  {lang === "ar"
                    ? "الخصم المقترح ظاهر فوق — لم يُطبَّق على المسير بعد. اضغط «تنفيذ» لنقله لحقل خصم الغياب."
                    : "Suggested amount is shown above — not applied yet. Press Execute to put it on the slip."}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="flex-1 rounded-xl bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                  disabled={!editable || !(liveAbsence && liveAbsence.absentDays > 0)}
                  onClick={applyAbsenceDeduction}
                >
                  {lang === "ar" ? "تنفيذ خصم الغياب على المسير" : "Execute absence deduction"}
                </Button>
                {deductionApplied ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={!editable}
                    onClick={clearAbsenceDeduction}
                  >
                    {lang === "ar" ? "إلغاء الخصم" : "Clear"}
                  </Button>
                ) : null}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-bold">
              {lang === "ar" ? "تفاصيل الراتب والخصم" : "Salary & deduction breakdown"}
            </h3>
            <ul className="space-y-2.5">
              {payslipBreakdownLines(previewSlip, lang).map((line) => (
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
            {deductionApplied && appliedAbsenceDates.length > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground" dir="ltr">
                {(lang === "ar" ? "خصم على التواريخ: " : "Deducted for: ") + appliedAbsenceDates.join(" · ")}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-bold">
              {lang === "ar" ? "تعديل الراتب والخصومات" : "Edit salary & deductions"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={lang === "ar" ? "الأساسي (JOD)" : "Basic (JOD)"}>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={basic}
                  disabled={!editable}
                  onChange={(e) => setBasic(e.target.value)}
                  className={fieldClass}
                  dir="ltr"
                />
              </Field>
              <Field label={lang === "ar" ? "البدلات" : "Allowances"}>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={allowances}
                  disabled={!editable}
                  onChange={(e) => setAllowances(e.target.value)}
                  className={fieldClass}
                  dir="ltr"
                />
              </Field>
              <Field label={lang === "ar" ? "خصم الغياب" : "Absence deduction"}>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={absenceDeduction}
                  disabled={!editable}
                  onChange={(e) => setAbsenceDeduction(e.target.value)}
                  className={fieldClass}
                  dir="ltr"
                />
              </Field>
              <Field label={lang === "ar" ? "خصم آخر" : "Other deduction"}>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={otherDeduction}
                  disabled={!editable}
                  onChange={(e) => setOtherDeduction(e.target.value)}
                  className={fieldClass}
                  dir="ltr"
                />
              </Field>
            </div>
            <Field label={lang === "ar" ? "ملاحظة على المسير" : "Payslip note"} className="mt-3">
              <Input
                value={note}
                disabled={!editable}
                onChange={(e) => setNote(e.target.value)}
                className={fieldClass}
                placeholder={lang === "ar" ? "تظهر للموظف على كشف الراتب" : "Shown to employee on payslip"}
              />
            </Field>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {lang === "ar" ? "إجمالي الخصم" : "Total deductions"}: {money(totalDeduction)} JOD
                </p>
                <p className="font-display text-2xl font-bold text-primary">
                  {lang === "ar" ? "الصافي" : "Net"}: {money(net)} JOD
                </p>
              </div>
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={locked}
                    onClick={saveBaseSalary}
                  >
                    {lang === "ar" ? "حفظ الأساسي على الملف" : "Save base to profile"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={locked}
                    onClick={() => savePayslip("draft")}
                  >
                    {lang === "ar" ? "حفظ مسودة" : "Save draft"}
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl bg-brand text-brand-foreground shadow-glow"
                    disabled={locked}
                    onClick={() => savePayslip("approved")}
                  >
                    <CheckCircle2 className="size-4" />
                    {lang === "ar" ? "تأكيد المسير" : "Confirm slip"}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {lang === "ar" ? "عرض فقط" : "View only"}
                </p>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {lang === "ar"
                ? "تنزيل الراتب للكل يتم من زر واحد في صفحة الرواتب بعد تأكيد مسير كل موظف."
                : "Batch disbursement is on the payroll page after each employee is confirmed."}
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Printer className="size-4 text-primary" />
              {lang === "ar" ? "طباعة كشف راتب" : "Print payslip"}
            </h3>
            <div className="flex flex-wrap items-end gap-3">
              <Field label={lang === "ar" ? "كم شهر (آخر المسيرات)" : "How many months"}>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={printCount}
                  onChange={(e) => setPrintCount(e.target.value)}
                  className={cn(fieldClass, "w-28")}
                  dir="ltr"
                />
              </Field>
              <Button type="button" className="rounded-xl" onClick={handlePrint}>
                <Printer className="size-4" />
                {lang === "ar" ? "طباعة الكشف" : "Print"}
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-bold">
              {lang === "ar" ? "سجل مسيرات الموظف" : "Employee payslip history"}
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {lang === "ar" ? "لا يوجد مسيرات محفوظة بعد." : "No payslips saved yet."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead className="bg-secondary/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-start">{lang === "ar" ? "الشهر" : "Month"}</th>
                      <th className="px-3 py-2 text-start">{lang === "ar" ? "أساسي" : "Basic"}</th>
                      <th className="px-3 py-2 text-start">{lang === "ar" ? "خصم" : "Deduct"}</th>
                      <th className="px-3 py-2 text-start">{lang === "ar" ? "صافي" : "Net"}</th>
                      <th className="px-3 py-2 text-start">{t("common.status")}</th>
                      <th className="px-3 py-2 text-start">{lang === "ar" ? "غياب" : "Absent"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((s) => (
                      <tr
                        key={s.id}
                        className={cn(
                          "cursor-pointer border-t border-border hover:bg-primary/5",
                          s.month === month && "bg-primary/5",
                        )}
                        onClick={() => setMonth(s.month)}
                      >
                        <td className="px-3 py-2.5 font-medium">{formatPayrollMonth(s.month, lang)}</td>
                        <td className="px-3 py-2.5" dir="ltr">
                          {money(s.basic)}
                        </td>
                        <td className="px-3 py-2.5" dir="ltr">
                          {money(s.deductions)}
                        </td>
                        <td className="px-3 py-2.5 font-semibold" dir="ltr">
                          {money(s.net)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge tone={payslipStatusTone(s.status)}>
                            {payslipStatusLabel(s.status, lang)}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2.5">{s.absenceDays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Mini({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-background/70 px-3 py-2",
        danger && "border-destructive/30 bg-destructive/5",
      )}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold", danger && "text-destructive")} dir="ltr">
        {value}
      </p>
    </div>
  );
}
