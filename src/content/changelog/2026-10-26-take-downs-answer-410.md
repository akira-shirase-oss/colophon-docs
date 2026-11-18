---
title: "Take an entry down through a publish request, and it answers 410 at every generation"
date: 2026-10-26
type: Feature
areas: [API, Studio]
docs:
  - label: Publishing
    href: /studio/publishing/
  - label: Delivery API
    href: /api/delivery/
---

Taking an entry down changes what readers see, so it goes through review like any other change. A publish request (`changesets` in the API) lists the entry under `unpublish`, pinning the revision that is live now, so the reviewer approves taking down exactly what readers get:

```http
POST /api/v1/projects/{project}/environments/{environment}/changesets
Idempotency-Key: …
{"title":"Withdraw the old pricing page","unpublish":["{entry}"]}
```

When its release commits, the entry's publication closes, a tombstone is recorded and every earlier publication of it is revoked. From then on `/content/v1` leaves it out of lists and answers a read of it with 410 `gone` and `Cache-Control: no-store`, including reads pinned to an older release with `?generation=`: history never gets round a take-down. Answers cached before it are never served again, because cache keys name the environment's latest take-down.

With a CDN connection, the release reports its purge as `pending`, `accepted` or `failed`, and the Studio says *Removal pending at the CDN* until it is accepted. Copies a browser already downloaded can't be recalled. Publishing the entry again makes it readable from that new release on.
