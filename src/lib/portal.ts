import { firstErpPathForPermissions } from "./erp-nav";
import { hasErpAccess, type AppPermission } from "./permissions";

const ERP_PATHS = new Set([
  "/dashboard",
  "/employees",
  "/attendance",
  "/leaves",
  "/resignations",
  "/contact-changes",
  "/payroll",
  "/contracts",
  "/recruitment",
  "/invoices",
  "/expenses",
  "/income",
  "/payments",
  "/journal",
  "/tax",
  "/users",
  "/branches",
  "/departments",
  "/audit",
  "/settings",
  "/profile",
]);

const PORTAL_PATHS = new Set(["/me", "/me-profile", "/me-absences", "/me-requests", "/me-payroll"]);

/**
 * True when the signed-in user should see the personal employee portal
 * (not the company ERP admin sidebar).
 */
export function isEmployeePortalUser(permissions: AppPermission[], isSuperAdmin: boolean) {
  return !hasErpAccess(permissions, isSuperAdmin);
}

export function homePathForUser(permissions: AppPermission[], isSuperAdmin: boolean) {
  if (isEmployeePortalUser(permissions, isSuperAdmin)) return "/me-profile";
  return firstErpPathForPermissions(permissions, isSuperAdmin);
}

export function isErpOnlyPath(pathname: string) {
  return ERP_PATHS.has(pathname);
}

export function isPortalOnlyPath(pathname: string) {
  return PORTAL_PATHS.has(pathname);
}
