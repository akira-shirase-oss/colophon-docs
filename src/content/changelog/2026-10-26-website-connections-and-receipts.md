---
title: "Website connections announce each release once, purge CDNs and check your site"
date: 2026-10-26
type: Feature
areas: [API, Studio]
docs:
  - label: Website connections
    href: /api/website-connections/
  - label: Publishing
    href: /studio/publishing/
---

An environment can have destinations, the Studio's website connections, of three kinds (`POST …/destinations`):

- `webhook`: each release is announced with a `release.committed` POST carrying `Idempotency-Key` and `Colophon-Generation`. The job is written in the release's own transaction and sent by a background worker, retried with backoff on 408, 425, 429, 500, 502, 503 and 504, and dropped when a newer release supersedes it, so an older release never lands after a newer one.
- `cdn`: each release sends `{"tags": [...]}`, a purge by tag covering every release since that CDN's last successful purge.
- `probe`: the worker fetches a URL and reads which release it serves, from the `Colophon-Generation` header or a `<meta name="colophon-generation" content="N">` tag.

```json
{"kind":"probe","name":"Home page","url":"https://example.com/"}
```

Addresses must be https on the public internet. `GET …/releases/{generation}` is the release's receipt: one `label` (`published`, `pending`, `verified` with its count of `locations`, or `needs_attention`), the CDN `purge` state, each destination's deliveries and every probe observation. "Verified" always says at how many locations, because one probe's view isn't the whole internet. The Studio shows it as a receipt timeline.
