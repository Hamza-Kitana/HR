/** Mock datasets still used by seeded org data and (temporarily hidden) finance pages */

export const MOCK_EXPENSES = [
  { id: "ex1", title: "إيجار المكتب - آب", category: "تشغيل", amount: 4500, date: "2026-08-01", status: "paid" as const, vendor: "عقارات العاصمة" },
  { id: "ex2", title: "اشتراكات سحابية", category: "تقنية", amount: 820, date: "2026-08-03", status: "paid" as const, vendor: "AWS" },
  { id: "ex3", title: "حملة تسويق رقمي", category: "تسويق", amount: 1600, date: "2026-08-05", status: "pending" as const, vendor: "Digital Pulse" },
  { id: "ex4", title: "صيانة أجهزة", category: "تشغيل", amount: 340, date: "2026-08-06", status: "approved" as const, vendor: "TechCare JO" },
];

export const MOCK_INCOME = [
  { id: "in1", title: "عقد توقيع - بنك الأردن الرقمي", source: "مشاريع", amount: 18500, date: "2026-07-15", status: "received" as const },
  { id: "in2", title: "اشتراك سنوي - الشرق للتأمين", source: "اشتراكات", amount: 9200, date: "2026-08-02", status: "received" as const },
  { id: "in3", title: "دفعة مشروع حكومي", source: "مشاريع", amount: 12000, date: "2026-08-08", status: "expected" as const },
  { id: "in4", title: "خدمات استشارية", source: "استشارات", amount: 3500, date: "2026-08-04", status: "received" as const },
];

export const MOCK_PAYMENTS = [
  { id: "pm1", ref: "PAY-2026-041", party: "عقارات العاصمة", method: "تحويل بنكي", amount: 4500, date: "2026-08-01", status: "completed" as const },
  { id: "pm2", ref: "PAY-2026-042", party: "ليلى العمري", method: "راتب", amount: 2370, date: "2026-07-28", status: "completed" as const },
  { id: "pm3", ref: "PAY-2026-043", party: "Digital Pulse", method: "بطاقة", amount: 1600, date: "2026-08-05", status: "pending" as const },
  { id: "pm4", ref: "PAY-2026-044", party: "وزارة الاقتصاد الرقمي", method: "وارد", amount: 12000, date: "2026-08-08", status: "scheduled" as const },
];

export const MOCK_JOURNAL = [
  { id: "je1", entry: "JE-2401", date: "2026-08-01", description: "إثبات إيجار المكتب", debit: 4500, credit: 4500, account: "مصاريف تشغيل / نقدية" },
  { id: "je2", entry: "JE-2402", date: "2026-08-02", description: "تحصيل فاتورة TQ-2026-002", debit: 9200, credit: 9200, account: "بنك / ذمم مدينة" },
  { id: "je3", entry: "JE-2403", date: "2026-08-04", description: "صرف رواتب يوليو", debit: 11455, credit: 11455, account: "رواتب / بنك" },
  { id: "je4", entry: "JE-2404", date: "2026-08-06", description: "مشتريات تقنية", debit: 820, credit: 820, account: "مصاريف تقنية / بنك" },
];

export const MOCK_TAX = [
  { id: "tx1", period: "Q2 2026", type: "ضريبة مبيعات", amount: 2850, due: "2026-07-31", status: "filed" as const },
  { id: "tx2", period: "Q2 2026", type: "ضريبة دخل تقديرية", amount: 4200, due: "2026-07-31", status: "filed" as const },
  { id: "tx3", period: "Jul 2026", type: "ضريبة مقتطعة", amount: 960, due: "2026-08-15", status: "due" as const },
  { id: "tx4", period: "Q3 2026", type: "ضريبة مبيعات", amount: 0, due: "2026-10-31", status: "open" as const },
];

export const MOCK_BRANCHES = [
  { id: "br1", name: "الفرع الرئيسي - عبدون", city: "عمّان", manager: "Sami Rasekh", employees: 12, status: "active" as const },
  { id: "br2", name: "مكتب إربد", city: "إربد", manager: "يزن الحمود", employees: 3, status: "active" as const },
  { id: "br3", name: "مكتب العقبة", city: "العقبة", manager: "—", employees: 0, status: "planned" as const },
];

export const MOCK_DEPARTMENTS = [
  { id: "dp1", name: "الإدارة التنفيذية", head: "Sami Rasekh", employees: 2, budget: 18000 },
  { id: "dp2", name: "الموارد البشرية", head: "ليلى العمري", employees: 3, budget: 6500 },
  { id: "dp3", name: "المالية", head: "عمر الخطيب", employees: 2, budget: 7200 },
  { id: "dp4", name: "التقنية", head: "Raed Abu Sanad", employees: 5, budget: 22000 },
  { id: "dp5", name: "الدعم الفني", head: "نور الشامي", employees: 4, budget: 4800 },
];
