import { createFileRoute } from "@tanstack/react-router";

import { AppShell, DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { MOCK_INVOICES } from "@/lib/mock-data";

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "الفواتير | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { t } = useI18n();
  const total = MOCK_INVOICES.reduce((sum, i) => sum + i.amount, 0);
  const overdue = MOCK_INVOICES.filter((i) => i.status === "overdue").length;

  return (
    <AppShell title="nav.invoices">
      <PageHeader
        title="nav.invoices"
        action={<Button className="rounded-xl bg-brand text-brand-foreground">{t("inv.newInvoice")}</Button>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label={t("common.total")} value={`${total.toLocaleString("en-GB")} JOD`} />
        <StatCard label={t("inv.overdue")} value={overdue} />
      </div>
      <DataTable
        headers={[t("inv.number"), t("inv.client"), t("inv.amount"), t("inv.due"), t("common.status")]}
        rows={MOCK_INVOICES.map((i) => [
          i.number,
          i.client,
          `${i.amount.toLocaleString("en-GB")} JOD`,
          i.dueDate,
          <StatusBadge
            key={i.id}
            tone={i.status === "paid" ? "success" : i.status === "overdue" ? "danger" : i.status === "sent" ? "warning" : "neutral"}
          >
            {i.status === "paid"
              ? t("inv.paid")
              : i.status === "sent"
                ? t("inv.sent")
                : i.status === "overdue"
                  ? t("inv.overdue")
                  : t("doc.draft")}
          </StatusBadge>,
        ])}
      />
    </AppShell>
  );
}
