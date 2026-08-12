import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Building2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import {
  useOrg,
  type OrgDepartment,
  type OrgPosition,
  type OrgRole,
} from "@/lib/org-structure";
import { getRoleLabel, ROLE_GROUPS, type AppRole } from "@/lib/permissions";
import { useStaff } from "@/lib/staff";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/departments")({
  ssr: false,
  head: () => ({
    meta: [{ title: "الهيكل التنظيمي | توقيعي" }, { name: "robots", content: "noindex" }],
  }),
  component: OrgStructurePage,
});

type Tab = "departments" | "positions" | "roles";

const selectClass =
  "flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function OrgStructurePage() {
  const { lang } = useI18n();
  const { staff } = useStaff();
  const {
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
  } = useOrg();

  const [tab, setTab] = useState<Tab>("departments");
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(departments[0]?.id ?? null);

  // Department form
  const [deptName, setDeptName] = useState("");
  const [deptHead, setDeptHead] = useState("");
  const [deptBudget, setDeptBudget] = useState("0");
  const [editingDept, setEditingDept] = useState<OrgDepartment | null>(null);

  // Position form
  const [posName, setPosName] = useState("");
  const [posDesc, setPosDesc] = useState("");
  const [posDeptId, setPosDeptId] = useState("");
  const [editingPos, setEditingPos] = useState<OrgPosition | null>(null);

  // Role form
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [roleDeptId, setRoleDeptId] = useState("");
  const [rolePerms, setRolePerms] = useState<AppRole[]>([]);
  const [rolePermGroup, setRolePermGroup] = useState("");
  const [editingRole, setEditingRole] = useState<OrgRole | null>(null);

  const activeDeptId = selectedDeptId && departments.some((d) => d.id === selectedDeptId)
    ? selectedDeptId
    : (departments[0]?.id ?? null);

  const deptPositions = activeDeptId ? positionsForDepartment(activeDeptId) : [];

  const employeeCountByDept = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of departments) {
      map[d.id] = staff.filter((s) => s.department === d.name && s.is_active).length;
    }
    return map;
  }, [departments, staff]);

  const selectedPermGroup = ROLE_GROUPS.find((g) => g.key === rolePermGroup) ?? null;
  const groupRoles = selectedPermGroup?.sections.flatMap((s) => s.roles) ?? [];

  function resetDeptForm() {
    setEditingDept(null);
    setDeptName("");
    setDeptHead("");
    setDeptBudget("0");
  }

  function resetPosForm() {
    setEditingPos(null);
    setPosName("");
    setPosDesc("");
    setPosDeptId(activeDeptId ?? "");
  }

  function resetRoleForm() {
    setEditingRole(null);
    setRoleName("");
    setRoleDesc("");
    setRoleDeptId("");
    setRolePerms([]);
    setRolePermGroup("");
  }

  function saveDepartment() {
    const name = deptName.trim();
    if (!name) {
      toast.error(lang === "ar" ? "اسم القسم مطلوب" : "Department name required");
      return;
    }
    const budget = Number(deptBudget) || 0;
    if (editingDept) {
      updateDepartment(editingDept.id, { name, head: deptHead.trim(), budget });
      toast.success(lang === "ar" ? "تم تحديث القسم" : "Department updated");
    } else {
      const created = addDepartment({ name, head: deptHead.trim(), budget });
      setSelectedDeptId(created.id);
      toast.success(lang === "ar" ? "تمت إضافة القسم" : "Department added");
    }
    resetDeptForm();
  }

  function savePosition() {
    const departmentId = posDeptId || activeDeptId || "";
    if (editingPos) {
      updatePosition(editingPos.id, {
        name: posName,
        description: posDesc,
        departmentId,
      });
      toast.success(lang === "ar" ? "تم تحديث المنصب" : "Position updated");
      resetPosForm();
      return;
    }
    const result = addPosition({
      name: posName,
      description: posDesc,
      departmentId,
    });
    if ("error" in result) {
      toast.error(
        result.error === "duplicate"
          ? lang === "ar"
            ? "المنصب موجود مسبقاً في هذا القسم"
            : "Position already exists in this department"
          : lang === "ar"
            ? "اختر قسماً واكتب اسم المنصب"
            : "Pick a department and position name",
      );
      return;
    }
    toast.success(lang === "ar" ? "تمت إضافة المنصب" : "Position added");
    setTab("positions");
    setSelectedDeptId(departmentId);
    resetPosForm();
  }

  function togglePerm(role: AppRole) {
    setRolePerms((prev) => {
      if (role === "super_admin") return prev.includes("super_admin") ? [] : ["super_admin"];
      const without = prev.filter((r) => r !== "super_admin");
      if (without.includes(role)) {
        return without.filter((r) => r !== role);
      }
      return [...without, role];
    });
  }

  function saveRole() {
    if (editingRole) {
      updateRole(editingRole.id, {
        name: roleName,
        description: roleDesc,
        departmentId: roleDeptId || null,
        appRoles: rolePerms,
      });
      toast.success(lang === "ar" ? "تم تحديث الرول" : "Role updated");
      resetRoleForm();
      return;
    }
    const result = addRole({
      name: roleName,
      description: roleDesc,
      departmentId: roleDeptId || null,
      appRoles: rolePerms,
    });
    if ("error" in result) {
      toast.error(
        result.error === "duplicate"
          ? lang === "ar"
            ? "اسم الرول مستخدم"
            : "Role name taken"
          : result.error === "no_permissions"
            ? lang === "ar"
              ? "اختر صلاحية واحدة على الأقل"
              : "Pick at least one permission"
            : lang === "ar"
              ? "اسم الرول مطلوب"
              : "Role name required",
      );
      return;
    }
    toast.success(lang === "ar" ? "تمت إضافة الرول" : "Role added");
    setTab("roles");
    resetRoleForm();
  }

  const tabs: { id: Tab; ar: string; en: string; icon: typeof Building2 }[] = [
    { id: "departments", ar: "الأقسام", en: "Departments", icon: Building2 },
    { id: "positions", ar: "المناصب", en: "Positions", icon: Briefcase },
    { id: "roles", ar: "الرولات", en: "Roles", icon: ShieldCheck },
  ];

  return (
    <AppShell title="nav.departments">
      <PageHeader
        title="nav.departments"
        description={
          lang === "ar"
            ? "من هنا تدير الأقسام والمناصب والرولات مع صلاحياتها — كل شيء في مكان واحد."
            : "Manage departments, positions, and roles with their permissions — all in one place."
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={lang === "ar" ? "الأقسام" : "Departments"} value={departments.length} />
        <StatCard label={lang === "ar" ? "المناصب" : "Positions"} value={positions.length} />
        <StatCard label={lang === "ar" ? "الرولات" : "Roles"} value={roles.length} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-brand text-brand-foreground shadow-glow"
                  : "border border-border bg-card text-muted-foreground hover:bg-secondary",
              )}
            >
              <Icon className="size-4" />
              {lang === "ar" ? item.ar : item.en}
            </button>
          );
        })}
      </div>

      {tab === "departments" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold">{lang === "ar" ? "كل الأقسام" : "All departments"}</h3>
            <div className="space-y-2">
              {departments.map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3",
                    activeDeptId === d.id && "border-primary/40 bg-primary/5",
                  )}
                >
                  <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setSelectedDeptId(d.id)}>
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar" ? "الرئيس" : "Head"}: {d.head || "—"} ·{" "}
                      {employeeCountByDept[d.id] ?? 0} {lang === "ar" ? "موظف" : "staff"} ·{" "}
                      {positionsForDepartment(d.id).length} {lang === "ar" ? "منصب" : "positions"}
                    </p>
                  </button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => {
                        setEditingDept(d);
                        setDeptName(d.name);
                        setDeptHead(d.head);
                        setDeptBudget(String(d.budget));
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="rounded-lg"
                      onClick={() => {
                        const result = deleteDepartment(d.id);
                        if (!result.ok) {
                          toast.error(
                            lang === "ar"
                              ? "احذف المناصب التابعة أولاً"
                              : "Delete department positions first",
                          );
                          return;
                        }
                        toast.success(lang === "ar" ? "تم حذف القسم" : "Department deleted");
                        if (selectedDeptId === d.id) setSelectedDeptId(null);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="h-fit space-y-3 rounded-2xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Plus className="size-4 text-primary" />
              {editingDept
                ? lang === "ar"
                  ? "تعديل قسم"
                  : "Edit department"
                : lang === "ar"
                  ? "إضافة قسم"
                  : "Add department"}
            </h3>
            <Field label={lang === "ar" ? "اسم القسم" : "Name"}>
              <Input value={deptName} onChange={(e) => setDeptName(e.target.value)} />
            </Field>
            <Field label={lang === "ar" ? "رئيس القسم" : "Head"}>
              <Input value={deptHead} onChange={(e) => setDeptHead(e.target.value)} />
            </Field>
            <Field label={lang === "ar" ? "الميزانية الشهرية" : "Monthly budget"}>
              <Input type="number" min={0} value={deptBudget} onChange={(e) => setDeptBudget(e.target.value)} dir="ltr" />
            </Field>
            <div className="flex gap-2">
              {editingDept ? (
                <Button type="button" variant="outline" className="rounded-xl" onClick={resetDeptForm}>
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </Button>
              ) : null}
              <Button type="button" className="flex-1 rounded-xl bg-brand text-brand-foreground" onClick={saveDepartment}>
                {editingDept ? (lang === "ar" ? "حفظ" : "Save") : lang === "ar" ? "إضافة" : "Add"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {tab === "positions" ? (
        <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)_22rem]">
          <section className="h-fit space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="px-1 text-xs font-semibold text-muted-foreground">
              {lang === "ar" ? "اختر القسم" : "Pick department"}
            </p>
            {departments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedDeptId(d.id);
                  if (!editingPos) setPosDeptId(d.id);
                }}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-start text-sm font-semibold transition-colors",
                  activeDeptId === d.id ? "bg-brand text-brand-foreground" : "hover:bg-secondary",
                )}
              >
                {d.name}
                <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                  {positionsForDepartment(d.id).length} {lang === "ar" ? "منصب" : "pos."}
                </span>
              </button>
            ))}
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold">
              {lang === "ar" ? "مناصب القسم" : "Department positions"}
              {activeDeptId ? (
                <span className="ms-2 font-normal text-muted-foreground">
                  · {departments.find((d) => d.id === activeDeptId)?.name}
                </span>
              ) : null}
            </h3>
            {deptPositions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {lang === "ar" ? "لا يوجد مناصب بعد — أضف منصب من النموذج." : "No positions yet — add one from the form."}
              </p>
            ) : (
              <div className="space-y-2">
                {deptPositions.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 rounded-xl border border-border px-4 py-3">
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      {p.description ? <p className="text-xs text-muted-foreground">{p.description}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => {
                          setEditingPos(p);
                          setPosName(p.name);
                          setPosDesc(p.description);
                          setPosDeptId(p.departmentId);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="rounded-lg"
                        onClick={() => {
                          deletePosition(p.id);
                          toast.success(lang === "ar" ? "تم حذف المنصب" : "Position deleted");
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="h-fit space-y-3 rounded-2xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Plus className="size-4 text-primary" />
              {editingPos ? (lang === "ar" ? "تعديل منصب" : "Edit position") : lang === "ar" ? "إضافة منصب" : "Add position"}
            </h3>
            <Field label={lang === "ar" ? "القسم" : "Department"}>
              <select
                className={selectClass}
                value={posDeptId || activeDeptId || ""}
                onChange={(e) => setPosDeptId(e.target.value)}
              >
                <option value="">{lang === "ar" ? "— اختر —" : "— Choose —"}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={lang === "ar" ? "اسم المنصب (Position)" : "Position title"}>
              <Input value={posName} onChange={(e) => setPosName(e.target.value)} placeholder={lang === "ar" ? "مثال: محاسب رئيسي" : "e.g. Senior Accountant"} />
            </Field>
            <Field label={lang === "ar" ? "الوصف" : "Description"}>
              <Input value={posDesc} onChange={(e) => setPosDesc(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              {editingPos ? (
                <Button type="button" variant="outline" className="rounded-xl" onClick={resetPosForm}>
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </Button>
              ) : null}
              <Button type="button" className="flex-1 rounded-xl bg-brand text-brand-foreground" onClick={savePosition}>
                {editingPos ? (lang === "ar" ? "حفظ" : "Save") : lang === "ar" ? "إضافة" : "Add"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {tab === "roles" ? (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold">{lang === "ar" ? "كل الرولات" : "All roles"}</h3>
            <div className="space-y-2">
              {roles.map((r) => {
                const dept = departments.find((d) => d.id === r.departmentId);
                return (
                  <div key={r.id} className="rounded-xl border border-border px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {dept ? dept.name : lang === "ar" ? "عام للشركة" : "Company-wide"}
                          {r.description ? ` · ${r.description}` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.appRoles
                            .filter((ar) => ar !== "employee.base")
                            .slice(0, 4)
                            .map((ar) => (
                            <StatusBadge key={ar} tone="info">
                              {getRoleLabel(ar, lang)}
                            </StatusBadge>
                          ))}
                          {r.appRoles.filter((ar) => ar !== "employee.base").length > 4 ? (
                            <StatusBadge tone="neutral">
                              +{r.appRoles.filter((ar) => ar !== "employee.base").length - 4}
                            </StatusBadge>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => {
                            setEditingRole(r);
                            setRoleName(r.name);
                            setRoleDesc(r.description);
                            setRoleDeptId(r.departmentId ?? "");
                            setRolePerms(r.appRoles.filter((ar) => ar !== "employee.base"));
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="rounded-lg"
                          onClick={() => {
                            deleteRole(r.id);
                            toast.success(lang === "ar" ? "تم حذف الرول" : "Role deleted");
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="h-fit space-y-3 rounded-2xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Plus className="size-4 text-primary" />
              {editingRole ? (lang === "ar" ? "تعديل رول" : "Edit role") : lang === "ar" ? "إضافة رول" : "Add role"}
            </h3>
            <Field label={lang === "ar" ? "اسم الرول" : "Role name"}>
              <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} />
            </Field>
            <Field label={lang === "ar" ? "القسم (اختياري)" : "Department (optional)"}>
              <select className={selectClass} value={roleDeptId} onChange={(e) => setRoleDeptId(e.target.value)}>
                <option value="">{lang === "ar" ? "— عام للشركة —" : "— Company-wide —"}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={lang === "ar" ? "الوصف" : "Description"}>
              <Input value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} />
            </Field>
            <Field label={lang === "ar" ? "مجموعة الصلاحيات" : "Permission group"}>
              <select className={selectClass} value={rolePermGroup} onChange={(e) => setRolePermGroup(e.target.value)}>
                <option value="">{lang === "ar" ? "— اختر —" : "— Choose —"}</option>
                {ROLE_GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>
                    {lang === "ar" ? g.ar : g.en}
                  </option>
                ))}
              </select>
            </Field>
            {selectedPermGroup ? (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-input p-2">
                {groupRoles.map((role) => (
                  <label key={role} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/60">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={rolePerms.includes(role)}
                      onChange={() => togglePerm(role)}
                    />
                    {getRoleLabel(role, lang)}
                  </label>
                ))}
              </div>
            ) : null}
            {rolePerms.length ? (
              <div className="flex flex-wrap gap-1">
                {rolePerms.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => togglePerm(r)}
                    className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"
                  >
                    {getRoleLabel(r, lang)} ×
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              {editingRole ? (
                <Button type="button" variant="outline" className="rounded-xl" onClick={resetRoleForm}>
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </Button>
              ) : null}
              <Button type="button" className="flex-1 rounded-xl bg-brand text-brand-foreground" onClick={saveRole}>
                {editingRole ? (lang === "ar" ? "حفظ" : "Save") : lang === "ar" ? "إضافة" : "Add"}
              </Button>
            </div>
          </section>
          </div>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-1 text-sm font-bold">
              {lang === "ar" ? "دليل الصلاحيات المتاحة في النظام" : "Available permissions catalog"}
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              {lang === "ar"
                ? "كل الصلاحيات اللي تقدر تربطها بأي رول من النموذج أعلاه."
                : "All permissions you can attach to any role from the form above."}
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ROLE_GROUPS.map((group) => (
                <div key={group.key} className="rounded-xl border border-border/80 bg-secondary/20 p-3">
                  <p className="mb-2 text-sm font-bold">{lang === "ar" ? group.ar : group.en}</p>
                  <ul className="space-y-1.5">
                    {group.sections.flatMap((section) =>
                      section.roles.map((role) => (
                        <li key={role} className="flex items-start justify-between gap-2 text-xs">
                          <span>{getRoleLabel(role, lang)}</span>
                          <code className="shrink-0 text-[10px] text-muted-foreground">{role}</code>
                        </li>
                      )),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
