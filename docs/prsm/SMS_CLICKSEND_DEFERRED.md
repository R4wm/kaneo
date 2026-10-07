# SMS / ClickSend — deferred

**Status:** Not implemented. Execute only after Phase 1 auth is stable ([EMAIL_AUTH_TEST_CHECKLIST.md](./EMAIL_AUTH_TEST_CHECKLIST.md)).

## Intent

Optional **phone sign-in** via ClickSend SMS OTP, **after** user has **`email_verified`** (preserves Google linking rules).

## Out of scope for v1

- Phone-first registration (`signUpOnVerification`)
- Replacing email OTP
- ClickSend as OTP verifier (Better Auth stores codes; ClickSend is transport)

## Prior design summary

1. **`packages/sms`** — `POST https://rest.clicksend.com/v3/sms/send`, env `CLICKSEND_USERNAME`, `CLICKSEND_API_KEY`, `CLICKSEND_SENDER_ID`
2. Better Auth **`phoneNumber`** plugin without auto sign-up
3. Gates: send/verify phone OTP for session only if `email_verified && phoneNumberVerified`
4. Settings UI: add/change phone while logged in
5. Deploy via custom image from [R4wm/kaneo](https://github.com/R4wm/kaneo) — prod stays upstream until approved

## Related Kaneo task

PRSMUSA board task **#6** (ClickSend verification) — depends on this auth foundation.

## References

- [ClickSend Send SMS](https://developers.clicksend.com/docs/messaging/sms/other/send-sms)
- [Better Auth phoneNumber plugin](https://www.better-auth.com/docs/plugins/phone-number)
- [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) Phase 4
