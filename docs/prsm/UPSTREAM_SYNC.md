# Upstream sync — PRSM Kaneo fork

## Release cadence

Kaneo tags ship **often** (multiple minors per week). Treat merges as routine, not one-time.

Example: **v2.29.3** (2026-09-29) → **v2.35.0** (2026-10-06).

## Workflow

1. Fetch tags: `git fetch upstream --tags`
2. Merge or rebase feature branch onto target tag (e.g. `v2.35.0`).
3. Run monorepo build (`pnpm` / upstream CI equivalent).
4. Apply migrations against a **Postgres snapshot** (not prod first).
5. Smoke checklist:
   - Email OTP sign-in
   - Password sign-in / reset (if enabled)
   - Google sign-in + linking (requires `email_verified`)
   - Workspace invite accept
   - File upload (presign + size limit)
   - Public project read (`isPublic`) if used
6. Update **infra-docs** digest pin only after smoke pass.

## Remotes (suggested)

```text
origin    → https://github.com/R4wm/kaneo.git
upstream  → https://github.com/usekaneo/kaneo.git
```

GitHub fork: **[github.com/R4wm/kaneo](https://github.com/R4wm/kaneo)** (not a local-only clone).

## Branch naming

| Branch | Purpose |
|--------|---------|
| `main` | Tracks upstream release line |
| `prsm/planning` | Docs and research spikes |
| `prsm/<feature>` | Features intended for upstream PR |

## Prod rule

**work.prsmusa.com** uses **pinned upstream digest** until a PRSM-built image is rebased, tested, and explicitly approved for deploy.
