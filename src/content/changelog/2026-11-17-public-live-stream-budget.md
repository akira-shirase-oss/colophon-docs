---
title: "Anonymous live streams have their own budget and can't crowd out editors"
date: 2026-11-17
type: Security
areas: [API, Self-hosting]
docs:
  - label: Live events
    href: /api/live-events/
  - label: Configuration
    href: /self-hosting/configuration/
---

The public live stream, `GET /content/v1/{project}/{environment}/events`, needs no credential. Its streams used to count against the same per-project and per-server limits as the Studio's own live updates, so enough anonymous streams could stop editors from getting live updates, and one client could take the whole budget.

Now anonymous streams are counted on their own, and each client address has a cap (IPv6 counted by its /64). Editors' streams never compete with them. Hints still travel the same way, so a published change costs the same to announce.

| Setting | Default | Over it |
|---|---|---|
| `COLOPHON_EVENTS_PUBLIC_PER_ADDRESS` | 8 | `429 rate_limited` with `Retry-After` |
| `COLOPHON_EVENTS_PUBLIC_PER_PROJECT` | 256 | `503 unavailable` |
| `COLOPHON_EVENTS_PUBLIC_MAX_STREAMS` | 2048 per server | `503 unavailable` |

A site that fans one upstream stream out to its own visitors holds one stream per site server, well inside the per-address cap. Behind a reverse proxy, set `COLOPHON_TRUSTED_PROXIES` so each visitor is counted by their own address rather than the proxy's.
