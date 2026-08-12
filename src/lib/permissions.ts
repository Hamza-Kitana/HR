/** Module-level HR roles — each opens its matching sidebar section. */

export const ROLES = [
  "employee.base",
  "super_admin",
  // HR modules (assignable)
  "hr.employees.manage",
  "hr.attendance.manage",
  "hr.leaves.manage",
  "hr.resignations.manage",
  "hr.contact.manage",
  "hr.payroll.manage",
  "hr.contracts.manage",
  "hr.recruitment.manage",
  // Legacy granular roles (kept for stored data migration)
  "hr.employees.view",
  "hr.employees.create",
  "hr.employees.edit",
  "hr.employees.delete",
  "hr.attendance.view",
  "hr.leaves.view",
  // Other system roles (super-admin / advanced)
  "iam.users.view",
  "iam.users.create",
  "iam.users.edit",
  "iam.users.delete",
  "iam.roles.manage",
  "docs.view",
  "docs.create",
  "docs.sign",
  "docs.delete",
  "finance.invoices.view",
  "finance.invoices.manage",
  "crm.clients.view",
  "crm.clients.manage",
  "pm.projects.view",
  "pm.projects.manage",
  "sys.reports.view",
  "sys.audit.view",
  "sys.settings.manage",
] as const;

export type AppRole = (typeof ROLES)[number];

export const PERMISSIONS = [
  "hr.employees.view",
  "hr.employees.create",
  "hr.employees.edit",
  "hr.employees.delete",
  "hr.attendance.view",
  "hr.attendance.manage",
  "hr.leaves.view",
  "hr.leaves.manage",
  "hr.resignations.view",
  "hr.resignations.manage",
  "hr.contact.view",
  "hr.contact.manage",
  "hr.payroll.view",
  "hr.payroll.manage",
  "hr.contracts.view",
  "hr.contracts.manage",
  "hr.recruitment.view",
  "hr.recruitment.manage",
  "users.view",
  "users.create",
  "users.edit",
  "users.delete",
  "roles.manage",
  "documents.view",
  "documents.create",
  "documents.sign",
  "documents.delete",
  "accounting.view",
  "accounting.manage",
  "clients.view",
  "clients.manage",
  "projects.view",
  "projects.manage",
  "reports.view",
  "audit.view",
  "settings.manage",
] as const;

export type AppPermission = (typeof PERMISSIONS)[number];

export const ROLE_LABELS: Record<AppRole, { ar: string; en: string }> = {
  super_admin: { ar: "مدير عام كامل الصلاحيات", en: "Full Super Admin" },
  "employee.base": { ar: "موظف", en: "Employee" },
  "hr.employees.manage": { ar: "إدارة الموظفين", en: "Manage employees" },
  "hr.attendance.manage": { ar: "إدارة الحضور والغياب", en: "Manage attendance" },
  "hr.leaves.manage": { ar: "إدارة الإجازات", en: "Manage leaves" },
  "hr.resignations.manage": { ar: "إدارة الاستقالات", en: "Manage resignations" },
  "hr.contact.manage": { ar: "إدارة تعديل بيانات التواصل", en: "Manage contact changes" },
  "hr.payroll.manage": { ar: "إدارة الرواتب", en: "Manage payroll" },
  "hr.contracts.manage": { ar: "إدارة العقود", en: "Manage contracts" },
  "hr.recruitment.manage": { ar: "إدارة طلبات التوظيف", en: "Manage recruitment" },
  "hr.employees.view": { ar: "عرض الموظفين", en: "View employees" },
  "hr.employees.create": { ar: "إضافة موظف", en: "Add employee" },
  "hr.employees.edit": { ar: "تعديل التفاصيل", en: "Edit details" },
  "hr.employees.delete": { ar: "حذف موظف", en: "Delete employee" },
  "hr.attendance.view": { ar: "عرض الحضور", en: "View attendance" },
  "hr.leaves.view": { ar: "عرض الإجازات", en: "View leaves" },
  "iam.users.view": { ar: "عرض المستخدمين", en: "View users" },
  "iam.users.create": { ar: "إضافة مستخدم", en: "Create user" },
  "iam.users.edit": { ar: "تعديل مستخدم", en: "Edit user" },
  "iam.users.delete": { ar: "حذف مستخدم", en: "Delete user" },
  "iam.roles.manage": { ar: "إدارة الأدوار", en: "Manage roles" },
  "docs.view": { ar: "عرض المستندات", en: "View documents" },
  "docs.create": { ar: "إنشاء وتعديل مستند", en: "Create & edit documents" },
  "docs.sign": { ar: "توقيع المستندات", en: "Sign documents" },
  "docs.delete": { ar: "حذف المستندات", en: "Delete documents" },
  "finance.invoices.view": { ar: "عرض الفواتير", en: "View invoices" },
  "finance.invoices.manage": { ar: "إدارة الفواتير", en: "Manage invoices" },
  "crm.clients.view": { ar: "عرض العملاء", en: "View clients" },
  "crm.clients.manage": { ar: "إدارة العملاء", en: "Manage clients" },
  "pm.projects.view": { ar: "عرض المشاريع", en: "View projects" },
  "pm.projects.manage": { ar: "إدارة المشاريع", en: "Manage projects" },
  "sys.reports.view": { ar: "عرض التقارير", en: "View reports" },
  "sys.audit.view": { ar: "عرض سجل العمليات", en: "View audit log" },
  "sys.settings.manage": { ar: "إدارة الإعدادات", en: "Manage settings" },
};

/** The 8 HR module roles — used in assignment UI (everyone is already an employee). */
export const ASSIGNABLE_HR_ROLES: AppRole[] = [
  "hr.employees.manage",
  "hr.attendance.manage",
  "hr.leaves.manage",
  "hr.resignations.manage",
  "hr.contact.manage",
  "hr.payroll.manage",
  "hr.contracts.manage",
  "hr.recruitment.manage",
];

export type RoleGroup = {
  key: string;
  order: number;
  ar: string;
  en: string;
  sections: { ar: string; en: string; roles: AppRole[] }[];
};

/** Simplified picker catalog for create/edit employee */
export const ROLE_GROUPS: RoleGroup[] = [
  {
    key: "hr",
    order: 1,
    ar: "الموارد البشرية",
    en: "Human Resources",
    sections: [
      {
        ar: "وحدات الإدارة",
        en: "Management modules",
        roles: [...ASSIGNABLE_HR_ROLES],
      },
    ],
  },
  {
    key: "admin",
    order: 2,
    ar: "الإدارة العليا",
    en: "Executive",
    sections: [{ ar: "صلاحيات كاملة", en: "Full access", roles: ["super_admin"] }],
  },
];

const ROLE_ORDER = new Map(ROLES.map((role, index) => [role, index]));

export function sortRoles(roles: AppRole[]): AppRole[] {
  return [...roles].sort((a, b) => (ROLE_ORDER.get(a) ?? 999) - (ROLE_ORDER.get(b) ?? 999));
}

/** Each role grants matching permission(s). */
export const ROLE_PERMISSIONS: Record<Exclude<AppRole, "super_admin">, AppPermission[]> = {
  "employee.base": ["documents.view", "documents.sign"],
  "hr.employees.manage": [
    "hr.employees.view",
    "hr.employees.create",
    "hr.employees.edit",
    "hr.employees.delete",
  ],
  "hr.attendance.manage": ["hr.attendance.manage", "hr.attendance.view"],
  "hr.leaves.manage": ["hr.leaves.manage", "hr.leaves.view"],
  "hr.resignations.manage": ["hr.resignations.manage", "hr.resignations.view"],
  "hr.contact.manage": ["hr.contact.manage", "hr.contact.view"],
  "hr.payroll.manage": ["hr.payroll.manage", "hr.payroll.view"],
  "hr.contracts.manage": ["hr.contracts.manage", "hr.contracts.view"],
  "hr.recruitment.manage": ["hr.recruitment.manage", "hr.recruitment.view"],
  // Legacy granular
  "hr.employees.view": ["hr.employees.view"],
  "hr.employees.create": ["hr.employees.create", "hr.employees.view"],
  "hr.employees.edit": ["hr.employees.edit", "hr.employees.view"],
  "hr.employees.delete": ["hr.employees.delete", "hr.employees.view"],
  "hr.attendance.view": ["hr.attendance.view"],
  "hr.leaves.view": ["hr.leaves.view"],
  "iam.users.view": ["users.view"],
  "iam.users.create": ["users.create", "users.view"],
  "iam.users.edit": ["users.edit", "users.view"],
  "iam.users.delete": ["users.delete", "users.view"],
  "iam.roles.manage": ["roles.manage", "users.view"],
  "docs.view": ["documents.view"],
  "docs.create": ["documents.create", "documents.view"],
  "docs.sign": ["documents.sign", "documents.view"],
  "docs.delete": ["documents.delete", "documents.view"],
  "finance.invoices.view": ["accounting.view"],
  "finance.invoices.manage": ["accounting.manage", "accounting.view"],
  "crm.clients.view": ["clients.view"],
  "crm.clients.manage": ["clients.manage", "clients.view"],
  "pm.projects.view": ["projects.view"],
  "pm.projects.manage": ["projects.manage", "projects.view"],
  "sys.reports.view": ["reports.view"],
  "sys.audit.view": ["audit.view"],
  "sys.settings.manage": ["settings.manage"],
};

export const PERMISSION_LABELS: Record<AppPermission, { ar: string; en: string }> = {
  "hr.employees.view": { ar: "عرض الموظفين", en: "View employees" },
  "hr.employees.create": { ar: "إضافة موظف", en: "Add employee" },
  "hr.employees.edit": { ar: "تعديل التفاصيل", en: "Edit details" },
  "hr.employees.delete": { ar: "حذف موظف", en: "Delete employee" },
  "hr.attendance.view": { ar: "عرض الحضور", en: "View attendance" },
  "hr.attendance.manage": { ar: "إدارة الحضور والغياب", en: "Manage attendance" },
  "hr.leaves.view": { ar: "عرض الإجازات", en: "View leaves" },
  "hr.leaves.manage": { ar: "إدارة الإجازات", en: "Manage leaves" },
  "hr.resignations.view": { ar: "عرض الاستقالات", en: "View resignations" },
  "hr.resignations.manage": { ar: "إدارة الاستقالات", en: "Manage resignations" },
  "hr.contact.view": { ar: "عرض طلبات التواصل", en: "View contact requests" },
  "hr.contact.manage": { ar: "إدارة تعديل بيانات التواصل", en: "Manage contact changes" },
  "hr.payroll.view": { ar: "عرض الرواتب", en: "View payroll" },
  "hr.payroll.manage": { ar: "إدارة الرواتب", en: "Manage payroll" },
  "hr.contracts.view": { ar: "عرض العقود", en: "View contracts" },
  "hr.contracts.manage": { ar: "إدارة العقود", en: "Manage contracts" },
  "hr.recruitment.view": { ar: "عرض طلبات التوظيف", en: "View recruitment" },
  "hr.recruitment.manage": { ar: "إدارة طلبات التوظيف", en: "Manage recruitment" },
  "users.view": { ar: "عرض المستخدمين", en: "View users" },
  "users.create": { ar: "إضافة مستخدم", en: "Create users" },
  "users.edit": { ar: "تعديل المستخدمين", en: "Edit users" },
  "users.delete": { ar: "حذف المستخدمين", en: "Delete users" },
  "roles.manage": { ar: "إدارة الأدوار والصلاحيات", en: "Manage roles & permissions" },
  "documents.view": { ar: "عرض المستندات", en: "View documents" },
  "documents.create": { ar: "إنشاء وتعديل المستندات", en: "Create & edit documents" },
  "documents.sign": { ar: "توقيع المستندات", en: "Sign documents" },
  "documents.delete": { ar: "حذف المستندات", en: "Delete documents" },
  "accounting.view": { ar: "عرض الفواتير", en: "View invoices" },
  "accounting.manage": { ar: "إدارة الفواتير", en: "Manage invoices" },
  "clients.view": { ar: "عرض العملاء", en: "View clients" },
  "clients.manage": { ar: "إدارة العملاء", en: "Manage clients" },
  "projects.view": { ar: "عرض المشاريع", en: "View projects" },
  "projects.manage": { ar: "إدارة المشاريع", en: "Manage projects" },
  "reports.view": { ar: "عرض التقارير", en: "View reports" },
  "audit.view": { ar: "عرض سجل العمليات", en: "View audit log" },
  "settings.manage": { ar: "إدارة الإعدادات", en: "Manage settings" },
};

export const PERMISSION_GROUPS: { key: string; ar: string; en: string; items: AppPermission[] }[] = [
  {
    key: "hr",
    ar: "الموارد البشرية",
    en: "Human resources",
    items: [
      "hr.employees.view",
      "hr.employees.create",
      "hr.employees.edit",
      "hr.employees.delete",
      "hr.attendance.view",
      "hr.attendance.manage",
      "hr.leaves.view",
      "hr.leaves.manage",
      "hr.resignations.view",
      "hr.resignations.manage",
      "hr.contact.view",
      "hr.contact.manage",
      "hr.payroll.view",
      "hr.payroll.manage",
      "hr.contracts.view",
      "hr.contracts.manage",
      "hr.recruitment.view",
      "hr.recruitment.manage",
    ],
  },
  {
    key: "users",
    ar: "المستخدمون والأدوار",
    en: "Users & roles",
    items: ["users.view", "users.create", "users.edit", "users.delete", "roles.manage"],
  },
  {
    key: "docs",
    ar: "المستندات والتوقيع",
    en: "Documents & signing",
    items: ["documents.view", "documents.create", "documents.sign", "documents.delete"],
  },
  {
    key: "finance",
    ar: "المالية",
    en: "Finance",
    items: ["accounting.view", "accounting.manage"],
  },
  {
    key: "crm",
    ar: "العملاء",
    en: "Clients",
    items: ["clients.view", "clients.manage"],
  },
  {
    key: "pm",
    ar: "المشاريع",
    en: "Projects",
    items: ["projects.view", "projects.manage"],
  },
  {
    key: "system",
    ar: "النظام والرقابة",
    en: "System & control",
    items: ["reports.view", "audit.view", "settings.manage"],
  },
];

/** Legacy coarse / granular roles → module packs. */
const LEGACY_ROLE_MAP: Record<string, AppRole[]> = {
  super_admin: ["super_admin"],
  hr_manager: [
    "hr.employees.manage",
    "hr.attendance.manage",
    "hr.leaves.manage",
    "hr.resignations.manage",
    "hr.contact.manage",
    "hr.payroll.manage",
    "hr.contracts.manage",
    "hr.recruitment.manage",
  ],
  accountant: ["hr.payroll.manage"],
  project_manager: ["pm.projects.manage", "crm.clients.manage"],
  employee: ["employee.base"],
  // Collapse old granular HR roles into module roles
  "hr.employees.view": ["hr.employees.manage"],
  "hr.employees.create": ["hr.employees.manage"],
  "hr.employees.edit": ["hr.employees.manage"],
  "hr.employees.delete": ["hr.employees.manage"],
  "hr.attendance.view": ["hr.attendance.manage"],
  "hr.leaves.view": ["hr.leaves.manage"],
  // مالية مخفية مؤقتاً — حوّل قوالب المحاسبة القديمة لرواتب
  "finance.invoices.view": ["hr.payroll.manage"],
  "finance.invoices.manage": ["hr.payroll.manage"],
};

const ROLE_SET = new Set<string>(ROLES);

export function isAppRole(value: string): value is AppRole {
  return ROLE_SET.has(value);
}

export function getRoleLabel(role: AppRole, lang: "ar" | "en" = "ar") {
  return ROLE_LABELS[role]?.[lang] ?? role;
}

/** Expand legacy role names, collapse granular HR → module roles. */
export function migrateRoles(input: unknown, fallback?: string): AppRole[] {
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? [input]
      : fallback
        ? [fallback]
        : [];
  const expanded: AppRole[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const mapped = LEGACY_ROLE_MAP[item];
    if (mapped) {
      expanded.push(...mapped);
      continue;
    }
    if (isAppRole(item)) {
      expanded.push(item);
    }
  }
  const unique = [...new Set(expanded)];
  return sortRoles(unique.length > 0 ? unique : (["employee.base"] as AppRole[]));
}

export function permissionsForRole(role: AppRole): AppPermission[] {
  if (role === "super_admin") return [...PERMISSIONS];
  return [...ROLE_PERMISSIONS[role]];
}

/** Permissions that unlock ERP (not personal portal). */
export const ERP_MODULE_PERMISSIONS: AppPermission[] = [
  "hr.employees.view",
  "hr.employees.create",
  "hr.employees.edit",
  "hr.employees.delete",
  "hr.attendance.view",
  "hr.attendance.manage",
  "hr.leaves.view",
  "hr.leaves.manage",
  "hr.resignations.view",
  "hr.resignations.manage",
  "hr.contact.view",
  "hr.contact.manage",
  "hr.payroll.view",
  "hr.payroll.manage",
  "hr.contracts.view",
  "hr.contracts.manage",
  "hr.recruitment.view",
  "hr.recruitment.manage",
  "users.view",
  "users.create",
  "users.edit",
  "users.delete",
  "roles.manage",
  // accounting.* مخفي مؤقتاً مع قسم المالية في الشريط — لا يفتح ERP لوحده
  "clients.view",
  "clients.manage",
  "projects.view",
  "projects.manage",
  "reports.view",
  "audit.view",
  "settings.manage",
];

export function hasErpAccess(permissions: AppPermission[], isSuperAdmin: boolean) {
  if (isSuperAdmin) return true;
  return permissions.some((p) => ERP_MODULE_PERMISSIONS.includes(p));
}
