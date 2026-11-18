---
title: "Sign-in pauses the guesser, not the account, and password work has a ceiling"
date: 2026-11-17
type: Security
areas: [API, Self-hosting]
docs:
  - label: Authentication & API tokens
    href: /api/authentication/
  - label: Errors
    href: /api/errors/
  - label: Security
    href: /self-hosting/security/
---

Several fixes to staff and site-user sign-in, all on `main`:

- **Guessing no longer locks out the owner.** Eight misses used to pause the account itself, and a pause answered differently from a wrong password. Now misses pause the (account, client address) pair for fifteen minutes; IPv6 clients count by their /64. Fifty misses in an hour from addresses the account never signed in from pause those addresses only; the owner's own addresses keep working.
- **A pause looks like a miss.** `409 too_many_attempts` is gone: a paused attempt answers `400 sign_in_failed`, as a wrong password or a missing account does. A site user's `403 account_disabled` now comes only with the right password.
- **Password hashing is bounded.** At most `COLOPHON_PASSWORD_CONCURRENCY` hashes run at once (one per core by default); a short queue waits, the rest answer `503 unavailable` with `Retry-After`, and no hash holds a database connection, so a sign-in flood can't starve delivery.
- **Small bodies before sign-in.** Sign-up, sign-in, the device flow and magic-link requests read at most 16 KiB; more answers `413 payload_too_large`.

If clients branch on `too_many_attempts`, treat `sign_in_failed` as the only refusal. Behind a reverse proxy, set `COLOPHON_TRUSTED_PROXIES`, or every client looks like the proxy.
