# Kaneo fundamentals — PRSM work.prsmusa.com

Reference for operators and fork contributors. Upstream docs: [kaneo.app/docs](https://kaneo.app/docs).

## PRSM fork

| Item | Value |
|------|--------|
| Fork (`origin`) | [github.com/R4wm/kaneo](https://github.com/R4wm/kaneo) — **only push target** |
| Upstream (fetch only) | [usekaneo/kaneo](https://github.com/usekaneo/kaneo) — see [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) |
| Prod image | Pinned upstream **v2.29.3** (see infra-docs `deployments/kaneo/compose.yaml`) |

## Identity and auth (Better Auth)

- **Email** is the primary account identifier (`user.email`, unique).
- **`email_verified`** must be true before **Google OAuth** can link to an existing password account (`requireLocalEmailVerified`).
- **Sign-in paths** (when configured):
  - **Email OTP** — default when SMTP is set and `DISABLE_EMAIL_OTP_SIGN_IN=false`.
  - **Email + password** — login form; password reset via SMTP does **not** set `email_verified` on v2.29.3.
  - **Google** — OAuth; new users subject to registration rules.
- **OTP delivery** uses `packages/email` (HTML). Sign-in OTP is queued asynchronously; SMTP errors may not fail the HTTP response.
- **Registration gate** when `DISABLE_REGISTRATION=true`: new accounts need a valid **pending invitation** (or existing user for sign-in email only).
- **Captcha**: optional Cloudflare Turnstile on OTP send and other auth paths when `TURNSTILE_SECRET_KEY` is set.

## Organization / workspace

- Kaneo **organization** maps to a **workspace** in the API/DB.
- **`DISABLE_WORKSPACE_CREATION=true`**: only existing flows (e.g. first setup, admin) create workspaces; typical members join via **invite**.
- **Roles** (owner, admin, member, viewer, plus custom workspace roles): control **what** users can do.
- **Project access**: all projects vs **selected projects** per member (limits visibility for contractors/clients).

## Work items

- **Project** → **columns** (status) → **tasks** (numbered per project, e.g. PRSMUSA-8).
- **Backlog** is a virtual status (`planned`), not always a board column.
- **Attachments**: presigned PUT to S3-compatible storage; max size from **`S3_MAX_IMAGE_UPLOAD_BYTES`** (instance-wide).

## Public read vs guest

- **`project.isPublic`**: unauthenticated read of board via `/api/public-project/{id}` (not per-task private links).
- **`DISABLE_GUEST_ACCESS`**: disables anonymous **guest** plugin — separate from public projects.

## Billing (self-hosted PRSM)

- **`billingEnabled`** is false unless `KANEO_CLOUD=true` and Creem credentials are set.
- With billing disabled, **`computeEntitlement`** treats workspaces as active for mutate APIs.

## PRSM production config (2026-10-07)

Verify live: `GET https://work.prsmusa.com/api/config`

| Setting | Prod (`/api/config` or env) | Notes |
|---------|-----------------------------|--------|
| `disableRegistration` | **false** | Open sign-up; workspace creation still restricted |
| `disableWorkspaceCreation` | **true** | Members join workspaces via invite |
| `disableEmailOtpSignIn` | **false** | Email OTP enabled |
| `hasSmtp` | **true** | Gmail app password in `~/kaneo/.env` |
| `hasGoogleSignIn` | **true** | Shared OAuth client with bible_api |
| `hasGuestAccess` | **false** | Guest plugin off |
| `billingEnabled` | **false** | Self-hosted; no Creem |
| Upload cap | **20971520** bytes (20 MiB) | `S3_MAX_IMAGE_UPLOAD_BYTES` in compose |

## Runbook alignment gaps (addressed in infra-docs)

1. Runbook previously said invite-only registration; prod has **`DISABLE_REGISTRATION=false`** — document both modes.
2. **`compose.yaml` default** for `DISABLE_REGISTRATION` is `true`; prod overrides in `.env` — defaults are not prod state.
3. Admin **`administrator.json` password** may drift from actual account; use email OTP or reset for API automation.
4. **Email typos** on invite (e.g. livetolive vs lifetolive) cause OTP to wrong inbox — verify spelling with members.

## Related PRSM docs

- [SMS_PHONE_VERIFICATION.md](./SMS_PHONE_VERIFICATION.md) — upstream SMS scope (OAuth linking unchanged)
- [PRODUCT_PLAN.md](./PRODUCT_PLAN.md)
- [EMAIL_AUTH_TEST_CHECKLIST.md](./EMAIL_AUTH_TEST_CHECKLIST.md)
- [public-sharing.md](./public-sharing.md)
- [monetization.md](./monetization.md)
- [UPSTREAM_SYNC.md](./UPSTREAM_SYNC.md)
