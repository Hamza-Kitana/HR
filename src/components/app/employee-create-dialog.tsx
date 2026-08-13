import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { EmployeeAvatarUploader } from "@/components/app/employee-avatar";
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
import { MOCK_DEPARTMENTS } from "@/lib/erp-modules";
import { useI18n } from "@/lib/i18n";
import { useOrg } from "@/lib/org-structure";
import { ASSIGNABLE_HR_ROLES, getRoleLabel, type AppRole } from "@/lib/permissions";
import { DEFAULT_WORK_DAYS, hoursBetween, WEEKDAY_LABELS } from "@/lib/shifts";
import {
  idDocumentLabel,
  isJordanianNationality,
  JORDANIAN_NATIONALITY,
  NATIONALITY_OPTIONS,
  useStaff,
} from "@/lib/staff";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EmployeeCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (employeeId: string) => void;
}) {
  const { t, lang } = useI18n();
  const { addStaff } = useStaff();
  const { departments, roles: orgRoles, positionsForDepartment } = useOrg();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [nationality, setNationality] = useState(JORDANIAN_NATIONALITY);
  const [customNationality, setCustomNationality] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("1234");
  const [jobTitle, setJobTitle] = useState("");
  const [customJobTitle, setCustomJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [hireDate, setHireDate] = useState(todayIso());
  const [salary, setSalary] = useState("1000");
  const [notes, setNotes] = useState("");
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("16:00");
  const [workHours, setWorkHours] = useState("8");
  const [workDays, setWorkDays] = useState<number[]>([...DEFAULT_WORK_DAYS]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [orgRoleId, setOrgRoleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<{
    id: string;
    fullName: string;
    username: string;
    code: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<"username" | "code" | "both" | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName("");
    setAvatarUrl("");
    setNationality(JORDANIAN_NATIONALITY);
    setCustomNationality("");
    setNationalId("");
    setPhone("");
    setEmail("");
    setAddress("عمّان، الأردن");
    setUsername("");
    setCode("1234");
    setJobTitle("");
    setCustomJobTitle("");
    setDepartment("");
    setHireDate(todayIso());
    setSalary("1000");
    setNotes("");
    setWorkStart("08:00");
    setWorkEnd("16:00");
    setWorkHours("8");
    setWorkDays([...DEFAULT_WORK_DAYS]);
    setRoles([]);
    setOrgRoleId("");
    setSaving(false);
    setCreatedAccount(null);
    setCopiedField(null);
  }, [open]);

  const selectedDepartment = departments.find((d) => d.name === department);
  const deptPositions = selectedDepartment
    ? positionsForDepartment(selectedDepartment.id)
    : [];
  const departmentList = departments.length
    ? departments.map((d) => d.name)
    : MOCK_DEPARTMENTS.map((d) => d.name);

  const resolvedNationality =
    nationality === "أخرى" ? customNationality.trim() : nationality;
  const jordanian = isJordanianNationality(resolvedNationality);
  const docLabel = idDocumentLabel(resolvedNationality || "أخرى", lang);

  const suggestedHours = hoursBetween(workStart, workEnd);

  function applySuggestedHours() {
    if (suggestedHours) setWorkHours(String(suggestedHours));
  }

  function toggleRole(role: AppRole) {
    setRoles((prev) => {
      if (role === "super_admin") {
        return prev.includes("super_admin") ? [] : ["super_admin"];
      }
      const withoutSuper = prev.filter((r) => r !== "super_admin");
      if (withoutSuper.includes(role)) {
        return withoutSuper.filter((r) => r !== role);
      }
      return [...withoutSuper, role];
    });
  }

  function toggleDay(day: number) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (nationality === "أخرى" && !customNationality.trim()) {
      toast.error(lang === "ar" ? "اكتب اسم الجنسية" : "Enter nationality");
      return;
    }

    setSaving(true);

    const finalJobTitle =
      jobTitle === "__custom__" ? customJobTitle.trim() : jobTitle.trim();
    if (!finalJobTitle) {
      setSaving(false);
      toast.error(lang === "ar" ? "المسمى الوظيفي مطلوب" : "Job title required");
      return;
    }

    const result = addStaff({
      full_name: fullName,
      username,
      code,
      email,
      job_title: finalJobTitle,
      department,
      phone,
      hire_date: hireDate,
      salary: Number(salary),
      address,
      nationality: resolvedNationality || customNationality.trim(),
      national_id: nationalId,
      notes,
      avatarUrl,
      roles,
      workDays,
      workStart,
      workEnd,
      workHours: Number(workHours),
    });

    if (!result.ok) {
      setSaving(false);
      const messages: Record<string, { ar: string; en: string }> = {
        missing_fields: {
          ar: "أدخل كل البيانات المطلوبة (الاسم، الهوية، الهاتف، الإيميل، العنوان، الحساب، الوظيفة، القسم، التعيين)",
          en: "Fill all required fields",
        },
        invalid_username: {
          ar: "اسم المستخدم: حروف إنجليزية صغيرة وأرقام فقط (3–24)",
          en: "Username: lowercase letters/numbers only (3–24)",
        },
        invalid_salary: { ar: "الراتب غير صحيح", en: "Invalid salary" },
        invalid_hours: {
          ar: "حدد وقت الدوام وعدد الساعات بشكل صحيح (أي عدد أكبر من صفر)",
          en: "Set valid work times and hours (any number greater than zero)",
        },
        username_taken: { ar: "اسم المستخدم مستخدم مسبقاً", en: "Username already taken" },
        failed: { ar: "تعذّر إنشاء الموظف", en: "Could not create employee" },
      };
      const msg = messages[result.error] ?? messages["failed"]!;
      toast.error(lang === "ar" ? msg.ar : msg.en);
      return;
    }

    toast.success(lang === "ar" ? "تمت إضافة الموظف لكل موظفي الشركة" : "Employee added to company roster");
    setCreatedAccount({
      id: result.employee.id,
      fullName: result.employee.full_name,
      username: result.employee.username,
      code: result.employee.code,
    });
    setSaving(false);
  }

  async function copyText(value: string, field: "username" | "code" | "both") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(lang === "ar" ? "تم النسخ" : "Copied");
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      toast.error(lang === "ar" ? "تعذّر النسخ" : "Could not copy");
    }
  }

  function finishCreated() {
    if (!createdAccount) return;
    const id = createdAccount.id;
    setCreatedAccount(null);
    onOpenChange(false);
    onCreated(id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(96vw,52rem)] max-w-none gap-0 overflow-hidden rounded-3xl border-border p-0 shadow-lift">
        {createdAccount ? (
          <>
            <DialogHeader className="border-b border-border bg-card px-4 py-4 text-start sm:px-6 sm:py-5 sm:text-start">
              <DialogTitle className="font-display text-xl font-bold">
                {lang === "ar" ? "تم إنشاء حساب الموظف" : "Employee account created"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {lang === "ar"
                  ? `احفظ بيانات دخول ${createdAccount.fullName} — يحتاجها لتسجيل الدخول للنظام.`
                  : `Save login details for ${createdAccount.fullName} — needed to sign in.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-primary">
                  <KeyRound className="size-4" />
                  {lang === "ar" ? "بيانات الدخول" : "Login credentials"}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CredRow
                    label={t("auth.username")}
                    value={createdAccount.username}
                    copied={copiedField === "username"}
                    onCopy={() => copyText(createdAccount.username, "username")}
                    copyLabel={lang === "ar" ? "نسخ" : "Copy"}
                  />
                  <CredRow
                    label={t("auth.password")}
                    value={createdAccount.code}
                    copied={copiedField === "code"}
                    onCopy={() => copyText(createdAccount.code, "code")}
                    copyLabel={lang === "ar" ? "نسخ" : "Copy"}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full rounded-xl"
                  onClick={() =>
                    copyText(
                      `${lang === "ar" ? "المستخدم" : "Username"}: ${createdAccount.username}\n${lang === "ar" ? "كلمة المرور" : "Password"}: ${createdAccount.code}`,
                      "both",
                    )
                  }
                >
                  {copiedField === "both" ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {lang === "ar" ? "نسخ الاثنين معاً" : "Copy both"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {lang === "ar"
                  ? "تقدر ترجع تشوف اليوزرنيم والباسورد أي وقت من ملف الموظف."
                  : "You can always view username and password later from the employee profile."}
              </p>

              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button type="button" className="rounded-xl bg-brand text-brand-foreground shadow-glow" onClick={finishCreated}>
                  {lang === "ar" ? "فتح ملف الموظف" : "Open employee profile"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
        <DialogHeader className="border-b border-border bg-card px-4 py-4 text-start sm:px-6 sm:py-5 sm:text-start">
          <DialogTitle className="font-display text-xl font-bold">{t("emp.newEmployee")}</DialogTitle>
          <DialogDescription className="text-sm">
            {lang === "ar"
              ? "أدخل بيانات الموظف كاملة وحدد رتبته/أدواره قبل الحفظ — يظهر مباشرة ضمن موظفي الشركة."
              : "Enter full employee data and assign ranks/roles — they appear on the company roster."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="max-h-[calc(92vh-5.5rem)] space-y-6 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <Section title={lang === "ar" ? "1) البيانات الشخصية" : "1) Personal details"}>
            <div className="mb-4 rounded-2xl border border-border bg-secondary/25 p-4">
              <EmployeeAvatarUploader
                name={fullName || (lang === "ar" ? "موظف جديد" : "New employee")}
                src={avatarUrl || null}
                lang={lang}
                onChange={(next) => setAvatarUrl(next ?? "")}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${t("emp.fullName")} *`}>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
              </Field>
              <Field label={`${lang === "ar" ? "الجنسية" : "Nationality"} *`}>
                <select
                  className={selectClass}
                  value={nationality}
                  required
                  onChange={(e) => {
                    setNationality(e.target.value);
                    setNationalId("");
                  }}
                >
                  {NATIONALITY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>
              {nationality === "أخرى" ? (
                <Field label={`${lang === "ar" ? "اكتب الجنسية" : "Enter nationality"} *`}>
                  <Input
                    value={customNationality}
                    onChange={(e) => setCustomNationality(e.target.value)}
                    required
                    placeholder={lang === "ar" ? "مثال: تركي" : "e.g. Turkish"}
                  />
                </Field>
              ) : null}
              <Field label={`${docLabel} *`}>
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  required
                  dir="ltr"
                  placeholder={jordanian ? "1234567890" : "A12345678"}
                />
              </Field>
              <Field label={`${t("emp.phone")} *`}>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required dir="ltr" />
              </Field>
              <Field label="Email *">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
              </Field>
              <Field label={`${lang === "ar" ? "العنوان" : "Address"} *`} className="sm:col-span-2">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
              </Field>
            </div>
          </Section>

          <Section title={lang === "ar" ? "2) بيانات العمل" : "2) Job details"}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${t("emp.department")} *`}>
                <select
                  className={selectClass}
                  value={department}
                  required
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setJobTitle("");
                    setCustomJobTitle("");
                  }}
                >
                  <option value="">{lang === "ar" ? "— اختر القسم —" : "— Choose department —"}</option>
                  {departmentList.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`${t("emp.jobTitle")} *`}>
                {deptPositions.length > 0 ? (
                  <select
                    className={selectClass}
                    value={jobTitle}
                    required
                    onChange={(e) => {
                      setJobTitle(e.target.value);
                      if (e.target.value !== "__custom__") setCustomJobTitle("");
                    }}
                  >
                    <option value="">{lang === "ar" ? "— اختر المنصب —" : "— Choose position —"}</option>
                    {deptPositions.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                    <option value="__custom__">{lang === "ar" ? "أخرى (كتابة يدوية)" : "Other (custom)"}</option>
                  </select>
                ) : (
                  <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
                )}
              </Field>
              {jobTitle === "__custom__" ? (
                <Field label={lang === "ar" ? "اكتب المنصب" : "Custom position"} className="sm:col-span-2">
                  <Input
                    value={customJobTitle}
                    onChange={(e) => setCustomJobTitle(e.target.value)}
                    required
                    placeholder={lang === "ar" ? "المسمى الوظيفي" : "Job title"}
                  />
                </Field>
              ) : null}
              <Field label={lang === "ar" ? "رول جاهز من الهيكل (اختياري)" : "Org role template (optional)"} className="sm:col-span-2">
                <select
                  className={selectClass}
                  value={orgRoleId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setOrgRoleId(id);
                    const orgRole = orgRoles.find((r) => r.id === id);
                    if (orgRole?.appRoles.length) {
                      setRoles(orgRole.appRoles.filter((r) => r !== "employee.base"));
                    }
                  }}
                >
                  <option value="">{lang === "ar" ? "— بدون قالب / اختيار يدوي تحت —" : "— None / pick manually below —"}</option>
                  {orgRoles
                    .filter((r) => r.appRoles.some((ar) => ar !== "employee.base"))
                    .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`${t("emp.hireDate")} *`}>
                <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} required dir="ltr" />
              </Field>
              <Field label={`${t("emp.salary")} *`}>
                <Input
                  type="number"
                  min={0}
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  required
                  dir="ltr"
                />
              </Field>
              <Field label={lang === "ar" ? "ملاحظات" : "Notes"} className="sm:col-span-2">
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title={lang === "ar" ? "3) حساب الدخول" : "3) Login account"}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${t("auth.username")} *`}>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  placeholder="ahmad"
                  required
                  dir="ltr"
                />
              </Field>
              <Field label={`${t("auth.password")} *`}>
                <Input value={code} onChange={(e) => setCode(e.target.value)} required dir="ltr" />
              </Field>
            </div>
          </Section>

          <Section title={lang === "ar" ? "4) دوام الموظف (من–إلى)" : "4) Work hours (from–to)"}>
            <p className="mb-3 text-xs text-muted-foreground">
              {lang === "ar"
                ? "حدد من أي ساعة إلى أي ساعة، وعدد ساعات الدوام بحرية (مش لازم 8 — الأدمن يكتب اللي بدو إياه)."
                : "Set from–to times and any work-hour total (not limited to 8)."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={`${lang === "ar" ? "من الساعة" : "From"} *`}>
                <Input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  required
                  dir="ltr"
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field label={`${lang === "ar" ? "إلى الساعة" : "To"} *`}>
                <Input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  required
                  dir="ltr"
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field label={`${lang === "ar" ? "ساعات الدوام" : "Work hours"} *`}>
                <Input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={workHours}
                  onChange={(e) => setWorkHours(e.target.value)}
                  required
                  dir="ltr"
                  className="h-11 rounded-xl"
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-xl"
                  onClick={applySuggestedHours}
                  disabled={!suggestedHours}
                >
                  {lang === "ar"
                    ? suggestedHours
                      ? `احسب من الوقت (${suggestedHours})`
                      : "احسب من الوقت"
                    : suggestedHours
                      ? `Use time span (${suggestedHours})`
                      : "Use time span"}
                </Button>
              </div>
            </div>
            <div className="mt-3 space-y-2">
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
                      onClick={() => toggleDay(d.day)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
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
          </Section>

          <Section title={lang === "ar" ? "5) الرتب (اختياري)" : "5) Roles (optional)"}>
            <p className="mb-3 text-xs text-muted-foreground">
              {lang === "ar"
                ? "اترك الرولات فاضي لموظف عادي (بوابة شخصية). كل رول إداري يفتح قسمه فقط في الشريط الجانبي."
                : "Leave roles empty for a regular employee portal. Each admin role opens only its sidebar section."}
            </p>
            <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
              {roles.length === 0
                ? lang === "ar"
                  ? "الحالة: موظف عادي (بدون رولات إدارية)"
                  : "Status: regular employee (no admin roles)"
                : lang === "ar"
                  ? `رولات مختارة: ${roles.map((r) => getRoleLabel(r, "ar")).join(" · ")}`
                  : `Selected: ${roles.map((r) => getRoleLabel(r, "en")).join(" · ")}`}
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-input bg-background p-2">
              {ASSIGNABLE_HR_ROLES.map((role) => {
                const selected = roles.includes(role);
                return (
                  <label
                    key={role}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm hover:bg-secondary/60",
                      selected && "bg-primary/10 font-semibold",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={selected}
                      onChange={() => toggleRole(role)}
                    />
                    <span>{getRoleLabel(role, lang)}</span>
                  </label>
                );
              })}
            </div>
          </Section>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="rounded-xl bg-brand text-brand-foreground shadow-glow" disabled={saving}>
              {t("common.create")}
            </Button>
          </div>
        </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CredRow({
  label,
  value,
  copied,
  onCopy,
  copyLabel,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  copyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate font-mono text-base font-bold" dir="ltr">
          {value}
        </p>
        <Button type="button" size="sm" variant="outline" className="shrink-0 rounded-lg" onClick={onCopy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copyLabel}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      {children}
    </section>
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
