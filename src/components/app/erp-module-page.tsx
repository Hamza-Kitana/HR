import type { ReactNode } from "react";

import { AppShell, DataTable, PageHeader, StatCard } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { useI18n, type TranslationKey } from "@/lib/i18n";

export function ErpModulePage({
  title,
  description,
  actionLabel,
  stats,
  headers,
  rows,
}: {
  title: TranslationKey;
  description: string;
  actionLabel?: string;
  stats: { label: string; value: string | number; hint?: string }[];
  headers: string[];
  rows: ReactNode[][];
}) {
  const { t } = useI18n();
  return (
    <AppShell title={title}>
      <PageHeader
        title={title}
        description={description}
        action={
          actionLabel ? (
            <Button className="rounded-xl bg-brand text-brand-foreground shadow-glow">{actionLabel}</Button>
          ) : undefined
        }
      />
      {stats.length ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              {...(s.hint ? { hint: s.hint } : {})}
            />
          ))}
        </div>
      ) : null}
      <DataTable headers={headers.length ? headers : [t("common.name")]} rows={rows} />
    </AppShell>
  );
}
