import { splitRoles } from "./split-roles";

type StoredInvitation = {
  role: string | null;
  projectAccess: string;
  projectIds: string[];
};

type ResendRequest = {
  role?: unknown;
  projectAccess?: unknown;
  projectIds?: unknown;
};

function roleSet(role: unknown): string[] {
  const names = Array.isArray(role)
    ? role.flatMap((name) => splitRoles(typeof name === "string" ? name : ""))
    : splitRoles(typeof role === "string" ? role : null);
  return [...new Set(names)].sort();
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  const left = [...new Set(a)].sort();
  const right = [...new Set(b)].sort();
  return left.length === right.length && left.every((id, i) => id === right[i]);
}

// Fields the caller leaves out are not compared, so existing API clients that
// resend with only email and role keep working. Fields it sends must match.
export function invitationResendMatches(
  stored: StoredInvitation,
  request: ResendRequest,
): boolean {
  if (
    request.role !== undefined &&
    roleSet(request.role).join(",") !== roleSet(stored.role).join(",")
  ) {
    return false;
  }
  if (request.projectAccess === undefined) return true;
  if (request.projectAccess !== stored.projectAccess) return false;
  if (stored.projectAccess !== "selected") return true;
  return (
    Array.isArray(request.projectIds) &&
    request.projectIds.every((id) => typeof id === "string") &&
    sameIds(request.projectIds as string[], stored.projectIds)
  );
}
