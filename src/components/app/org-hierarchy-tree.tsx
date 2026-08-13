import { Building2, Crown, Users } from "lucide-react";
import { useMemo } from "react";

import { EmployeeAvatar } from "@/components/app/employee-avatar";
import { useI18n } from "@/lib/i18n";
import { useOrg } from "@/lib/org-structure";
import {
  buildOrgTree,
  countPeopleInTree,
  countTreeNodes,
  unassignedStaff,
  type OrgTreeNode,
} from "@/lib/org-tree";
import { useStaff } from "@/lib/staff";
import { cn } from "@/lib/utils";

function OrgCard({ node, depth }: { node: OrgTreeNode; depth: number }) {
  const { lang } = useI18n();
  const person = node.people.find((p) => p.isActive) ?? node.people[0] ?? null;
  const extras = node.people.filter((p) => p.id !== person?.id);
  const isCeo = depth === 0 && !node.position.parentPositionId;
  const reports = node.children.length;

  return (
    <article
      className={cn(
        "org-tree-card px-4 pb-4 pt-5 text-center",
        isCeo && "org-tree-card--ceo pt-6",
        !isCeo && depth === 1 && "org-tree-card--tier-1",
        !isCeo && depth >= 2 && "org-tree-card--tier-2",
      )}
      style={{ animationDelay: `${Math.min(depth * 55, 220)}ms` }}
    >
      {isCeo ? (
        <span className="absolute -top-3 start-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold tracking-wide text-brand-foreground shadow-glow rtl:translate-x-1/2">
          <Crown className="size-3" />
          {lang === "ar" ? "القمة" : "Top"}
        </span>
      ) : null}

      <div className="relative mx-auto mb-3 w-fit">
        {isCeo ? (
          <span
            className="pointer-events-none absolute inset-[-6px] rounded-full bg-primary/15 blur-md"
            aria-hidden
          />
        ) : null}
        {person ? (
          <EmployeeAvatar
            name={person.fullName}
            src={person.avatarUrl}
            size={isCeo ? "lg" : "md"}
            className={cn(
              "relative ring-2 ring-background",
              isCeo ? "!size-[4.25rem] shadow-glow" : "!size-14",
            )}
          />
        ) : (
          <div
            className={cn(
              "relative grid place-items-center rounded-full border border-dashed border-border bg-secondary font-bold text-foreground/70",
              isCeo ? "size-[4.25rem] text-sm" : "size-14 text-xs",
            )}
          >
            {lang === "ar" ? "شاغر" : "Vacant"}
          </div>
        )}
        {person?.isActive === false ? (
          <span className="absolute -bottom-1 start-1/2 -translate-x-1/2 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground rtl:translate-x-1/2">
            {lang === "ar" ? "غير نشط" : "Inactive"}
          </span>
        ) : null}
      </div>

      <h3
        className={cn(
          "font-display font-extrabold leading-snug tracking-tight text-foreground",
          isCeo ? "text-lg sm:text-xl" : "text-[15px] sm:text-base",
        )}
      >
        {person?.fullName ?? (lang === "ar" ? "منصب شاغر" : "Open role")}
      </h3>

      <p
        className={cn(
          "mt-1.5 font-bold leading-snug text-foreground",
          isCeo ? "text-sm sm:text-[15px]" : "text-[13px]",
        )}
      >
        <span className="text-primary">{node.position.name}</span>
      </p>

      {node.departmentName ? (
        <p className="mt-2 inline-flex max-w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground/85">
          <Building2 className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{node.departmentName}</span>
        </p>
      ) : null}

      {(reports > 0 || extras.length > 0) && (
        <div className="mt-3 flex items-center justify-center gap-2 border-t border-border/60 pt-3">
          {reports > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/80">
              <Users className="size-3.5 text-primary" />
              {lang === "ar" ? `${reports} يتبعونه` : `${reports} reports`}
            </span>
          ) : null}
          {extras.length > 0 ? (
            <div className="flex items-center -space-x-1.5 rtl:space-x-reverse">
              {extras.slice(0, 3).map((p) => (
                <EmployeeAvatar
                  key={p.id}
                  name={p.fullName}
                  src={p.avatarUrl}
                  size="xs"
                  className="!size-6 ring-2 ring-card"
                />
              ))}
              {extras.length > 3 ? (
                <span className="grid size-6 place-items-center rounded-full bg-secondary text-[9px] font-bold ring-2 ring-card">
                  +{extras.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}

function OrgNode({ node, depth }: { node: OrgTreeNode; depth: number }) {
  return (
    <li className="org-tree-node">
      <OrgCard node={node} depth={depth} />
      {node.children.length > 0 ? (
        <ul className="org-tree-children">
          {node.children.map((child) => (
            <OrgNode key={child.position.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Full-page org pyramid (CEO → reports → …). */
export function OrgHierarchyChart() {
  const { lang } = useI18n();
  const { departments, positions } = useOrg();
  const { staff } = useStaff();

  const tree = useMemo(
    () => buildOrgTree(positions, departments, staff),
    [positions, departments, staff],
  );
  const total = countTreeNodes(tree);
  const peopleOnTree = countPeopleInTree(tree);
  const missing = useMemo(
    () => unassignedStaff(staff, positions, departments),
    [staff, positions, departments],
  );

  if (positions.length === 0) {
    return (
      <div className="org-chart-canvas flex min-h-[22rem] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <div className="relative z-[1] max-w-md">
          <p className="font-display text-lg font-bold">
            {lang === "ar" ? "لا مناصب بعد" : "No positions yet"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "ar"
              ? "أضف المناصب من صفحة الهيكل التنظيمي، وحدّد لكل منصب «يتبع» مين — وبيظهر الهرم هنا."
              : "Add positions in Org structure and set who each role reports to — the pyramid will appear here."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          {lang === "ar" ? `${total} منصب` : `${total} positions`}
        </span>
        <span className="rounded-xl border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
          {lang === "ar" ? `${peopleOnTree} موظف على الهرم` : `${peopleOnTree} people on chart`}
        </span>
        {missing.length > 0 ? (
          <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
            {lang === "ar" ? `${missing.length} بلا منصب` : `${missing.length} unassigned`}
          </span>
        ) : null}
      </div>

      {missing.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-200">
            {lang === "ar"
              ? "موظفين مش مربوطين بالهرم — لازم يختاروا منصب من الهيكل"
              : "Employees not linked to the hierarchy — assign them a position"}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missing.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium"
              >
                {s.full_name}
                {s.job_title ? ` · ${s.job_title}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="org-chart-canvas relative z-0 px-3 py-10 sm:px-8 sm:py-14">
        <div className="relative z-[1] mx-auto w-max min-w-full max-w-none">
          <ul className="org-tree">
            {tree.map((root) => (
              <OrgNode key={root.position.id} node={root} depth={0} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
