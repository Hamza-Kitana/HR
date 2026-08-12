import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app/app-shell";
import { HrRequestsInbox } from "@/components/app/hr-requests-inbox";

export const Route = createFileRoute("/leaves")({
  ssr: false,
  head: () => ({ meta: [{ title: "الإجازات | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: LeavesPage,
});

function LeavesPage() {
  return (
    <AppShell title="nav.leaves">
      <HrRequestsInbox
        type="leave"
        titleKey="nav.leaves"
        descriptionAr="طلبات الإجازة من الموظفين. HR يوافق أو يرفض ويصل الرد لليوزر."
        descriptionEn="Employee leave requests. HR approves or rejects and the employee is notified."
      />
    </AppShell>
  );
}
