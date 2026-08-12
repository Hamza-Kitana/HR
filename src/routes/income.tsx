import { createFileRoute } from "@tanstack/react-router";

import { StatusBadge } from "@/components/app/app-shell";
import { ErpModulePage } from "@/components/app/erp-module-page";
import { MOCK_INCOME } from "@/lib/erp-modules";

export const Route = createFileRoute("/income")({
  head: () => ({ meta: [{ title: "الدخل | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: IncomePage,
});

function IncomePage() {
  const total = MOCK_INCOME.reduce((s, i) => s + i.amount, 0);
  const received = MOCK_INCOME.filter((i) => i.status === "received").reduce((s, i) => s + i.amount, 0);
  return (
    <ErpModulePage
      title="nav.income"
      description="تتبع الإيرادات المحصّلة والمتوقعة من العقود والاشتراكات."
      actionLabel="تسجيل دخل"
      stats={[
        { label: "إجمالي الدخل", value: `${total.toLocaleString("en-GB")} JOD` },
        { label: "محصّل", value: `${received.toLocaleString("en-GB")} JOD` },
        { label: "متوقع", value: MOCK_INCOME.filter((i) => i.status === "expected").length },
        { label: "عمليات", value: MOCK_INCOME.length },
      ]}
      headers={["البند", "المصدر", "المبلغ", "التاريخ", "الحالة"]}
      rows={MOCK_INCOME.map((i) => [
        i.title,
        i.source,
        `${i.amount.toLocaleString("en-GB")} JOD`,
        i.date,
        <StatusBadge key={i.id} tone={i.status === "received" ? "success" : "info"}>
          {i.status === "received" ? "محصّل" : "متوقع"}
        </StatusBadge>,
      ])}
    />
  );
}
