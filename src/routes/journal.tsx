import { createFileRoute } from "@tanstack/react-router";

import { ErpModulePage } from "@/components/app/erp-module-page";
import { MOCK_JOURNAL } from "@/lib/erp-modules";

export const Route = createFileRoute("/journal")({
  head: () => ({ meta: [{ title: "قيود محاسبية | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: JournalPage,
});

function JournalPage() {
  const debit = MOCK_JOURNAL.reduce((s, j) => s + j.debit, 0);
  return (
    <ErpModulePage
      title="nav.journal"
      description="دفتر القيود اليومية مع توازن المدين والدائن لكل عملية."
      actionLabel="قيد جديد"
      stats={[
        { label: "عدد القيود", value: MOCK_JOURNAL.length },
        { label: "إجمالي المدين", value: `${debit.toLocaleString("en-GB")} JOD` },
        { label: "إجمالي الدائن", value: `${debit.toLocaleString("en-GB")} JOD` },
        { label: "الحالة", value: "متوازن", hint: "لا فروقات" },
      ]}
      headers={["رقم القيد", "التاريخ", "البيان", "الحسابات", "مدين", "دائن"]}
      rows={MOCK_JOURNAL.map((j) => [
        j.entry,
        j.date,
        j.description,
        j.account,
        `${j.debit.toLocaleString("en-GB")} JOD`,
        `${j.credit.toLocaleString("en-GB")} JOD`,
      ])}
    />
  );
}
