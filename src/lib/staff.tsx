import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { logActivity } from "./activity-log";
import { MOCK_USERS, permissionsForRole, type MockUser } from "./mock-users";
import { migrateRoles, PERMISSIONS, sortRoles, type AppPermission, type AppRole } from "./permissions";
import { DEFAULT_WORK_DAYS, getShift, hoursBetween, isValidShiftId, isValidTime, type ShiftId } from "./shifts";

export const JORDANIAN_NATIONALITY = "أردني";

export const NATIONALITY_OPTIONS = [
  "أردني",
  "فلسطيني",
  "سوري",
  "مصري",
  "عراقي",
  "لبناني",
  "سعودي",
  "إماراتي",
  "كويتي",
  "قطري",
  "بحريني",
  "يمني",
  "أخرى",
] as const;

export function isJordanianNationality(nationality: string | undefined | null): boolean {
  const n = (nationality ?? "").trim().toLowerCase();
  return n === "jo" || n === "jordan" || n === "jordanian" || n === "أردني" || n === "اردني";
}

export function idDocumentLabel(nationality: string | undefined | null, lang: "ar" | "en" = "ar"): string {
  if (isJordanianNationality(nationality)) {
    return lang === "ar" ? "الرقم الوطني" : "National ID";
  }
  return lang === "ar" ? "رقم الجواز" : "Passport number";
}

export type StaffRecord = Omit<MockUser, "role" | "roles"> & {
  /** Primary role (first selected) — kept for compatibility */
  role: AppRole;
  /** All assigned granular roles (supports multiple) */
  roles: AppRole[];
  salary: number;
  is_active: boolean;
  address: string;
  /** أردني / country name */
  nationality: string;
  /** National ID if Jordanian, passport number otherwise */
  national_id: string;
  notes: string;
  /** Weekdays they work — JS getDay() 0=Sun … 6=Sat */
  workDays: number[];
  /** Assigned shift template (legacy / quick preset) */
  shiftId: ShiftId;
  /** Custom daily start — "HH:MM" */
  workStart: string;
  /** Custom daily end — "HH:MM" */
  workEnd: string;
  /** Expected daily hours (from start→end) */
  workHours: number;
  /** Profile photo as data URL or remote URL */
  avatarUrl: string;
  /** true = grant extra, false = revoke from role defaults */
  permissionOverrides: Partial<Record<AppPermission, boolean>>;
};

export type NewStaffInput = {
  username: string;
  code: string;
  full_name: string;
  email: string;
  job_title: string;
  department: string;
  phone: string;
  hire_date: string;
  salary: number;
  address: string;
  nationality: string;
  national_id: string;
  notes?: string;
  avatarUrl?: string;
  roles: AppRole[];
  workDays?: number[];
  /** Required: from–to work window */
  workStart: string;
  workEnd: string;
  shiftId?: ShiftId;
  workHours?: number;
};

type StaffContextValue = {
  staff: StaffRecord[];
  getStaff: (id: string) => StaffRecord | undefined;
  getByUsername: (username: string) => StaffRecord | undefined;
  addStaff: (input: NewStaffInput) => { ok: true; employee: StaffRecord } | { ok: false; error: string };
  updateStaff: (id: string, patch: Partial<StaffRecord>) => void;
  deleteStaff: (id: string) => { ok: true } | { ok: false; error: string };
  toggleRole: (id: string, role: AppRole) => void;
  setRoles: (id: string, roles: AppRole[]) => void;
  setPermissionOverride: (id: string, permission: AppPermission, value: boolean | null) => void;
  effectivePermissions: (person: StaffRecord) => AppPermission[];
  resetStaff: () => void;
};

const STORAGE_KEY = "tawqi3i.staff.v3";
const LEGACY_STORAGE_KEYS = ["tawqi3i.staff.v2", "tawqi3i.staff"] as const;
const StaffContext = createContext<StaffContextValue | null>(null);

const SALARIES: Record<string, number> = {
  sadmin: 0,
  sami: 4500,
  raed: 4000,
  layla: 2200,
  omar: 1900,
  nour: 1100,
  yazan: 1500,
};

const ADDRESSES: Record<string, string> = {
  sadmin: "عمّان — عبدون",
  sami: "عمّان — الدوار السابع",
  raed: "عمّان — خلدا",
  layla: "عمّان — الجبيهة",
  omar: "الزرقاء",
  nour: "عمّان — ماركا",
  yazan: "إربد",
};

const SCHEDULE_SEED: Record<
  string,
  { shiftId: ShiftId; workDays: number[]; workStart: string; workEnd: string; workHours: number }
> = {
  sadmin: { shiftId: "standard", workDays: [...DEFAULT_WORK_DAYS], workStart: "09:00", workEnd: "17:00", workHours: 8 },
  sami: { shiftId: "standard", workDays: [...DEFAULT_WORK_DAYS], workStart: "09:00", workEnd: "17:00", workHours: 8 },
  raed: { shiftId: "standard", workDays: [0, 1, 2, 3, 4], workStart: "09:00", workEnd: "17:00", workHours: 8 },
  layla: { shiftId: "morning", workDays: [0, 1, 2, 3, 4], workStart: "08:00", workEnd: "16:00", workHours: 8 },
  omar: { shiftId: "morning", workDays: [0, 1, 2, 3, 4], workStart: "08:00", workEnd: "16:00", workHours: 8 },
  nour: { shiftId: "part", workDays: [0, 1, 2, 3], workStart: "09:00", workEnd: "13:00", workHours: 4 },
  yazan: { shiftId: "evening", workDays: [0, 1, 2, 3, 4, 5], workStart: "14:00", workEnd: "22:00", workHours: 8 },
};

function normalizeWorkDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [...DEFAULT_WORK_DAYS];
  const days = raw
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return days.length ? [...new Set(days)].sort((a, b) => a - b) : [...DEFAULT_WORK_DAYS];
}

function normalizeRoles(input: unknown, fallback?: string): AppRole[] {
  return migrateRoles(input, fallback);
}

function normalizeStaff(raw: Partial<StaffRecord> & { role?: string; roles?: unknown }): StaffRecord {
  const roles = normalizeRoles(raw.roles, raw.role);
  const role = roles.includes("super_admin") ? "super_admin" : roles[0]!;
  const seed = SCHEDULE_SEED[raw.username ?? ""] ?? {
    shiftId: "morning" as ShiftId,
    workDays: [...DEFAULT_WORK_DAYS],
    workStart: "08:00",
    workEnd: "16:00",
    workHours: 8,
  };
  const shiftId = isValidShiftId(raw.shiftId ?? "") ? raw.shiftId! : seed.shiftId;
  const shift = getShift(shiftId);
  const workStart =
    raw.workStart && isValidTime(raw.workStart) ? raw.workStart : (seed.workStart ?? shift.start);
  const workEnd = raw.workEnd && isValidTime(raw.workEnd) ? raw.workEnd : (seed.workEnd ?? shift.end);
  const fromRange = hoursBetween(workStart, workEnd);
  const workHours =
    typeof raw.workHours === "number" && !Number.isNaN(raw.workHours) && raw.workHours > 0
      ? raw.workHours
      : (fromRange ?? seed.workHours ?? shift.hours);

  return {
    id: raw.id ?? `user-${raw.username ?? "unknown"}`,
    username: raw.username ?? "unknown",
    code: raw.code ?? "1234",
    full_name: raw.full_name ?? "",
    email: raw.email ?? "",
    job_title: raw.job_title ?? "",
    department: raw.department ?? "",
    phone: raw.phone ?? "",
    hire_date: raw.hire_date ?? "",
    role,
    roles,
    salary: typeof raw.salary === "number" ? raw.salary : 1000,
    is_active: raw.is_active !== false,
    address: raw.address ?? "عمّان، الأردن",
    nationality: (raw.nationality ?? JORDANIAN_NATIONALITY).trim() || JORDANIAN_NATIONALITY,
    national_id: raw.national_id ?? "0000000000",
    notes: raw.notes ?? "",
    workDays: raw.workDays !== undefined ? normalizeWorkDays(raw.workDays) : [...seed.workDays],
    shiftId,
    workStart,
    workEnd,
    workHours,
    avatarUrl: typeof raw.avatarUrl === "string" ? raw.avatarUrl : "",
    permissionOverrides: raw.permissionOverrides ?? {},
  };
}

function seedStaff(): StaffRecord[] {
  return MOCK_USERS.map((user) =>
    normalizeStaff({
      ...user,
      roles: user.roles,
      salary: SALARIES[user.username] ?? 1000,
      is_active: true,
      address: ADDRESSES[user.username] ?? "عمّان، الأردن",
      national_id: `99${user.username.length}${user.id.replace(/\D/g, "").slice(-6).padStart(6, "0")}`,
      notes: user.roles.includes("super_admin") ? "صلاحيات كاملة على النظام" : "موظف ضمن هيكل توقيعي",
      permissionOverrides: {},
      ...SCHEDULE_SEED[user.username],
    }),
  );
}

function readStaff(): StaffRecord[] {
  if (typeof window === "undefined") return seedStaff();
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    for (const key of LEGACY_STORAGE_KEYS) {
      if (raw) break;
      raw = window.localStorage.getItem(key);
    }
    if (!raw) return seedStaff();
    const parsed = JSON.parse(raw) as Array<Partial<StaffRecord>>;
    if (!Array.isArray(parsed) || parsed.length === 0) return seedStaff();
    return parsed.map((item) => normalizeStaff(item));
  } catch {
    return seedStaff();
  }
}

export function loadStaffSnapshot() {
  return readStaff();
}

export function findStaffByUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  return readStaff().find((s) => s.username === normalized) ?? null;
}

export function staffRoles(person: StaffRecord): AppRole[] {
  return normalizeRoles(person.roles, person.role);
}

export function effectivePermissionsFor(person: StaffRecord): AppPermission[] {
  const roles = staffRoles(person);
  if (roles.includes("super_admin")) return [...PERMISSIONS];

  const set = new Set<AppPermission>();
  for (const role of roles) {
    for (const perm of permissionsForRole(role)) set.add(perm);
  }
  for (const [perm, granted] of Object.entries(person.permissionOverrides) as [AppPermission, boolean][]) {
    if (granted) set.add(perm);
    else set.delete(perm);
  }
  return [...set];
}

function persist(next: StaffRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const key of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(key);
}

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffRecord[]>(() => seedStaff());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStaff(readStaff());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(staff);
  }, [staff, hydrated]);

  const getStaff = useCallback((id: string) => staff.find((s) => s.id === id), [staff]);

  const getByUsername = useCallback(
    (username: string) => staff.find((s) => s.username === username.trim().toLowerCase()),
    [staff],
  );

  const addStaff = useCallback((input: NewStaffInput) => {
    const username = input.username.trim().toLowerCase();
    const fullName = input.full_name.trim();
    const code = input.code.trim();
    const email = input.email.trim();
    const jobTitle = input.job_title.trim();
    const department = input.department.trim();
    const phone = input.phone.trim();
    const hireDate = input.hire_date.trim();
    const address = input.address.trim();
    const nationality = input.nationality.trim() || JORDANIAN_NATIONALITY;
    const nationalId = input.national_id.trim();
    const roles = normalizeRoles(input.roles);
    const finalRoles = roles.length ? roles : (["employee.base"] as AppRole[]);

    if (
      !username ||
      !fullName ||
      !code ||
      !email ||
      !jobTitle ||
      !department ||
      !phone ||
      !hireDate ||
      !address ||
      !nationality ||
      !nationalId
    ) {
      return { ok: false as const, error: "missing_fields" };
    }
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      return { ok: false as const, error: "invalid_username" };
    }
    if (typeof input.salary !== "number" || Number.isNaN(input.salary) || input.salary < 0) {
      return { ok: false as const, error: "invalid_salary" };
    }
    const workStart = input.workStart.trim();
    const workEnd = input.workEnd.trim();
    if (!isValidTime(workStart) || !isValidTime(workEnd)) {
      return { ok: false as const, error: "invalid_hours" };
    }
    const explicitHours =
      typeof input.workHours === "number" && !Number.isNaN(input.workHours) ? input.workHours : null;
    const rangeHours = hoursBetween(workStart, workEnd);
    const workHours = explicitHours !== null && explicitHours > 0 ? explicitHours : rangeHours;
    if (!workHours || workHours <= 0) {
      return { ok: false as const, error: "invalid_hours" };
    }

    let created: StaffRecord | null = null;
    let duplicate = false;

    setStaff((prev) => {
      if (prev.some((s) => s.username === username)) {
        duplicate = true;
        return prev;
      }
      created = normalizeStaff({
        id: `user-${username}-${Date.now().toString(36)}`,
        username,
        code,
        full_name: fullName,
        email,
        job_title: jobTitle,
        department,
        phone,
        hire_date: hireDate,
        roles: finalRoles,
        role: finalRoles.includes("super_admin") ? "super_admin" : finalRoles[0]!,
        salary: input.salary,
        is_active: true,
        address,
        nationality,
        national_id: nationalId,
        notes: input.notes?.trim() || "",
        workDays: input.workDays?.length ? input.workDays : [...DEFAULT_WORK_DAYS],
        shiftId: "morning",
        workStart,
        workEnd,
        workHours,
        avatarUrl: input.avatarUrl?.trim() || "",
        permissionOverrides: {},
      });
      const next = [...prev, created];
      persist(next);
      return next;
    });

    if (duplicate) return { ok: false as const, error: "username_taken" };
    if (!created) return { ok: false as const, error: "failed" };
    const employee = created as StaffRecord;
    logActivity({
      module: "employees",
      action: "إضافة موظف",
      actionEn: "Employee created",
      entity: "موظف",
      entityEn: "Employee",
      details: `${employee.full_name} (@${employee.username})`,
      detailsEn: `${employee.full_name} (@${employee.username})`,
    });
    return { ok: true as const, employee };
  }, []);

  const updateStaff = useCallback((id: string, patch: Partial<StaffRecord>) => {
    let name = id;
    setStaff((prev) => {
      const next = prev.map((s) => {
        if (s.id !== id) return s;
        name = s.full_name;
        return normalizeStaff({ ...s, ...patch });
      });
      persist(next);
      return next;
    });
    const keys = Object.keys(patch).join(", ");
    logActivity({
      module: "employees",
      action: "تعديل موظف",
      actionEn: "Employee updated",
      entity: "موظف",
      entityEn: "Employee",
      details: `${name} · ${keys}`,
      detailsEn: `${name} · ${keys}`,
    });
  }, []);

  const deleteStaff = useCallback((id: string) => {
    let result: { ok: true } | { ok: false; error: string } = { ok: false, error: "not_found" };
    let deletedName = "";
    setStaff((prev) => {
      const target = prev.find((s) => s.id === id);
      if (!target) {
        result = { ok: false, error: "not_found" };
        return prev;
      }
      if (target.username === "sadmin") {
        result = { ok: false, error: "protected" };
        return prev;
      }
      deletedName = target.full_name;
      result = { ok: true };
      const next = prev.filter((s) => s.id !== id);
      persist(next);
      return next;
    });
    if (result.ok) {
      logActivity({
        module: "employees",
        action: "حذف موظف",
        actionEn: "Employee deleted",
        entity: "موظف",
        entityEn: "Employee",
        details: deletedName,
        detailsEn: deletedName,
      });
    }
    return result;
  }, []);

  const setRoles = useCallback((id: string, roles: AppRole[]) => {
    setStaff((prev) => {
      const next = prev.map((s) => {
        if (s.id !== id) return s;
        const normalized = normalizeRoles(roles, s.role);
        // Keep at least one role
        const finalRoles =
          normalized.length > 0 ? sortRoles(normalized) : (["employee.base"] as AppRole[]);
        return normalizeStaff({
          ...s,
          roles: finalRoles,
          role: finalRoles.includes("super_admin") ? "super_admin" : finalRoles[0]!,
          permissionOverrides: {},
        });
      });
      persist(next);
      return next;
    });
  }, []);

  const toggleRole = useCallback((id: string, role: AppRole) => {
    let name = id;
    let added = false;
    setStaff((prev) => {
      const next = prev.map((s) => {
        if (s.id !== id) return s;
        name = s.full_name;
        // Protect sadmin from losing super_admin
        if (s.username === "sadmin" && role === "super_admin") {
          return normalizeStaff({ ...s, roles: ["super_admin"], role: "super_admin" });
        }
        const current = staffRoles(s);
        const exists = current.includes(role);
        let roles: AppRole[];
        if (exists) {
          added = false;
          roles = current.filter((r) => r !== role);
          if (roles.length === 0) roles = ["employee.base"];
        } else {
          added = true;
          // Super admin is exclusive
          if (role === "super_admin") roles = ["super_admin"];
          else roles = [...current.filter((r) => r !== "super_admin"), role];
        }
        roles = sortRoles(roles);
        return normalizeStaff({
          ...s,
          roles,
          role: roles.includes("super_admin") ? "super_admin" : roles[0]!,
          permissionOverrides: {},
        });
      });
      persist(next);
      return next;
    });
    logActivity({
      module: "employees",
      action: added ? "منح رول" : "سحب رول",
      actionEn: added ? "Role granted" : "Role removed",
      entity: "صلاحيات",
      entityEn: "Roles",
      details: `${name} · ${role}`,
      detailsEn: `${name} · ${role}`,
    });
  }, []);

  const setPermissionOverride = useCallback(
    (id: string, permission: AppPermission, value: boolean | null) => {
      let name = id;
      setStaff((prev) => {
        const next = prev.map((s) => {
          if (s.id !== id) return s;
          name = s.full_name;
          const overrides = { ...s.permissionOverrides };
          if (value === null) delete overrides[permission];
          else overrides[permission] = value;
          return normalizeStaff({ ...s, permissionOverrides: overrides });
        });
        persist(next);
        return next;
      });
      logActivity({
        module: "employees",
        action: "تعديل صلاحية",
        actionEn: "Permission override",
        entity: "صلاحيات",
        entityEn: "Permissions",
        details: `${name} · ${permission} = ${value === null ? "default" : String(value)}`,
        detailsEn: `${name} · ${permission} = ${value === null ? "default" : String(value)}`,
      });
    },
    [],
  );

  const resetStaff = useCallback(() => {
    const seeded = seedStaff();
    setStaff(seeded);
    persist(seeded);
  }, []);

  const value = useMemo<StaffContextValue>(
    () => ({
      staff,
      getStaff,
      getByUsername,
      addStaff,
      updateStaff,
      deleteStaff,
      toggleRole,
      setRoles,
      setPermissionOverride,
      effectivePermissions: effectivePermissionsFor,
      resetStaff,
    }),
    [
      staff,
      getStaff,
      getByUsername,
      addStaff,
      updateStaff,
      deleteStaff,
      toggleRole,
      setRoles,
      setPermissionOverride,
      resetStaff,
    ],
  );

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used inside <StaffProvider>");
  return ctx;
}
