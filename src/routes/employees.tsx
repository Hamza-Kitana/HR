import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import { EmployeeNameCell } from "@/components/app/employee-avatar";
import { EmployeeCreateDialog } from "@/components/app/employee-create-dialog";
import { EmployeeDetailSheet } from "@/components/app/employee-detail-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getRoleLabel, type AppRole } from "@/lib/permissions";
import { idDocumentLabel, useStaff } from "@/lib/staff";

export const Route = createFileRoute("/employees")({
  ssr: false,
  head: () => ({ meta: [{ title: "الموظفون | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: EmployeesPage,
});

function RolesCell({ roles }: { roles: AppRole[] }) {
  const { lang } = useI18n();
  const shown = roles.slice(0, 2);
  const rest = roles.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((role) => (
        <StatusBadge key={role} tone="info">
          {getRoleLabel(role, lang)}
        </StatusBadge>
      ))}
      {rest > 0 ? <StatusBadge tone="neutral">+{rest}</StatusBadge> : null}
    </div>
  );
}

function EmployeesPage() {
  const { t, lang } = useI18n();
  const { can, isSuperAdmin, session } = useAuth();
  const { staff } = useStaff();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");

  const canCreate =
    isSuperAdmin ||
    session?.username === "sadmin" ||
    session?.username === "sami" ||
    can("hr.employees.create") ||
    can("users.create");

  // All company employees (full roster)
  const companyStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...staff].sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
    if (!q) return list;
    return list.filter(
      (emp) =>
        emp.full_name.toLowerCase().includes(q) ||
        emp.username.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.job_title.toLowerCase().includes(q) ||
        emp.phone.includes(q) ||
        emp.national_id.includes(q) ||
        emp.nationality.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q),
    );
  }, [staff, query]);

  const activeCount = staff.filter((s) => s.is_active).length;
  const departments = new Set(staff.map((s) => s.department).filter(Boolean)).size;

  function openEmployee(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  function handleNewClick() {
    if (!canCreate) {
      toast.error(lang === "ar" ? "ما عندك صلاحية إضافة موظف" : "You don't have permission to add employees");
      return;
    }
    setCreateOpen(true);
  }

  return (
    <AppShell title="nav.employees">
      <PageHeader
        title="nav.employees"
        description={
          lang === "ar"
            ? "سجل كامل لموظفي الشركة — الإضافة تحتاج البيانات الأساسية؛ الرولات الإدارية اختيارية."
            : "Full company employee roster — adding requires profile data; admin roles are optional."
        }
        action={
          <Button
            className="rounded-xl bg-brand text-brand-foreground shadow-glow"
            onClick={handleNewClick}
            disabled={!canCreate}
          >
            {t("emp.newEmployee")}
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={lang === "ar" ? "إجمالي موظفي الشركة" : "Company employees"} value={staff.length} />
        <StatCard label={lang === "ar" ? "نشطون" : "Active"} value={activeCount} />
        <StatCard label={lang === "ar" ? "الأقسام" : "Departments"} value={departments} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === "ar" ? "بحث بالاسم، المستخدم، القسم، الهوية…" : "Search name, user, dept, ID…"}
            className="h-11 rounded-xl ps-10"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {lang === "ar" ? `المعروض: ${companyStaff.length}` : `Showing: ${companyStaff.length}`}
        </p>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        {lang === "ar"
          ? "هذي قائمة كل موظفي الشركة. اضغط أي صف لفتح التفاصيل. عند الإضافة لازم تدخل البيانات؛ الصلاحيات الإدارية اختيارية."
          : "This is the full company roster. Click a row for details. Adding requires profile data; admin roles are optional."}
      </div>

      <DataTable
        headers={[
          t("emp.fullName"),
          t("emp.jobTitle"),
          t("emp.department"),
          lang === "ar" ? "الرتبة" : "Rank",
          t("emp.phone"),
          lang === "ar" ? "الجنسية" : "Nationality",
          lang === "ar" ? "الهوية / الجواز" : "ID / Passport",
          t("common.status"),
        ]}
        onRowClick={(index) => {
          const emp = companyStaff[index];
          if (emp) openEmployee(emp.id);
        }}
        rows={companyStaff.map((emp) => [
          <EmployeeNameCell
            key={emp.id}
            name={emp.full_name}
            src={emp.avatarUrl}
            subtitle={`@${emp.username} · ${emp.email}`}
          />,
          emp.job_title,
          emp.department,
          <RolesCell key={`${emp.id}-roles`} roles={emp.roles?.length ? emp.roles : [emp.role]} />,
          emp.phone,
          <span key={`${emp.id}-nat`}>{emp.nationality || "—"}</span>,
          <div key={`${emp.id}-nid`} className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground">{idDocumentLabel(emp.nationality, lang)}</p>
            <p className="font-mono text-xs" dir="ltr">
              {emp.national_id}
            </p>
          </div>,
          <StatusBadge key={`${emp.id}-s`} tone={emp.is_active ? "success" : "neutral"}>
            {emp.is_active ? t("emp.active") : t("emp.inactive")}
          </StatusBadge>,
        ])}
      />

      <EmployeeCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => openEmployee(id)}
      />

      <EmployeeDetailSheet
        employeeId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={() => {
          setSelectedId(null);
          setDetailOpen(false);
        }}
      />
    </AppShell>
  );
}
