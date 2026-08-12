import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app/app-shell";
import { HrRequestsInbox } from "@/components/app/hr-requests-inbox";

export const Route = createFileRoute("/resignations")({
  head: () => ({ meta: [{ title: "الاستقالات | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: ResignationsPage,
});

function ResignationsPage() {
  return (
    <AppShell title="nav.resignations">
      <HrRequestsInbox
        type="resignation"
        titleKey="nav.resignations"
        descriptionAr="طلبات الاستقالة من الموظفين. HR يوافق أو يرفض ويصل الرد لليوزر."
        descriptionEn="Employee resignation requests. HR approves or rejects and the employee is notified."
      />
    </AppShell>
  );
}
