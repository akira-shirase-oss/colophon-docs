---
title: "Rate limits counted once across every server, and safe to run several servers"
date: 2026-10-28
type: Feature
areas: [API, Self-hosting]
docs:
  - label: Rate limits
    href: /api/rate-limits/
  - label: Configuration
    href: /self-hosting/configuration/
---

Every request to the management API (`/api/`, `/auth/`) now counts against its client address and its credential, and every public delivery request (`/content/`) against its address at a higher rate. Health checks, `/version` and the Studio's files never count. Over a limit, the answer is 429 `rate_limited` with `Retry-After` in seconds, before any work is done.

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 2

{"error": {"code": "rate_limited", "message": "…", "request_id": "…"}}
```

The counts live in Valkey, so several Colophon servers behind one load balancer share them. If Valkey is down or slow, each server applies the same limits on its own until it is back. Sessions, idempotency keys and caches were already shared, so any server can answer any request, and `/readyz` checks the database on a connection of its own, so a busy server isn't marked unready by mistake.

Defaults are 300 requests a second (burst 600) per address, 150 (300) per credential and 1,000 (2,000) for delivery; change them with `COLOPHON_RATE_LIMIT_PER_ADDRESS`, `COLOPHON_RATE_LIMIT_PER_CREDENTIAL` and `COLOPHON_RATE_LIMIT_DELIVERY` (for example `300/600`, or `off`). Behind a reverse proxy, list it in `COLOPHON_TRUSTED_PROXIES` so `X-Forwarded-For` names the real client; otherwise every visitor shares the proxy's count.
