import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACTIVITY_MODULE_LABELS,
  formatActivityWhen,
  useActivityLog,
  type ActivityModule,
} from "@/lib/activity-log";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audit")({
  ssr: false,
  head: () => ({ meta: [{ title: "اللوجات | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: LogsPage,
});

const MODULES: Array<ActivityModule | "all"> = [
  "all",
  "auth",
  "employees",
  "attendance",
  "leaves",
  "payroll",
  "recruitment",
  "org",
  "navigation",
  "profile",
  "system",
];

function LogsPage() {
  const { t, lang } = useI18n();
  const { entries, clear } = useActivityLog();
  const [module, setModule] = useState<ActivityModule | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (module !== "all" && e.module !== module) return false;
      if (!query) return true;
      const hay = [
        e.actorName,
        e.actorUsername,
        e.action,
        e.actionEn,
        e.entity,
        e.entityEn,
        e.details ?? "",
        e.detailsEn ?? "",
        e.path ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [entries, module, q]);

  const todayCount = entries.filter((e) => e.at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  return (
    <AppShell title="nav.audit">
      <PageHeader
        title="nav.audit"
        description={
          lang === "ar"
            ? "كل شي بصير بالموقع يظهر هنا: دخول، موظفين، حضور، إجازات، هيكل تنظيمي، وتنقل الصفحات."
            : "Everything that happens in the app shows here: auth, HR, attendance, leaves, org, and page navigation."
        }
        action={
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              if (!entries.length) return;
              clear();
              toast.success(lang === "ar" ? "تم تفريغ اللوجات" : "Logs cleared");
            }}
          >
            {lang === "ar" ? "تفريغ اللوجات" : "Clear logs"}
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={lang === "ar" ? "إجمالي السجلات" : "Total entries"} value={entries.length} />
        <StatCard label={lang === "ar" ? "اليوم" : "Today"} value={todayCount} />
        <StatCard label={lang === "ar" ? "المعروض الآن" : "Showing"} value={filtered.length} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={lang === "ar" ? "بحث في اللوجات..." : "Search logs..."}
          className="max-w-md rounded-xl"
        />
        <div className="flex flex-wrap gap-2">
          {MODULES.map((id) => {
            const label =
              id === "all"
                ? lang === "ar"
                  ? "الكل"
                  : "All"
                : lang === "ar"
                  ? ACTIVITY_MODULE_LABELS[id].ar
                  : ACTIVITY_MODULE_LABELS[id].en;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setModule(id)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                  module === id
                    ? "bg-brand text-brand-foreground shadow-glow"
                    : "border border-border bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <DataTable
        headers={[
          t("common.date"),
          t("audit.actor"),
          lang === "ar" ? "القسم" : "Module",
          t("audit.action"),
          t("audit.entity"),
          lang === "ar" ? "التفاصيل" : "Details",
        ]}
        rows={
          filtered.length === 0
            ? [
                [
                  <span key="empty" className="text-muted-foreground">
                    {lang === "ar" ? "لا يوجد لوجات بعد — جرّب تعمل أي عملية بالموقع." : "No logs yet — try any action in the app."}
                  </span>,
                  "",
                  "",
                  "",
                  "",
                  "",
                ],
              ]
            : filtered.map((row) => [
                <span key={`${row.id}-at`} className="whitespace-nowrap font-mono text-xs" dir="ltr">
                  {formatActivityWhen(row.at, lang)}
                </span>,
                <div key={`${row.id}-actor`}>
                  <p className="font-semibold">{row.actorName}</p>
                  <p className="text-xs text-muted-foreground">@{row.actorUsername}</p>
                </div>,
                <StatusBadge key={`${row.id}-mod`} tone="info">
                  {lang === "ar" ? ACTIVITY_MODULE_LABELS[row.module].ar : ACTIVITY_MODULE_LABELS[row.module].en}
                </StatusBadge>,
                lang === "ar" ? row.action : row.actionEn,
                lang === "ar" ? row.entity : row.entityEn,
                <span key={`${row.id}-d`} className="max-w-xs text-xs text-muted-foreground">
                  {(lang === "ar" ? row.details : row.detailsEn || row.details) || row.path || "—"}
                </span>,
              ])
        }
      />
    </AppShell>
  );
}
