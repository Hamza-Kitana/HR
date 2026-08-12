import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand text-brand-foreground shadow-glow",
        className,
      )}
    >
      <svg viewBox="0 0 48 48" fill="none" className="size-7">
        <path
          d="M8 32c6-2 8-16 13-16 4 0 3 12 7 12 3 0 5-4 12-6"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeDasharray="1200"
          className="animate-draw"
        />
        <path d="M10 39h28" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      </svg>
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[image:var(--gradient-sheen)] animate-sheen" />
    </span>
  );
}

export function BrandLock({ withTagline = true }: { withTagline?: boolean }) {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-3">
      <BrandMark />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-lg font-bold text-foreground">{t("brand.name")}</span>
        {withTagline ? (
          <span className="text-[0.7rem] text-foreground/65">{t("brand.tagline")}</span>
        ) : null}
      </span>
    </span>
  );
}