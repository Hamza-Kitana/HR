import { Link } from "@tanstack/react-router";
import { LockKeyhole, Mail, MapPin, Phone } from "lucide-react";

import { BrandMark } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="relative overflow-hidden bg-ink-gradient text-ink-foreground">
      <div className="pointer-events-none absolute inset-0 grid-noise opacity-[0.07]" />
      <div className="pointer-events-none absolute -top-32 start-1/4 size-[28rem] rounded-full bg-primary/25 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 lg:grid-cols-[1.4fr_1fr_1.2fr]">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="font-display text-xl font-bold text-ink-foreground">{t("brand.name")}</span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-foreground/80">{t("footer.about")}</p>
          <ul className="space-y-2 text-sm text-ink-foreground/80">
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-primary-glow" /> عمّان، الأردن
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-primary-glow" /> info@tawqi3i.jo
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-primary-glow" /> +962 6 500 0000
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-primary-glow">
            {t("footer.links")}
          </h3>
          <ul className="space-y-2.5 text-sm text-ink-foreground/80">
            <li>
              <a className="transition-colors hover:text-ink-foreground" href="#services">
                {t("nav.solutions")}
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-ink-foreground" href="#platform">
                {t("nav.platform")}
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-ink-foreground" href="#clients">
                {t("nav.clients")}
              </a>
            </li>
            <li>
              <Link className="transition-colors hover:text-ink-foreground" to="/company">
                {t("footer.company")}
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-ink-foreground" to="/careers">
                {t("nav.careers")}
              </Link>
            </li>
          </ul>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-ink-foreground/20 bg-ink-foreground/[0.06] p-6 backdrop-blur">
          <div className="pointer-events-none absolute -end-10 -top-10 size-32 rounded-full bg-primary-glow/20 blur-2xl" />
          <div className="relative space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/25 px-3 py-1 text-xs font-semibold text-primary-glow">
              <LockKeyhole className="size-3.5" />
              {t("footer.staff")}
            </span>
            <p className="text-sm leading-relaxed text-ink-foreground/80">{t("footer.staffDesc")}</p>
            <Button
              asChild
              className="w-full rounded-xl bg-brand font-semibold text-brand-foreground shadow-glow hover:opacity-95"
            >
              <Link to="/auth">{t("footer.login")}</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="relative border-t border-ink-foreground/15 py-5 text-center text-xs text-ink-foreground/65">
        © {year} — {t("footer.rights")}
      </div>
    </footer>
  );
}
