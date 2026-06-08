/** Internal app routes that require a team member session. */
export const APP_PROTECTED_PREFIXES = [
  "/dashboard",
  "/marketing",
  "/clients",
  "/projects",
  "/tasks",
  "/team",
  "/settings",
  "/history",
] as const;

export function isAppProtectedPath(pathname: string): boolean {
  return APP_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isPortalProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/portal") && !pathname.startsWith("/portal/login")
  );
}
