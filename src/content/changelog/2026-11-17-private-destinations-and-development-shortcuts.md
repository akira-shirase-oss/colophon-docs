---
title: "Website connections reach only public https addresses unless you opt in"
date: 2026-11-17
type: Security
areas: [Self-hosting, API]
docs:
  - label: Website connections
    href: /api/website-connections/
  - label: Configuration
    href: /self-hosting/configuration/
---

A server listening on a loopback address used to be treated as a development machine, so its webhooks, CDN purges and probes could reach private and loopback addresses. A production server behind a reverse proxy listens on loopback too, which meant a project member could aim a destination at services on the private network.

Now a destination must be https and resolve to a public address, checked when it is saved and again before every attempt, whatever address the server listens on. The worker also ignores proxy settings from its environment, so a delivery can't go around the check through a proxy.

For local development only, opt in explicitly; the server says so in its start-up log:

```sh
COLOPHON_ALLOW_PRIVATE_DESTINATIONS=1
```

The other development shortcuts got the same treatment. `COLOPHON_DEV_MAIL=1`, which hands sign-in links back in responses, and the development identity provider's public client secret are refused at start-up unless the server listens on loopback **and** `COLOPHON_PUBLIC_URL` names `localhost`, a `*.localhost` name or a loopback address.
