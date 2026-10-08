import { eq } from "drizzle-orm";
import db from "../../database";
import { userTable } from "../../database/schema";
import deleteAccountData from "./delete-account-data";

/**
 * When a verified identity (Google or email OTP) arrives for email E, remove any
 * unverified placeholder account so OAuth signup can proceed (PRSM first-verifier-wins).
 */
export async function displaceUnverifiedUserByEmail(
  email: string,
): Promise<void> {
  const normalized = email.toLowerCase();
  const [existing] = await db
    .select({ id: userTable.id, emailVerified: userTable.emailVerified })
    .from(userTable)
    .where(eq(userTable.email, normalized))
    .limit(1);

  if (!existing || existing.emailVerified) {
    return;
  }

  await deleteAccountData(existing.id);
  await db.delete(userTable).where(eq(userTable.id, existing.id));
}

export async function displaceUnverifiedUserByEmailIfVerifiedIncoming(
  email: string,
  emailVerified: boolean | null | undefined,
): Promise<void> {
  if (emailVerified !== true) return;
  await displaceUnverifiedUserByEmail(email);
}
