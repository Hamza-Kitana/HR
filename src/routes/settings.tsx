import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "الإعدادات | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  return (
    <AppShell title="nav.settings">
      <PageHeader title="nav.settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-panel space-y-4 p-6">
          <h3 className="font-bold">{t("settings.company")}</h3>
          <div className="space-y-2">
            <Label>{t("brand.name")}</Label>
            <Input defaultValue="توقيعي | Tawqi3i" />
          </div>
          <div className="space-y-2">
            <Label>المقر</Label>
            <Input defaultValue="عمّان، الأردن" />
          </div>
          <div className="space-y-2">
            <Label>البريد</Label>
            <Input defaultValue="info@tawqi3i.jo" />
          </div>
        </section>
        <section className="surface-panel space-y-4 p-6">
          <h3 className="font-bold">{t("settings.workHours")}</h3>
          <div className="space-y-2">
            <Label>{t("settings.startTime")}</Label>
            <Input defaultValue="08:00" type="time" />
          </div>
          <div className="space-y-2">
            <Label>{t("settings.appearance")}</Label>
            <p className="text-sm text-muted-foreground">اللغة والثيم من شريط الأدوات أعلى الصفحة.</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
