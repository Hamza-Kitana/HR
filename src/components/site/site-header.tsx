import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { BrandLock } from "@/components/brand-logo";
import { LanguageToggle, ThemeToggle } from "@/components/preference-toggles";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "py-2" : "py-4",
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4">
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-2xl px-4 py-2.5 transition-all duration-500",
            scrolled ? "glass shadow-soft" : "border border-transparent",
          )}
        >
          <Link to="/" className="transition-opacity hover:opacity-80">
            <BrandLock />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "/#services", label: t("nav.solutions") },
              { href: "/#platform", label: t("nav.platform") },
              { href: "/#clients", label: t("nav.clients") },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="relative rounded-full px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/company"
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              {t("nav.company")}
            </Link>
            <Link
              to="/careers"
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              {t("nav.careers")}
            </Link>
          </nav>

          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            <Button asChild size="sm" className="ms-1 rounded-full bg-brand px-2.5 text-brand-foreground shadow-glow sm:px-3">
              <a href="#contact">
                <span className="max-w-[6.5rem] truncate sm:max-w-none">{t("cta.demo")}</span>
                <ArrowUpRight className="size-4 shrink-0" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}