import type { TranslationKey } from "./i18n";
import type { AppPermission } from "./permissions";

export type ErpNavItem = {
  to: string;
  labelKey: TranslationKey;
  /** Any of these permissions unlocks the link. Empty = always (for that nav mode). */
  anyOf?: AppPermission[];
};

export type ErpNavGroup = {
  id: string;
  labelKey: TranslationKey;
  collapsible: boolean;
  items: ErpNavItem[];
};

/** Super-admin / HR ERP sidebar — items filtered by permission */
export const ERP_NAV: ErpNavGroup[] = [
  {
    id: "main",
    labelKey: "nav.main",
    collapsible: false,
    items: [
      {
        to: "/dashboard",
        labelKey: "nav.dashboard",
        // visible if user has any ERP module (filtered further in shell)
        anyOf: [],
      },
    ],
  },
  {
    id: "hr",
    labelKey: "nav.hrSystem",
    collapsible: false,
    items: [
      {
        to: "/employees",
        labelKey: "nav.employees",
        anyOf: ["hr.employees.view", "hr.employees.create", "hr.employees.edit", "hr.employees.delete"],
      },
      {
        to: "/attendance",
        labelKey: "nav.attendance",
        anyOf: ["hr.attendance.view", "hr.attendance.manage"],
      },
      {
        to: "/leaves",
        labelKey: "nav.leaves",
        anyOf: ["hr.leaves.view", "hr.leaves.manage"],
      },
      {
        to: "/resignations",
        labelKey: "nav.resignations",
        anyOf: ["hr.resignations.view", "hr.resignations.manage"],
      },
      {
        to: "/contact-changes",
        labelKey: "nav.contactChanges",
        anyOf: ["hr.contact.view", "hr.contact.manage"],
      },
      {
        to: "/payroll",
        labelKey: "nav.payroll",
        anyOf: ["hr.payroll.view", "hr.payroll.manage"],
      },
      {
        to: "/contracts",
        labelKey: "nav.contracts",
        anyOf: ["hr.contracts.view", "hr.contracts.manage"],
      },
      {
        to: "/recruitment",
        labelKey: "nav.recruitment",
        anyOf: ["hr.recruitment.view", "hr.recruitment.manage"],
      },
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
    ],
  },
  // المحاسبة والمالية — مخفية مؤقتاً من الشريط الجانبي
  // {
  //   id: "finance",
  //   labelKey: "nav.financeSystem",
  //   collapsible: false,
  //   items: [
  //     { to: "/invoices", labelKey: "nav.invoices", anyOf: ["accounting.view", "accounting.manage"] },
  //     { to: "/expenses", labelKey: "nav.expenses", anyOf: ["accounting.view", "accounting.manage"] },
  //     { to: "/income", labelKey: "nav.income", anyOf: ["accounting.view", "accounting.manage"] },
  //     { to: "/payments", labelKey: "nav.payments", anyOf: ["accounting.view", "accounting.manage"] },
  //     { to: "/journal", labelKey: "nav.journal", anyOf: ["accounting.view", "accounting.manage"] },
  //     { to: "/tax", labelKey: "nav.tax", anyOf: ["accounting.view", "accounting.manage"] },
  //   ],
  // },
  {
    id: "system",
    labelKey: "nav.systemAdmin",
    collapsible: false,
    items: [
      { to: "/branches", labelKey: "nav.branches", anyOf: ["settings.manage", "roles.manage"] },
      { to: "/audit", labelKey: "nav.audit", anyOf: ["audit.view"] },
      { to: "/settings", labelKey: "nav.settings", anyOf: ["settings.manage"] },
      { to: "/profile", labelKey: "nav.myProfile", anyOf: [] },
    ],
  },
];

/** Personal employee self-service sidebar */
export const EMPLOYEE_NAV: ErpNavGroup[] = [
  {
    id: "portal-main",
    labelKey: "nav.main",
    collapsible: false,
    items: [
      { to: "/me-profile", labelKey: "nav.myProfile" },
      { to: "/me-absences", labelKey: "nav.myAbsences" },
      { to: "/me-requests", labelKey: "nav.myRequests" },
      { to: "/me-payroll", labelKey: "nav.myPayroll" },
    ],
  },
];

/** First ERP page the user can open based on permissions. */
export function firstErpPathForPermissions(
  permissions: AppPermission[],
  isSuperAdmin: boolean,
): string {
  if (isSuperAdmin) return "/dashboard";
  for (const group of ERP_NAV) {
    for (const item of group.items) {
      if (item.to === "/dashboard" || item.to === "/profile") continue;
      if (!item.anyOf || item.anyOf.length === 0) continue;
      if (item.anyOf.some((p) => permissions.includes(p))) return item.to;
    }
  }
  return "/profile";
}

export function canAccessNavItem(
  item: ErpNavItem,
  permissions: AppPermission[],
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (!item.anyOf || item.anyOf.length === 0) return true;
  return item.anyOf.some((p) => permissions.includes(p));
}

export function filterErpNav(
  permissions: AppPermission[],
  isSuperAdmin: boolean,
): ErpNavGroup[] {
  return ERP_NAV.map((group) => {
    const items = group.items.filter((item) => {
      if (item.to === "/dashboard") {
        // Dashboard only if they have at least one real module
        return (
          isSuperAdmin ||
          ERP_NAV.some((g) =>
            g.items.some(
              (i) =>
                i.to !== "/dashboard" &&
                i.to !== "/profile" &&
                canAccessNavItem(i, permissions, false),
            ),
          )
        );
      }
      return canAccessNavItem(item, permissions, isSuperAdmin);
    });
    return { ...group, items };
  }).filter((g) => g.items.length > 0);
}
