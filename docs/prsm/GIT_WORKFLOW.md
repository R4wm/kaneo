# Git workflow — PRSM Kaneo fork

## Rules (non-negotiable)

1. **`origin` is always [R4wm/kaneo](https://github.com/R4wm/kaneo)** — the only remote you **push** to.
2. **`upstream` is [usekaneo/kaneo](https://github.com/usekaneo/kaneo)** — **fetch only**. Never push to upstream (including **`main`**).
3. **All PRSM work** happens on branches under **`prsm/*`** (or other named PRSM branches), never directly on upstream’s default branch.
4. **Production** deploys from **infra-docs** pinned **upstream image digest**, not from a push to usekaneo/kaneo.

Upstream contributions (if any) go through **GitHub Pull Requests** from `R4wm/kaneo` → `usekaneo/kaneo`, not `git push upstream`.

## Host clone setup

On each machine that builds or edits Kaneo (e.g. baser4wm, developer laptop):

```bash
git clone https://github.com/R4wm/kaneo.git ~/github/kaneo
cd ~/github/kaneo
git remote add upstream https://github.com/usekaneo/kaneo.git
git remote set-url --push upstream no_push   # blocks accidental push to upstream
git fetch upstream --tags
git checkout prsm/sms-phone-verification   # or your prsm/* feature branch
git remote -v
# origin    → R4wm/kaneo (fetch + push)
# upstream  → usekaneo/kaneo (fetch only; push disabled)
```

Do **not** clone `usekaneo/kaneo` as `origin` on PRSM hosts.

## Daily workflow

```bash
git fetch upstream --tags
git checkout prsm/my-feature
git merge v2.35.0   # or rebase onto upstream tag when refreshing baseline
# ... edit, commit ...
git push origin prsm/my-feature
```

To refresh **fork `main`** with upstream (optional, still push only to **origin**):

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

Never `git push upstream …`.

## Branches

| Branch | Where it lives | Purpose |
|--------|----------------|---------|
| `prsm/sms-phone-verification` | **origin** | SMS upstream PR plan + PRSM docs |
| `prsm/<feature>` | **origin** | Features / spikes |
| `v2.29.3-base` | **origin** | Optional tag bookmark (not prod deploy) |
| `main` on fork | **origin** | May track merged upstream; not required for PRSM doc work |

## Mistake we avoid repeating

During initial fork setup, do **not** try to `git push origin v2.29.3:main` to overwrite fork history unless you intend a deliberate fork sync. Prefer **`prsm/*` branches** for all PRSM commits.

See also [UPSTREAM_SYNC.md](./UPSTREAM_SYNC.md).
