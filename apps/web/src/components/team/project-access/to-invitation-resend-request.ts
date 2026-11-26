import type { ProjectAccessValue } from "./project-access-value";

type StoredInvitation = {
  email: string;
  role: string;
  projectAccess?: string | null;
  projectIds?: string[] | null;
};

export type InvitationResendRequest = {
  email: string;
  role: string;
} & ProjectAccessValue;

// A resend must repeat the invitation's stored scope. Better Auth only reuses
// the stored row while the invitation is unexpired; for an expired one it
// creates a new invitation from the request, where omitted access means "all".
// Unknown or incomplete access returns null so callers refuse instead of
// widening it.
export function toInvitationResendRequest(
  invitation: StoredInvitation,
): InvitationResendRequest | null {
  const { email, role } = invitation;
  if (invitation.projectAccess === "all") {
    return { email, role, projectAccess: "all", projectIds: [] };
  }
  if (
    invitation.projectAccess === "selected" &&
    Array.isArray(invitation.projectIds) &&
    invitation.projectIds.length > 0
  ) {
    return {
      email,
      role,
      projectAccess: "selected",
      projectIds: [...invitation.projectIds],
    };
  }
  return null;
}
