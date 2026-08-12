import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand-logo";
import { LanguageToggle, ThemeToggle } from "@/components/preference-toggles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { homePathForUser } from "@/lib/portal";
import { effectivePermissionsFor, findStaffByUsername } from "@/lib/staff";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "بوابة الموظفين | نظام توقيعي" },
      { name: "description", content: "تسجيل الدخول إلى نظام توقيعي الداخلي لموظفي الشركة المصرّح لهم." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "بوابة الموظفين | نظام توقيعي" },
      { property: "og:description", content: "الدخول مخصص لموظفي شركة توقيعي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { signIn, session, loading, permissions, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const home = homePathForUser(permissions, isSuperAdmin);

  useEffect(() => {
    if (!loading && session) void navigate({ to: home, replace: true });
  }, [loading, session, navigate, home]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim() || !code) return;
    setSubmitting(true);
    const { error } = await signIn(username, code);
    setSubmitting(false);
    if (error) {
      toast.error(t("auth.error"));
      return;
    }
    const staff = findStaffByUsername(username);
    const path = staff
      ? homePathForUser(effectivePermissionsFor(staff), staff.roles.includes("super_admin"))
      : "/dashboard";
    void navigate({ to: path, replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-gradient px-4 py-16">
      <div className="pointer-events-none absolute inset-0 grid-noise opacity-[0.07]" />
      <div className="pointer-events-none absolute -top-32 start-1/3 size-[30rem] rounded-full bg-primary/25 blur-3xl animate-float" />

      <div className="absolute top-5 end-5 z-10 flex items-center gap-1 text-ink-foreground [&_button]:text-ink-foreground [&_button:hover]:bg-ink-foreground/10">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="rounded-[1.75rem] border border-white/12 bg-card/95 p-8 shadow-lift backdrop-blur-xl">
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <BrandMark className="size-12" />
            <h1 className="font-display text-2xl font-bold">{t("auth.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("auth.username")}</Label>
              <div className="relative">
                <User className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  className="h-11 ps-9"
                  placeholder="sadmin"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="current-password"
                  className="h-11 ps-9"
                  placeholder="••••"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full rounded-xl bg-brand text-brand-foreground shadow-glow hover-lift"
            >
              {submitting ? t("auth.signingIn") : t("auth.signin")}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Button>
          </form>

          <p className="mt-5 flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            {t("auth.notice")}
          </p>

          <Link
            to="/"
            className="mt-5 block text-center text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("auth.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
