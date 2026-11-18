---
title: "Site users can sign in with a magic link sent by email"
date: 2026-11-05
type: Feature
areas: [API, Self-hosting]
docs:
  - label: Authentication & API tokens
    href: /api/authentication/
  - label: Configuration
    href: /self-hosting/configuration/
---

Visitors to your site can now sign in, or sign up, without a password. Your site asks Colophon for a link, Colophon emails it, and the visitor lands back on your site with a single-use token that lasts 15 minutes.

`POST /audience/v1/{project}/magic-link` answers the same `202` whether or not the address has an account, so it reveals nothing about who is registered. The link is your `return_to` page with `token=` added. Your site spends it with `POST /audience/v1/{project}/magic-link/{token}`: an existing account gets its session, an unknown address becomes a new site user in the project's open sign-up role, and a used, expired or unknown token answers `403 magic_link_invalid`. Only the token's hash is stored.

```sh
curl -X POST https://cms.example.com/audience/v1/{project}/magic-link \
  -H 'Content-Type: application/json' \
  -d '{"email":"reader@example.com","return_to":"https://example.com/signed-in"}'
```

To send real mail, set `COLOPHON_MAIL_PROVIDER=resend`, `COLOPHON_MAIL_FROM` and `COLOPHON_RESEND_API_KEY` together; a partial set stops the server at start-up. Since 2026-11-17 a link lands only on an origin the project lists.
