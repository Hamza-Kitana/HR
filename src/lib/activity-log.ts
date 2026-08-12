import { useCallback, useEffect, useState } from "react";

export type ActivityModule =
  | "auth"
  | "employees"
  | "attendance"
  | "leaves"
  | "org"
  | "navigation"
  | "profile"
  | "payroll"
  | "recruitment"
  | "system";

export type ActivityEntry = {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorUsername: string;
  module: ActivityModule;
  action: string;
  actionEn: string;
  entity: string;
  entityEn: string;
  details?: string;
  detailsEn?: string;
  path?: string;
};

type LogInput = {
  module: ActivityModule;
  action: string;
  actionEn: string;
  entity: string;
  entityEn: string;
  details?: string;
  detailsEn?: string;
  path?: string;
  actor?: { id: string; name: string; username: string };
};

const STORAGE_KEY = "tawqi3i.activity-log.v1";
const SESSION_KEY = "tawqi3i.local-session";
const STAFF_KEY = "tawqi3i.staff.v3";
const MAX_ENTRIES = 800;
const EVENT_NAME = "tawqi3i-activity-log";

type SessionSnap = { userId: string; username: string };

function uid() {
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function readSession(): SessionSnap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionSnap;
    if (!parsed?.userId || !parsed?.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

function resolveActor(override?: LogInput["actor"]) {
  if (override) return override;
  const session = readSession();
  if (!session) {
    return { id: "system", name: "النظام", username: "system" };
  }
  try {
    const raw = window.localStorage.getItem(STAFF_KEY);
    if (raw) {
      const list = JSON.parse(raw) as Array<{ id: string; full_name?: string }>;
      const match = Array.isArray(list) ? list.find((s) => s.id === session.userId) : undefined;
      if (match?.full_name) {
        return { id: session.userId, name: match.full_name, username: session.username };
      }
    }
  } catch {
    /* ignore */
  }
  return { id: session.userId, name: session.username, username: session.username };
}

function readEntries(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: ActivityEntry[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function logActivity(input: LogInput): ActivityEntry {
  const actor = resolveActor(input.actor);
  const entry: ActivityEntry = {
    id: uid(),
    at: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorUsername: actor.username,
    module: input.module,
    action: input.action,
    actionEn: input.actionEn,
    entity: input.entity,
    entityEn: input.entityEn,
    ...(input.details ? { details: input.details } : {}),
    ...(input.detailsEn ? { detailsEn: input.detailsEn } : {}),
    ...(input.path ? { path: input.path } : {}),
  };

  if (typeof window === "undefined") return entry;

  const next = [entry, ...readEntries()].slice(0, MAX_ENTRIES);
  writeEntries(next);
  return entry;
}

export function clearActivityLog() {
  if (typeof window === "undefined") return;
  writeEntries([]);
}

export function getActivityLogSnapshot() {
  return readEntries();
}

export function formatActivityWhen(iso: string, _lang: "ar" | "en" = "ar") {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export const ACTIVITY_MODULE_LABELS: Record<ActivityModule, { ar: string; en: string }> = {
  auth: { ar: "تسجيل الدخول", en: "Auth" },
  employees: { ar: "الموظفون", en: "Employees" },
  attendance: { ar: "الحضور", en: "Attendance" },
  leaves: { ar: "الإجازات", en: "Leaves" },
  org: { ar: "الهيكل التنظيمي", en: "Organization" },
  navigation: { ar: "التنقل", en: "Navigation" },
  profile: { ar: "الملف الشخصي", en: "Profile" },
  payroll: { ar: "الرواتب", en: "Payroll" },
  recruitment: { ar: "التوظيف", en: "Recruitment" },
  system: { ar: "النظام", en: "System" },
};

export function useActivityLog() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(readEntries());
    setHydrated(true);
    const onChange = () => setEntries(readEntries());
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const clear = useCallback(() => {
    clearActivityLog();
  }, []);

  return { entries, hydrated, log: logActivity, clear };
}
