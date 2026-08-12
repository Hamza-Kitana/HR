import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, DataTable, PageHeader, StatusBadge } from "@/components/app/app-shell";
import { EmployeeNameCell } from "@/components/app/employee-avatar";
import { EmployeeDetailSheet } from "@/components/app/employee-detail-sheet";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getRoleLabel, type AppRole } from "@/lib/permissions";
import { useStaff } from "@/lib/staff";

export const Route = createFileRoute("/users")({
  ssr: false,
  head: () => ({ meta: [{ title: "المستخدمون | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: UsersPage,
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

function UsersPage() {
  const { t } = useI18n();
  const { staff, effectivePermissions } = useStaff();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AppShell title="nav.users">
      <PageHeader
        title="nav.users"
        description={t("perm.desc")}
        action={<Button className="rounded-xl bg-brand text-brand-foreground">{t("common.add")}</Button>}
      />
      <DataTable
        headers={[t("common.name"), t("auth.username"), t("common.role"), t("perm.title"), t("common.status")]}
        onRowClick={(index) => {
          const user = staff[index];
          if (!user) return;
          setSelectedId(user.id);
          setOpen(true);
        }}
        rows={staff.map((u) => [
          <EmployeeNameCell key={u.id} name={u.full_name} src={u.avatarUrl} />,
          u.username,
          <RolesCell key={`${u.id}-roles`} roles={u.roles?.length ? u.roles : [u.role]} />,
          `${effectivePermissions(u).length}`,
          <StatusBadge key={`${u.id}-s`} tone={u.is_active ? "success" : "neutral"}>
            {u.is_active ? t("emp.active") : t("emp.inactive")}
          </StatusBadge>,
        ])}
      />
      <EmployeeDetailSheet employeeId={selectedId} open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}
