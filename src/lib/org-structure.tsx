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
  /** Reports to this position in the org chart; null = top of hierarchy (e.g. CEO). */
  parentPositionId: string | null;
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
  const rows: Array<{
    key: string;
    dept: string;
    name: string;
    description: string;
    parentKey: string | null;
  }> = [
    {
      key: "ceo",
      dept: "الإدارة التنفيذية",
      name: "المدير التنفيذي",
      description: "قيادة الشركة",
      parentKey: null,
    },
    {
      key: "sysadmin",
      dept: "الإدارة التنفيذية",
      name: "مدير النظام",
      description: "إدارة النظام والصلاحيات",
      parentKey: "ceo",
    },
    {
      key: "hr-head",
      dept: "الموارد البشرية",
      name: "مديرة الموارد البشرية",
      description: "إدارة شؤون الموظفين",
      parentKey: "ceo",
    },
    {
      key: "hr-spec",
      dept: "الموارد البشرية",
      name: "أخصائي موارد بشرية",
      description: "تنفيذ عمليات HR",
      parentKey: "hr-head",
    },
    {
      key: "payroll-lead",
      dept: "المالية",
      name: "مسؤول رواتب",
      description: "إدارة الرواتب والمسير",
      parentKey: "ceo",
    },
    {
      key: "senior-acc",
      dept: "المالية",
      name: "محاسب رئيسي",
      description: "الحسابات والفواتير",
      parentKey: "payroll-lead",
    },
    {
      key: "accountant",
      dept: "المالية",
      name: "محاسب",
      description: "قيود ومصاريف",
      parentKey: "payroll-lead",
    },
    {
      key: "cto",
      dept: "التقنية",
      name: "المدير التقني",
      description: "مسؤول قسم التقنية",
      parentKey: "ceo",
    },
    {
      key: "tech-lead",
      dept: "التقنية",
      name: "تيم ليد",
      description: "قيادة فريق التطوير",
      parentKey: "cto",
    },
    {
      key: "frontend",
      dept: "التقنية",
      name: "مطور واجهات",
      description: "تطوير Frontend ضمن التيم",
      parentKey: "tech-lead",
    },
    {
      key: "support",
      dept: "الدعم الفني",
      name: "مسؤول دعم فني",
      description: "دعم العملاء",
      parentKey: "ceo",
    },
    {
      key: "support-spec",
      dept: "الدعم الفني",
      name: "أخصائية دعم فني",
      description: "دعم فني مباشر",
      parentKey: "support",
    },
  ];
  const idByKey = Object.fromEntries(rows.map((r) => [r.key, `pos-${r.key}`]));
  return rows
    .filter((r) => byName[r.dept])
    .map((r) => ({
      id: idByKey[r.key]!,
      departmentId: byName[r.dept]!,
      name: r.name,
      description: r.description,
      parentPositionId: r.parentKey ? idByKey[r.parentKey]! : null,
    }));
}

/** When stored positions lack hierarchy, wire common Arabic titles under CEO. */
function inferParentIds(positions: OrgPosition[]): OrgPosition[] {
  if (!positions.length) return positions;
  if (positions.some((p) => p.parentPositionId)) return positions;

  const byTitle = new Map(positions.map((p) => [p.name.trim(), p.id]));
  const ceoId =
    byTitle.get("المدير التنفيذي") ??
    positions.find((p) => /ceo|المدير التنفيذي/i.test(p.name))?.id ??
    null;
  if (!ceoId) return positions;

  const underCeo = new Set([
    "مدير النظام",
    "مديرة الموارد البشرية",
    "مسؤول رواتب",
    "المدير التقني",
    "مسؤول دعم فني",
  ]);
  const underHr = new Set(["أخصائي موارد بشرية"]);
  const underPayroll = new Set(["محاسب", "محاسب رئيسي"]);
  const underCto = new Set(["تيم ليد"]);
  const underTechLead = new Set(["مطور واجهات"]);
  const underSupport = new Set(["أخصائية دعم فني"]);

  const hrId = byTitle.get("مديرة الموارد البشرية") ?? null;
  const payId = byTitle.get("مسؤول رواتب") ?? byTitle.get("محاسب رئيسي") ?? null;
  const ctoId = byTitle.get("المدير التقني") ?? null;
  const techLeadId = byTitle.get("تيم ليد") ?? null;
  const supportId = byTitle.get("مسؤول دعم فني") ?? null;

  return positions.map((p) => {
    if (p.id === ceoId) return { ...p, parentPositionId: null };
    if (underHr.has(p.name) && hrId) return { ...p, parentPositionId: hrId };
    if (underSupport.has(p.name) && supportId) return { ...p, parentPositionId: supportId };
    if (underTechLead.has(p.name) && techLeadId) return { ...p, parentPositionId: techLeadId };
    if (underCto.has(p.name) && ctoId) return { ...p, parentPositionId: ctoId };
    if (underPayroll.has(p.name) && payId && p.id !== payId) return { ...p, parentPositionId: payId };
    if (underCeo.has(p.name)) return { ...p, parentPositionId: ceoId };
    return { ...p, parentPositionId: ceoId };
  });
}

/** Ensure Tech dept has Team Lead between CTO and developers when missing. */
function ensureTechLeadBridge(positions: OrgPosition[], departments: OrgDepartment[]): OrgPosition[] {
  const techDept = departments.find((d) => d.name === "التقنية");
  if (!techDept) return positions;
  if (positions.some((p) => p.name === "تيم ليد" && p.departmentId === techDept.id)) {
    return positions;
  }
  const cto = positions.find((p) => p.name === "المدير التقني" && p.departmentId === techDept.id);
  const frontend = positions.find((p) => p.name === "مطور واجهات" && p.departmentId === techDept.id);
  if (!cto) return positions;

  const leadId = "pos-tech-lead";
  const lead: OrgPosition = {
    id: leadId,
    departmentId: techDept.id,
    name: "تيم ليد",
    description: "قيادة فريق التطوير",
    parentPositionId: cto.id,
  };
  const next = positions.map((p) =>
    frontend && p.id === frontend.id ? { ...p, parentPositionId: leadId } : p,
  );
  return [...next, lead];
}

function normalizePositions(raw: unknown[], departments: OrgDepartment[]): OrgPosition[] {
  const mapped = raw
    .map((item) => {
      const p = item as Partial<OrgPosition> & { id?: string };
      return {
        id: p.id || uid("pos"),
        departmentId: p.departmentId || "",
        name: (p.name || "").trim(),
        description: p.description || "",
        parentPositionId: p.parentPositionId ?? null,
      } satisfies OrgPosition;
    })
    .filter((p) => p.id && p.name && p.departmentId);

  return ensureTechLeadBridge(inferParentIds(mapped), departments);
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
      positions: Array.isArray(parsed.positions)
        ? normalizePositions(parsed.positions, parsed.departments)
        : [],
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
        parentPositionId: input.parentPositionId ?? null,
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
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextParent =
          patch.parentPositionId === undefined ? p.parentPositionId : patch.parentPositionId;
        return {
          ...p,
          ...patch,
          name: patch.name?.trim() ?? p.name,
          description: patch.description?.trim() ?? p.description,
          parentPositionId: nextParent === id ? null : nextParent,
        };
      }),
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
      const parentId = target?.parentPositionId ?? null;
      return prev
        .filter((p) => p.id !== id)
        .map((p) => (p.parentPositionId === id ? { ...p, parentPositionId: parentId } : p));
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
