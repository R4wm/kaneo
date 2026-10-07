# Bug backlog — PRSM Kaneo production

Track operational issues; prefer config/process fixes before fork code.

| ID | Issue | Status | Mitigation |
|----|--------|--------|------------|
| B1 | Email typo on account vs real inbox | Fixed (data) | Verify spelling at invite; SQL fix only with confirmation |
| B2 | Gmail HTML OTP filtered; manual mail works | Open | Checklist + spam; transactional domain long-term |
| B3 | Google before verify → misleading “registration disabled” | Open (UX) | Train: OTP first; upstream error message |
| B4 | `DISABLE_EMAIL_OTP` hardcoded in compose | Fixed | Use `~/kaneo/.env` |
| B5 | Runbook said invite-only; prod open registration | Fixed | Runbook updated 2026-10-07 |
| B6 | `administrator.json` password out of sync → API 401 | Open | Use OTP test user; rotate admin password in JSON |
| B7 | `project:share` on v2.29.3 | Open | Plan upstream digest bump |

## Process

1. Reproduce with test email from [EMAIL_AUTH_TEST_CHECKLIST.md](./EMAIL_AUTH_TEST_CHECKLIST.md)
2. Check logs + `verification` table before DB edits
3. File Kaneo task in PRSMUSA project for tracking
