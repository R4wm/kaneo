# Upload tiers design — premium media limits

## Today (upstream v2.29.3)

- Single env var **`S3_MAX_IMAGE_UPLOAD_BYTES`** (default 10 MiB; PRSM compose uses **20 MiB**).
- Applied at **presign** time via storage config (`getMaxImageUploadBytes()` in API).
- **Same limit for every user** on the instance; not tied to Creem, roles, or Stripe.

## Goal

**Premium users** (or workspaces) can upload **larger** attachments; free tier keeps current cap.

## Proposed model (fork — R4wm/kaneo)

| Field | Location | Values |
|-------|----------|--------|
| `uploadLimitBytes` | `workspace_billing` extension or `workspace` metadata JSON | optional override |
| `uploadLimitBytes` | `user` additional field (Better Auth) | optional per-user override |
| **Effective limit** | `max(defaultEnv, workspaceOverride, userOverride)` or explicit min-of-plan | |

**Resolution order (fail closed to env default):**

1. If user has verified premium flag → user limit  
2. Else if workspace plan premium → workspace limit  
3. Else → `S3_MAX_IMAGE_UPLOAD_BYTES`

## Code touchpoints (spike)

Search upstream for presign / upload size validation:

- Storage module that reads `S3_MAX_IMAGE_UPLOAD_BYTES`
- Task comment / description image upload routes using `requireEntitlement` (cloud billing only today)

**Spike tasks:**

1. Add helper `resolveUploadLimitBytes({ userId, workspaceId })`.
2. Call from presign handler(s) instead of global getter only.
3. Unit tests: free vs premium mock plans.
4. No Stripe yet — manual DB flag for dev.

## Stripe linkage

When [monetization.md](./monetization.md) Option C is approved:

- Stripe `checkout.session.completed` / `customer.subscription.updated` → set `billingPlan=premium` and `uploadLimitBytes=52428800` (example 50 MiB).

## Non-goals (v1 spike)

- Per-file-type limits (video vs image)
- Storage quota totals (only max single upload)
- Billing UI inside Kaneo (portal can stay Stripe-hosted)

## Acceptance

- [ ] Free user receives 413/400 when over free limit on presign
- [ ] Premium user can presign up to premium limit
- [ ] Env default unchanged for existing PRSM prod behavior when no plan flags set
