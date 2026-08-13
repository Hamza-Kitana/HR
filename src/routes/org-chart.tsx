import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app/app-shell";
import { OrgHierarchyChart } from "@/components/app/org-hierarchy-tree";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { canAccessNavItem } from "@/lib/erp-nav";
import { useI18n } from "@/lib/i18n";
import { isEmployeePortalUser } from "@/lib/portal";

export const Route = createFileRoute("/org-chart")({
  ssr: false,
  head: () => ({
    meta: [{ title: "الهرم الوظيفي | توقيعي" }, { name: "robots", content: "noindex" }],
  }),
  component: OrgChartPage,
});

function OrgChartPage() {
  const { lang } = useI18n();
  const { permissions, isSuperAdmin } = useAuth();
  const portalOnly = isEmployeePortalUser(permissions, isSuperAdmin);
  const canEditStructure = canAccessNavItem(
    {
      to: "/departments",
      labelKey: "nav.departments",
      anyOf: [
        "hr.employees.view",
        "hr.employees.create",
        "hr.employees.edit",
        "hr.employees.delete",
        "roles.manage",
        "settings.manage",
      ],
    },
    permissions,
    isSuperAdmin,
  );

  return (
    <AppShell title="nav.orgChart">
      <PageHeader
        title="nav.orgChart"
        description={
          lang === "ar"
            ? "كل موظف مربوط بمنصب بالهيكل: قسم → رئيس قسم → تيم ليد → التيم. من الهيكل التنظيمي تبني الرتب، ومن إضافة الموظف تختَرله مكانه."
            : "Every employee is linked to a position: dept → head → team lead → team. Build ranks in Org structure, then place people when adding employees."
        }
        action={
          canEditStructure && !portalOnly ? (
            <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
              <Link to="/departments">
                <Settings2 className="size-4" />
                {lang === "ar" ? "تعديل الهيكل" : "Edit structure"}
              </Link>
            </Button>
          ) : null
        }
      />

      <OrgHierarchyChart />
    </AppShell>
  );
}
