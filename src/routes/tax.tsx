import { createFileRoute } from "@tanstack/react-router";

import { StatusBadge } from "@/components/app/app-shell";
import { ErpModulePage } from "@/components/app/erp-module-page";
import { MOCK_TAX } from "@/lib/erp-modules";

export const Route = createFileRoute("/tax")({
  head: () => ({ meta: [{ title: "الضريبة | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: TaxPage,
});

function TaxPage() {
  const due = MOCK_TAX.filter((t) => t.status === "due").reduce((s, t) => s + t.amount, 0);
  return (
    <ErpModulePage
      title="nav.tax"
      description="متابعة الالتزامات الضريبية ومواعيد التقديم والدفع."
      actionLabel="إقرار جديد"
      stats={[
        { label: "مستحق حالياً", value: `${due.toLocaleString()} JOD` },
        { label: "مقدّم", value: MOCK_TAX.filter((t) => t.status === "filed").length },
        { label: "مفتوح", value: MOCK_TAX.filter((t) => t.status === "open").length },
        { label: "فترات", value: MOCK_TAX.length },
      ]}
      headers={["الفترة", "النوع", "المبلغ", "الاستحقاق", "الحالة"]}
      rows={MOCK_TAX.map((t) => [
        t.period,
        t.type,
        `${t.amount.toLocaleString()} JOD`,
        t.due,
        <StatusBadge
          key={t.id}
          tone={t.status === "filed" ? "success" : t.status === "due" ? "danger" : "neutral"}
        >
          {t.status === "filed" ? "مقدّم" : t.status === "due" ? "مستحق" : "مفتوح"}
        </StatusBadge>,
      ])}
    />
  );
}
