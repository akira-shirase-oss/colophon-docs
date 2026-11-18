---
title: "Sign in with email and password; an identity provider is now optional"
date: 2026-11-06
type: Feature
areas: [API, Studio, Self-hosting]
docs:
  - label: Authentication & API tokens
    href: /api/authentication/
  - label: Installation
    href: /installation/
---

Colophon no longer needs an OpenID Connect provider. Built-in email-and-password accounts are the default way to sign in to the Studio, and OIDC is an adapter you add only if you want single sign-on.

`POST /auth/signup` makes an account (password at least 8 characters) and starts its session; an existing email answers `409 email_taken`. `POST /auth/signin` answers `204` with the session cookies. A wrong password and a missing account get the same `400 sign_in_failed`, so the form never reveals who has an account. `GET /auth/providers` answers `{"data": {"sso": false}}` when no provider is configured, and the Studio hides the single sign-on button accordingly.

Operators can make accounts from the terminal. `colophon admin account` creates or resets one, and `--admin` makes it an administrator; `colophon admin bootstrap --issuer password --subject <email>` makes the first administrator without a provider.

```sh
export COLOPHON_MIGRATION_DATABASE_URL=postgres://…
COLOPHON_ACCOUNT_PASSWORD='…' colophon admin account \
  --email editor@example.com --admin
```

Re-running the command replaces the password, so it doubles as a recovery tool.
