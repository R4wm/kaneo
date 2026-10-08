# PRSM auth environment (fork testing)

Use on branch `prsm/allow_google_signup_first` when building a test image (not required for upstream-style self-host).

| Variable | Recommended (PRSM test) | Purpose |
|----------|-------------------------|---------|
| `PRSM_SIGNED_INVITATION_LINKS` | `true` (default on fork unless `false`) | HMAC-signed accept URLs in email only; hide admin copy-link when SMTP is on |
| `PRSM_REQUIRE_EMAIL_VERIFICATION_ON_INVITATION` | `true` | Block workspace accept until `emailVerified` (Google or email OTP) |
| `INVITATION_TOKEN_SECRET` | Strong random string (optional) | HMAC secret; defaults to `AUTH_SECRET` if unset |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud | Google sign-up/sign-in |
| `DISABLE_REGISTRATION` | `false` or `true` with invites | PRSM prod often open registration + invite-only workspaces |
| `DISABLE_EMAIL_OTP_SIGN_IN` | `false` | Keep OTP as peer path to Google |

## Build test image

```bash
cd /path/to/kaneo
git checkout prsm/allow_google_signup_first
docker build -f Dockerfile.kaneo -t kaneo-prsm-google:test .
```

Point a non-prod compose stack at `kaneo-prsm-google:test` and set the variables above. Do not change the production `usekaneo/kaneo` image pin until QA passes.

See [GOOGLE_FIRST_SIGNUP.md](./GOOGLE_FIRST_SIGNUP.md) for manual verification steps.
