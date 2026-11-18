---
title: "Sign in to the Studio, and every project is walled off from the others"
date: 2026-10-26
type: Feature
areas: [API, Studio]
docs:
  - label: Authentication & API tokens
    href: /api/authentication/
---

People can sign in to the Studio through an OpenID Connect provider: `GET /auth/login` sends the browser to the provider, and `GET /auth/callback` brings it back signed in. The server keeps each session as a database row and gives the browser only a random token in the `colophon_session` cookie (`HttpOnly`, `Secure`, `SameSite=Lax`). A session ends 12 hours after sign-in or after 2 hours unused, and `POST /auth/logout` ends it from the very next request, because nothing caches sessions.

Writes made with that cookie need two more things: an `X-CSRF-Token` header echoing the readable `colophon_csrf` cookie, and an `Origin` that is the server's public origin or one listed in `COLOPHON_TRUSTED_ORIGINS`, compared exactly. Anything else is 403 with `details.reason` `csrf_token_invalid` or `origin_not_allowed`.

Projects are isolated. `GET /me` and `GET /api/v1/projects` list only the projects you belong to, and a route naming a project you aren't in answers exactly as one that doesn't exist, so ids and slugs can't be probed:

```http
GET /api/v1/projects/{project} HTTP/1.1
Cookie: colophon_session=…

HTTP/1.1 404 Not Found
{"error":{"code":"not_found","message":"…","request_id":"…"}}
```
