import { useCallback, useEffect, useState } from "react";

import { logActivity } from "./activity-log";

export type JobOpeningStatus = "open" | "closed" | "on_hold";
export type ApplicationStage =
  | "new"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export type JobOpening = {
  id: string;
  title: string;
  department: string;
  description: string;
  /** Job work location id from JOB_LOCATIONS */
  location: string;
  owner: string;
  status: JobOpeningStatus;
  openedAt: string;
  createdAt: string;
};

export const JOB_LOCATIONS = [
  { id: "amman", ar: "عمّان", en: "Amman" },
  { id: "irbid", ar: "إربد", en: "Irbid" },
  { id: "zarqa", ar: "الزرقاء", en: "Zarqa" },
  { id: "aqaba", ar: "العقبة", en: "Aqaba" },
  { id: "salt", ar: "السلط", en: "Salt" },
  { id: "madaba", ar: "مادبا", en: "Madaba" },
  { id: "karak", ar: "الكرك", en: "Karak" },
  { id: "ajloun", ar: "عجلون", en: "Ajloun" },
  { id: "jerash", ar: "جرش", en: "Jerash" },
  { id: "maan", ar: "معان", en: "Ma'an" },
  { id: "tafilah", ar: "الطفيلة", en: "Tafilah" },
  { id: "mafraq", ar: "المفرق", en: "Mafraq" },
  { id: "remote", ar: "عن بُعد", en: "Remote" },
  { id: "hybrid", ar: "هجين (مكتب + عن بُعد)", en: "Hybrid (office + remote)" },
] as const;

function normalizeOpeningStatus(status: unknown): JobOpeningStatus {
  if (status === "open" || status === "closed" || status === "on_hold") return status;
  return "open";
}

export function normalizeOpening(raw: Partial<JobOpening> & { id?: string }): JobOpening {
  const locationId =
    JOB_LOCATIONS.some((l) => l.id === raw.location) ? (raw.location as string) : "amman";
  return {
    id: raw.id ?? uid("job"),
    title: raw.title ?? "",
    department: raw.department ?? "",
    description: raw.description ?? "",
    location: locationId,
    owner: raw.owner ?? "",
    status: normalizeOpeningStatus(raw.status),
    openedAt: raw.openedAt ?? todayDate(),
    createdAt: raw.createdAt ?? nowIso(),
  };
}

export function locationLabel(locationId: string, lang: "ar" | "en") {
  const row = JOB_LOCATIONS.find((l) => l.id === locationId);
  if (!row) return locationId || (lang === "ar" ? "غير محدد" : "Unspecified");
  return lang === "ar" ? row.ar : row.en;
}

export type JobApplication = {
  id: string;
  openingId: string;
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
  /** Language option ids joined by comma, e.g. "ar,en" */
  languages: string;
  experienceYears: number;
  expectedSalary: number;
  /** نص طلب التوظيف / خطاب التقديم */
  coverLetter: string;
  /** Legacy text CV (seed / old data) */
  cvText: string;
  /** Uploaded CV file name */
  cvFileName: string;
  /** Uploaded CV as data URL */
  cvDataUrl: string;
  notes: string;
  stage: ApplicationStage;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  decisionNote?: string;
};

export type NewApplicationInput = {
  openingId: string;
  fullName: string;
  phone: string;
  email: string;
  city?: string;
  nationality?: string;
  address?: string;
  birthDate?: string;
  education?: string;
  currentJob?: string;
  skills?: string;
  languages?: string;
  experienceYears: number;
  expectedSalary: number;
  coverLetter?: string;
  cvText?: string;
  cvFileName?: string;
  cvDataUrl?: string;
  notes?: string;
};

export const LANGUAGE_OPTIONS = [
  { id: "ar", ar: "العربية", en: "Arabic" },
  { id: "en", ar: "الإنجليزية", en: "English" },
  { id: "fr", ar: "الفرنسية", en: "French" },
  { id: "de", ar: "الألمانية", en: "German" },
  { id: "tr", ar: "التركية", en: "Turkish" },
  { id: "es", ar: "الإسبانية", en: "Spanish" },
  { id: "ru", ar: "الروسية", en: "Russian" },
  { id: "it", ar: "الإيطالية", en: "Italian" },
  { id: "zh", ar: "الصينية", en: "Chinese" },
  { id: "hi", ar: "الهندية", en: "Hindi" },
] as const;

export type LanguageId = (typeof LANGUAGE_OPTIONS)[number]["id"];

const CV_MAX_BYTES = 1.5 * 1024 * 1024;
const CV_ACCEPT =
  ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export function cvAcceptAttr() {
  return CV_ACCEPT;
}

export function parseLanguageIds(raw: string): string[] {
  if (!raw.trim()) return [];
  const parts = raw
    .split(/[,،]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const ids: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    const match =
      LANGUAGE_OPTIONS.find((o) => o.id === lower || o.id === part) ||
      LANGUAGE_OPTIONS.find((o) => o.ar === part || part.includes(o.ar)) ||
      LANGUAGE_OPTIONS.find((o) => lower.includes(o.en.toLowerCase()) || o.en.toLowerCase() === lower);
    if (match && !ids.includes(match.id)) ids.push(match.id);
  }
  return ids;
}

export function serializeLanguages(ids: string[]): string {
  return [...new Set(ids.filter((id) => LANGUAGE_OPTIONS.some((o) => o.id === id)))].join(",");
}

export function formatLanguages(raw: string, lang: "ar" | "en"): string {
  const ids = parseLanguageIds(raw);
  if (ids.length === 0) return raw.trim() || "—";
  return ids
    .map((id) => {
      const opt = LANGUAGE_OPTIONS.find((o) => o.id === id);
      return opt ? (lang === "ar" ? opt.ar : opt.en) : id;
    })
    .join(lang === "ar" ? "، " : ", ");
}

export function textToCvDataUrl(text: string): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
}

export async function readCvFile(file: File): Promise<{ fileName: string; dataUrl: string }> {
  if (file.size > CV_MAX_BYTES) {
    throw new Error("CV_TOO_LARGE");
  }
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "",
  ];
  const okExt = /\.(pdf|doc|docx|txt)$/i.test(file.name);
  if (!okExt && file.type && !allowed.includes(file.type)) {
    throw new Error("CV_INVALID_TYPE");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("CV_READ_FAILED"));
    reader.readAsDataURL(file);
  });
  return { fileName: file.name, dataUrl };
}

export function hasCvFile(app: Pick<JobApplication, "cvDataUrl" | "cvText" | "cvFileName">) {
  return Boolean(app.cvDataUrl?.trim() || app.cvText?.trim());
}

type Store = {
  openings: JobOpening[];
  applications: JobApplication[];
};

const STORAGE_KEY = "tawqi3i.recruitment.v2";
const LEGACY_KEY = "tawqi3i.recruitment.v1";

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function todayDate() {
  return nowIso().slice(0, 10);
}

export function normalizeApplication(raw: Partial<JobApplication> & { id?: string }): JobApplication {
  const cvText = raw.cvText ?? "";
  let cvFileName = raw.cvFileName ?? "";
  let cvDataUrl = raw.cvDataUrl ?? "";
  if (!cvDataUrl && cvText.trim()) {
    cvDataUrl = textToCvDataUrl(cvText);
    if (!cvFileName) cvFileName = `${(raw.fullName || "cv").trim() || "cv"}.txt`;
  }
  return {
    id: raw.id ?? uid("app"),
    openingId: raw.openingId ?? "",
    fullName: raw.fullName ?? "",
    phone: raw.phone ?? "",
    email: raw.email ?? "",
    city: raw.city ?? "",
    nationality: raw.nationality ?? "أردني",
    address: raw.address ?? "",
    birthDate: raw.birthDate ?? "",
    education: raw.education ?? "",
    currentJob: raw.currentJob ?? "",
    skills: raw.skills ?? "",
    languages: serializeLanguages(parseLanguageIds(raw.languages ?? "")),
    experienceYears: typeof raw.experienceYears === "number" ? raw.experienceYears : 0,
    expectedSalary: typeof raw.expectedSalary === "number" ? raw.expectedSalary : 0,
    coverLetter: raw.coverLetter ?? "",
    cvText,
    cvFileName,
    cvDataUrl,
    notes: raw.notes ?? "",
    stage: raw.stage ?? "new",
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
    ...(raw.decidedAt ? { decidedAt: raw.decidedAt } : {}),
    ...(raw.decisionNote ? { decisionNote: raw.decisionNote } : {}),
  };
}

function seed(): Store {
  const openings: JobOpening[] = [
    {
      id: "job-fullstack",
      title: "مطور Full Stack",
      department: "التقنية",
      description: "تطوير واجهات وأنظمة توقيعي.",
      location: "amman",
      owner: "Raed Abu Sanad",
      status: "open",
      openedAt: "2026-07-10",
      createdAt: "2026-07-10T10:00:00.000Z",
    },
    {
      id: "job-hr",
      title: "أخصائي موارد بشرية",
      department: "الموارد البشرية",
      description: "إدارة التوظيف والحضور والإجازات.",
      location: "amman",
      owner: "ليلى العمري",
      status: "open",
      openedAt: "2026-07-22",
      createdAt: "2026-07-22T10:00:00.000Z",
    },
    {
      id: "job-finance",
      title: "محاسب مالي",
      department: "المالية",
      description: "محاسبة وفواتير وتقارير.",
      location: "amman",
      owner: "عمر الخطيب",
      status: "open",
      openedAt: "2026-06-30",
      createdAt: "2026-06-30T10:00:00.000Z",
    },
  ];

  const applications: JobApplication[] = [
    normalizeApplication({
      id: "app-1",
      openingId: "job-fullstack",
      fullName: "أحمد منصور",
      phone: "+962 7 9555 1001",
      email: "ahmad.m@example.com",
      city: "عمّان",
      nationality: "أردني",
      address: "خلدا، عمّان",
      birthDate: "1996-04-12",
      education: "بكالوريوس علوم حاسوب — الجامعة الأردنية",
      currentJob: "مطور Front-end في شركة محلية",
      skills: "React, TypeScript, Node.js, PostgreSQL, Git",
      languages: "ar,en",
      experienceYears: 4,
      expectedSalary: 1800,
      notes: "متاح للبدء خلال أسبوعين",
      coverLetter:
        "أتقدم لشاغر مطور Full Stack لدى توقيعي لشغفي ببناء أنظمة موثوقة تخدم المستخدم العربي. لدي خبرة في تطوير واجهات سريعة وتكامل APIs، وأرغب بالمساهمة في منتج التوقيع الإلكتروني.",
      cvFileName: "ahmad-mansour-cv.txt",
      cvText: `أحمد منصور
مطور Full Stack
عمّان، الأردن | ahmad.m@example.com | +962 7 9555 1001

الملخص
مطور بخبرة 4 سنوات في بناء تطبيقات ويب حديثة باستخدام React و Node.js، مع تركيز على الجودة وتجربة المستخدم.

الخبرات
• 2023–الآن: مطور Front-end — تطوير لوحات تحكم وواجهات عملاء
• 2021–2023: مطور ويب — صيانة أنظمة داخلية وتكامل REST APIs

التعليم
• بكالوريوس علوم حاسوب — الجامعة الأردنية (2019)

المهارات
React · TypeScript · Node.js · PostgreSQL · Tailwind · Git`,
      stage: "interview",
      createdAt: "2026-08-01T09:00:00.000Z",
      updatedAt: "2026-08-05T11:00:00.000Z",
    }),
    normalizeApplication({
      id: "app-2",
      openingId: "job-hr",
      fullName: "سارة الخطيب",
      phone: "+962 7 9555 1002",
      email: "sara.k@example.com",
      city: "إربد",
      nationality: "أردني",
      address: "إربد، حي الجامعة",
      birthDate: "1998-09-03",
      education: "بكالوريوس إدارة أعمال — جامعة اليرموك",
      currentJob: "منسقة موارد بشرية",
      skills: "توظيف، مقابلات، أنظمة HR، Excel",
      languages: "ar,en",
      experienceYears: 3,
      expectedSalary: 1200,
      notes: "خبرة أنظمة HR",
      coverLetter:
        "أرغب بالانضمام لفريق الموارد البشرية في توقيعي للمساهمة في التوظيف وإدارة دورة حياة الموظف باحترافية.",
      cvFileName: "sara-alkhatib-cv.txt",
      cvText: `سارة الخطيب
أخصائية موارد بشرية
إربد | sara.k@example.com | +962 7 9555 1002

الخبرات
• 3 سنوات في التوظيف والفرز والمقابلات
• إعداد عروض وظيفية ومتابعة المرشحين

التعليم
• بكالوريوس إدارة أعمال — جامعة اليرموك

المهارات
توظيف · مقابلات · Excel · أنظمة HR`,
      stage: "screening",
      createdAt: "2026-08-03T12:00:00.000Z",
      updatedAt: "2026-08-03T12:00:00.000Z",
    }),
    normalizeApplication({
      id: "app-3",
      openingId: "job-finance",
      fullName: "خالد نمر",
      phone: "+962 7 9555 1003",
      email: "khaled.n@example.com",
      city: "عمّان",
      nationality: "أردني",
      address: "الجبيهة، عمّان",
      birthDate: "1992-01-20",
      education: "بكالوريوس محاسبة — الجامعة الهاشمية",
      currentJob: "محاسب أول",
      skills: "محاسبة مالية، فواتير، تقارير، Excel متقدم",
      languages: "ar,en",
      experienceYears: 6,
      expectedSalary: 1600,
      notes: "CPA جزئي",
      coverLetter:
        "أتقدم لوظيفة محاسب مالي لما لدي من خبرة في الفواتير والتقارير المالية والالتزام بالمعايير.",
      cvFileName: "khaled-nimr-cv.txt",
      cvText: `خالد نمر
محاسب مالي
عمّان | khaled.n@example.com | +962 7 9555 1003

الخبرات
• 6 سنوات في المحاسبة المالية والفواتير
• إعداد تقارير شهرية ومتابعة التحصيل

التعليم
• بكالوريوس محاسبة — الجامعة الهاشمية
• CPA جزئي

المهارات
محاسبة · Excel · تقارير مالية · فواتير`,
      stage: "offer",
      createdAt: "2026-07-20T08:00:00.000Z",
      updatedAt: "2026-08-02T15:00:00.000Z",
    }),
  ];

  return { openings, applications };
}

function readStore(): Store {
  if (typeof window === "undefined") return seed();
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<Store>;
    const openings = Array.isArray(parsed.openings)
      ? parsed.openings.map((o) => normalizeOpening(o))
      : seed().openings;
    const applications = Array.isArray(parsed.applications)
      ? parsed.applications.map((a) => normalizeApplication(a))
      : seed().applications;
    return { openings, applications };
  } catch {
    return seed();
  }
}

const EVENT_NAME = "tawqi3i-recruitment";

function persist(data: Store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.localStorage.removeItem(LEGACY_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/** Write-through mutations — avoids stale multi-hook races overwriting status. */
function writeStore(updater: (prev: Store) => Store): Store {
  const prev = readStore();
  const next = updater(prev);
  persist(next);
  return next;
}

export const APPLICATION_STAGES: Array<{
  id: ApplicationStage;
  ar: string;
  en: string;
}> = [
  { id: "new", ar: "جديد", en: "New" },
  { id: "screening", ar: "فرز", en: "Screening" },
  { id: "interview", ar: "مقابلة", en: "Interview" },
  { id: "offer", ar: "عرض وظيفي", en: "Offer" },
  { id: "hired", ar: "مقبول", en: "Hired" },
  { id: "rejected", ar: "مرفوض", en: "Rejected" },
];

export function stageLabel(stage: ApplicationStage, lang: "ar" | "en") {
  const row = APPLICATION_STAGES.find((s) => s.id === stage);
  return row ? (lang === "ar" ? row.ar : row.en) : stage;
}

export function stageTone(
  stage: ApplicationStage,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (stage === "hired") return "success";
  if (stage === "rejected") return "danger";
  if (stage === "offer" || stage === "interview") return "info";
  if (stage === "screening" || stage === "new") return "warning";
  return "neutral";
}

export function openingStatusLabel(status: JobOpeningStatus, lang: "ar" | "en") {
  if (status === "open") return lang === "ar" ? "مفتوح" : "Open";
  if (status === "closed") return lang === "ar" ? "مغلق" : "Closed";
  return lang === "ar" ? "معلّق" : "On hold";
}

export function useRecruitment() {
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = readStore();
      setOpenings(next.openings);
      setApplications(next.applications);
    };
    sync();
    setHydrated(true);
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const addOpening = useCallback(
    (input: {
      title: string;
      department: string;
      description?: string;
      location: string;
      owner: string;
    }) => {
      const next = normalizeOpening({
        id: uid("job"),
        title: input.title.trim(),
        department: input.department.trim(),
        description: input.description?.trim() || "",
        location: input.location,
        owner: input.owner.trim(),
        status: "open",
        openedAt: todayDate(),
        createdAt: nowIso(),
      });
      writeStore((prev) => ({ openings: [next, ...prev.openings], applications: prev.applications }));
      logActivity({
        module: "recruitment",
        action: "إضافة شاغر",
        actionEn: "Job opening created",
        entity: "توظيف",
        entityEn: "Recruitment",
        details: next.title,
        detailsEn: next.title,
      });
      return next;
    },
    [],
  );

  const updateOpening = useCallback((id: string, patch: Partial<Omit<JobOpening, "id" | "createdAt">>) => {
    writeStore((prev) => ({
      openings: prev.openings.map((o) =>
        o.id === id ? normalizeOpening({ ...o, ...patch }) : o,
      ),
      applications: prev.applications,
    }));
  }, []);

  const addApplication = useCallback((input: NewApplicationInput) => {
    const next = normalizeApplication({
      id: uid("app"),
      openingId: input.openingId,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      city: input.city?.trim() || "",
      nationality: input.nationality?.trim() || "أردني",
      address: input.address?.trim() || "",
      birthDate: input.birthDate?.trim() || "",
      education: input.education?.trim() || "",
      currentJob: input.currentJob?.trim() || "",
      skills: input.skills?.trim() || "",
      languages: serializeLanguages(parseLanguageIds(input.languages || "")),
      experienceYears: input.experienceYears,
      expectedSalary: input.expectedSalary,
      coverLetter: input.coverLetter?.trim() || "",
      cvText: input.cvText?.trim() || "",
      cvFileName: input.cvFileName?.trim() || "",
      cvDataUrl: input.cvDataUrl?.trim() || "",
      notes: input.notes?.trim() || "",
      stage: "new",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    writeStore((prev) => ({
      openings: prev.openings,
      applications: [next, ...prev.applications],
    }));
    logActivity({
      module: "recruitment",
      action: "طلب توظيف جديد",
      actionEn: "Job application submitted",
      entity: "توظيف",
      entityEn: "Recruitment",
      details: next.fullName,
      detailsEn: next.fullName,
    });
    return next;
  }, []);

  const setApplicationStage = useCallback(
    (id: string, stage: ApplicationStage, decisionNote?: string) => {
      writeStore((prev) => ({
        openings: prev.openings,
        applications: prev.applications.map((a) => {
          if (a.id !== id) return a;
          const isFinal = stage === "hired" || stage === "rejected";
          const note = decisionNote?.trim() || a.decisionNote || "";
          const next = normalizeApplication({
            ...a,
            stage,
            updatedAt: nowIso(),
            decisionNote: note,
          });
          if (isFinal) {
            next.decidedAt = nowIso();
          } else {
            delete next.decidedAt;
          }
          return next;
        }),
      }));
      logActivity({
        module: "recruitment",
        action: "تحديث مرحلة متقدم",
        actionEn: "Application stage updated",
        entity: "توظيف",
        entityEn: "Recruitment",
        details: `${id} → ${stage}`,
        detailsEn: `${id} → ${stage}`,
      });
    },
    [],
  );

  const deleteApplication = useCallback((id: string) => {
    let name = id;
    writeStore((prev) => {
      const target = prev.applications.find((a) => a.id === id);
      if (target) name = target.fullName;
      return {
        openings: prev.openings,
        applications: prev.applications.filter((a) => a.id !== id),
      };
    });
    logActivity({
      module: "recruitment",
      action: "حذف طلب توظيف",
      actionEn: "Job application deleted",
      entity: "توظيف",
      entityEn: "Recruitment",
      details: name,
      detailsEn: name,
    });
  }, []);

  const updateApplication = useCallback(
    (id: string, patch: Partial<Omit<JobApplication, "id" | "createdAt">>) => {
      let name = id;
      writeStore((prev) => ({
        openings: prev.openings,
        applications: prev.applications.map((a) => {
          if (a.id !== id) return a;
          name = patch.fullName?.trim() || a.fullName;
          return normalizeApplication({
            ...a,
            ...patch,
            fullName: patch.fullName !== undefined ? patch.fullName.trim() : a.fullName,
            phone: patch.phone !== undefined ? patch.phone.trim() : a.phone,
            email: patch.email !== undefined ? patch.email.trim() : a.email,
            city: patch.city !== undefined ? patch.city.trim() : a.city,
            nationality: patch.nationality !== undefined ? patch.nationality.trim() : a.nationality,
            address: patch.address !== undefined ? patch.address.trim() : a.address,
            birthDate: patch.birthDate !== undefined ? patch.birthDate.trim() : a.birthDate,
            education: patch.education !== undefined ? patch.education.trim() : a.education,
            currentJob: patch.currentJob !== undefined ? patch.currentJob.trim() : a.currentJob,
            skills: patch.skills !== undefined ? patch.skills.trim() : a.skills,
            languages:
              patch.languages !== undefined
                ? serializeLanguages(parseLanguageIds(patch.languages))
                : a.languages,
            coverLetter: patch.coverLetter !== undefined ? patch.coverLetter.trim() : a.coverLetter,
            cvText: patch.cvText !== undefined ? patch.cvText.trim() : a.cvText,
            cvFileName: patch.cvFileName !== undefined ? patch.cvFileName.trim() : a.cvFileName,
            cvDataUrl: patch.cvDataUrl !== undefined ? patch.cvDataUrl.trim() : a.cvDataUrl,
            notes: patch.notes !== undefined ? patch.notes.trim() : a.notes,
            updatedAt: nowIso(),
          });
        }),
      }));
      logActivity({
        module: "recruitment",
        action: "تعديل طلب توظيف",
        actionEn: "Job application updated",
        entity: "توظيف",
        entityEn: "Recruitment",
        details: name,
        detailsEn: name,
      });
    },
    [],
  );

  const getOpening = useCallback((id: string) => openings.find((o) => o.id === id), [openings]);
  const getApplication = useCallback(
    (id: string) => applications.find((a) => a.id === id),
    [applications],
  );

  return {
    openings,
    applications,
    hydrated,
    addOpening,
    updateOpening,
    addApplication,
    setApplicationStage,
    updateApplication,
    deleteApplication,
    getOpening,
    getApplication,
  };
}
