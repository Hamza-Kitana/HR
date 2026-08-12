import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { logActivity } from "./activity-log";
import { effectivePermissionsFor, loadStaffSnapshot, type StaffRecord } from "./staff";

export type RequestType = "leave" | "resignation" | "contact_change";
export type RequestStatus = "pending" | "approved" | "rejected";

export type HrRequest = {
  id: string;
  type: RequestType;
  employeeId: string;
  employeeName: string;
  leaveType?: string;
  from?: string;
  to?: string;
  lastDay?: string;
  /** Current values when requesting a contact change */
  currentEmail?: string;
  currentPhone?: string;
  /** Requested new values */
  newEmail?: string;
  newPhone?: string;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  decidedAt?: string;
  decidedById?: string;
  decidedByName?: string;
  decisionNote?: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  kind: "leave" | "resignation" | "contact_change" | "system";
  read: boolean;
  createdAt: string;
  requestId?: string;
};

type HrRequestsContextValue = {
  requests: HrRequest[];
  notifications: AppNotification[];
  submitLeave: (input: {
    employee: StaffRecord;
    leaveType: string;
    from: string;
    to: string;
    reason: string;
  }) => HrRequest;
  submitResignation: (input: {
    employee: StaffRecord;
    lastDay: string;
    reason: string;
  }) => HrRequest;
  submitContactChange: (input: {
    employee: StaffRecord;
    newEmail?: string;
    newPhone?: string;
    reason: string;
  }) => HrRequest | { error: string };
  decideRequest: (input: {
    requestId: string;
    status: "approved" | "rejected";
    actor: StaffRecord;
    note?: string;
  }) => { ok: true; request: HrRequest } | { ok: false; error: string };
  myRequests: (employeeId: string) => HrRequest[];
  myNotifications: (userId: string) => AppNotification[];
  unreadCount: (userId: string) => number;
  markRead: (notificationId: string) => void;
  markAllRead: (userId: string) => void;
};

const STORAGE_KEY = "tawqi3i.hr-requests.v1";
const HrRequestsContext = createContext<HrRequestsContextValue | null>(null);

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ar-JO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function normalizeRequest(raw: Partial<HrRequest>): HrRequest | null {
  if (!raw.id || !raw.type || !raw.employeeId) return null;
  if (raw.type !== "leave" && raw.type !== "resignation" && raw.type !== "contact_change") return null;
  const status: RequestStatus =
    raw.status === "approved" || raw.status === "rejected" || raw.status === "pending"
      ? raw.status
      : "pending";
  return {
    id: raw.id,
    type: raw.type,
    employeeId: raw.employeeId,
    employeeName: raw.employeeName ?? "",
    reason: raw.reason ?? "",
    status,
    createdAt: raw.createdAt ?? nowIso(),
    ...(raw.leaveType ? { leaveType: raw.leaveType } : {}),
    ...(raw.from ? { from: raw.from } : {}),
    ...(raw.to ? { to: raw.to } : {}),
    ...(raw.lastDay ? { lastDay: raw.lastDay } : {}),
    ...(raw.currentEmail ? { currentEmail: raw.currentEmail } : {}),
    ...(raw.currentPhone ? { currentPhone: raw.currentPhone } : {}),
    ...(raw.newEmail ? { newEmail: raw.newEmail } : {}),
    ...(raw.newPhone ? { newPhone: raw.newPhone } : {}),
    ...(raw.decidedAt ? { decidedAt: raw.decidedAt } : {}),
    ...(raw.decidedById ? { decidedById: raw.decidedById } : {}),
    ...(raw.decidedByName ? { decidedByName: raw.decidedByName } : {}),
    ...(raw.decisionNote ? { decisionNote: raw.decisionNote } : {}),
  };
}

type Persisted = {
  requests: HrRequest[];
  notifications: AppNotification[];
};

function readStore(): Persisted {
  if (typeof window === "undefined") return { requests: [], notifications: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { requests: [], notifications: [] };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const requests = Array.isArray(parsed.requests)
      ? parsed.requests.map((r) => normalizeRequest(r)).filter((r): r is HrRequest => !!r)
      : [];
    const notifications = Array.isArray(parsed.notifications) ? parsed.notifications : [];
    return { requests, notifications };
  } catch {
    return { requests: [], notifications: [] };
  }
}

function persist(data: Persisted) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function findHrRecipients(forType?: RequestType): StaffRecord[] {
  return loadStaffSnapshot().filter((s) => {
    if (!s.is_active) return false;
    if (s.roles.includes("super_admin")) return true;
    const perms = effectivePermissionsFor(s);
    if (forType === "leave") return perms.includes("hr.leaves.manage");
    if (forType === "resignation") return perms.includes("hr.resignations.manage");
    if (forType === "contact_change") return perms.includes("hr.contact.manage");
    return (
      perms.includes("hr.leaves.manage") ||
      perms.includes("hr.resignations.manage") ||
      perms.includes("hr.contact.manage") ||
      perms.includes("hr.employees.edit")
    );
  });
}

function requestKindLabel(type: RequestType, lang: "ar" | "en" = "ar") {
  if (type === "leave") return lang === "ar" ? "الإجازة" : "leave";
  if (type === "resignation") return lang === "ar" ? "الاستقالة" : "resignation";
  return lang === "ar" ? "تعديل بيانات التواصل" : "contact change";
}

export function HrRequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<HrRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const data = readStore();
    setRequests(data.requests);
    setNotifications(data.notifications);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist({ requests, notifications });
  }, [requests, notifications, hydrated]);

  const pushNotifications = useCallback((items: AppNotification[]) => {
    if (!items.length) return;
    setNotifications((prev) => [...items, ...prev]);
  }, []);

  const submitLeave = useCallback(
    (input: {
      employee: StaffRecord;
      leaveType: string;
      from: string;
      to: string;
      reason: string;
    }) => {
      const request: HrRequest = {
        id: uid("req"),
        type: "leave",
        employeeId: input.employee.id,
        employeeName: input.employee.full_name,
        leaveType: input.leaveType,
        from: input.from,
        to: input.to,
        reason: input.reason.trim(),
        status: "pending",
        createdAt: nowIso(),
      };
      setRequests((prev) => [request, ...prev]);

      logActivity({
        module: "leaves",
        action: "طلب إجازة",
        actionEn: "Leave requested",
        entity: "إجازة",
        entityEn: "Leave",
        details: `${input.employee.full_name} · ${input.leaveType} · ${input.from} → ${input.to}`,
        detailsEn: `${input.employee.full_name} · ${input.leaveType} · ${input.from} → ${input.to}`,
        actor: {
          id: input.employee.id,
          name: input.employee.full_name,
          username: input.employee.username,
        },
      });

      const hrs = findHrRecipients("leave").filter((h) => h.id !== input.employee.id);
      pushNotifications(
        hrs.map((hr) => ({
          id: uid("ntf"),
          userId: hr.id,
          title: "طلب إجازة جديد",
          body: `${input.employee.full_name} قدّم طلب إجازة (${input.leaveType}) من ${input.from} إلى ${input.to}`,
          kind: "leave" as const,
          read: false,
          createdAt: nowIso(),
          requestId: request.id,
        })),
      );

      return request;
    },
    [pushNotifications],
  );

  const submitResignation = useCallback(
    (input: { employee: StaffRecord; lastDay: string; reason: string }) => {
      const request: HrRequest = {
        id: uid("req"),
        type: "resignation",
        employeeId: input.employee.id,
        employeeName: input.employee.full_name,
        lastDay: input.lastDay,
        reason: input.reason.trim(),
        status: "pending",
        createdAt: nowIso(),
      };
      setRequests((prev) => [request, ...prev]);

      logActivity({
        module: "leaves",
        action: "طلب استقالة",
        actionEn: "Resignation requested",
        entity: "استقالة",
        entityEn: "Resignation",
        details: `${input.employee.full_name} · آخر يوم ${input.lastDay}`,
        detailsEn: `${input.employee.full_name} · last day ${input.lastDay}`,
        actor: {
          id: input.employee.id,
          name: input.employee.full_name,
          username: input.employee.username,
        },
      });

      const hrs = findHrRecipients("resignation").filter((h) => h.id !== input.employee.id);
      pushNotifications(
        hrs.map((hr) => ({
          id: uid("ntf"),
          userId: hr.id,
          title: "طلب استقالة جديد",
          body: `${input.employee.full_name} قدّم طلب استقالة — آخر يوم عمل ${input.lastDay}`,
          kind: "resignation" as const,
          read: false,
          createdAt: nowIso(),
          requestId: request.id,
        })),
      );

      return request;
    },
    [pushNotifications],
  );

  const submitContactChange = useCallback(
    (input: {
      employee: StaffRecord;
      newEmail?: string;
      newPhone?: string;
      reason: string;
    }) => {
      const newEmail = input.newEmail?.trim() ?? "";
      const newPhone = input.newPhone?.trim() ?? "";
      const emailChanged = newEmail && newEmail !== input.employee.email;
      const phoneChanged = newPhone && newPhone !== input.employee.phone;

      if (!emailChanged && !phoneChanged) {
        return { error: "no_change" };
      }
      if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return { error: "invalid_email" };
      }
      if (newPhone && newPhone.length < 7) {
        return { error: "invalid_phone" };
      }

      const pendingExists = requests.some(
        (r) =>
          r.type === "contact_change" &&
          r.employeeId === input.employee.id &&
          r.status === "pending",
      );
      if (pendingExists) {
        return { error: "pending_exists" };
      }

      const request: HrRequest = {
        id: uid("req"),
        type: "contact_change",
        employeeId: input.employee.id,
        employeeName: input.employee.full_name,
        currentEmail: input.employee.email,
        currentPhone: input.employee.phone,
        ...(emailChanged ? { newEmail } : {}),
        ...(phoneChanged ? { newPhone } : {}),
        reason: input.reason.trim() || "طلب تعديل بيانات التواصل",
        status: "pending",
        createdAt: nowIso(),
      };
      setRequests((prev) => [request, ...prev]);

      const parts: string[] = [];
      if (emailChanged) parts.push(`إيميل → ${newEmail}`);
      if (phoneChanged) parts.push(`هاتف → ${newPhone}`);

      logActivity({
        module: "leaves",
        action: "طلب تعديل بيانات التواصل",
        actionEn: "Contact change requested",
        entity: "بيانات تواصل",
        entityEn: "Contact details",
        details: `${input.employee.full_name} · ${parts.join(" · ")}`,
        detailsEn: `${input.employee.full_name} · ${parts.join(" · ")}`,
        actor: {
          id: input.employee.id,
          name: input.employee.full_name,
          username: input.employee.username,
        },
      });

      const hrs = findHrRecipients("contact_change").filter((h) => h.id !== input.employee.id);
      pushNotifications(
        hrs.map((hr) => ({
          id: uid("ntf"),
          userId: hr.id,
          title: "طلب تعديل بيانات تواصل جديد",
          body: `${input.employee.full_name} يطلب: ${parts.join(" · ")}`,
          kind: "contact_change" as const,
          read: false,
          createdAt: nowIso(),
          requestId: request.id,
        })),
      );

      return request;
    },
    [pushNotifications, requests],
  );

  const decideRequest = useCallback(
    (input: {
      requestId: string;
      status: "approved" | "rejected";
      actor: StaffRecord;
      note?: string;
    }) => {
      const target = requests.find((r) => r.id === input.requestId);
      if (!target) return { ok: false as const, error: "not_found" };
      if (target.status !== "pending") return { ok: false as const, error: "already_decided" };

      const decidedAt = nowIso();
      const updated: HrRequest = {
        ...target,
        status: input.status,
        decidedAt,
        decidedById: input.actor.id,
        decidedByName: input.actor.full_name,
        decisionNote: input.note?.trim() || "",
      };

      setRequests((prev) => prev.map((r) => (r.id === input.requestId ? updated : r)));

      const approved = input.status === "approved";
      const kindLabel = requestKindLabel(target.type, "ar");
      const kindLabelEn = requestKindLabel(target.type, "en");
      logActivity({
        module: "leaves",
        action: approved ? `موافقة على ${kindLabel}` : `رفض ${kindLabel}`,
        actionEn: approved ? `Approved ${kindLabelEn}` : `Rejected ${kindLabelEn}`,
        entity: kindLabel,
        entityEn: kindLabelEn,
        details: `${target.employeeName}${input.note?.trim() ? ` · ${input.note.trim()}` : ""}`,
        detailsEn: `${target.employeeName}${input.note?.trim() ? ` · ${input.note.trim()}` : ""}`,
        actor: {
          id: input.actor.id,
          name: input.actor.full_name,
          username: input.actor.username,
        },
      });

      pushNotifications([
        {
          id: uid("ntf"),
          userId: target.employeeId,
          title: approved ? `تمت الموافقة على ${kindLabel}` : `تم رفض ${kindLabel}`,
          body: approved
            ? `HR وافق على طلبك${input.note?.trim() ? ` — ${input.note.trim()}` : "."}`
            : `HR رفض طلبك${input.note?.trim() ? ` — ${input.note.trim()}` : "."}`,
          kind: target.type === "contact_change" ? "contact_change" : target.type,
          read: false,
          createdAt: decidedAt,
          requestId: target.id,
        },
      ]);

      return { ok: true as const, request: updated };
    },
    [requests, pushNotifications],
  );

  const myRequests = useCallback(
    (employeeId: string) => requests.filter((r) => r.employeeId === employeeId),
    [requests],
  );

  const myNotifications = useCallback(
    (userId: string) => notifications.filter((n) => n.userId === userId),
    [notifications],
  );

  const unreadCount = useCallback(
    (userId: string) => notifications.filter((n) => n.userId === userId && !n.read).length,
    [notifications],
  );

  const markRead = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback((userId: string) => {
    setNotifications((prev) => prev.map((n) => (n.userId === userId ? { ...n, read: true } : n)));
  }, []);

  const value = useMemo<HrRequestsContextValue>(
    () => ({
      requests,
      notifications,
      submitLeave,
      submitResignation,
      submitContactChange,
      decideRequest,
      myRequests,
      myNotifications,
      unreadCount,
      markRead,
      markAllRead,
    }),
    [
      requests,
      notifications,
      submitLeave,
      submitResignation,
      submitContactChange,
      decideRequest,
      myRequests,
      myNotifications,
      unreadCount,
      markRead,
      markAllRead,
    ],
  );

  return <HrRequestsContext.Provider value={value}>{children}</HrRequestsContext.Provider>;
}

export function useHrRequests() {
  const ctx = useContext(HrRequestsContext);
  if (!ctx) throw new Error("useHrRequests must be used inside <HrRequestsProvider>");
  return ctx;
}

export function formatRequestWhen(iso: string) {
  return formatWhen(iso);
}

export function requestTypeLabel(type: RequestType, lang: "ar" | "en") {
  if (type === "leave") return lang === "ar" ? "إجازة" : "Leave";
  if (type === "resignation") return lang === "ar" ? "استقالة" : "Resignation";
  return lang === "ar" ? "تعديل تواصل" : "Contact change";
}
