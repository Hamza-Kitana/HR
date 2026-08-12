import { useCallback, useEffect, useState } from "react";

import { logActivity } from "./activity-log";
import { loadStaffSnapshot, type StaffRecord } from "./staff";

export type ContractStatus = "active" | "renewal" | "ended";
export type ContractType = "full_time" | "part_time" | "probation" | "consultant";

export type EmploymentContract = {
  id: string;
  employeeId: string;
  title: string;
  type: ContractType;
  startDate: string;
  endDate: string;
  salary: number;
  status: ContractStatus;
  workHours: number;
  probationMonths: number;
  noticeDays: number;
  /** Full contract text */
  body: string;
  signedAt: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "tawqi3i.contracts.v1";

function uid() {
  return `ct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function contractTypeLabel(type: ContractType, lang: "ar" | "en" = "ar") {
  const map: Record<ContractType, { ar: string; en: string }> = {
    full_time: { ar: "دوام كامل", en: "Full time" },
    part_time: { ar: "دوام جزئي", en: "Part time" },
    probation: { ar: "تجريبي", en: "Probation" },
    consultant: { ar: "استشاري", en: "Consultant" },
  };
  return lang === "ar" ? map[type].ar : map[type].en;
}

export function contractStatusLabel(status: ContractStatus, lang: "ar" | "en" = "ar") {
  if (status === "active") return lang === "ar" ? "ساري" : "Active";
  if (status === "renewal") return lang === "ar" ? "بحاجة تجديد" : "Needs renewal";
  return lang === "ar" ? "منتهٍ" : "Ended";
}

export function contractStatusTone(status: ContractStatus): "success" | "warning" | "neutral" {
  if (status === "active") return "success";
  if (status === "renewal") return "warning";
  return "neutral";
}

export function buildDemoContractBody(employee: StaffRecord, input: {
  type: ContractType;
  startDate: string;
  endDate: string;
  salary: number;
  workHours: number;
  probationMonths: number;
  noticeDays: number;
}) {
  const typeAr = contractTypeLabel(input.type, "ar");
  const endLabel = input.endDate || "غير محدد (مفتوح)";
  return `عقد عمل فردي
شركة توقيعي لتقنية المعلومات ذ.م.م — عمّان، المملكة الأردنية الهاشمية

الطرف الأول: شركة توقيعي (صاحب العمل)
الطرف الثاني: ${employee.full_name} — الرقم/الهوية: ${employee.national_id}
الجنسية: ${employee.nationality} | العنوان: ${employee.address}
البريد: ${employee.email} | الهاتف: ${employee.phone}

المادة (1) — موضوع العقد
يتعهد الطرف الثاني بالعمل لدى الطرف الأول بوظيفة «${employee.job_title}» ضمن قسم «${employee.department}» وفق تعليمات الإدارة والأنظمة المعمول بها.

المادة (2) — نوع العقد ومدته
نوع العقد: ${typeAr}
تاريخ البدء: ${input.startDate}
تاريخ الانتهاء: ${endLabel}
ساعات العمل اليومية المتفق عليها: ${input.workHours} ساعة
فترة التجربة: ${input.probationMonths} شهر/أشهر (إن وجدت)

المادة (3) — الأجر والمزايا
يتقاضى الطرف الثاني راتبًا أساسيًا شهريًا قدره (${input.salary.toLocaleString("en-GB")} دينار أردني) يُدفع في نهاية كل شهر ميلادي، مع أي بدلات تقررها الشركة وفق السياسات الداخلية.

المادة (4) — الواجبات
يلتزم الطرف الثاني بأداء مهامه بأمانة، والمحافظة على سرية معلومات الشركة وبيانات العملاء، والالتزام بسياسات التوقيع الإلكتروني وأمن المعلومات المعتمدة لدى توقيعي.

المادة (5) — الإجازات والدوام
تخضع الإجازات والدوام والحضور لأنظمة الشركة وقانون العمل الأردني، ويتم تسجيل الحضور عبر نظام الشركة.

المادة (6) — إنهاء العقد
يجوز لأي من الطرفين إنهاء العقد وفق القانون، مع مراعاة مدة إشعار قدرها (${input.noticeDays}) يومًا، ما لم يُنص على خلاف ذلك نظامًا.

المادة (7) — القانون الواجب التطبيق
يخضع هذا العقد لأحكام قانون العمل الأردني والأنظمة الصادرة بموجبه، وتكون محاكم عمّان مختصة بالنظر في أي نزاع.

المادة (8) — الإقرار
بتوقيع هذا العقد يقر الطرفان بأنهما اطلعا على جميع بنوده ووافقا عليها بكامل الأهلية.

حرر في عمّان بتاريخ ${input.startDate}

التوقيع الإلكتروني للطرف الأول: ________________
التوقيع الإلكتروني للطرف الثاني: ${employee.full_name}
`;
}

function normalizeContract(raw: Partial<EmploymentContract>): EmploymentContract {
  return {
    id: raw.id ?? uid(),
    employeeId: raw.employeeId ?? "",
    title: raw.title ?? "عقد عمل",
    type: raw.type ?? "full_time",
    startDate: raw.startDate ?? "",
    endDate: raw.endDate ?? "",
    salary: typeof raw.salary === "number" ? raw.salary : 0,
    status: raw.status ?? "active",
    workHours: typeof raw.workHours === "number" ? raw.workHours : 8,
    probationMonths: typeof raw.probationMonths === "number" ? raw.probationMonths : 3,
    noticeDays: typeof raw.noticeDays === "number" ? raw.noticeDays : 30,
    body: raw.body ?? "",
    signedAt: raw.signedAt ?? "",
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
  };
}

function seedContracts(): EmploymentContract[] {
  const staff = typeof window !== "undefined" ? loadStaffSnapshot() : [];
  const byUser = new Map(staff.map((s) => [s.username, s]));

  const demos: Array<{
    username: string;
    type: ContractType;
    start: string;
    end: string;
    status: ContractStatus;
    probation: number;
  }> = [
    { username: "layla", type: "full_time", start: "2022-03-15", end: "", status: "active", probation: 3 },
    { username: "omar", type: "full_time", start: "2022-06-01", end: "2027-06-01", status: "active", probation: 3 },
    { username: "nour", type: "probation", start: "2023-09-10", end: "2026-09-10", status: "renewal", probation: 6 },
    { username: "yazan", type: "full_time", start: "2024-01-20", end: "", status: "active", probation: 3 },
    { username: "raed", type: "full_time", start: "2021-02-01", end: "", status: "active", probation: 3 },
    { username: "sami", type: "full_time", start: "2021-01-04", end: "", status: "active", probation: 0 },
  ];

  return demos
    .map((d) => {
      const emp = byUser.get(d.username);
      if (!emp) return null;
      const input = {
        type: d.type,
        startDate: d.start,
        endDate: d.end,
        salary: emp.salary,
        workHours: emp.workHours || 8,
        probationMonths: d.probation,
        noticeDays: 30,
      };
      return normalizeContract({
        id: `ct-seed-${d.username}`,
        employeeId: emp.id,
        title: `عقد عمل — ${emp.full_name}`,
        type: d.type,
        startDate: d.start,
        endDate: d.end,
        salary: emp.salary,
        status: d.status,
        workHours: input.workHours,
        probationMonths: d.probation,
        noticeDays: 30,
        body: buildDemoContractBody(emp, input),
        signedAt: d.start,
        createdAt: `${d.start}T10:00:00.000Z`,
        updatedAt: `${d.start}T10:00:00.000Z`,
      });
    })
    .filter(Boolean) as EmploymentContract[];
}

function readContracts(): EmploymentContract[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedContracts();
    const parsed = JSON.parse(raw) as Partial<EmploymentContract>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedContracts();
    return parsed.map((c) => normalizeContract(c));
  } catch {
    return seedContracts();
  }
}

function persist(list: EmploymentContract[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("tawqi3i-contracts"));
}

export function contractsForEmployee(contracts: EmploymentContract[], employeeId: string) {
  return contracts
    .filter((c) => c.employeeId === employeeId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function activeContractFor(contracts: EmploymentContract[], employeeId: string) {
  const list = contractsForEmployee(contracts, employeeId);
  return list.find((c) => c.status === "active") ?? list[0];
}

export function useContracts() {
  const [contracts, setContracts] = useState<EmploymentContract[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setContracts(readContracts());
    setHydrated(true);
    const refresh = () => setContracts(readContracts());
    window.addEventListener("tawqi3i-contracts", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("tawqi3i-contracts", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(contracts);
  }, [contracts, hydrated]);

  const upsertContract = useCallback(
    (
      employee: StaffRecord,
      input: {
        id?: string;
        title?: string;
        type: ContractType;
        startDate: string;
        endDate?: string;
        salary: number;
        status?: ContractStatus;
        workHours?: number;
        probationMonths?: number;
        noticeDays?: number;
        body?: string;
        signedAt?: string;
      },
    ) => {
      const workHours = input.workHours ?? employee.workHours ?? 8;
      const probationMonths = input.probationMonths ?? 3;
      const noticeDays = input.noticeDays ?? 30;
      const endDate = input.endDate ?? "";
      const body =
        input.body?.trim() ||
        buildDemoContractBody(employee, {
          type: input.type,
          startDate: input.startDate,
          endDate,
          salary: input.salary,
          workHours,
          probationMonths,
          noticeDays,
        });

      const existingId = input.id;
      const next = normalizeContract({
        id: existingId ?? uid(),
        employeeId: employee.id,
        title: input.title?.trim() || `عقد عمل — ${employee.full_name}`,
        type: input.type,
        startDate: input.startDate,
        endDate,
        salary: input.salary,
        status: input.status ?? "active",
        workHours,
        probationMonths,
        noticeDays,
        body,
        signedAt: input.signedAt ?? input.startDate,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });

      setContracts((prev) => {
        const existing = existingId ? prev.find((c) => c.id === existingId) : undefined;
        const merged = existing
          ? normalizeContract({
              ...next,
              id: existing.id,
              createdAt: existing.createdAt,
              status: input.status ?? existing.status,
              signedAt: input.signedAt ?? existing.signedAt ?? input.startDate,
            })
          : next;
        const without = existing ? prev.filter((c) => c.id !== existing.id) : prev;
        return [merged, ...without];
      });

      logActivity({
        module: "system",
        action: "تحديث عقد عمل",
        actionEn: "Employment contract updated",
        entity: "عقود",
        entityEn: "Contracts",
        details: `${employee.full_name} · ${input.startDate}`,
        detailsEn: `${employee.full_name} · ${input.startDate}`,
      });

      return next;
    },
    [],
  );

  const deleteContract = useCallback((id: string) => {
    setContracts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { contracts, upsertContract, deleteContract, hydrated };
}
