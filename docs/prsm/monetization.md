# Monetization research — PRSM Kaneo

## Current prod state

- **Self-hosted** at work.prsmusa.com
- `/api/config` → **`billingEnabled: false`**
- All workspace **entitlements active** (`billing_disabled` path in API)

## Built-in Kaneo billing (Creem, not Stripe)

| Requirement | Env / flag |
|-------------|------------|
| Enable cloud billing mode | `KANEO_CLOUD=true` |
| Payment provider | **Creem** — `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET` |
| Products | `CREEM_PRODUCT_PERSONAL_*`, `CREEM_PRODUCT_TEAM_*` (monthly/annual) |

**Model:**

- Billing is **per workspace**, plans **personal** vs **team** (seats on team).
- **`requireEntitlement`** middleware returns **402** when subscription expired (cloud only).
- **Does not** implement per-user “premium uploads” or Stripe.

**PRSM fit:** Poor if we stay self-hosted on baser4wm and want **Stripe**. Reasonable only if we moved to Kaneo Cloud + Creem (not current direction).

## Stripe options for PRSM

| Option | Description | Effort |
|--------|-------------|--------|
| **A. No in-app billing** | Free internal tool; cost recovery offline | None |
| **B. Stripe outside Kaneo** | Bill in separate product; manual tier flags in DB | Low enforcement |
| **C. Fork: Stripe webhooks + entitlements** | Store `plan` on `user` or `workspace`; gate features in API | High; merge tax |
| **D. Hybrid** | Creem for “hosting” if we resell managed Kaneo; Stripe for PRSM-specific SKUs | Two systems |

**Recommendation (2026-10-07):** If PRSM needs **Stripe** and **self-hosted**, plan **Option C** on [R4wm/kaneo](https://github.com/R4wm/kaneo) with minimal surface:

1. `workspace` or `user` metadata: `billingPlan` (`free` | `premium`), `stripeCustomerId`, `stripeSubscriptionId`.
2. Small **webhook route** (Stripe signing secret) updating plan flags.
3. Feature gates read plan flags (upload limit first — see [upload-tiers-design.md](./upload-tiers-design.md)).
4. Upstream PR only for **generic** “entitlement hook” if Kaneo accepts it.

## Upload tiers vs Creem plans

Creem/Kaneo cloud plans gate **workspace activity when expired**, not **upload size per tier**. Premium upload limits are a **separate fork feature**.

## Next steps

1. Product decision: bill **per user**, **per workspace**, or **flat instance**.
2. Stripe products/prices in dashboard (test mode).
3. Spike webhook + presign limit on fork branch `prsm/stripe-spike` (no prod deploy).
4. Legal/tax: Creem as MoR vs Stripe on PRSM entity.

## References

- [Kaneo pricing](https://kaneo.app/pricing) (Creem)
- [Environment variables — KANEO_CLOUD](https://kaneo.app/docs/core/installation/environment-variables)
- [upload-tiers-design.md](./upload-tiers-design.md)
