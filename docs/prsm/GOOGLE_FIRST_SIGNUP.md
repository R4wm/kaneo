# Google-first sign-up — plan (PRSM fork)

**Status:** Planned — branch **`prsm/google-first-signup`**.  
**Separate from:** [SMS / text messaging](https://github.com/R4wm/kaneo/tree/prsm/sms-phone-verification/docs/prsm/SMS_PHONE_VERIFICATION.md) (`prsm/sms-phone-verification`).

## Goal

Let new members **start with Google sign-in/sign-up**: persist **email from Google**, use Google as the **first and sufficient** auth factor. **No password required** to begin; password remains **optional** (set later in Account → Security).

Improves onboarding when:

- Email OTP mail is slow or filtered (user still has Google).
- Invited users should not need a local password or manual email OTP before using Google.

## Product rules

| Topic | Rule |
|-------|------|
| **Create account** | **Google OAuth** allowed when instance has `hasGoogleSignIn` and registration rules permit (open reg or valid **invitation** for that Gmail). |
| **Email on user row** | Set from Google profile; treat provider **verified email** as trusted for **new** Google-created users (`emailVerified` true when Better Auth/Google supply verified claim). |
| **Password** | **Not required.** No `credential` account until user chooses “Set password” in settings ([change-password-settings.tsx](../../apps/web/src/components/account/change-password-settings.tsx) already hides change form when no credential). |
| **Sign-in later** | Google OAuth; optional password after set; optional SMS later (other branch). |
| **Email OTP first** | **Not required** before first Google sign-up for a **new** account. |
| **Existing password account** | Unchanged: [`requireLocalEmailVerified`](../../apps/api/src/auth.ts) still blocks linking Google to an existing **unverified local** email (anti–account takeover). This plan targets **Google-first new users**, not merging Option B for all linking cases. |

```mermaid
flowchart TB
  Invite[Invitation or open registration] --> Google[Sign up with Google]
  Google --> Callback[OAuth callback]
  Callback --> User[user plus account rows]
  User --> EmailSaved[email from Google]
  User --> NoPwd[no credential password yet]
  NoPwd --> Session[Session and workspace]
  Session --> Optional[Optional set password later]
```

## Current behavior (baseline)

- Sign-up already renders [SSOProviders](../../apps/web/src/components/auth/sso-providers.tsx) / Google on [sign-up.tsx](../../apps/web/src/routes/auth/sign-up.tsx).
- Invite-only OAuth signup is supported when provider email matches a pending invitation ([registration-invitation.test.ts](../../tests/api-integration/registration-invitation.test.ts)).
- Pain point on PRSM: members who **create a password account first** or hit **email OTP** flows may believe Google is broken until `email_verified` is true — UX/copy and recommended path need to steer **invited users to Google first** when appropriate.

## Out of scope (this initiative)

- Bundled SMS / phone work (`prsm/sms-phone-verification`).
- Replacing Google with other providers.
- Changing workspace RBAC or invitation model.
- Full “Option B” (trust Google verify to fix **existing** unverified local accounts) — separate small auth PR if still needed.
- Forcing Google-only (email OTP and password remain available where configured).

## Technical work (implementation checklist)

### 1. Verify OAuth user creation

- Confirm Better Auth sets `email` + `emailVerified` from Google on **new user** create (integration test on fork).
- Confirm `databaseHooks.user.create` + [`assertUserRegistrationAllowed`](../../apps/api/src/utils/registration-policy.ts) allow OAuth callback with verified provider email + invitation when `DISABLE_REGISTRATION=true`.
- Pass **`x-invitation-id`** (or query) from sign-up/sign-in Google buttons when user landed from invite link (mirror [verify-otp.tsx](../../apps/web/src/routes/auth/verify-otp.tsx) email OTP).

### 2. Web — onboarding UX

- **Sign-up (invite):** When `hasGoogleSignIn`, present Google as a **first-class** path (equal or primary for invited Gmail); short copy: “Continue with Google — no password needed.”
- **Sign-in:** Same; avoid implying password is required.
- **After Google session:** If no credential account, show **“Set a password (optional)”** in Security — reuse or extend set-password flow if missing (today UI may only expose *change* password).
- **Errors:** Map Better Auth linking errors to actionable copy for invite mismatch vs wrong Google account.

### 3. Optional set-password (if not present)

- Better Auth / Kaneo: allow **first** password set for Google-only users (creates `credential` provider) without “current password”.
- Tests: Google-only user → set password → can sign in with email+password.

### 4. Config / PRSM env

- Document recommended PRSM combo: `hasGoogleSignIn`, invitations, optionally `DISABLE_PASSWORD_REGISTRATION` to reduce accidental password-first signup (evaluate — may stay false for admins who want password).
- No new env required if Google client already configured ([FUNDAMENTALS](https://github.com/R4wm/kaneo/tree/prsm/sms-phone-verification/docs/prsm/FUNDAMENTALS.md) on SMS branch / prod runbook).

### 5. Tests

| Case | Assert |
|------|--------|
| Invite + Google create | User with Google email, `emailVerified`, no credential |
| Invite + Google wrong email | Registration denied |
| Google-only session | Authenticated; workspace invite accept works |
| Set password optional | After set, credential exists; Google still works |
| Local unverified + Google link | Still blocked (security regression test) |

### 6. Docs

- PRSM runbook: recommended member flow “Accept invite → Continue with Google.”
- Update email auth checklist: Google-first path for Gmail invitees.

## Upstream

Prefer a **focused PR** to usekaneo/kaneo: invitation header on social sign-up, optional set-password for OAuth-only users, tests + copy — without PRSM-only env docs in upstream.

## Verification (manual)

1. Create pending invitation for a Gmail address.
2. Open invite link → sign up with Google (same email).
3. Land in workspace; confirm no password set.
4. Sign out → sign in with Google again.
5. Optionally set password → sign in with password.

## References

- [Better Auth Google](https://www.better-auth.com/docs/authentication/google)
- Kaneo `requireLocalEmailVerified` in [auth.ts](../../apps/api/src/auth.ts)
- PRSM email checklist (SMS branch): `docs/prsm/EMAIL_AUTH_TEST_CHECKLIST.md`
