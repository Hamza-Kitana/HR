import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  FileSignature,
  Fingerprint,
  Gauge,
  GitBranch,
  Landmark,
  LayoutDashboard,
  Plug,
  Receipt,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRoundCheck,
  Users,
  Wallet,
} from "lucide-react";

import heroImage from "@/assets/hero-signature.jpg";
import { Reveal } from "@/components/site/reveal";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { useI18n, type TranslationKey } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "توقيعي | التوقيع الإلكتروني والهوية الرقمية في الأردن" },
      {
        name: "description",
        content:
          "شركة توقيعي: توقيع إلكتروني قانوني، تحقق من الهوية، مصادقة ثنائية، وأتمتة الموافقات وإدارة العقود للبنوك والجهات الحكومية والشركات الكبيرة.",
      },
      { property: "og:title", content: "توقيعي | التوقيع الإلكتروني والهوية الرقمية" },
      {
        property: "og:description",
        content: "حوّل معاملاتك الورقية إلى مسارات رقمية آمنة وقانونية مع منصة توقيعي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const services: { icon: typeof FileSignature; title: TranslationKey; desc: TranslationKey }[] = [
  { icon: FileSignature, title: "svc.esign.t", desc: "svc.esign.d" },
  { icon: Fingerprint, title: "svc.identity.t", desc: "svc.identity.d" },
  { icon: UserRoundCheck, title: "svc.verify.t", desc: "svc.verify.d" },
  { icon: ShieldCheck, title: "svc.2fa.t", desc: "svc.2fa.d" },
  { icon: GitBranch, title: "svc.flow.t", desc: "svc.flow.d" },
  { icon: ScrollText, title: "svc.docs.t", desc: "svc.docs.d" },
  { icon: Plug, title: "svc.integrate.t", desc: "svc.integrate.d" },
  { icon: Sparkles, title: "svc.support.t", desc: "svc.support.d" },
];

const steps: { title: TranslationKey; desc: TranslationKey }[] = [
  { title: "how.1.t", desc: "how.1.d" },
  { title: "how.2.t", desc: "how.2.d" },
  { title: "how.3.t", desc: "how.3.d" },
  { title: "how.4.t", desc: "how.4.d" },
  { title: "how.5.t", desc: "how.5.d" },
  { title: "how.6.t", desc: "how.6.d" },
];

const sectors: { icon: typeof Landmark; label: TranslationKey }[] = [
  { icon: Landmark, label: "clients.banks" },
  { icon: ShieldCheck, label: "clients.insurance" },
  { icon: Building2, label: "clients.gov" },
  { icon: Users, label: "clients.enterprise" },
  { icon: Wallet, label: "clients.finance" },
];

const erpModules: { icon: typeof Users; label: TranslationKey }[] = [
  { icon: Users, label: "erp.hr" },
  { icon: Receipt, label: "erp.acc" },
  { icon: Building2, label: "erp.crm" },
  { icon: Gauge, label: "erp.pm" },
  { icon: ScrollText, label: "erp.audit" },
  { icon: ShieldCheck, label: "erp.roles" },
];

function Landing() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="pointer-events-none absolute inset-0 grid-noise opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
          <div className="pointer-events-none absolute -top-24 end-[-6rem] size-[30rem] rounded-full bg-primary/12 blur-3xl animate-float" />
          <div className="pointer-events-none absolute top-40 start-[-8rem] size-[24rem] rounded-full bg-accent/12 blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-8">
              <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-semibold text-muted-foreground shadow-soft backdrop-blur">
                <BadgeCheck className="size-4 text-primary" />
                {t("hero.badge")}
              </span>

              <h1 className="animate-fade-up text-3xl leading-[1.15] font-extrabold text-balance sm:text-5xl md:text-6xl [animation-delay:120ms]">
                {t("hero.title1")}{" "}
                <span className="relative inline-block text-gradient-brand">
                  {t("hero.title2")}
                  <svg
                    viewBox="0 0 320 22"
                    className="absolute -bottom-2 start-0 h-3 w-full text-primary/50"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M3 15c60-12 130 8 190-2 40-6 80-4 124 2"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="1200"
                      className="animate-draw"
                    />
                  </svg>
                </span>
              </h1>

              <p className="max-w-xl animate-fade-up text-base leading-relaxed text-muted-foreground md:text-lg [animation-delay:220ms]">
                {t("hero.desc")}
              </p>

              <div className="flex animate-fade-up flex-wrap items-center gap-3 [animation-delay:320ms]">
                <Button asChild size="lg" className="rounded-xl bg-brand px-6 text-brand-foreground shadow-glow hover-lift">
                  <a href="#contact">
                    {t("cta.demo")}
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl border-border bg-card px-6 text-foreground hover:bg-secondary">
                  <a href="#platform">{t("cta.explore")}</a>
                </Button>
              </div>

              <dl className="grid animate-fade-up gap-4 pt-4 sm:grid-cols-3 [animation-delay:420ms]">
                {[
                  { value: "< 2", label: t("hero.stat1"), icon: Timer },
                  { value: "100%", label: t("hero.stat2"), icon: ScrollText },
                  { value: "AES-256", label: t("hero.stat3"), icon: ShieldCheck },
                ].map((stat) => (
                  <div key={stat.label} className="surface-panel p-4">
                    <stat.icon className="mb-2 size-4 text-primary" />
                    <dt className="font-display text-xl font-bold">{stat.value}</dt>
                    <dd className="text-xs text-muted-foreground">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative animate-scale-in [animation-delay:200ms]">
              <div className="absolute inset-0 -rotate-3 rounded-[2rem] bg-brand opacity-20 blur-2xl" />
              <img
                src={heroImage}
                alt="مستند رقمي موقّع إلكترونيًا مع بصمة تحقق من الهوية"
                width={1280}
                height={960}
                className="relative w-full rounded-[1.75rem] border border-border/60 shadow-lift"
              />
              <div className="absolute -bottom-6 start-4 flex items-center gap-3 rounded-2xl border border-border glass px-4 py-3 shadow-lift animate-float">
                <span className="relative grid size-9 place-items-center rounded-xl bg-success/15 text-success">
                  <BadgeCheck className="size-5" />
                  <span className="absolute inset-0 rounded-xl animate-pulse-ring" />
                </span>
                <span className="text-xs leading-tight">
                  <span className="block font-semibold">{t("doc.signed")}</span>
                  <span className="text-muted-foreground">TQ-9F2A71C4</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="relative py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <Reveal className="max-w-2xl space-y-4">
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
                {t("services.eyebrow")}
              </span>
              <h2 className="text-3xl font-bold text-balance md:text-4xl">{t("services.title")}</h2>
              <p className="text-muted-foreground">{t("services.desc")}</p>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service, index) => (
                <Reveal key={service.title} delay={index * 70}>
                  <article className="group surface-panel h-full p-6 hover-lift">
                    <span className="mb-4 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                      <service.icon className="size-5" />
                    </span>
                    <h3 className="mb-2 text-base font-bold">{t(service.title)}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{t(service.desc)}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="platform" className="relative overflow-hidden bg-ink-gradient py-24 text-ink-foreground">
          <div className="pointer-events-none absolute inset-0 grid-noise opacity-[0.06]" />
          <div className="pointer-events-none absolute bottom-[-8rem] end-[-6rem] size-[26rem] rounded-full bg-primary/25 blur-3xl" />

          <div className="relative mx-auto w-full max-w-6xl px-4">
            <Reveal className="max-w-2xl space-y-4">
              <span className="text-xs font-bold tracking-[0.2em] text-primary-glow uppercase">
                {t("how.eyebrow")}
              </span>
              <h2 className="text-3xl font-bold text-balance md:text-4xl">{t("how.title")}</h2>
            </Reveal>

            <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {steps.map((step, index) => (
                <Reveal as="li" key={step.title} delay={index * 80}>
                  <div className="group relative h-full overflow-hidden rounded-2xl border border-ink-foreground/15 bg-ink-foreground/[0.06] p-6 backdrop-blur transition-colors hover:border-primary-glow/50">
                    <span className="font-display text-4xl font-extrabold text-primary-glow/45">
                      0{index + 1}
                    </span>
                    <h3 className="mt-3 text-base font-bold text-ink-foreground">{t(step.title)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-foreground/75">{t(step.desc)}</p>
                    <span className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary-glow/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* CLIENTS */}
        <section id="clients" className="py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <Reveal className="max-w-2xl space-y-4">
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
                {t("clients.eyebrow")}
              </span>
              <h2 className="text-3xl font-bold text-balance md:text-4xl">{t("clients.title")}</h2>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {sectors.map((sector, index) => (
                <Reveal key={sector.label} delay={index * 60}>
                  <div className="surface-panel flex h-full flex-col items-center gap-3 p-6 text-center hover-lift">
                    <sector.icon className="size-6 text-primary" />
                    <span className="text-sm font-semibold">{t(sector.label)}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CAREERS CTA */}
        <section className="pb-16">
          <div className="mx-auto w-full max-w-6xl px-4">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2rem] border border-border bg-ink-gradient px-8 py-12 text-ink-foreground md:px-12">
                <div className="pointer-events-none absolute -end-10 -top-16 size-64 rounded-full bg-primary/30 blur-3xl" />
                <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                  <div className="max-w-xl space-y-3">
                    <h2 className="font-display text-3xl font-bold text-balance">{t("careers.ctaTitle")}</h2>
                    <p className="text-sm leading-relaxed text-ink-foreground/80 md:text-base">{t("careers.ctaDesc")}</p>
                  </div>
                  <Button asChild size="lg" className="rounded-xl bg-brand text-brand-foreground shadow-glow">
                    <Link to="/careers">
                      {t("careers.ctaBtn")}
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ERP */}
        <section className="pb-28">
          <div className="mx-auto w-full max-w-6xl px-4">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-8 shadow-soft md:p-12">
                <div className="pointer-events-none absolute -top-24 -end-16 size-72 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative grid gap-10 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-5">
                    <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      <LayoutDashboard className="size-3.5" />
                      {t("erp.eyebrow")}
                    </span>
                    <h2 className="text-3xl font-bold text-balance md:text-4xl">{t("erp.title")}</h2>
                    <p className="leading-relaxed text-muted-foreground">{t("erp.desc")}</p>
                    <Button asChild size="lg" className="rounded-xl bg-brand text-brand-foreground shadow-glow hover-lift">
                      <Link to="/auth">{t("footer.login")}</Link>
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {erpModules.map((module, index) => (
                      <Reveal key={module.label} delay={index * 60}>
                        <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:border-primary/40">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                            <module.icon className="size-4" />
                          </span>
                          <span className="text-sm font-semibold">{t(module.label)}</span>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
