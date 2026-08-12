import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { logActivity } from "./activity-log";
import { MOCK_DEPARTMENTS } from "./erp-modules";
import { migrateRoles, type AppRole } from "./permissions";

export type OrgDepartment = {
  id: string;
  name: string;
  head: string;
  budget: number;
};

export type OrgPosition = {
  id: string;
  departmentId: string;
  name: string;
  description: string;
};

export type OrgRole = {
  id: string;
  name: string;
  /** Optional: role belongs under a department */
  departmentId: string | null;
  description: string;
  /** Linked permission roles applied when assigning this org role */
  appRoles: AppRole[];
};

type OrgContextValue = {
  departments: OrgDepartment[];
  positions: OrgPosition[];
  roles: OrgRole[];
  addDepartment: (input: Omit<OrgDepartment, "id">) => OrgDepartment;
  updateDepartment: (id: string, patch: Partial<Omit<OrgDepartment, "id">>) => void;
  deleteDepartment: (id: string) => { ok: true } | { ok: false; error: string };
  addPosition: (input: Omit<OrgPosition, "id">) => OrgPosition | { error: string };
  updatePosition: (id: string, patch: Partial<Omit<OrgPosition, "id">>) => void;
  deletePosition: (id: string) => void;
  addRole: (input: Omit<OrgRole, "id">) => OrgRole | { error: string };
  updateRole: (id: string, patch: Partial<Omit<OrgRole, "id">>) => void;
  deleteRole: (id: string) => void;
  positionsForDepartment: (departmentId: string) => OrgPosition[];
  rolesForDepartment: (departmentId: string | null) => OrgRole[];
};

const STORAGE_KEY = "tawqi3i.org.v1";
const OrgContext = createContext<OrgContextValue | null>(null);

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function seedDepartments(): OrgDepartment[] {
  return MOCK_DEPARTMENTS.map((d) => ({
    id: d.id,
    name: d.name,
    head: d.head,
    budget: d.budget,
  }));
}

function seedPositions(departments: OrgDepartment[]): OrgPosition[] {
  const byName = Object.fromEntries(departments.map((d) => [d.name, d.id]));
  const rows: Array<{ dept: string; name: string; description: string }> = [
    { dept: "الإدارة التنفيذية", name: "المدير التنفيذي", description: "قيادة الشركة" },
    { dept: "الإدارة التنفيذية", name: "مدير النظام", description: "إدارة النظام والصلاحيات" },
    { dept: "الموارد البشرية", name: "مديرة الموارد البشرية", description: "إدارة شؤون الموظفين" },
    { dept: "الموارد البشرية", name: "أخصائي موارد بشرية", description: "تنفيذ عمليات HR" },
    { dept: "المالية", name: "محاسب رئيسي", description: "الحسابات والفواتير" },
    { dept: "المالية", name: "محاسب", description: "قيود ومصاريف" },
    { dept: "التقنية", name: "المدير التقني", description: "قيادة التقنية والمشاريع" },
    { dept: "التقنية", name: "مطور واجهات", description: "تطوير Frontend" },
    { dept: "الدعم الفني", name: "مسؤول دعم فني", description: "دعم العملاء" },
  ];
  return rows
    .filter((r) => byName[r.dept])
    .map((r) => ({
      id: uid("pos"),
      departmentId: byName[r.dept]!,
      name: r.name,
      description: r.description,
    }));
}

function seedRoles(departments: OrgDepartment[]): OrgRole[] {
  const hr = departments.find((d) => d.name === "الموارد البشرية")?.id ?? null;
  const finance = departments.find((d) => d.name === "المالية")?.id ?? null;
  const tech = departments.find((d) => d.name === "التقنية")?.id ?? null;
  return [
    {
      id: uid("role"),
      name: "مدير موارد بشرية",
      departmentId: hr,
      description: "إدارة الموظفين والحضور",
      appRoles: migrateRoles("hr_manager"),
    },
    {
      id: uid("role"),
      name: "مسؤول رواتب",
      departmentId: finance,
      description: "إدارة الرواتب والمسير (المالية مخفية مؤقتاً)",
      appRoles: migrateRoles(["hr.payroll.manage"]),
    },
    {
      id: uid("role"),
      name: "مدير مشاريع",
      departmentId: tech,
      description: "إدارة المشاريع والمستندات",
      appRoles: migrateRoles("project_manager"),
    },
  ];
}

type Persisted = {
  departments: OrgDepartment[];
  positions: OrgPosition[];
  roles: OrgRole[];
};

function seedAll(): Persisted {
  const departments = seedDepartments();
  return {
    departments,
    positions: seedPositions(departments),
    roles: seedRoles(departments),
  };
}

function readOrg(): Persisted {
  if (typeof window === "undefined") return seedAll();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedAll();
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (!parsed.departments?.length) return seedAll();
    return {
      departments: parsed.departments,
      positions: Array.isArray(parsed.positions) ? parsed.positions : [],
      roles: Array.isArray(parsed.roles)
        ? parsed.roles.map((r) => ({
            ...r,
            appRoles: migrateRoles(r.appRoles),
            departmentId: r.departmentId ?? null,
            description: r.description ?? "",
          }))
        : [],
    };
  } catch {
    return seedAll();
  }
}

function persist(data: Persisted) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<OrgDepartment[]>(() => seedDepartments());
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const data = readOrg();
    setDepartments(data.departments);
    setPositions(data.positions);
    setRoles(data.roles);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist({ departments, positions, roles });
  }, [departments, positions, roles, hydrated]);

  const addDepartment = useCallback((input: Omit<OrgDepartment, "id">) => {
    const next: OrgDepartment = { ...input, id: uid("dept"), name: input.name.trim() };
    setDepartments((prev) => [...prev, next]);
    logActivity({
      module: "org",
      action: "إضافة قسم",
      actionEn: "Department added",
      entity: "قسم",
      entityEn: "Department",
      details: next.name,
      detailsEn: next.name,
    });
    return next;
  }, []);

  const updateDepartment = useCallback((id: string, patch: Partial<Omit<OrgDepartment, "id">>) => {
    setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch, name: patch.name?.trim() ?? d.name } : d)));
    logActivity({
      module: "org",
      action: "تعديل قسم",
      actionEn: "Department updated",
      entity: "قسم",
      entityEn: "Department",
      details: patch.name?.trim() || id,
      detailsEn: patch.name?.trim() || id,
    });
  }, []);

  const deleteDepartment = useCallback(
    (id: string) => {
      if (positions.some((p) => p.departmentId === id)) {
        return { ok: false as const, error: "has_positions" };
      }
      const target = departments.find((d) => d.id === id);
      setRoles((prev) => prev.map((r) => (r.departmentId === id ? { ...r, departmentId: null } : r)));
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      logActivity({
        module: "org",
        action: "حذف قسم",
        actionEn: "Department deleted",
        entity: "قسم",
        entityEn: "Department",
        details: target?.name || id,
        detailsEn: target?.name || id,
      });
      return { ok: true as const };
    },
    [positions, departments],
  );

  const addPosition = useCallback((input: Omit<OrgPosition, "id">) => {
    const name = input.name.trim();
    if (!name || !input.departmentId) return { error: "missing" };
    let duplicate = false;
    let created: OrgPosition | null = null;
    setPositions((prev) => {
      if (prev.some((p) => p.departmentId === input.departmentId && p.name === name)) {
        duplicate = true;
        return prev;
      }
      created = {
        id: uid("pos"),
        departmentId: input.departmentId,
        name,
        description: input.description.trim(),
      };
      return [...prev, created];
    });
    if (duplicate) return { error: "duplicate" };
    logActivity({
      module: "org",
      action: "إضافة منصب",
      actionEn: "Position added",
      entity: "منصب",
      entityEn: "Position",
      details: created!.name,
      detailsEn: created!.name,
    });
    return created!;
  }, []);

  const updatePosition = useCallback((id: string, patch: Partial<Omit<OrgPosition, "id">>) => {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              ...patch,
              name: patch.name?.trim() ?? p.name,
              description: patch.description?.trim() ?? p.description,
            }
          : p,
      ),
    );
    logActivity({
      module: "org",
      action: "تعديل منصب",
      actionEn: "Position updated",
      entity: "منصب",
      entityEn: "Position",
      details: patch.name?.trim() || id,
      detailsEn: patch.name?.trim() || id,
    });
  }, []);

  const deletePosition = useCallback((id: string) => {
    let name = id;
    setPositions((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) name = target.name;
      return prev.filter((p) => p.id !== id);
    });
    logActivity({
      module: "org",
      action: "حذف منصب",
      actionEn: "Position deleted",
      entity: "منصب",
      entityEn: "Position",
      details: name,
      detailsEn: name,
    });
  }, []);

  const addRole = useCallback((input: Omit<OrgRole, "id">) => {
    const name = input.name.trim();
    if (!name) return { error: "missing" };
    const appRoles = migrateRoles(input.appRoles);
    if (!appRoles.length) return { error: "no_permissions" };
    let duplicate = false;
    let created: OrgRole | null = null;
    setRoles((prev) => {
      if (prev.some((r) => r.name === name)) {
        duplicate = true;
        return prev;
      }
      created = {
        id: uid("role"),
        name,
        departmentId: input.departmentId,
        description: input.description.trim(),
        appRoles,
      };
      return [...prev, created];
    });
    if (duplicate) return { error: "duplicate" };
    logActivity({
      module: "org",
      action: "إضافة رول تنظيمي",
      actionEn: "Org role added",
      entity: "رول",
      entityEn: "Role",
      details: created!.name,
      detailsEn: created!.name,
    });
    return created!;
  }, []);

  const updateRole = useCallback((id: string, patch: Partial<Omit<OrgRole, "id">>) => {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...patch,
              name: patch.name?.trim() ?? r.name,
              description: patch.description?.trim() ?? r.description,
              appRoles: patch.appRoles ? migrateRoles(patch.appRoles) : r.appRoles,
            }
          : r,
      ),
    );
    logActivity({
      module: "org",
      action: "تعديل رول تنظيمي",
      actionEn: "Org role updated",
      entity: "رول",
      entityEn: "Role",
      details: patch.name?.trim() || id,
      detailsEn: patch.name?.trim() || id,
    });
  }, []);

  const deleteRole = useCallback((id: string) => {
    let name = id;
    setRoles((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) name = target.name;
      return prev.filter((r) => r.id !== id);
    });
    logActivity({
      module: "org",
      action: "حذف رول تنظيمي",
      actionEn: "Org role deleted",
      entity: "رول",
      entityEn: "Role",
      details: name,
      detailsEn: name,
    });
  }, []);

  const positionsForDepartment = useCallback(
    (departmentId: string) => positions.filter((p) => p.departmentId === departmentId),
    [positions],
  );

  const rolesForDepartment = useCallback(
    (departmentId: string | null) =>
      roles.filter((r) => (departmentId ? r.departmentId === departmentId || r.departmentId === null : true)),
    [roles],
  );

  const value = useMemo<OrgContextValue>(
    () => ({
      departments,
      positions,
      roles,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      addPosition,
      updatePosition,
      deletePosition,
      addRole,
      updateRole,
      deleteRole,
      positionsForDepartment,
      rolesForDepartment,
    }),
    [
      departments,
      positions,
      roles,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      addPosition,
      updatePosition,
      deletePosition,
      addRole,
      updateRole,
      deleteRole,
      positionsForDepartment,
      rolesForDepartment,
    ],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used inside <OrgProvider>");
  return ctx;
}
