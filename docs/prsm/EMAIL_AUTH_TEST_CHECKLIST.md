# Email auth test checklist — PRSM Kaneo

Use for each new member or before declaring auth “stable.” Prod: [work.prsmusa.com](https://work.prsmusa.com).

## Preconditions

- [ ] `GET /api/config` → `hasSmtp: true`, `disableEmailOtpSignIn: false`
- [ ] If testing Google: `hasGoogleSignIn: true`
- [ ] Confirm **exact email spelling** with the user (avoid livetolive vs lifetolive-style typos)
- [ ] User checks **Spam / Promotions / All Mail** for “Authentication code for Kaneo” from `SMTP_FROM`

## Happy path — invitee (password + OTP + Google)

1. [ ] Admin sends invite to target email (or user registers if `disableRegistration: false`)
2. [ ] User completes invite / sets password if prompted
3. [ ] **Email OTP sign-in**: enter email → receive code → verify on `/auth/verify-otp`
4. [ ] DB: `user.email_verified = true` for that email
5. [ ] **Password sign-in** works (optional sanity check)
6. [ ] **Google**: Sign in with Google using **same email** → links without “registration disabled” error
7. [ ] Session: user reaches workspace/dashboard; can open assigned projects

## Negative cases

1. [ ] **Google before email verify**: expect failure / no link; user should use email OTP section first, not Google button
2. [ ] **Wrong email on OTP form**: no mail to intended inbox; check `verification` table identifier matches typed email
3. [ ] **Expired OTP**: wait past expiry (~5 min) → invalid code; request new code

## Operator diagnostics

```bash
# On baser4wm
curl -sS https://work.prsmusa.com/api/config | jq .
docker logs kaneo-kaneo-1 --since 30m 2>&1 | tail -50

docker exec kaneo-postgres-1 psql -U kaneo -d kaneo -c \
  "SELECT email, email_verified FROM \"user\" WHERE email = '<test-email>';"

docker exec kaneo-postgres-1 psql -U kaneo -d kaneo -c \
  "SELECT identifier, created_at, expires_at > NOW() AS valid FROM verification \
   WHERE identifier LIKE '%<test-email>%' ORDER BY created_at DESC LIMIT 5;"
```

## Deliverability notes

- Gmail SMTP from `prsmusallc@gmail.com` may deliver to Sent while recipient Gmail filters HTML OTP mail.
- Manual plain email to the same address is not a substitute test for Kaneo HTML OTP.
- Long-term: transactional domain (not consumer Gmail) or SMS fallback (deferred — see [SMS_CLICKSEND_DEFERRED.md](./SMS_CLICKSEND_DEFERRED.md)).

## Sign-off

| Field | Value |
|-------|--------|
| Tester | |
| Test email | |
| Date | |
| Result | Pass / Fail |
| Notes | |
