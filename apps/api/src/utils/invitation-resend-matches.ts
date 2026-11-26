type StoredInvitation = {
  projectAccess: string;
  projectIds: string[];
};

type ResendRequest = {
  projectAccess?: unknown;
  projectIds?: unknown;
};

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  const left = [...new Set(a)].sort();
  const right = [...new Set(b)].sort();
  return left.length === right.length && left.every((id, i) => id === right[i]);
}

// Role is not compared: a resend keeps the stored role whatever the request
// sends, and owner requests are refused by the owner checks. Project access the
// caller leaves out is not compared either, so resends with only email and role
// keep working. Access the caller does send must match the stored invitation.
export function invitationResendMatches(
  stored: StoredInvitation,
  request: ResendRequest,
): boolean {
  if (request.projectAccess === undefined) return true;
  if (request.projectAccess !== stored.projectAccess) return false;
  if (stored.projectAccess !== "selected") return true;
  return (
    Array.isArray(request.projectIds) &&
    request.projectIds.every((id) => typeof id === "string") &&
    sameIds(request.projectIds as string[], stored.projectIds)
  );
}
