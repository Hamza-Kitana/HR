import { createFileRoute } from "@tanstack/react-router";
import { Building2, Mail, MapPin, Phone, Target, Users } from "lucide-react";

import { Reveal } from "@/components/site/reveal";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/company")({
  head: () => ({
    meta: [
      { title: "عن شركة توقيعي | الإدارة والرؤية" },
      {
        name: "description",
        content:
          "تعرّف على شركة توقيعي الأردنية: تأسست 2021، متخصصة بالتوقيع الإلكتروني والهوية الرقمية، بقيادة Sami Rasekh وRaed Abu Sanad.",
      },
      { property: "og:title", content: "عن شركة توقيعي" },
      {
        property: "og:description",
        content: "شركة أردنية تقنية متخصصة بالتوقيع الإلكتروني والهوية الرقمية وأتمتة العمليات.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompanyPage,
});

function CompanyPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 pt-36 pb-24">
        <Reveal className="space-y-5">
          <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
            {t("footer.company")}
          </span>
          <h1 className="text-4xl font-extrabold text-balance md:text-5xl">
            <span className="text-gradient-brand">{t("brand.name")}</span> — {t("brand.tagline")}
          </h1>
          <p className="max-w-2xl leading-relaxed text-muted-foreground">{t("footer.about")}</p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Building2, k: "تأسست", v: "2021" },
            { icon: MapPin, k: "المقر", v: "عمّان، الأردن" },
            { icon: Target, k: "التخصص", v: "التوقيع الإلكتروني والأتمتة" },
          ].map((item, index) => (
            <Reveal key={item.k} delay={index * 80}>
              <div className="surface-panel h-full p-6 hover-lift">
                <item.icon className="mb-3 size-5 text-primary" />
                <p className="text-xs text-muted-foreground">{item.k}</p>
                <p className="font-display text-lg font-bold">{item.v}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-16 space-y-6">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="size-5 text-primary" />
            {t("leadership.eyebrow")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "Sami Rasekh", role: t("leadership.ceo"), initials: "SR" },
              { name: "Raed Abu Sanad", role: t("leadership.cto"), initials: "RA" },
            ].map((person) => (
              <div key={person.name} className="surface-panel flex items-center gap-4 p-6 hover-lift">
                <span className="grid size-14 place-items-center rounded-2xl bg-brand font-display text-lg font-bold text-brand-foreground shadow-glow">
                  {person.initials}
                </span>
                <span>
                  <span className="block font-display text-lg font-bold">{person.name}</span>
                  <span className="text-sm text-muted-foreground">{person.role}</span>
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-16">
          <div className="surface-panel grid gap-4 p-8 sm:grid-cols-3">
            <span className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-primary" /> info@tawqi3i.jo
            </span>
            <span className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-primary" /> +962 6 500 0000
            </span>
            <span className="flex items-center gap-2 text-sm">
              <MapPin className="size-4 text-primary" /> عمّان، الأردن
            </span>
          </div>
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}