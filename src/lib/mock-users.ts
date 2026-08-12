import { migrateRoles, permissionsForRole, type AppPermission, type AppRole } from "./permissions";

export type MockUser = {
  id: string;
  username: string;
  code: string;
  full_name: string;
  /** Primary / display role */
  role: AppRole;
  /** All assigned granular roles */
  roles: AppRole[];
  job_title: string;
  department: string;
  phone: string;
  hire_date: string;
  email: string;
};

export { permissionsForRole };
export type { AppPermission, AppRole };

export const MOCK_USERS: MockUser[] = [
  {
    id: "user-sadmin",
    username: "sadmin",
    code: "222",
    full_name: "Super Admin",
    role: "super_admin",
    roles: ["super_admin"],
    job_title: "مدير النظام",
    department: "الإدارة التنفيذية",
    phone: "+962 7 9000 0000",
    hire_date: "2021-01-04",
    email: "sadmin@staff.tawqi3i.jo",
  },
  {
    id: "user-sami",
    username: "sami",
    code: "1234",
    full_name: "Sami Rasekh",
    role: "super_admin",
    roles: ["super_admin"],
    job_title: "المدير التنفيذي",
    department: "الإدارة التنفيذية",
    phone: "+962 7 9111 1111",
    hire_date: "2021-01-04",
    email: "sami@staff.tawqi3i.jo",
  },
  {
    id: "user-raed",
    username: "raed",
    code: "1234",
    full_name: "Raed Abu Sanad",
    role: "pm.projects.manage",
    roles: migrateRoles("project_manager"),
    job_title: "المدير التقني",
    department: "التقنية",
    phone: "+962 7 9222 2222",
    hire_date: "2021-02-01",
    email: "raed@staff.tawqi3i.jo",
  },
  {
    id: "user-layla",
    username: "layla",
    code: "1234",
    full_name: "ليلى العمري",
    role: "hr.employees.manage",
    roles: migrateRoles("hr_manager"),
    job_title: "مديرة الموارد البشرية",
    department: "الموارد البشرية",
    phone: "+962 7 9333 3333",
    hire_date: "2022-03-15",
    email: "layla@staff.tawqi3i.jo",
  },
  {
    id: "user-omar",
    username: "omar",
    code: "1234",
    full_name: "عمر الخطيب",
    role: "hr.payroll.manage",
    roles: migrateRoles("accountant"),
    job_title: "مسؤول رواتب",
    department: "المالية",
    phone: "+962 7 9444 4444",
    hire_date: "2022-06-01",
    email: "omar@staff.tawqi3i.jo",
  },
  {
    id: "user-nour",
    username: "nour",
    code: "1234",
    full_name: "نور الشامي",
    role: "employee.base",
    roles: migrateRoles("employee"),
    job_title: "أخصائية دعم فني",
    department: "الدعم الفني",
    phone: "+962 7 9555 5555",
    hire_date: "2023-09-10",
    email: "nour@staff.tawqi3i.jo",
  },
  {
    id: "user-yazan",
    username: "yazan",
    code: "1234",
    full_name: "يزن الحمود",
    role: "employee.base",
    roles: migrateRoles("employee"),
    job_title: "مطور واجهات",
    department: "التقنية",
    phone: "+962 7 9666 6666",
    hire_date: "2024-01-20",
    email: "yazan@staff.tawqi3i.jo",
  },
];

export function findMockUser(username: string, code: string) {
  const normalized = username.trim().toLowerCase();
  return MOCK_USERS.find((user) => user.username === normalized && user.code === code) ?? null;
}
