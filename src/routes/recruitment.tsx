import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { AppShell, DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import {
  CvUploadField,
  CvViewer,
  LanguageSelectField,
} from "@/components/app/application-form-fields";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useOrg } from "@/lib/org-structure";
import {
  APPLICATION_STAGES,
  JOB_LOCATIONS,
  formatLanguages,
  locationLabel,
  openingStatusLabel,
  parseLanguageIds,
  serializeLanguages,
  stageLabel,
  stageTone,
  useRecruitment,
  type ApplicationStage,
  type JobApplication,
  type JobOpening,
  type NewApplicationInput,
} from "@/lib/recruitment";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recruitment")({
  head: () => ({ meta: [{ title: "طلبات التوظيف | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: RecruitmentPage,
});

type Tab = "applications" | "openings";
type DetailTab = "profile" | "request" | "cv" | "hr";

function RecruitmentPage() {
  const { t, lang } = useI18n();
  const { can, isSuperAdmin, profile } = useAuth();
  const { departments } = useOrg();
  const {
    openings,
    applications,
    addOpening,
    updateOpening,
    addApplication,
    setApplicationStage,
    updateApplication,
    deleteApplication,
    getOpening,
    getApplication,
  } = useRecruitment();

  const canManage = isSuperAdmin || can("hr.recruitment.manage");

  const [tab, setTab] = useState<Tab>("applications");
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState<ApplicationStage | "all">("all");

  const [openingOpen, setOpeningOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const detail = selectedAppId ? getApplication(selectedAppId) ?? null : null;

  const openJobs = openings.filter((o) => o.status === "open");
  const newApps = applications.filter((a) => a.stage === "new").length;
  const interviews = applications.filter((a) => a.stage === "interview").length;
  const hired = applications.filter((a) => a.stage === "hired").length;

  const filteredApps = useMemo(() => {
    const query = q.trim().toLowerCase();
    return applications
      .filter((a) => (stageFilter === "all" ? true : a.stage === stageFilter))
      .filter((a) => {
        if (!query) return true;
        const opening = getOpening(a.openingId);
        return (
          a.fullName.toLowerCase().includes(query) ||
          a.email.toLowerCase().includes(query) ||
          a.phone.includes(query) ||
          (opening?.title ?? "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [applications, stageFilter, q, getOpening]);

  const filteredOpenings = useMemo(() => {
    const query = q.trim().toLowerCase();
    return openings
      .filter((o) => {
        if (!query) return true;
        return (
          o.title.toLowerCase().includes(query) ||
          o.department.toLowerCase().includes(query) ||
          o.owner.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  }, [openings, q]);

  function appsForOpening(openingId: string) {
    return applications.filter((a) => a.openingId === openingId).length;
  }

  return (
    <AppShell title="nav.recruitment">
      <PageHeader
        title="nav.recruitment"
        description={
          lang === "ar"
            ? "إدارة الشواغر وطلبات المتقدمين: عرض، تعديل، حذف، وفرز حتى القبول أو الرفض."
            : "Manage openings and applications: view, edit, delete, and move stages until hire or reject."
        }
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpeningOpen(true)}>
                <Briefcase className="size-4" />
                {lang === "ar" ? "شاغر جديد" : "New opening"}
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-brand text-brand-foreground shadow-glow"
                onClick={() => setAppOpen(true)}
                disabled={openJobs.length === 0}
              >
                <UserPlus className="size-4" />
                {lang === "ar" ? "طلب توظيف" : "New application"}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={lang === "ar" ? "شواغر مفتوحة" : "Open roles"} value={openJobs.length} />
        <StatCard label={lang === "ar" ? "طلبات جديدة" : "New apps"} value={newApps} />
        <StatCard label={lang === "ar" ? "مقابلات" : "Interviews"} value={interviews} />
        <StatCard label={lang === "ar" ? "مقبولون" : "Hired"} value={hired} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "applications" as const, ar: "الطلبات", en: "Applications" },
              { id: "openings" as const, ar: "الشواغر", en: "Openings" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                tab === item.id
                  ? "bg-brand text-brand-foreground shadow-glow"
                  : "border border-border bg-card text-muted-foreground hover:bg-secondary",
              )}
            >
              {lang === "ar" ? item.ar : item.en}
            </button>
          ))}
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={lang === "ar" ? "بحث..." : "Search..."}
          className="max-w-xs rounded-xl"
        />
      </div>

      {tab === "applications" ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <StageChip
              active={stageFilter === "all"}
              label={lang === "ar" ? "الكل" : "All"}
              onClick={() => setStageFilter("all")}
            />
            {APPLICATION_STAGES.map((s) => (
              <StageChip
                key={s.id}
                active={stageFilter === s.id}
                label={lang === "ar" ? s.ar : s.en}
                onClick={() => setStageFilter(s.id)}
              />
            ))}
          </div>

          <DataTable
            onRowClick={(idx) => {
              const row = filteredApps[idx];
              if (row) setSelectedAppId(row.id);
            }}
            headers={[
              lang === "ar" ? "المتقدم" : "Applicant",
              lang === "ar" ? "الشاغر" : "Opening",
              t("emp.phone"),
              lang === "ar" ? "الخبرة" : "Experience",
              lang === "ar" ? "الراتب المتوقع" : "Expected salary",
              lang === "ar" ? "المرحلة" : "Stage",
              lang === "ar" ? "تاريخ الطلب" : "Applied",
              ...(canManage ? [t("common.actions")] : []),
            ]}
            rows={filteredApps.map((a) => {
              const opening = getOpening(a.openingId);
              return [
                <div key={`${a.id}-n`} className="flex items-center gap-3">
                  <EmployeeAvatar name={a.fullName} size="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold">{a.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                  </div>
                </div>,
                opening?.title ?? "—",
                a.phone,
                `${a.experienceYears} ${lang === "ar" ? "سنة" : "yrs"}`,
                <span key={`${a.id}-sal`} dir="ltr">
                  {a.expectedSalary.toLocaleString("en-GB")} JOD
                </span>,
                <StatusBadge key={`${a.id}-st`} tone={stageTone(a.stage)}>
                  {stageLabel(a.stage, lang)}
                </StatusBadge>,
                new Date(a.createdAt).toLocaleDateString("en-GB"),
                ...(canManage
                  ? [
                      <div key={`${a.id}-act`} className="flex flex-wrap gap-1.5" data-no-row-click>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppId(a.id);
                          }}
                        >
                          <Pencil className="size-3.5" />
                          {lang === "ar" ? "تعديل" : "Edit"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              !window.confirm(
                                lang === "ar"
                                  ? `حذف طلب «${a.fullName}» نهائيًا؟`
                                  : `Delete application «${a.fullName}» permanently?`,
                              )
                            ) {
                              return;
                            }
                            deleteApplication(a.id);
                            if (selectedAppId === a.id) setSelectedAppId(null);
                            toast.success(lang === "ar" ? "تم حذف الطلب" : "Application deleted");
                          }}
                        >
                          <Trash2 className="size-3.5" />
                          {lang === "ar" ? "حذف" : "Delete"}
                        </Button>
                      </div>,
                    ]
                  : []),
              ];
            })}
          />
        </>
      ) : (
        <DataTable
          headers={[
            lang === "ar" ? "المسمى" : "Title",
            t("emp.department"),
            lang === "ar" ? "المكان" : "Location",
            lang === "ar" ? "المتقدمون" : "Applicants",
            lang === "ar" ? "المسؤول" : "Owner",
            t("common.status"),
            lang === "ar" ? "تاريخ الفتح" : "Opened",
            t("common.actions"),
          ]}
          rows={filteredOpenings.map((o) => [
            <div key={`${o.id}-t`}>
              <p className="font-semibold">{o.title}</p>
              {o.description ? <p className="text-xs text-muted-foreground">{o.description}</p> : null}
            </div>,
            o.department,
            canManage ? (
              <select
                key={`${o.id}-loc`}
                value={o.location || "amman"}
                onChange={(e) => updateOpening(o.id, { location: e.target.value })}
                className="h-9 max-w-[11rem] rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-no-row-click
              >
                {JOB_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {lang === "ar" ? loc.ar : loc.en}
                  </option>
                ))}
              </select>
            ) : (
              locationLabel(o.location, lang)
            ),
            String(appsForOpening(o.id)),
            o.owner,
            <StatusBadge
              key={`${o.id}-s`}
              tone={o.status === "open" ? "success" : o.status === "on_hold" ? "warning" : "neutral"}
            >
              {openingStatusLabel(o.status, lang)}
            </StatusBadge>,
            o.openedAt,
            canManage ? (
              <div key={`${o.id}-a`} className="flex flex-wrap gap-1.5" data-no-row-click>
                {o.status !== "open" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOpening(o.id, { status: "open" });
                      toast.success(lang === "ar" ? "تم فتح الشاغر" : "Opening reopened");
                    }}
                  >
                    {lang === "ar" ? "فتح" : "Open"}
                  </Button>
                ) : null}
                {o.status !== "on_hold" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOpening(o.id, { status: "on_hold" });
                      toast.success(lang === "ar" ? "تم تعليق الشاغر" : "Opening put on hold");
                    }}
                  >
                    {lang === "ar" ? "تعليق" : "Hold"}
                  </Button>
                ) : null}
                {o.status !== "closed" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOpening(o.id, { status: "closed" });
                      toast.success(lang === "ar" ? "تم إغلاق الشاغر" : "Opening closed");
                    }}
                  >
                    {lang === "ar" ? "إغلاق" : "Close"}
                  </Button>
                ) : null}
              </div>
            ) : (
              "—"
            ),
          ])}
        />
      )}

      <OpeningDialog
        open={openingOpen}
        onOpenChange={setOpeningOpen}
        departments={departments.map((d) => d.name)}
        defaultOwner={profile?.full_name ?? ""}
        lang={lang}
        onSubmit={(data) => {
          addOpening(data);
          toast.success(lang === "ar" ? "تم إضافة الشاغر" : "Opening created");
          setOpeningOpen(false);
          setTab("openings");
        }}
      />

      <ApplicationDialog
        open={appOpen}
        onOpenChange={setAppOpen}
        openings={openJobs}
        lang={lang}
        onSubmit={(data) => {
          addApplication(data);
          toast.success(lang === "ar" ? "تم تسجيل طلب التوظيف" : "Application submitted");
          setAppOpen(false);
          setTab("applications");
        }}
      />

      <ApplicationDetailDialog
        application={detail}
        opening={detail ? getOpening(detail.openingId) : undefined}
        openings={openings}
        open={!!selectedAppId}
        onOpenChange={(v) => {
          if (!v) setSelectedAppId(null);
        }}
        canManage={canManage}
        lang={lang}
        onStage={(stage, note) => {
          if (!selectedAppId) return;
          setApplicationStage(selectedAppId, stage, note);
          toast.success(
            lang === "ar"
              ? `تم تحديث المرحلة إلى «${stageLabel(stage, lang)}» — تقدر تغيّرها مرة ثانية بأي وقت`
              : `Stage updated to «${stageLabel(stage, lang)}» — you can change it again anytime`,
          );
        }}
        onUpdate={(patch) => {
          if (!selectedAppId) return;
          updateApplication(selectedAppId, patch);
          toast.success(lang === "ar" ? "تم حفظ التعديلات" : "Application updated");
        }}
        onDelete={() => {
          if (!selectedAppId || !detail) return;
          if (
            !window.confirm(
              lang === "ar"
                ? `حذف طلب «${detail.fullName}» نهائيًا؟`
                : `Delete application «${detail.fullName}» permanently?`,
            )
          ) {
            return;
          }
          deleteApplication(selectedAppId);
          setSelectedAppId(null);
          toast.success(lang === "ar" ? "تم حذف الطلب" : "Application deleted");
        }}
      />
    </AppShell>
  );
}

function StageChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-brand text-brand-foreground shadow-glow"
          : "border border-border bg-card text-muted-foreground hover:bg-secondary",
      )}
    >
      {label}
    </button>
  );
}

function OpeningDialog({
  open,
  onOpenChange,
  departments,
  defaultOwner,
  lang,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departments: string[];
  defaultOwner: string;
  lang: "ar" | "en";
  onSubmit: (data: {
    title: string;
    department: string;
    description: string;
    location: string;
    owner: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState(departments[0] ?? "");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("amman");
  const [owner, setOwner] = useState(defaultOwner);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !department.trim()) {
      toast.error(lang === "ar" ? "المسمى والقسم مطلوبان" : "Title and department required");
      return;
    }
    if (!location) {
      toast.error(lang === "ar" ? "اختر مكان الوظيفة" : "Select job location");
      return;
    }
    onSubmit({ title, department, description, location, owner: owner || defaultOwner });
    setTitle("");
    setDescription("");
    setLocation("amman");
  }

  const selectClass =
    "flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle>{lang === "ar" ? "شاغر وظيفي جديد" : "New job opening"}</DialogTitle>
          <DialogDescription>
            {lang === "ar" ? "أضف شاغراً لاستقبال طلبات التوظيف." : "Add an opening to receive applications."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label={lang === "ar" ? "المسمى الوظيفي" : "Job title"}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl" />
          </Field>
          <Field label={lang === "ar" ? "القسم" : "Department"}>
            <select className={selectClass} value={department} onChange={(e) => setDepartment(e.target.value)}>
              {departments.length === 0 ? <option value="عام">عام</option> : null}
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label={lang === "ar" ? "مكان الوظيفة" : "Job location"}>
            <select className={selectClass} value={location} onChange={(e) => setLocation(e.target.value)} required>
              {JOB_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {lang === "ar" ? loc.ar : loc.en}
                </option>
              ))}
            </select>
          </Field>
          <Field label={lang === "ar" ? "المسؤول" : "Owner"}>
            <Input value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-xl" />
          </Field>
          <Field label={lang === "ar" ? "الوصف" : "Description"}>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl" />
          </Field>
          <Button type="submit" className="w-full rounded-xl bg-brand text-brand-foreground">
            <Plus className="size-4" />
            {lang === "ar" ? "حفظ الشاغر" : "Save opening"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationDialog({
  open,
  onOpenChange,
  openings,
  lang,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  openings: JobOpening[];
  lang: "ar" | "en";
  onSubmit: (data: NewApplicationInput) => void;
}) {
  const [openingId, setOpeningId] = useState(openings[0]?.id ?? "");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("عمّان");
  const [nationality, setNationality] = useState("أردني");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [education, setEducation] = useState("");
  const [currentJob, setCurrentJob] = useState("");
  const [skills, setSkills] = useState("");
  const [languageIds, setLanguageIds] = useState<string[]>(["ar", "en"]);
  const [experienceYears, setExperienceYears] = useState("1");
  const [expectedSalary, setExpectedSalary] = useState("1000");
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFileName, setCvFileName] = useState("");
  const [cvDataUrl, setCvDataUrl] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const oid = openingId || openings[0]?.id;
    if (!oid || !fullName.trim() || !phone.trim() || !email.trim()) {
      toast.error(lang === "ar" ? "أكمل بيانات المتقدم والشاغر" : "Fill applicant and opening");
      return;
    }
    if (languageIds.length === 0) {
      toast.error(lang === "ar" ? "اختر لغة واحدة على الأقل" : "Select at least one language");
      return;
    }
    if (!cvDataUrl) {
      toast.error(lang === "ar" ? "حمّل ملف السيرة الذاتية" : "Upload a CV file");
      return;
    }
    onSubmit({
      openingId: oid,
      fullName,
      phone,
      email,
      city,
      nationality,
      address,
      birthDate,
      education,
      currentJob,
      skills,
      languages: serializeLanguages(languageIds),
      experienceYears: Number(experienceYears) || 0,
      expectedSalary: Number(expectedSalary) || 0,
      coverLetter,
      cvFileName,
      cvDataUrl,
      notes,
    });
    setFullName("");
    setPhone("");
    setEmail("");
    setCoverLetter("");
    setCvFileName("");
    setCvDataUrl("");
    setNotes("");
    setLanguageIds(["ar", "en"]);
  }

  const selectClass =
    "flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,44rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5 text-start">
          <DialogTitle>{lang === "ar" ? "طلب توظيف جديد" : "New job application"}</DialogTitle>
          <DialogDescription>
            {lang === "ar"
              ? "أدخل بيانات المتقدم كاملة مع طلب التوظيف والسيرة الذاتية."
              : "Enter full applicant details with cover letter and CV."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <Field label={lang === "ar" ? "الشاغر" : "Opening"}>
            <select
              className={selectClass}
              value={openingId || openings[0]?.id || ""}
              onChange={(e) => setOpeningId(e.target.value)}
            >
              {openings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} — {o.department}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={lang === "ar" ? "الاسم الكامل" : "Full name"}>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="rounded-xl" />
            </Field>
            <Field label={lang === "ar" ? "الجنسية" : "Nationality"}>
              <Input value={nationality} onChange={(e) => setNationality(e.target.value)} className="rounded-xl" />
            </Field>
            <Field label={lang === "ar" ? "الهاتف" : "Phone"}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required className="rounded-xl" dir="ltr" />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl" dir="ltr" />
            </Field>
            <Field label={lang === "ar" ? "المدينة" : "City"}>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl" />
            </Field>
            <Field label={lang === "ar" ? "تاريخ الميلاد" : "Birth date"}>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="rounded-xl" dir="ltr" />
            </Field>
          </div>
          <Field label={lang === "ar" ? "العنوان" : "Address"}>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={lang === "ar" ? "المؤهل العلمي" : "Education"}>
              <Input value={education} onChange={(e) => setEducation(e.target.value)} className="rounded-xl" />
            </Field>
            <Field label={lang === "ar" ? "العمل الحالي" : "Current job"}>
              <Input value={currentJob} onChange={(e) => setCurrentJob(e.target.value)} className="rounded-xl" />
            </Field>
            <Field label={lang === "ar" ? "سنوات الخبرة" : "Years of experience"}>
              <Input type="number" min={0} value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} className="rounded-xl" dir="ltr" />
            </Field>
            <Field label={lang === "ar" ? "الراتب المتوقع" : "Expected salary"}>
              <Input type="number" min={0} value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} className="rounded-xl" dir="ltr" />
            </Field>
          </div>
          <Field label={lang === "ar" ? "المهارات" : "Skills"}>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} className="rounded-xl" />
          </Field>
          <Field label={lang === "ar" ? "اللغات" : "Languages"}>
            <LanguageSelectField value={languageIds} onChange={setLanguageIds} lang={lang} />
          </Field>
          <Field label={lang === "ar" ? "طلب التوظيف / خطاب التقديم" : "Cover letter"}>
            <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className="min-h-24 rounded-xl" />
          </Field>
          <Field label={lang === "ar" ? "السيرة الذاتية (CV)" : "CV / Resume"}>
            <CvUploadField
              fileName={cvFileName}
              dataUrl={cvDataUrl}
              onChange={(next) => {
                setCvFileName(next.fileName);
                setCvDataUrl(next.dataUrl);
              }}
              lang={lang}
              required
            />
          </Field>
          <Field label={lang === "ar" ? "ملاحظات داخلية" : "Internal notes"}>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" />
          </Field>
          <Button type="submit" className="w-full rounded-xl bg-brand text-brand-foreground">
            <UserPlus className="size-4" />
            {lang === "ar" ? "تسجيل الطلب" : "Submit application"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationDetailDialog({
  application,
  opening,
  openings,
  open,
  onOpenChange,
  canManage,
  lang,
  onStage,
  onUpdate,
  onDelete,
}: {
  application: JobApplication | null;
  opening?: JobOpening | undefined;
  openings: JobOpening[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canManage: boolean;
  lang: "ar" | "en";
  onStage: (stage: ApplicationStage, note?: string) => void;
  onUpdate: (patch: Partial<Omit<JobApplication, "id" | "createdAt">>) => void;
  onDelete: () => void;
}) {
  const [note, setNote] = useState("");
  const [detailTab, setDetailTab] = useState<DetailTab>("profile");
  const [editing, setEditing] = useState(false);
  const [pendingStage, setPendingStage] = useState<ApplicationStage | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [nationality, setNationality] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [education, setEducation] = useState("");
  const [currentJob, setCurrentJob] = useState("");
  const [skills, setSkills] = useState("");
  const [languageIds, setLanguageIds] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState("0");
  const [expectedSalary, setExpectedSalary] = useState("0");
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFileName, setCvFileName] = useState("");
  const [cvDataUrl, setCvDataUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [openingId, setOpeningId] = useState("");

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setDetailTab("profile");
      setNote("");
      setPendingStage(null);
    }
  }, [open]);

  useEffect(() => {
    if (!application) return;
    setFullName(application.fullName);
    setPhone(application.phone);
    setEmail(application.email);
    setCity(application.city);
    setNationality(application.nationality);
    setAddress(application.address);
    setBirthDate(application.birthDate);
    setEducation(application.education);
    setCurrentJob(application.currentJob);
    setSkills(application.skills);
    setLanguageIds(parseLanguageIds(application.languages));
    setExperienceYears(String(application.experienceYears));
    setExpectedSalary(String(application.expectedSalary));
    setCoverLetter(application.coverLetter);
    setCvFileName(application.cvFileName);
    setCvDataUrl(application.cvDataUrl);
    setNotes(application.notes);
    setOpeningId(application.openingId);
  }, [application?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!application) return;
    setPendingStage(null);
  }, [application?.stage, application?.id]);

  if (!application) return null;

  const tabs: Array<{ id: DetailTab; ar: string; en: string }> = [
    { id: "profile", ar: "من هو", en: "Profile" },
    { id: "request", ar: "طلب التوظيف", en: "Application" },
    { id: "cv", ar: "السيرة الذاتية", en: "CV" },
    { id: "hr", ar: "قرار HR", en: "HR decision" },
  ];

  const resetEditFromApplication = () => {
    setFullName(application.fullName);
    setPhone(application.phone);
    setEmail(application.email);
    setCity(application.city);
    setNationality(application.nationality);
    setAddress(application.address);
    setBirthDate(application.birthDate);
    setEducation(application.education);
    setCurrentJob(application.currentJob);
    setSkills(application.skills);
    setLanguageIds(parseLanguageIds(application.languages));
    setExperienceYears(String(application.experienceYears));
    setExpectedSalary(String(application.expectedSalary));
    setCoverLetter(application.coverLetter);
    setCvFileName(application.cvFileName);
    setCvDataUrl(application.cvDataUrl);
    setNotes(application.notes);
    setOpeningId(application.openingId);
    setEditing(false);
  };

  const saveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      toast.error(lang === "ar" ? "الاسم والهاتف والبريد مطلوبة" : "Name, phone and email are required");
      return;
    }
    if (languageIds.length === 0) {
      toast.error(lang === "ar" ? "اختر لغة واحدة على الأقل" : "Select at least one language");
      return;
    }
    if (!cvDataUrl) {
      toast.error(lang === "ar" ? "حمّل ملف السيرة الذاتية" : "Upload a CV file");
      return;
    }
    onUpdate({
      openingId: openingId || application.openingId,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      nationality: nationality.trim(),
      address: address.trim(),
      birthDate: birthDate.trim(),
      education: education.trim(),
      currentJob: currentJob.trim(),
      skills: skills.trim(),
      languages: serializeLanguages(languageIds),
      experienceYears: Number(experienceYears) || 0,
      expectedSalary: Number(expectedSalary) || 0,
      coverLetter: coverLetter.trim(),
      cvText: "",
      cvFileName: cvFileName.trim(),
      cvDataUrl: cvDataUrl.trim(),
      notes: notes.trim(),
    });
    setEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[min(96vw,52rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5 text-start">
          <div className="flex items-start gap-4 pe-6">
            <EmployeeAvatar name={application.fullName} size="lg" rounded="2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <DialogTitle className="font-display text-xl">{application.fullName}</DialogTitle>
              <DialogDescription>
                {opening?.title ?? "—"} · {opening?.department ?? ""}
                {opening?.owner ? ` · ${lang === "ar" ? "مسؤول الشاغر" : "Owner"}: ${opening.owner}` : ""}
              </DialogDescription>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={stageTone(application.stage)}>{stageLabel(application.stage, lang)}</StatusBadge>
                <StatusBadge tone="neutral">
                  {application.experienceYears} {lang === "ar" ? "سنة خبرة" : "yrs exp"}
                </StatusBadge>
                <StatusBadge tone="info">{application.expectedSalary.toLocaleString("en-GB")} JOD</StatusBadge>
                {application.city ? <StatusBadge tone="neutral">{application.city}</StatusBadge> : null}
              </div>
            </div>
          </div>
          {canManage ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {!editing ? (
                <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" />
                  {lang === "ar" ? "تعديل الطلب" : "Edit application"}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={resetEditFromApplication}
                >
                  {lang === "ar" ? "إلغاء التعديل" : "Cancel edit"}
                </Button>
              )}
              <Button type="button" size="sm" variant="destructive" className="rounded-lg" onClick={onDelete}>
                <Trash2 className="size-3.5" />
                {lang === "ar" ? "حذف الطلب" : "Delete"}
              </Button>
            </div>
          ) : null}
        </DialogHeader>

        {editing ? (
          <form onSubmit={saveEdit} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={lang === "ar" ? "الاسم الكامل" : "Full name"}>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl" required />
              </Field>
              <Field label={lang === "ar" ? "الشاغر" : "Opening"}>
                <select
                  value={openingId}
                  onChange={(e) => setOpeningId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {openings.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} ({o.status === "open" ? (lang === "ar" ? "مفتوح" : "open") : o.status})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={lang === "ar" ? "الهاتف" : "Phone"}>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" required />
              </Field>
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" required />
              </Field>
              <Field label={lang === "ar" ? "المدينة" : "City"}>
                <Input value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl" />
              </Field>
              <Field label={lang === "ar" ? "الجنسية" : "Nationality"}>
                <Input value={nationality} onChange={(e) => setNationality(e.target.value)} className="rounded-xl" />
              </Field>
              <Field label={lang === "ar" ? "تاريخ الميلاد" : "Birth date"}>
                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="rounded-xl" />
              </Field>
              <Field label={lang === "ar" ? "سنوات الخبرة" : "Experience years"}>
                <Input
                  type="number"
                  min={0}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="rounded-xl"
                />
              </Field>
              <Field label={lang === "ar" ? "الراتب المتوقع (JOD)" : "Expected salary (JOD)"}>
                <Input
                  type="number"
                  min={0}
                  value={expectedSalary}
                  onChange={(e) => setExpectedSalary(e.target.value)}
                  className="rounded-xl"
                />
              </Field>
              <Field label={lang === "ar" ? "العنوان" : "Address"}>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl" />
              </Field>
              <Field label={lang === "ar" ? "المؤهل العلمي" : "Education"}>
                <Input value={education} onChange={(e) => setEducation(e.target.value)} className="rounded-xl" />
              </Field>
              <Field label={lang === "ar" ? "العمل الحالي" : "Current job"}>
                <Input value={currentJob} onChange={(e) => setCurrentJob(e.target.value)} className="rounded-xl" />
              </Field>
              <Field label={lang === "ar" ? "المهارات" : "Skills"}>
                <Input value={skills} onChange={(e) => setSkills(e.target.value)} className="rounded-xl" />
              </Field>
              <Field label={lang === "ar" ? "اللغات" : "Languages"}>
                <LanguageSelectField value={languageIds} onChange={setLanguageIds} lang={lang} />
              </Field>
            </div>
            <Field label={lang === "ar" ? "طلب التوظيف / خطاب التقديم" : "Cover letter"}>
              <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className="min-h-24 rounded-xl" />
            </Field>
            <Field label={lang === "ar" ? "السيرة الذاتية (CV)" : "CV / Resume"}>
              <CvUploadField
                fileName={cvFileName}
                dataUrl={cvDataUrl}
                onChange={(next) => {
                  setCvFileName(next.fileName);
                  setCvDataUrl(next.dataUrl);
                }}
                lang={lang}
                required
              />
            </Field>
            <Field label={lang === "ar" ? "ملاحظات داخلية" : "Internal notes"}>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" />
            </Field>
            <Button type="submit" className="w-full rounded-xl bg-brand text-brand-foreground">
              {lang === "ar" ? "حفظ التعديلات" : "Save changes"}
            </Button>
          </form>
        ) : (
          <>
            <div className="flex shrink-0 flex-wrap gap-2 border-b border-border px-6 py-3">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDetailTab(item.id)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                    detailTab === item.id
                      ? "bg-brand text-brand-foreground shadow-glow"
                      : "border border-border bg-card text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {lang === "ar" ? item.ar : item.en}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {detailTab === "profile" ? (
                <div className="space-y-4">
                  <section className="rounded-2xl border border-border bg-card p-4">
                    <h3 className="mb-3 text-sm font-bold">{lang === "ar" ? "البيانات الشخصية" : "Personal info"}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Info label={lang === "ar" ? "الاسم" : "Name"} value={application.fullName} />
                      <Info label={lang === "ar" ? "الجنسية" : "Nationality"} value={application.nationality || "—"} />
                      <Info label={lang === "ar" ? "الهاتف" : "Phone"} value={application.phone} />
                      <Info label="Email" value={application.email} />
                      <Info label={lang === "ar" ? "المدينة" : "City"} value={application.city || "—"} />
                      <Info label={lang === "ar" ? "تاريخ الميلاد" : "Birth date"} value={application.birthDate || "—"} />
                      <Info label={lang === "ar" ? "العنوان" : "Address"} value={application.address || "—"} className="sm:col-span-2" />
                    </div>
                  </section>
                  <section className="rounded-2xl border border-border bg-card p-4">
                    <h3 className="mb-3 text-sm font-bold">{lang === "ar" ? "الخبرة والمؤهلات" : "Experience & education"}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Info label={lang === "ar" ? "المؤهل العلمي" : "Education"} value={application.education || "—"} className="sm:col-span-2" />
                      <Info label={lang === "ar" ? "العمل الحالي" : "Current job"} value={application.currentJob || "—"} className="sm:col-span-2" />
                      <Info
                        label={lang === "ar" ? "سنوات الخبرة" : "Experience"}
                        value={`${application.experienceYears} ${lang === "ar" ? "سنة" : "years"}`}
                      />
                      <Info
                        label={lang === "ar" ? "الراتب المتوقع" : "Expected salary"}
                        value={`${application.expectedSalary.toLocaleString("en-GB")} JOD`}
                      />
                      <Info label={lang === "ar" ? "المهارات" : "Skills"} value={application.skills || "—"} className="sm:col-span-2" />
                      <Info
                        label={lang === "ar" ? "اللغات" : "Languages"}
                        value={formatLanguages(application.languages, lang)}
                        className="sm:col-span-2"
                      />
                      <Info label={lang === "ar" ? "ملاحظات" : "Notes"} value={application.notes || "—"} className="sm:col-span-2" />
                    </div>
                  </section>
                  <section className="rounded-2xl border border-border bg-secondary/30 p-4">
                    <h3 className="mb-3 text-sm font-bold">{lang === "ar" ? "تفاصيل الشاغر المتقدم له" : "Applied opening"}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Info label={lang === "ar" ? "المسمى" : "Title"} value={opening?.title ?? "—"} />
                      <Info label={lang === "ar" ? "القسم" : "Department"} value={opening?.department ?? "—"} />
                      <Info
                        label={lang === "ar" ? "مكان الوظيفة" : "Location"}
                        value={opening ? locationLabel(opening.location, lang) : "—"}
                      />
                      <Info label={lang === "ar" ? "المسؤول" : "Owner"} value={opening?.owner ?? "—"} />
                      <Info
                        label={lang === "ar" ? "تاريخ الطلب" : "Applied at"}
                        value={new Date(application.createdAt).toLocaleString("en-GB")}
                      />
                      <Info label={lang === "ar" ? "وصف الشاغر" : "Opening description"} value={opening?.description || "—"} className="sm:col-span-2" />
                    </div>
                  </section>
                </div>
              ) : null}

              {detailTab === "request" ? (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="mb-3 text-sm font-bold">{lang === "ar" ? "نص طلب التوظيف" : "Cover letter / application"}</h3>
                  {application.coverLetter ? (
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{application.coverLetter}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lang === "ar" ? "لا يوجد نص طلب مرفق." : "No cover letter provided."}
                    </p>
                  )}
                </section>
              ) : null}

              {detailTab === "cv" ? (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">{lang === "ar" ? "السيرة الذاتية (CV)" : "Curriculum Vitae"}</h3>
                    <StatusBadge tone="info">{lang === "ar" ? "ملف مرفوع" : "Uploaded file"}</StatusBadge>
                  </div>
                  <CvViewer
                    fileName={application.cvFileName}
                    dataUrl={application.cvDataUrl}
                    cvText={application.cvText}
                    lang={lang}
                  />
                </section>
              ) : null}

              {detailTab === "hr" ? (
                <div className="space-y-4">
                  {canManage ? (
                    <div className="space-y-3 rounded-2xl border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold">{lang === "ar" ? "تحديث المرحلة" : "Update stage"}</p>
                        <StatusBadge tone={stageTone(pendingStage ?? application.stage)}>
                          {stageLabel(pendingStage ?? application.stage, lang)}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {lang === "ar"
                          ? "تقدر تغيّر المرحلة في أي وقت — حتى بعد القبول أو الرفض."
                          : "You can change the stage anytime — even after hire or reject."}
                      </p>
                      <Input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={lang === "ar" ? "ملاحظة القرار (اختياري)" : "Decision note (optional)"}
                        className="rounded-xl"
                      />
                      <div className="flex flex-wrap gap-2">
                        {APPLICATION_STAGES.map((s) => {
                          const active = (pendingStage ?? application.stage) === s.id;
                          return (
                            <Button
                              key={s.id}
                              type="button"
                              size="sm"
                              variant={active ? "default" : "outline"}
                              className="rounded-lg"
                              aria-pressed={active}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPendingStage(s.id);
                                onStage(s.id, note);
                              }}
                            >
                              {lang === "ar" ? s.ar : s.en}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lang === "ar" ? "عرض فقط — تحتاج صلاحية HR للتعديل." : "View only."}
                    </p>
                  )}
                  {application.decisionNote ? (
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm">
                      <p className="text-xs text-muted-foreground">{lang === "ar" ? "ملاحظة HR" : "HR note"}</p>
                      <p className="mt-1 font-medium">{application.decisionNote}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
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

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-background/60 px-3 py-2.5", className)}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
