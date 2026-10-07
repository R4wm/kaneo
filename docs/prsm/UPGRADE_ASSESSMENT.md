# Upgrade assessment — v2.29.3 → latest upstream

**Prod today:** v2.29.3 (digest pinned in infra-docs).  
**Latest (2026-10-06):** v2.35.0.

## Cadence

~**250 commits** between v2.29.3 and v2.35.0 in one week — plan **regular** merge + smoke, not annual upgrades.

## Themes in delta (sample)

- **Realtime / board**: WebSocket access reconciliation, live board updates, drag guards
- **Integrations**: GitHub/GitLab import consistency, webhook continuations
- **Auth**: workspace revocation for deleted instance admins
- **Security releases**: v2.26.0+ advertised broad authz fixes — treat upgrades as **security maintenance**

## PRSM-specific upgrade drivers

| Item | Why upgrade |
|------|-------------|
| **`project:share` vs `isPublic`** | Advisory GHSA-wcf5-rr68-wg5c — server must require share permission to publish projects |
| **Auth / OTP fixes** | Any Better Auth plugin fixes since 2.29.3 |
| **Attachment / storage** | Presign or CORS fixes if upload issues appear |

## Recommended process

1. **Separate PR** from fork feature work — bump digest only in infra-docs.
2. Test on baser4wm **clone DB** or maintenance window:
   - Run [EMAIL_AUTH_TEST_CHECKLIST.md](./EMAIL_AUTH_TEST_CHECKLIST.md)
   - Public project 403/200 behavior
   - File upload near 20 MiB cap
3. Read upstream release notes v2.30.0 … v2.35.0 for breaking env/schema changes.
4. Pin new digest; recreate container; watch migration logs at boot.

## Risk if staying on 2.29.3

- Missing security and authz hardening from later patches.
- Harder jump when finally upgrading (more migrations at once).

## Risk if upgrading quickly

- Regression in board/ws behavior PRSM may not use heavily — still run smoke tests.
- Custom fork branches must **rebase** onto new tag before any PRSM image deploy.

## Decision log

| Date | Decision |
|------|----------|
| 2026-10-07 | Document only; prod remains v2.29.3 until scheduled bump with checklist |

See also [UPSTREAM_SYNC.md](./UPSTREAM_SYNC.md).
