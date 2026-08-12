import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app/app-shell";
import { HrRequestsInbox } from "@/components/app/hr-requests-inbox";

export const Route = createFileRoute("/contact-changes")({
  ssr: false,
  head: () => ({
    meta: [{ title: "تعديل بيانات التواصل | توقيعي" }, { name: "robots", content: "noindex" }],
  }),
  component: ContactChangesPage,
});

function ContactChangesPage() {
  return (
    <AppShell title="nav.contactChanges">
      <HrRequestsInbox
        type="contact_change"
        titleKey="nav.contactChanges"
        descriptionAr="طلبات الموظفين لتغيير الإيميل أو رقم الهاتف — الموافقة تحدّث البيانات فوراً."
        descriptionEn="Employee requests to change email or phone — approval updates records immediately."
      />
    </AppShell>
  );
}
