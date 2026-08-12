import { MOCK_USERS } from "./mock-users";

export type AttendanceRow = {
  id: string;
  employee: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "present" | "late" | "absent" | "leave" | "remote";
  lateMinutes: number;
  workMinutes: number;
};

export type LeaveRow = {
  id: string;
  employee: string;
  type: string;
  from: string;
  to: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
};

export type DocumentRow = {
  id: string;
  title: string;
  type: string;
  client: string;
  status: "draft" | "pending" | "signed" | "rejected" | "expired";
  dueDate: string;
  owner: string;
};

export type ClientRow = {
  id: string;
  name: string;
  sector: string;
  contact: string;
  email: string;
  status: "active" | "inactive";
};

export type ProjectRow = {
  id: string;
  name: string;
  client: string;
  manager: string;
  status: "active" | "completed" | "on_hold";
  progress: number;
};

export type InvoiceRow = {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  dueDate: string;
};

export type AuditRow = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  at: string;
};

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  kind: string;
  read: boolean;
  at: string;
};

export const MOCK_ATTENDANCE: AttendanceRow[] = [
  { id: "a1", employee: "ليلى العمري", date: "2026-08-06", checkIn: "08:02", checkOut: "16:45", status: "present", lateMinutes: 0, workMinutes: 523 },
  { id: "a2", employee: "عمر الخطيب", date: "2026-08-06", checkIn: "08:27", checkOut: "16:50", status: "late", lateMinutes: 27, workMinutes: 503 },
  { id: "a3", employee: "نور الشامي", date: "2026-08-06", checkIn: "07:55", checkOut: "16:30", status: "present", lateMinutes: 0, workMinutes: 515 },
  { id: "a4", employee: "يزن الحمود", date: "2026-08-06", checkIn: "09:10", checkOut: null, status: "late", lateMinutes: 70, workMinutes: 0 },
  { id: "a5", employee: "Raed Abu Sanad", date: "2026-08-06", checkIn: null, checkOut: null, status: "remote", lateMinutes: 0, workMinutes: 480 },
  { id: "a6", employee: "Sami Rasekh", date: "2026-08-05", checkIn: "08:00", checkOut: "17:10", status: "present", lateMinutes: 0, workMinutes: 550 },
];

export const MOCK_LEAVES: LeaveRow[] = [
  { id: "l1", employee: "نور الشامي", type: "سنوية", from: "2026-08-10", to: "2026-08-14", status: "pending", reason: "سفر عائلي" },
  { id: "l2", employee: "يزن الحمود", type: "مرضية", from: "2026-08-04", to: "2026-08-05", status: "approved", reason: "إجازة مرضية" },
  { id: "l3", employee: "عمر الخطيب", type: "طارئة", from: "2026-07-20", to: "2026-07-20", status: "rejected", reason: "ظرف طارئ" },
];

export const MOCK_DOCUMENTS: DocumentRow[] = [
  { id: "d1", title: "عقد خدمات توقيع إلكتروني", type: "عقد", client: "بنك الأردن الرقمي", status: "pending", dueDate: "2026-08-12", owner: "ليلى العمري" },
  { id: "d2", title: "اتفاقية سرية - شركة الشرق للتأمين", type: "NDA", client: "شركة الشرق للتأمين", status: "pending", dueDate: "2026-08-09", owner: "Sami Rasekh" },
  { id: "d3", title: "ملحق تكامل حكومي", type: "ملحق", client: "وزارة الاقتصاد الرقمي", status: "signed", dueDate: "2026-07-30", owner: "Raed Abu Sanad" },
  { id: "d4", title: "عرض سعر منصة التوقيع", type: "عرض", client: "مجموعة النخبة", status: "draft", dueDate: "2026-08-20", owner: "عمر الخطيب" },
  { id: "d5", title: "عقد دعم فني سنوي", type: "عقد", client: "فينتك عمّان", status: "expired", dueDate: "2026-06-01", owner: "ليلى العمري" },
];

export const MOCK_CLIENTS: ClientRow[] = [
  { id: "c1", name: "بنك الأردن الرقمي", sector: "بنوك", contact: "هاني المصري", email: "hani@jordigital.jo", status: "active" },
  { id: "c2", name: "شركة الشرق للتأمين", sector: "تأمين", contact: "سارة عبيد", email: "sara@sharq.jo", status: "active" },
  { id: "c3", name: "وزارة الاقتصاد الرقمي", sector: "حكومي", contact: "د. فادي ناصر", email: "fadi@mode.gov.jo", status: "active" },
  { id: "c4", name: "مجموعة النخبة", sector: "شركات", contact: "مالك خوري", email: "malek@nokhba.jo", status: "inactive" },
];

export const MOCK_PROJECTS: ProjectRow[] = [
  { id: "p1", name: "منصة التوقيع للبنك", client: "بنك الأردن الرقمي", manager: "Raed Abu Sanad", status: "active", progress: 72 },
  { id: "p2", name: "تكامل الهوية الحكومية", client: "وزارة الاقتصاد الرقمي", manager: "Raed Abu Sanad", status: "active", progress: 48 },
  { id: "p3", name: "أتمتة الموافقات", client: "شركة الشرق للتأمين", manager: "Sami Rasekh", status: "completed", progress: 100 },
  { id: "p4", name: "بوابة العملاء", client: "مجموعة النخبة", manager: "يزن الحمود", status: "on_hold", progress: 25 },
];

export const MOCK_INVOICES: InvoiceRow[] = [
  { id: "i1", number: "TQ-2026-001", client: "بنك الأردن الرقمي", amount: 18500, status: "paid", dueDate: "2026-07-15" },
  { id: "i2", number: "TQ-2026-002", client: "شركة الشرق للتأمين", amount: 9200, status: "sent", dueDate: "2026-08-18" },
  { id: "i3", number: "TQ-2026-003", client: "وزارة الاقتصاد الرقمي", amount: 24000, status: "overdue", dueDate: "2026-07-28" },
  { id: "i4", number: "TQ-2026-004", client: "فينتك عمّان", amount: 5600, status: "draft", dueDate: "2026-08-30" },
];

export const MOCK_AUDIT: AuditRow[] = [
  { id: "au1", actor: "Sami Rasekh", action: "document.signed", entity: "مستندات", at: "2026-08-06 09:12" },
  { id: "au2", actor: "ليلى العمري", action: "document.sent_for_signature", entity: "مستندات", at: "2026-08-06 08:40" },
  { id: "au3", actor: "عمر الخطيب", action: "invoice.created", entity: "فواتير", at: "2026-08-05 14:22" },
  { id: "au4", actor: "Super Admin", action: "user.role_updated", entity: "مستخدمون", at: "2026-08-05 11:05" },
  { id: "au5", actor: "نور الشامي", action: "leave.requested", entity: "إجازات", at: "2026-08-04 16:18" },
];

export const MOCK_NOTIFICATIONS: NotificationRow[] = [
  { id: "n1", title: "مستند بانتظار توقيعك", body: "اتفاقية سرية - شركة الشرق للتأمين", kind: "signature", read: false, at: "منذ ساعة" },
  { id: "n2", title: "طلب إجازة جديد", body: "نور الشامي أرسلت طلب إجازة سنوية", kind: "hr", read: false, at: "منذ 3 ساعات" },
  { id: "n3", title: "تنبيه تأخير", body: "تم تسجيل حالات تأخير في دوام اليوم", kind: "attendance", read: true, at: "اليوم" },
];

export const MOCK_EMPLOYEES = MOCK_USERS.map((u) => ({
  id: u.id,
  full_name: u.full_name,
  username: u.username,
  job_title: u.job_title,
  department: u.department,
  phone: u.phone,
  hire_date: u.hire_date,
  role: u.role,
  is_active: true,
  salary: u.username === "sadmin" ? 0 : u.username === "sami" ? 4500 : u.username === "raed" ? 4000 : u.username === "layla" ? 2200 : u.username === "omar" ? 1900 : u.username === "nour" ? 1100 : 1500,
}));

/** @deprecated Use ERP_NAV from `@/lib/erp-nav` */
export const APP_NAV = [] as const;
