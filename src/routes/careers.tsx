import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Briefcase, Building2, CalendarDays, MapPin, Send } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import {
  CvUploadField,
  LanguageSelectField,
} from "@/components/app/application-form-fields";
import { Reveal } from "@/components/site/reveal";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { serializeLanguages, locationLabel, useRecruitment, type JobOpening } from "@/lib/recruitment";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "الوظائف | توقيعي" },
      {
        name: "description",
        content: "وظائف مفتوحة في توقيعي — قدّم طلبك ويصل مباشرة لفريق الموارد البشرية.",
      },
      { property: "og:title", content: "الوظائف | توقيعي" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CareersPage,
});

function CareersPage() {
  const { t, lang } = useI18n();
  const { openings, addApplication, hydrated } = useRecruitment();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const openJobs = useMemo(
    () => openings.filter((o) => o.status === "open").sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
    [openings],
  );

  const selected = selectedId ? openJobs.find((o) => o.id === selectedId) ?? null : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden pt-32 pb-12 md:pt-40 md:pb-16">
          <div className="pointer-events-none absolute inset-0 grid-noise opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
          <div className="pointer-events-none absolute -top-24 end-[-6rem] size-[28rem] rounded-full bg-primary/12 blur-3xl" />
          <div className="relative mx-auto w-full max-w-6xl px-4">
            <Reveal className="max-w-3xl space-y-4">
              <p className="text-xs font-bold tracking-[0.22em] text-primary uppercase">{t("careers.eyebrow")}</p>
              <h1 className="font-display text-4xl font-extrabold text-balance md:text-5xl">
                <span className="text-gradient-brand">{t("brand.name")}</span>
                <span className="mt-2 block text-3xl md:text-4xl">{t("careers.title")}</span>
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {t("careers.desc")}
              </p>
              <p className="text-sm font-semibold text-foreground/80">
                {hydrated ? openJobs.length : "—"} {t("careers.openRoles")}
              </p>
            </Reveal>
          </div>
        </section>

        <section className="relative pb-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            {selected ? (
              <ApplyPanel
                job={selected}
                lang={lang}
                onBack={() => setSelectedId(null)}
                onSubmit={(data) => {
                  addApplication({ ...data, openingId: selected.id });
                  toast.success(t("careers.success"));
                  setSelectedId(null);
                }}
              />
            ) : openJobs.length === 0 ? (
              <Reveal>
                <div className="surface-panel rounded-3xl px-6 py-16 text-center">
                  <Briefcase className="mx-auto mb-4 size-10 text-primary/70" />
                  <p className="text-lg font-semibold">{t("careers.empty")}</p>
                  <Button asChild className="mt-6 rounded-full" variant="outline">
                    <a href="#contact">{t("nav.contact")}</a>
                  </Button>
                </div>
              </Reveal>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {openJobs.map((job, index) => (
                  <Reveal key={job.id} delay={index * 70}>
                    <article className="surface-panel flex h-full flex-col rounded-3xl p-6 hover-lift">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span className="grid size-12 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-glow">
                          <Briefcase className="size-5" />
                        </span>
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {job.department}
                        </span>
                      </div>
                      <h2 className="font-display text-xl font-bold">{job.title}</h2>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {job.description || (lang === "ar" ? "شاغر مفتوح للتقديم." : "Open role — apply now.")}
                      </p>
                      <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-primary" />
                          {t("careers.department")}: {job.department}
                        </li>
                        <li className="flex items-center gap-2">
                          <CalendarDays className="size-3.5 text-primary" />
                          {t("careers.posted")}: {job.openedAt}
                        </li>
                        <li className="flex items-center gap-2">
                          <MapPin className="size-3.5 text-primary" />
                          {locationLabel(job.location, lang)}
                        </li>
                      </ul>
                      <Button
                        type="button"
                        className="mt-6 w-full rounded-xl bg-brand text-brand-foreground shadow-glow"
                        onClick={() => setSelectedId(job.id)}
                      >
                        {t("careers.apply")}
                        {lang === "ar" ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
                      </Button>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ApplyPanel({
  job,
  lang,
  onBack,
  onSubmit,
}: {
  job: JobOpening;
  lang: "ar" | "en";
  onBack: () => void;
  onSubmit: (data: {
    fullName: string;
    phone: string;
    email: string;
    city: string;
    nationality: string;
    address: string;
    birthDate: string;
    education: string;
    currentJob: string;
    skills: string;
    languages: string;
    experienceYears: number;
    expectedSalary: number;
    coverLetter: string;
    cvFileName: string;
    cvDataUrl: string;
    notes: string;
  }) => void;
}) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState(lang === "ar" ? "عمّان" : "Amman");
  const [nationality, setNationality] = useState(lang === "ar" ? "أردني" : "Jordanian");
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
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !email.trim() || !coverLetter.trim()) {
      toast.error(lang === "ar" ? "أكمل البيانات وخطاب التقديم" : "Fill required fields and cover letter");
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
    setSaving(true);
    onSubmit({
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
      notes: lang === "ar" ? "تقديم عبر الموقع الرئيسي" : "Submitted via public website",
    });
    setSaving(false);
  }

  return (
    <Reveal>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="surface-panel h-fit rounded-3xl p-6 lg:sticky lg:top-28">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            {lang === "ar" ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
            {t("careers.back")}
          </button>
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{t("careers.details")}</p>
          <h2 className="mt-2 font-display text-2xl font-bold">
            {t("careers.applyFor")} «{job.title}»
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {job.description || (lang === "ar" ? "شاغر مفتوح للتقديم لدى توقيعي." : "Open role at Tawqi3i.")}
          </p>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              {job.department}
            </li>
            <li className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              {job.openedAt}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              {locationLabel(job.location, lang)}
            </li>
          </ul>
        </aside>

        <form onSubmit={handleSubmit} className="surface-panel space-y-4 rounded-3xl p-6 md:p-8">
          <h3 className="font-display text-xl font-bold">{t("careers.formTitle")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={lang === "ar" ? "الاسم الكامل *" : "Full name *"}>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="rounded-xl" />
            </Field>
            <Field label={lang === "ar" ? "الجنسية" : "Nationality"}>
              <Input value={nationality} onChange={(e) => setNationality(e.target.value)} className="rounded-xl" />
            </Field>
            <Field label={lang === "ar" ? "الهاتف *" : "Phone *"}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required className="rounded-xl" dir="ltr" />
            </Field>
            <Field label="Email *">
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
            <Field label={lang === "ar" ? "الراتب المتوقع (JOD)" : "Expected salary (JOD)"}>
              <Input type="number" min={0} value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} className="rounded-xl" dir="ltr" />
            </Field>
          </div>
          <Field label={lang === "ar" ? "المهارات" : "Skills"}>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} className="rounded-xl" />
          </Field>
          <Field label={lang === "ar" ? "اللغات *" : "Languages *"}>
            <LanguageSelectField value={languageIds} onChange={setLanguageIds} lang={lang} />
          </Field>
          <Field label={`${t("careers.coverLetter")} *`}>
            <Textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              required
              className="min-h-28 rounded-xl"
            />
          </Field>
          <Field label={`${t("careers.cv")} *`}>
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
          <Button
            type="submit"
            disabled={saving}
            className={cn("w-full rounded-xl bg-brand text-brand-foreground shadow-glow", saving && "opacity-70")}
          >
            <Send className="size-4" />
            {t("careers.submit")}
          </Button>
        </form>
      </div>
    </Reveal>
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
