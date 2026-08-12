import { Briefcase, Check, Clock3, Copy, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmployeeAvatarUploader } from "@/components/app/employee-avatar";
import { StatusBadge } from "@/components/app/app-shell";
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
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useOrg } from "@/lib/org-structure";
import { ASSIGNABLE_HR_ROLES, getRoleLabel, type AppRole } from "@/lib/permissions";
import { hoursBetween, isValidTime, WEEKDAY_LABELS } from "@/lib/shifts";
import {
  idDocumentLabel,
  isJordanianNationality,
  JORDANIAN_NATIONALITY,
  NATIONALITY_OPTIONS,
  staffRoles,
  useStaff,
  type StaffRecord,
} from "@/lib/staff";
import { cn } from "@/lib/utils";

export function EmployeeDetailSheet({
  employeeId,
  open,
  onOpenChange,
  onDeleted,
}: {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (employeeId: string) => void;
}) {
  const { t, lang } = useI18n();
  const { can, isSuperAdmin, session, reload } = useAuth();
  const { getStaff, updateStaff, toggleRole, deleteStaff } = useStaff();
  const { departments, positionsForDepartment } = useOrg();

  const employee = employeeId ? getStaff(employeeId) : undefined;
  const canEditDetails =
    isSuperAdmin ||
    session?.username === "sadmin" ||
    session?.username === "sami" ||
    can("hr.employees.edit") ||
    can("users.edit");
  const canManageRoles =
    isSuperAdmin ||
    session?.username === "sadmin" ||
    session?.username === "sami" ||
    can("roles.manage") ||
    can("users.edit");
  const canDelete =
    isSuperAdmin ||
    session?.username === "sadmin" ||
    session?.username === "sami" ||
    can("hr.employees.delete") ||
    can("users.delete");
  const canEditSchedule =
    canEditDetails ||
    can("hr.attendance.manage");

  const assignedRoles = employee ? staffRoles(employee) : [];
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("16:00");
  const [workHours, setWorkHours] = useState("8");
  const [workDays, setWorkDays] = useState<number[]>([]);
  const [natSelect, setNatSelect] = useState<string>(JORDANIAN_NATIONALITY);
  const [natCustom, setNatCustom] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLogin, setCopiedLogin] = useState<"username" | "code" | null>(null);

  useEffect(() => {
    setShowPassword(false);
    setCopiedLogin(null);
  }, [employee?.id]);

  useEffect(() => {
    if (!employee) return;
    setWorkStart(employee.workStart || "08:00");
    setWorkEnd(employee.workEnd || "16:00");
    setWorkHours(String(employee.workHours || 8));
    setWorkDays([...(employee.workDays ?? [])]);
    const known = NATIONALITY_OPTIONS.includes(
      employee.nationality as (typeof NATIONALITY_OPTIONS)[number],
    );
    if (known) {
      setNatSelect(employee.nationality);
      setNatCustom("");
    } else {
      setNatSelect("أخرى");
      setNatCustom(employee.nationality || "");
    }
  }, [
    employee?.id,
    employee?.workStart,
    employee?.workEnd,
    employee?.workHours,
    employee?.workDays,
    employee?.nationality,
  ]);

  const suggestedHours = hoursBetween(workStart, workEnd);
  const resolvedNat = natSelect === "أخرى" ? natCustom.trim() : natSelect;
  const docLabel = idDocumentLabel(resolvedNat || employee?.nationality, lang);
  const employeeDept = departments.find((d) => d.name === employee?.department);
  const employeePositions = employeeDept ? positionsForDepartment(employeeDept.id) : [];

  const pickableRoles: AppRole[] = [...ASSIGNABLE_HR_ROLES, "super_admin"];

  const isSuper = assignedRoles.includes("super_admin");

  function labelFor(role: AppRole) {
    return getRoleLabel(role, lang);
  }

  function handleRoleToggle(role: AppRole) {
    if (!employee || !canManageRoles) return;
    if (employee.username === "sadmin" && role === "super_admin" && assignedRoles.includes("super_admin")) {
      toast.message(lang === "ar" ? "لا يمكن إزالة دور Super Admin من sadmin" : "Cannot remove Super Admin from sadmin");
      return;
    }
    const willRemove = assignedRoles.includes(role);
    toggleRole(employee.id, role);
    toast.success(
      lang === "ar"
        ? willRemove
          ? `تمت إزالة الدور: ${labelFor(role)}`
          : `تمت إضافة الدور: ${labelFor(role)}`
        : willRemove
          ? `Removed role: ${labelFor(role)}`
          : `Added role: ${labelFor(role)}`,
    );
    if (session?.userId === employee.id) void reload();
  }

  function saveProfile(patch: Partial<StaffRecord>) {
    if (!employee || !canEditDetails) return;
    updateStaff(employee.id, patch);
    toast.success(lang === "ar" ? "تم حفظ بيانات الموظف" : "Employee saved");
    if (session?.userId === employee.id) void reload();
  }

  function toggleWorkDay(day: number) {
    if (!canEditSchedule) return;
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  function saveSchedule() {
    if (!employee || !canEditSchedule) return;
    if (workDays.length === 0) {
      toast.error(lang === "ar" ? "اختر يوم دوام واحد على الأقل" : "Pick at least one work day");
      return;
    }
    if (!isValidTime(workStart) || !isValidTime(workEnd)) {
      toast.error(lang === "ar" ? "حدد من ساعة إلى ساعة بشكل صحيح" : "Set a valid from–to time");
      return;
    }
    const hours = Number(workHours);
    if (!hours || hours <= 0) {
      toast.error(lang === "ar" ? "ساعات الدوام لازم تكون أكبر من صفر" : "Work hours must be greater than zero");
      return;
    }
    updateStaff(employee.id, {
      workStart,
      workEnd,
      workDays,
      workHours: hours,
    });
    toast.success(lang === "ar" ? "تم حفظ دوام الموظف" : "Work schedule saved");
    if (session?.userId === employee.id) void reload();
  }

  function handleDelete() {
    if (!employee || !canDelete) return;
    if (employee.username === "sadmin") {
      toast.error(lang === "ar" ? "لا يمكن حذف حساب sadmin" : "Cannot delete sadmin");
      return;
    }
    if (session?.userId === employee.id || session?.username === employee.username) {
      toast.error(lang === "ar" ? "لا يمكن حذف حسابك الحالي" : "Cannot delete your own account");
      return;
    }
    const confirmed = window.confirm(
      lang === "ar"
        ? `حذف الموظف «${employee.full_name}» نهائياً؟`
        : `Permanently delete «${employee.full_name}»?`,
    );
    if (!confirmed) return;

    const result = deleteStaff(employee.id);
    if (!result.ok) {
      toast.error(
        result.error === "protected"
          ? lang === "ar"
            ? "هذا الحساب محمي من الحذف"
            : "This account is protected"
          : lang === "ar"
            ? "تعذّر حذف الموظف"
            : "Could not delete employee",
      );
      return;
    }

    toast.success(lang === "ar" ? "تم حذف الموظف" : "Employee deleted");
    onOpenChange(false);
    onDeleted?.(employee.id);
  }

  const selectClass =
    "flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(96vw,64rem)] max-w-none gap-0 overflow-hidden rounded-3xl border-border p-0 shadow-lift">
        {!employee ? (
          <div className="p-8 text-sm text-muted-foreground">{t("common.empty")}</div>
        ) : (
          <div className="flex max-h-[92vh] flex-col">
            <DialogHeader className="border-b border-border bg-card px-6 py-5 text-start sm:text-start">
              <div className="flex flex-wrap items-start gap-4 pe-8">
                <EmployeeAvatarUploader
                  name={employee.full_name}
                  src={employee.avatarUrl || null}
                  lang={lang}
                  size="lg"
                  disabled={!canEditDetails}
                  onChange={(next) => saveProfile({ avatarUrl: next ?? "" })}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <DialogTitle className="font-display text-2xl font-bold">{employee.full_name}</DialogTitle>
                  <DialogDescription className="text-sm">
                    @{employee.username} · {employee.email}
                  </DialogDescription>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={employee.is_active ? "success" : "neutral"}>
                      {employee.is_active ? t("emp.active") : t("emp.inactive")}
                    </StatusBadge>
                    <StatusBadge tone="neutral">{employee.job_title}</StatusBadge>
                    {assignedRoles
                      .filter((role) => role !== "employee.base")
                      .slice(0, 3)
                      .map((role) => (
                      <StatusBadge key={role} tone="info">
                        {labelFor(role)}
                      </StatusBadge>
                    ))}
                    {assignedRoles.filter((role) => role !== "employee.base").length > 3 ? (
                      <StatusBadge tone="neutral">
                        +{assignedRoles.filter((role) => role !== "employee.base").length - 3}
                      </StatusBadge>
                    ) : null}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 overflow-y-auto px-6 py-5">
              {/* Profile — full width */}
              <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <Briefcase className="size-4 text-primary" />
                  {lang === "ar" ? "المسمى والمنصب" : "Position & profile"}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label={t("emp.fullName")}>
                    <Input
                      key={`${employee.id}-name`}
                      defaultValue={employee.full_name}
                      disabled={!canEditDetails}
                      onBlur={(e) => {
                        if (e.target.value !== employee.full_name) saveProfile({ full_name: e.target.value });
                      }}
                    />
                  </Field>
                    <Field label={t("emp.jobTitle")}>
                      {employeePositions.length > 0 ? (
                        <select
                          key={`${employee.id}-job-select-${employee.department}-${employee.job_title}`}
                          className={selectClass}
                          defaultValue={employee.job_title || ""}
                          disabled={!canEditDetails}
                          onChange={(e) => {
                            if (e.target.value !== employee.job_title) {
                              saveProfile({ job_title: e.target.value });
                            }
                          }}
                        >
                          <option value="">
                            {lang === "ar" ? "— اختر المسمى —" : "— Choose title —"}
                          </option>
                          {employee.job_title &&
                          !employeePositions.some((p) => p.name === employee.job_title) ? (
                            <option value={employee.job_title}>{employee.job_title}</option>
                          ) : null}
                          {employeePositions.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          key={`${employee.id}-job-${employee.department}`}
                          defaultValue={employee.job_title}
                          disabled={!canEditDetails}
                          onBlur={(e) => {
                            if (e.target.value !== employee.job_title) saveProfile({ job_title: e.target.value });
                          }}
                        />
                      )}
                    </Field>
                    <Field label={t("emp.department")}>
                      <select
                        key={`${employee.id}-dept-select`}
                        className={selectClass}
                        defaultValue={employee.department}
                        disabled={!canEditDetails}
                        onChange={(e) => {
                          if (e.target.value !== employee.department) {
                            saveProfile({ department: e.target.value, job_title: "" });
                          }
                        }}
                      >
                        {!departments.some((d) => d.name === employee.department) ? (
                          <option value={employee.department}>{employee.department}</option>
                        ) : null}
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  <Field label={t("emp.salary")}>
                    <Input
                      key={`${employee.id}-salary`}
                      type="number"
                      defaultValue={employee.salary}
                      disabled={!canEditDetails}
                      onBlur={(e) => {
                        const salary = Number(e.target.value);
                        if (!Number.isNaN(salary) && salary !== employee.salary) saveProfile({ salary });
                      }}
                    />
                  </Field>
                  <Field label={t("emp.hireDate")}>
                    <Input
                      key={`${employee.id}-hire`}
                      type="date"
                      defaultValue={employee.hire_date}
                      disabled={!canEditDetails}
                      dir="ltr"
                      onBlur={(e) => {
                        if (e.target.value && e.target.value !== employee.hire_date) {
                          saveProfile({ hire_date: e.target.value });
                        }
                      }}
                    />
                  </Field>
                  <Field label={lang === "ar" ? "الجنسية" : "Nationality"}>
                    <select
                      className={selectClass}
                      value={natSelect}
                      disabled={!canEditDetails}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNatSelect(value);
                        if (value !== "أخرى") {
                          setNatCustom("");
                          saveProfile({ nationality: value });
                        }
                      }}
                    >
                      {NATIONALITY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {natSelect === "أخرى" ? (
                    <Field label={lang === "ar" ? "اكتب الجنسية" : "Enter nationality"}>
                      <Input
                        value={natCustom}
                        disabled={!canEditDetails}
                        placeholder={lang === "ar" ? "مثال: تركي" : "e.g. Turkish"}
                        onChange={(e) => setNatCustom(e.target.value)}
                        onBlur={() => {
                          if (natCustom.trim() && natCustom.trim() !== employee.nationality) {
                            saveProfile({ nationality: natCustom.trim() });
                          }
                        }}
                      />
                    </Field>
                  ) : null}
                  <Field label={docLabel}>
                    <Input
                      key={`${employee.id}-nid-${resolvedNat}`}
                      defaultValue={employee.national_id}
                      disabled={!canEditDetails}
                      dir="ltr"
                      placeholder={isJordanianNationality(resolvedNat) ? "1234567890" : "A12345678"}
                      onBlur={(e) => {
                        if (e.target.value !== employee.national_id) {
                          saveProfile({ national_id: e.target.value });
                        }
                      }}
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      key={`${employee.id}-email`}
                      type="email"
                      defaultValue={employee.email}
                      disabled={!canEditDetails}
                      dir="ltr"
                      onBlur={(e) => {
                        if (e.target.value !== employee.email) saveProfile({ email: e.target.value });
                      }}
                    />
                  </Field>
                  <Field label={t("emp.phone")}>
                    <Input
                      key={`${employee.id}-phone`}
                      defaultValue={employee.phone}
                      disabled={!canEditDetails}
                      dir="ltr"
                      onBlur={(e) => {
                        if (e.target.value !== employee.phone) saveProfile({ phone: e.target.value });
                      }}
                    />
                  </Field>
                  <Field label={lang === "ar" ? "العنوان" : "Address"}>
                    <Input
                      key={`${employee.id}-addr`}
                      defaultValue={employee.address}
                      disabled={!canEditDetails}
                      onBlur={(e) => {
                        if (e.target.value !== employee.address) saveProfile({ address: e.target.value });
                      }}
                    />
                  </Field>
                  <Field label={lang === "ar" ? "ملاحظات" : "Notes"} className="sm:col-span-2 lg:col-span-3">
                    <Input
                      key={`${employee.id}-notes`}
                      defaultValue={employee.notes}
                      disabled={!canEditDetails}
                      onBlur={(e) => {
                        if (e.target.value !== employee.notes) saveProfile({ notes: e.target.value });
                      }}
                    />
                  </Field>
                </div>
              </section>

              {/* Login credentials */}
              <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <KeyRound className="size-4 text-primary" />
                  {lang === "ar" ? "حساب الدخول" : "Login account"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {lang === "ar"
                    ? "اليوزرنيم وكلمة المرور اللي بيدخل فيهم الموظف على النظام."
                    : "Username and password the employee uses to sign in."}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("auth.username")}>
                    <div className="flex gap-2">
                      <Input
                        key={`${employee.id}-username`}
                        value={employee.username}
                        readOnly
                        dir="ltr"
                        className="font-mono"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="shrink-0 rounded-xl"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(employee.username);
                            setCopiedLogin("username");
                            toast.success(lang === "ar" ? "تم نسخ اسم المستخدم" : "Username copied");
                            window.setTimeout(() => setCopiedLogin(null), 1500);
                          } catch {
                            toast.error(lang === "ar" ? "تعذّر النسخ" : "Could not copy");
                          }
                        }}
                      >
                        {copiedLogin === "username" ? <Check className="size-4" /> : <Copy className="size-4" />}
                      </Button>
                    </div>
                  </Field>
                  <Field label={t("auth.password")}>
                    <div className="flex gap-2">
                      <Input
                        key={`${employee.id}-code`}
                        type={showPassword ? "text" : "password"}
                        defaultValue={employee.code}
                        disabled={!canEditDetails}
                        dir="ltr"
                        className="font-mono"
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (!next) {
                            e.target.value = employee.code;
                            toast.error(lang === "ar" ? "كلمة المرور مطلوبة" : "Password required");
                            return;
                          }
                          if (next !== employee.code) saveProfile({ code: next });
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="shrink-0 rounded-xl"
                        onClick={() => setShowPassword((v) => !v)}
                        title={showPassword ? (lang === "ar" ? "إخفاء" : "Hide") : lang === "ar" ? "إظهار" : "Show"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="shrink-0 rounded-xl"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(employee.code);
                            setCopiedLogin("code");
                            toast.success(lang === "ar" ? "تم نسخ كلمة المرور" : "Password copied");
                            window.setTimeout(() => setCopiedLogin(null), 1500);
                          } catch {
                            toast.error(lang === "ar" ? "تعذّر النسخ" : "Could not copy");
                          }
                        }}
                      >
                        {copiedLogin === "code" ? <Check className="size-4" /> : <Copy className="size-4" />}
                      </Button>
                    </div>
                  </Field>
                </div>
              </section>

              {/* Schedule + Roles side by side */}
              <div className="grid gap-5 lg:grid-cols-2">
                <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <Clock3 className="size-4 text-primary" />
                    {lang === "ar" ? "دوام الموظف (من–إلى)" : "Work schedule (from–to)"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {lang === "ar"
                      ? "من–إلى وساعات الدوام بحرية، مع أيام الأسبوع."
                      : "From–to and free hours, plus weekdays."}
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={lang === "ar" ? "من الساعة" : "From"}>
                      <Input
                        type="time"
                        value={workStart}
                        disabled={!canEditSchedule}
                        onChange={(e) => setWorkStart(e.target.value)}
                        dir="ltr"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field label={lang === "ar" ? "إلى الساعة" : "To"}>
                      <Input
                        type="time"
                        value={workEnd}
                        disabled={!canEditSchedule}
                        onChange={(e) => setWorkEnd(e.target.value)}
                        dir="ltr"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field label={lang === "ar" ? "ساعات الدوام" : "Work hours"}>
                      <Input
                        type="number"
                        min={0.25}
                        step={0.25}
                        value={workHours}
                        disabled={!canEditSchedule}
                        onChange={(e) => setWorkHours(e.target.value)}
                        dir="ltr"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full rounded-xl"
                        disabled={!canEditSchedule || !suggestedHours}
                        onClick={() => suggestedHours && setWorkHours(String(suggestedHours))}
                      >
                        {lang === "ar"
                          ? suggestedHours
                            ? `احسب (${suggestedHours})`
                            : "احسب من الوقت"
                          : suggestedHours
                            ? `Use (${suggestedHours})`
                            : "Use span"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {lang === "ar" ? "أيام الدوام" : "Work days"}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_LABELS.map((d) => {
                        const on = workDays.includes(d.day);
                        return (
                          <button
                            key={d.day}
                            type="button"
                            disabled={!canEditSchedule}
                            onClick={() => toggleWorkDay(d.day)}
                            className={cn(
                              "rounded-xl px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                              on
                                ? "bg-brand text-brand-foreground shadow-glow"
                                : "border border-border bg-background text-muted-foreground hover:bg-secondary",
                            )}
                          >
                            {lang === "ar" ? d.ar : d.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {canEditSchedule ? (
                    <Button
                      type="button"
                      className="w-full rounded-xl bg-brand text-brand-foreground shadow-glow"
                      onClick={saveSchedule}
                    >
                      {lang === "ar" ? "حفظ الدوام" : "Save schedule"}
                    </Button>
                  ) : null}
                </section>

                <section className="flex flex-col space-y-4 rounded-2xl border border-border bg-card p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <ShieldCheck className="size-4 text-primary" />
                    {t("common.role")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {lang === "ar"
                      ? "كل رول إداري يفتح قسمه فقط في الشريط. بدون رول إداري = بوابة موظف."
                      : "Each admin role opens only its sidebar section. No admin role = employee portal."}
                  </p>

                  <div className="min-h-0 flex-1 space-y-2">
                    <Label>{lang === "ar" ? "الرتب" : "Ranks"}</Label>
                    <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-input bg-background p-2">
                      {pickableRoles.map((role) => {
                        const selected = assignedRoles.includes(role);
                        const locked =
                          employee.username === "sadmin" && role === "super_admin" && selected;
                        return (
                          <label
                            key={role}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm hover:bg-secondary/60",
                              selected && "bg-primary/10 font-semibold",
                              (!canManageRoles || locked) && "cursor-not-allowed opacity-60",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={selected}
                              disabled={!canManageRoles || locked}
                              onChange={() => handleRoleToggle(role)}
                            />
                            <span>{labelFor(role)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {assignedRoles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedRoles
                        .filter((role) => role !== "employee.base")
                        .map((role) => (
                        <button
                          key={role}
                          type="button"
                          disabled={!canManageRoles}
                          onClick={() => handleRoleToggle(role)}
                          className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-destructive/15 hover:text-destructive disabled:opacity-60"
                        >
                          {labelFor(role)} ×
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {isSuper ? (
                    <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
                      {lang === "ar"
                        ? "هذا الحساب Super Admin — كل الصلاحيات مفعّلة تلقائياً."
                        : "This account is Super Admin — all permissions are enabled."}
                    </p>
                  ) : null}
                </section>
              </div>

              {(canEditDetails || canManageRoles || canDelete) && (
                <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4">
                  {canEditDetails || canManageRoles ? (
                    <Button
                      variant="outline"
                      className="min-w-[10rem] flex-1 rounded-xl"
                      disabled={!canEditDetails}
                      onClick={() => {
                        updateStaff(employee.id, { is_active: !employee.is_active });
                        toast.success(employee.is_active ? t("emp.inactive") : t("emp.active"));
                      }}
                    >
                      {employee.is_active ? t("emp.inactive") : t("emp.active")}
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      variant="destructive"
                      className="min-w-[10rem] flex-1 rounded-xl"
                      disabled={employee.username === "sadmin" || session?.userId === employee.id}
                      onClick={handleDelete}
                    >
                      {t("common.delete")}
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
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
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
