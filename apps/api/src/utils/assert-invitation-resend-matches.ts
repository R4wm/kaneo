import { APIError } from "better-auth/api";
import { and, eq, gt } from "drizzle-orm";
import db, { schema } from "../database";
import { invitationResendMatches } from "./invitation-resend-matches";

// Better Auth resends by email: it extends the first unexpired pending
// invitation for that address and ignores the request's access. Refuse when
// that stored access differs from what the caller asked to resend, so a stale
// or ambiguous client cannot extend an invitation with different access.
export async function assertInvitationResendMatches(
  workspaceId: string,
  email: string,
  request: { projectAccess?: unknown; projectIds?: unknown },
): Promise<void> {
  const live = await db
    .select({
      projectAccess: schema.invitationTable.projectAccess,
      projectIds: schema.invitationTable.projectIds,
    })
    .from(schema.invitationTable)
    .where(
      and(
        eq(schema.invitationTable.workspaceId, workspaceId),
        eq(schema.invitationTable.email, email.toLowerCase()),
        eq(schema.invitationTable.status, "pending"),
        gt(schema.invitationTable.expiresAt, new Date()),
      ),
    );

  if (live.some((stored) => !invitationResendMatches(stored, request))) {
    throw new APIError("CONFLICT", {
      code: "INVITATION_RESEND_MISMATCH",
      message:
        "The pending invitation for this email has different project access than the request.",
    });
  }
}
