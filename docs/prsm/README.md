# PRSM documentation — Kaneo fork

Production remains **upstream pinned** at work.prsmusa.com unless otherwise noted.

Plans are split across **feature branches** (not all docs exist on every branch):

| Branch | Plan |
|--------|------|
| **`prsm/allow_google_signup_first`** | [GOOGLE_FIRST_SIGNUP.md](./GOOGLE_FIRST_SIGNUP.md) — allow Google sign-up (password/OTP unchanged) |
| **`prsm/sms-phone-verification`** | SMS backup sign-in + `@kaneo/sms` ([on that branch](https://github.com/R4wm/kaneo/tree/prsm/sms-phone-verification/docs/prsm/SMS_PHONE_VERIFICATION.md)) |

Shared workflow: push only to [R4wm/kaneo](https://github.com/R4wm/kaneo); fetch [usekaneo/kaneo](https://github.com/usekaneo/kaneo) for upstream.

Infra: [infra-docs runbooks](https://github.com/r4wm/infra-docs) (e.g. `runbooks/kaneo-prsmusa.md`).
