import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Briefcase,
  Building,
  CalendarDays,
  ClipboardList,
  Clock3,
  ContactRound,
  FileText,
  FileWarning,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  ScrollText,
  Settings,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { BrandMark } from "@/components/brand-logo";
import { EmployeeAvatar } from "@/components/app/employee-avatar";
import { LanguageToggle, ThemeToggle } from "@/components/preference-toggles";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { EMPLOYEE_NAV, filterErpNav } from "@/lib/erp-nav";
import { formatRequestWhen, useHrRequests } from "@/lib/hr-requests";
import { logActivity } from "@/lib/activity-log";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { getRoleLabel } from "@/lib/permissions";
import {
  homePathForUser,
  isEmployeePortalUser,
  isErpOnlyPath,
} from "@/lib/portal";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/me": LayoutDashboard,
  "/me-profile": UserRound,
  "/me-absences": CalendarDays,
  "/me-requests": ClipboardList,
  "/me-payroll": Wallet,
  "/employees": Users,
  "/attendance": Clock3,
  "/leaves": CalendarDays,
  "/resignations": FileWarning,
  "/contact-changes": ContactRound,
  "/payroll": Wallet,
  "/contracts": FileText,
  "/recruitment": Briefcase,
  "/branches": Building,
  "/departments": Network,
  "/audit": ScrollText,
  "/settings": Settings,
  "/profile": UserRound,
};

export function AppShell({ children, title }: { children: ReactNode; title: TranslationKey }) {
  const { t, lang } = useI18n();
  const { profile, roles, permissions, isSuperAdmin, signOut, loading, session } = useAuth();
  const { myNotifications, unreadCount, markRead, markAllRead } = useHrRequests();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const portalOnly = isEmployeePortalUser(permissions, isSuperAdmin);
  const navGroups = useMemo(
    () => (portalOnly ? EMPLOYEE_NAV : filterErpNav(permissions, isSuperAdmin)),
    [portalOnly, permissions, isSuperAdmin],
  );
  const homePath = homePathForUser(permissions, isSuperAdmin);

  const userId = session?.userId ?? "";
  const notifications = userId ? myNotifications(userId) : [];
  const unread = userId ? unreadCount(userId) : 0;

  useEffect(() => {
    if (!session || loading) return;
    if (portalOnly && isErpOnlyPath(pathname)) {
      void navigate({ to: homePath, replace: true });
      return;
    }
    // ERP user opened a module they don't have — bounce home
    if (!portalOnly && isErpOnlyPath(pathname)) {
      const allowed = navGroups.some((g) => g.items.some((i) => i.to === pathname));
      if (!allowed) {
        void navigate({ to: homePath, replace: true });
      }
    }
  }, [session, loading, portalOnly, pathname, homePath, navigate, navGroups]);

  useEffect(() => {
    if (!session || loading) return;
    const item = navGroups.flatMap((g) => g.items).find((i) => i.to === pathname);
    const labelAr = item ? t(item.labelKey) : pathname;
    logActivity({
      module: "navigation",
      action: "فتح صفحة",
      actionEn: "Opened page",
      entity: "تنقل",
      entityEn: "Navigation",
      details: labelAr,
      detailsEn: pathname,
      path: pathname,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- log page views
  }, [pathname, session?.userId]);

  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/auth", replace: true });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/auth", replace: true });
  }

  const roleLabel =
    roles.length === 0
      ? getRoleLabel("employee.base", lang)
      : roles.length === 1
        ? getRoleLabel(roles[0]!, lang)
        : lang === "ar"
          ? `${roles.length} أدوار مخصّصة`
          : `${roles.length} custom roles`;

  const nav = (
    <div className="relative z-10 flex h-full flex-col text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border/80 px-5 py-6">
        <BrandMark className="size-10 ring-1 ring-white/15" />
        <div className="min-w-0">
          <p className="truncate font-display text-base font-bold tracking-wide text-sidebar-foreground">
            {t("brand.name")}
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/70">
            {portalOnly
              ? lang === "ar"
                ? "بوابة الموظف"
                : "Employee portal"
              : roleLabel}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {group.items.length > 1 || group.id !== "main" ? (
              <p className="px-3 pb-1 text-[11px] font-bold tracking-wide text-sidebar-foreground/55">
                {t(group.labelKey)}
              </p>
            ) : null}
            {group.items.map((item) => {
              const Icon = ICONS[item.to] ?? ClipboardList;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_10px_28px_-12px_oklch(0.55_0.12_185/0.85)]"
                      : "text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border/80 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 p-3">
          <EmployeeAvatar
            name={profile?.full_name ?? "?"}
            src={profile?.avatar_url}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{profile?.full_name}</p>
            <p className="truncate text-xs text-sidebar-foreground/65">
              {profile?.job_title} · {profile?.department}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full rounded-xl border-white/12 bg-transparent text-sidebar-foreground hover:bg-white/8 hover:text-sidebar-foreground"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="size-4" />
          {t("common.signout")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="app-sidebar relative hidden h-svh w-[19rem] shrink-0 overflow-hidden md:sticky md:top-0 md:block">
        {nav}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-black/55" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <aside className="app-sidebar absolute inset-y-0 start-0 w-[19rem] overflow-hidden shadow-lift">{nav}</aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <div>
              <h1 className="font-display text-lg font-bold md:text-xl">{t(title)}</h1>
              <p className="text-xs text-muted-foreground md:text-sm">
                {t("dash.welcome")}, {profile?.full_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative rounded-full" onClick={() => setNotifOpen((v) => !v)}>
                <Bell className="size-4" />
                {unread > 0 ? (
                  <span className="absolute top-1.5 end-1.5 grid size-4 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground">
                    {unread}
                  </span>
                ) : null}
              </Button>
              {notifOpen ? (
                <div className="absolute end-0 top-11 z-50 w-80 rounded-2xl border border-border bg-card p-3 shadow-lift">
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <p className="text-sm font-semibold">{t("common.notifications")}</p>
                    <div className="flex items-center gap-2">
                      {unread > 0 && userId ? (
                        <button
                          type="button"
                          className="text-xs text-primary"
                          onClick={() => markAllRead(userId)}
                        >
                          {lang === "ar" ? "قراءة الكل" : "Mark all read"}
                        </button>
                      ) : null}
                      <button type="button" className="text-xs text-muted-foreground" onClick={() => setNotifOpen(false)}>
                        {t("common.close")}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                        {lang === "ar" ? "لا إشعارات حالياً" : "No notifications yet"}
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className={cn(
                            "w-full rounded-xl border border-border px-3 py-2.5 text-start",
                            n.read ? "bg-background" : "bg-primary/5",
                          )}
                          onClick={() => {
                            markRead(n.id);
                            const isNewRequest = n.title.includes("جديد");
                            let target = portalOnly ? "/me-requests" : "/profile";
                            if (isNewRequest) {
                              if (n.kind === "resignation") target = "/resignations";
                              else if (n.kind === "contact_change") target = "/contact-changes";
                              else if (n.kind === "leave") target = "/leaves";
                            } else if (portalOnly) {
                              if (n.kind === "contact_change") target = "/me-profile";
                              else target = "/me-requests";
                            } else if (n.kind === "contact_change") {
                              target = "/contact-changes";
                            }
                            void navigate({ to: target });
                            setNotifOpen(false);
                          }}
                        >
                          <p className="text-sm font-semibold">{n.title}</p>
                          <p className="text-xs text-muted-foreground">{n.body}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{formatRequestWhen(n.createdAt)}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: TranslationKey;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-bold">{t(title)}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "neutral" | "info";
  children: ReactNode;
}) {
  const tones = {
    success: "bg-success/15 text-success",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    danger: "bg-destructive/15 text-destructive",
    neutral: "bg-secondary text-secondary-foreground",
    info: "bg-primary/15 text-primary",
  } as const;
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  compact,
}: {
  label: string;
  value: string | number;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("surface-panel", compact ? "p-3" : "p-5")}>
      <p className={cn("text-muted-foreground", compact ? "text-[10px] leading-tight" : "text-xs")}>
        {label}
      </p>
      <p
        className={cn(
          "font-display font-bold",
          compact ? "mt-1 text-lg leading-tight truncate" : "mt-2 text-2xl",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className={cn("text-muted-foreground", compact ? "mt-0.5 text-[10px] leading-tight truncate" : "mt-1 text-xs")}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function DataTable({
  headers,
  rows,
  onRowClick,
}: {
  headers: string[];
  rows: ReactNode[][];
  onRowClick?: (rowIndex: number) => void;
}) {
  const { t } = useI18n();
  if (rows.length === 0) {
    return <div className="surface-panel p-8 text-center text-sm text-muted-foreground">{t("common.empty")}</div>;
  }
  return (
    <div className="surface-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary/50 text-muted-foreground">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                onClick={
                  onRowClick
                    ? (e) => {
                        const target = e.target as HTMLElement | null;
                        if (
                          target?.closest(
                            "button, a, input, select, textarea, label, [data-no-row-click]",
                          )
                        ) {
                          return;
                        }
                        onRowClick(idx);
                      }
                    : undefined
                }
                className={cn(
                  "border-t border-border/80 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-primary/5",
                )}
              >
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-3.5 align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
