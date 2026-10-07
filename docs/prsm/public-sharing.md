# Public read-only sharing — PRSM evaluation

## Question

Can a user share a link so **anyone** can **read** work without logging in?

## Answer (Kaneo v2.29.x)

**Yes at project scope**, not single private tickets.

| Approach | Login required | What viewers see |
|----------|----------------|------------------|
| **Public project** (`isPublic: true`) | No | Paginated board, task titles/descriptions via `/api/public-project/{id}` and description endpoints |
| **Viewer role + selected projects** | Yes | Only assigned projects; read-oriented permissions |
| **Guest access** (`DISABLE_GUEST_ACCESS=false`) | No (anonymous guest) | Demo-style; **disabled on PRSM** |

## Public project mechanics

- Toggle **public visibility** on a project (UI: project settings / visibility; permission **`project:share`** on current upstream).
- Public URL pattern (web): `/public-project/{projectId}` (see upstream web routes).
- API: `GET /api/public-project/{id}` — no auth; returns 403 if not public.

## Limitations

1. **No private-project, single-task URL** — entire project becomes readable when public.
2. **Attachments / comments** on public views — verify per release; do not assume all comment threads or files are exposed without testing.
3. **Security advisory** (older builds): `project:update` without `project:share` could set `isPublic` — upgrade to a tag that enforces **`project:share`** on visibility changes (see [UPGRADE_ASSESSMENT.md](./UPGRADE_ASSESSMENT.md)).

## PRSM recommendations

1. **Client status boards**: dedicated **public** project or duplicate “client view” project synced manually or via process.
2. **Contractors with edit access**: invite as **member** with **selected projects**.
3. **Read-only clients**: **viewer** role + selected projects (login required) if public board is too broad.

## Staging validation (TODO when upgrading)

- [ ] Create test project, enable public, open incognito URL
- [ ] Confirm private projects return 403 on public API
- [ ] Confirm member without `project:share` cannot toggle public (after upgrade)

## Related

- [FUNDAMENTALS.md](./FUNDAMENTALS.md)
- Kaneo API: [Get a public project board](https://kaneo.app/docs/api-reference/projects/get-a-public-project-board)
