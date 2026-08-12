import { createFileRoute } from "@tanstack/react-router";

import { StatusBadge } from "@/components/app/app-shell";
import { ErpModulePage } from "@/components/app/erp-module-page";
import { MOCK_PAYMENTS } from "@/lib/erp-modules";

export const Route = createFileRoute("/payments")({
  head: () => ({ meta: [{ title: "الدفعات | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const total = MOCK_PAYMENTS.reduce((s, p) => s + p.amount, 0);
  return (
    <ErpModulePage
      title="nav.payments"
      description="سجل الدفعات الصادرة والواردة عبر التحويل والبطاقة والرواتب."
      actionLabel="دفعة جديدة"
      stats={[
        { label: "حجم الدفعات", value: `${total.toLocaleString()} JOD` },
        { label: "مكتملة", value: MOCK_PAYMENTS.filter((p) => p.status === "completed").length },
        { label: "معلقة", value: MOCK_PAYMENTS.filter((p) => p.status === "pending").length },
        { label: "مجدولة", value: MOCK_PAYMENTS.filter((p) => p.status === "scheduled").length },
      ]}
      headers={["المرجع", "الجهة", "الطريقة", "المبلغ", "التاريخ", "الحالة"]}
      rows={MOCK_PAYMENTS.map((p) => [
        p.ref,
        p.party,
        p.method,
        `${p.amount.toLocaleString()} JOD`,
        p.date,
        <StatusBadge
          key={p.id}
          tone={p.status === "completed" ? "success" : p.status === "pending" ? "warning" : "info"}
        >
          {p.status === "completed" ? "مكتمل" : p.status === "pending" ? "معلق" : "مجدول"}
        </StatusBadge>,
      ])}
    />
  );
}
