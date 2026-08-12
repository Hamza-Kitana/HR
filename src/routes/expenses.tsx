import { createFileRoute } from "@tanstack/react-router";

import { StatusBadge } from "@/components/app/app-shell";
import { ErpModulePage } from "@/components/app/erp-module-page";
import { MOCK_EXPENSES } from "@/lib/erp-modules";

export const Route = createFileRoute("/expenses")({
  ssr: false,
  head: () => ({ meta: [{ title: "المصاريف | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const total = MOCK_EXPENSES.reduce((s, e) => s + e.amount, 0);
  return (
    <ErpModulePage
      title="nav.expenses"
      description="تسجيل واعتماد مصاريف التشغيل والتسويق والتقنية."
      actionLabel="مصروف جديد"
      stats={[
        { label: "إجمالي المصاريف", value: `${total.toLocaleString("en-GB")} JOD` },
        { label: "مدفوعة", value: MOCK_EXPENSES.filter((e) => e.status === "paid").length },
        { label: "بانتظار الاعتماد", value: MOCK_EXPENSES.filter((e) => e.status === "pending").length },
        { label: "معتمدة", value: MOCK_EXPENSES.filter((e) => e.status === "approved").length },
      ]}
      headers={["البند", "التصنيف", "المورد", "المبلغ", "التاريخ", "الحالة"]}
      rows={MOCK_EXPENSES.map((e) => [
        e.title,
        e.category,
        e.vendor,
        `${e.amount.toLocaleString("en-GB")} JOD`,
        e.date,
        <StatusBadge key={e.id} tone={e.status === "paid" ? "success" : e.status === "pending" ? "warning" : "info"}>
          {e.status === "paid" ? "مدفوع" : e.status === "pending" ? "معلق" : "معتمد"}
        </StatusBadge>,
      ])}
    />
  );
}
