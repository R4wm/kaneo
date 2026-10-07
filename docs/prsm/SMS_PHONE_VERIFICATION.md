# SMS phone verification — upstream PR scope

**Status:** Planned. Target: a **single, narrow** pull request to [usekaneo/kaneo](https://github.com/usekaneo/kaneo), developed on a `feat/*` branch from current upstream `main`, then cherry-picked or rebased from the PRSM fork as needed.

**PRSM prod:** Stays on pinned upstream until that PR merges and infra opts in. ClickSend credentials are PRSM-specific; upstream ships **optional SMS** via env (same pattern as SMTP for email).

## Goal

Let an **existing** user (already has an email account):

1. Add or change a phone number in account settings **only after OTP verification** (number is not saved until verify succeeds).
2. Sign in with **SMS OTP** to that verified number when SMS is configured on the instance.

Phone is **optional**. Email/password, email OTP, and OAuth behavior stay unchanged.

### Email verification must not block phone login

If the user has a **`phoneNumberVerified`** number on their account, they may **sign in with SMS OTP** and receive a normal session **regardless of `emailVerified`**. Do not add hooks, middleware, or UI that require email verification for the phone sign-in path.

- **In scope:** Verified phone → SMS OTP → session (even when `email_verified` is false).
- **Unchanged (this PR):** Google **account linking** still uses `requireLocalEmailVerified`; pending-invitation listing may still require email verify — those are separate from phone login.
- **Not in scope:** Fixing Google-first or email-OTP UX; bundling Option B (Google sets `emailVerified`).

Users who cannot receive email OTP but have verified phone should be able to access the app via SMS alone.

## Merge-friendly principles

- One feature: **Better Auth phone plugin + SMS transport + minimal UI**.
- No changes to Google linking, registration policy, invitations, or workspace RBAC.
- No PRSM-only docs in the upstream PR (this file stays under `docs/prsm/` on the fork).
- Follow existing patterns: `packages/email` → `packages/sms`, env-gated delivery, integration tests, i18n, `/api/config` flags.

## In scope (upstream PR)

| Area | Deliverable |
|------|-------------|
| **Auth** | Better Auth [`phoneNumber`](https://www.better-auth.com/docs/plugins/phone-number) plugin on API + client. **`signUpOnVerification` disabled** — no phone-only accounts. |
| **User fields** | `phoneNumber` (E.164) and `phoneNumberVerified` on `user` (Better Auth schema / migration). Product language: “phone verified”. |
| **SMS transport** | `packages/sms` with ClickSend implementation (`POST https://rest.clicksend.com/v3/sms/send`). Env: `CLICKSEND_USERNAME`, `CLICKSEND_API_KEY`, optional `CLICKSEND_SENDER_ID`. Instance works without these (SMS UI hidden / endpoints unavailable). |
| **OTP** | Better Auth generates and validates codes; ClickSend **only sends** the message (not Twilio-style external verify). Do not `await` send on the hot path (queue / background like sign-in email). |
| **Settings UI** | Logged-in: enter phone → send OTP → verify with `updatePhoneNumber: true`. Remove phone via `updateUser({ phoneNumber: null })` (clears verified). |
| **Sign-in UI** | Optional “Text me a code” when SMS is configured; only for numbers already tied to a **verified** account (same abuse posture as email OTP where applicable). |
| **Admin** | When an admin changes a user’s phone, clear `phoneNumberVerified` (mirror email change → `emailVerified` false). |
| **Tests** | API integration: verify-before-save, sign-in OTP for existing user, **SMS sign-in with unverified email**, SMS disabled without env. |
| **Docs** | Self-hosting: env vars and behavior in `apps/docs` (not PRSM runbooks). |

### User flows (acceptance)

**Add phone (session required)**

1. User submits E.164 number.
2. Server sends OTP via SMS (if configured).
3. User submits code; on success, phone is stored and `phoneNumberVerified = true`.

**Sign-in with phone**

1. User requests OTP for a phone number.
2. If a user exists with that number and `phoneNumberVerified`, send OTP; verify creates session (**must not** require `emailVerified`).
3. If no such user, generic response (no account enumeration).

**Acceptance:** Integration test: user with `emailVerified: false`, `phoneNumberVerified: true` completes SMS OTP sign-in and reaches an authenticated session.

**Change phone**

1. OTP to **new** number; verify with `updatePhoneNumber: true`.
2. Direct `updateUser` to a new non-null phone without OTP remains blocked (plugin behavior).

## Out of scope (this PR — do not bundle)

These stay on the PRSM fork or later tickets so the upstream PR stays reviewable:

| Item | Notes |
|------|--------|
| **Google / `requireLocalEmailVerified`** | e.g. treating Google verified email as local `emailVerified` — separate auth UX PR. |
| **Phone-first registration** | `signUpOnVerification`, temp email users. |
| **Replace or demote email OTP** | SMS is additive sign-in only. |
| **Require `email_verified` before add phone** | PRSM may enforce in fork/policy later; not required for generic upstream. |
| **ClickSend-only product branding** | Upstream exposes generic “SMS configured”; ClickSend is one provider implementation. |
| **Billing, sharing, upload tiers** | Unrelated phases in [PRODUCT_PLAN.md](./PRODUCT_PLAN.md). |
| **PRSM deploy / runbooks** | [infra-docs](https://github.com/r4wm/infra-docs) after merge. |

## Implementation sketch (for estimations)

1. Migration: `phone_number`, `phone_number_verified` on `user`.
2. `packages/sms`: `sendSms({ to, body })` + ClickSend adapter.
3. `apps/api/src/auth.ts`: `phoneNumber({ sendOTP })` wired to `packages/sms` when env present.
4. `apps/web`: account settings block + sign-in path gated by config.
5. `openapi:check:fix` if new public routes; config schema for `hasSms` / `disablePhoneSignIn` if needed.

## PRSM follow-up (after upstream merge)

- Enable ClickSend env on fork image / prod when approved.
- Board task **#6** tracks PRSM rollout, not upstream design.

Do **not** add a PRSM fork rule that requires `emailVerified` before phone enrollment or before SMS sign-in — that would contradict the phone-login goal above.

## References

- [ClickSend Send SMS](https://developers.clicksend.com/docs/messaging/sms/other/send-sms)
- [Better Auth phone number plugin](https://www.better-auth.com/docs/plugins/phone-number)
- Kaneo email OTP + `packages/email` (pattern to mirror)
