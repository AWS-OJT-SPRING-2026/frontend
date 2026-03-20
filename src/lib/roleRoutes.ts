import type { User } from "../types/auth";

export function getHomeRouteForRole(
  role: User["role"] | string | undefined | null,
): string {
  const roleLower = String(role ?? "").toLowerCase();

  if (roleLower === "admin") return "/admin";
  if (roleLower === "teacher") return "/teacher";
  if (roleLower === "student" || roleLower === "user") return "/student";

  return "/student";
}
