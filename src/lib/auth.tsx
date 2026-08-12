import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { logActivity } from "./activity-log";
import type { AppPermission, AppRole } from "./permissions";
import { effectivePermissionsFor, findStaffByUsername, type StaffRecord } from "./staff";

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  job_title: string | null;
  department: string | null;
  phone: string | null;
  avatar_url: string | null;
  hire_date: string | null;
  is_active: boolean;
};

type LocalSession = {
  userId: string;
  username: string;
};

type AuthContextValue = {
  loading: boolean;
  session: LocalSession | null;
  user: { id: string; username: string } | null;
  profile: Profile | null;
  roles: AppRole[];
  permissions: AppPermission[];
  can: (permission: AppPermission) => boolean;
  canAny: (permissions: AppPermission[]) => boolean;
  isSuperAdmin: boolean;
  signIn: (username: string, code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
};

const STORAGE_KEY = "tawqi3i.local-session";
const AuthContext = createContext<AuthContextValue | null>(null);

function profileFromStaff(user: StaffRecord): Profile {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    job_title: user.job_title,
    department: user.department,
    phone: user.phone,
    avatar_url: user.avatarUrl || null,
    hire_date: user.hire_date,
    is_active: user.is_active,
  };
}

function readStoredSession(): LocalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalSession;
    if (!parsed?.userId || !parsed?.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const applyStaff = useCallback((user: StaffRecord) => {
    const nextSession = { userId: user.id, username: user.username };
    setSession(nextSession);
    setProfile(profileFromStaff(user));
    setRoles(user.roles?.length ? user.roles : [user.role]);
    setPermissions(effectivePermissionsFor(user));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
  }, []);

  const clearUser = useCallback(() => {
    setSession(null);
    setProfile(null);
    setRoles([]);
    setPermissions([]);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const stored = readStoredSession();
    if (stored) {
      const match = findStaffByUsername(stored.username);
      if (match && match.is_active) applyStaff(match);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, [applyStaff]);

  const signIn = useCallback(
    async (username: string, code: string) => {
      const staff = findStaffByUsername(username);
      if (!staff || staff.code !== code.trim()) {
        logActivity({
          module: "auth",
          action: "فشل تسجيل الدخول",
          actionEn: "Login failed",
          entity: "الحساب",
          entityEn: "Account",
          details: `محاولة باسم ${username.trim()}`,
          detailsEn: `Attempt as ${username.trim()}`,
          actor: { id: "anonymous", name: username.trim() || "زائر", username: username.trim() || "anonymous" },
        });
        return { error: "Invalid credentials" };
      }
      if (!staff.is_active) {
        logActivity({
          module: "auth",
          action: "حساب معلّق",
          actionEn: "Suspended account login",
          entity: "الحساب",
          entityEn: "Account",
          details: staff.full_name,
          detailsEn: staff.full_name,
          actor: { id: staff.id, name: staff.full_name, username: staff.username },
        });
        return { error: "Account suspended" };
      }
      applyStaff(staff);
      logActivity({
        module: "auth",
        action: "تسجيل دخول",
        actionEn: "Signed in",
        entity: "الحساب",
        entityEn: "Account",
        details: staff.full_name,
        detailsEn: staff.full_name,
        actor: { id: staff.id, name: staff.full_name, username: staff.username },
      });
      return { error: null };
    },
    [applyStaff],
  );

  const signOut = useCallback(async () => {
    const current = readStoredSession();
    if (current) {
      logActivity({
        module: "auth",
        action: "تسجيل خروج",
        actionEn: "Signed out",
        entity: "الحساب",
        entityEn: "Account",
        details: current.username,
        detailsEn: current.username,
        actor: { id: current.userId, name: current.username, username: current.username },
      });
    }
    clearUser();
  }, [clearUser]);

  const reload = useCallback(async () => {
    if (!session) return;
    const match = findStaffByUsername(session.username);
    if (!match || !match.is_active) {
      clearUser();
      return;
    }
    applyStaff(match);
  }, [session, clearUser, applyStaff]);

  const value = useMemo<AuthContextValue>(() => {
    const permSet = new Set(permissions);
    return {
      loading,
      session,
      user: session ? { id: session.userId, username: session.username } : null,
      profile,
      roles,
      permissions,
      can: (permission) => permSet.has(permission),
      canAny: (list) => list.some((p) => permSet.has(p)),
      isSuperAdmin: roles.includes("super_admin"),
      signIn,
      signOut,
      reload,
    };
  }, [loading, session, profile, roles, permissions, signIn, signOut, reload]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
