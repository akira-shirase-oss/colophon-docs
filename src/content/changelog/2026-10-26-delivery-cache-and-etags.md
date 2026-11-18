---
title: "Delivery answers are cached by release, with ETags and a header that says where they came from"
date: 2026-10-26
type: Feature
areas: [API, Performance]
docs:
  - label: Delivery API
    href: /api/delivery/
---

`/content/v1` answers are now cached in Valkey under keys that name their release generation. The generation itself is always read from PostgreSQL first, so a cached answer can't come from the wrong release: a new release simply uses new keys. When many readers miss the same key at once, one request fills it and the others share its answer.

Every answer carries:

- a strong `ETag`; send it back in `If-None-Match` to get `304 Not Modified`;
- `Cache-Control` for shared caches: 30 seconds for the latest release, 300 for a read pinned with `?generation=`, and browsers always revalidate;
- `Cache-Tag` with the entry's and collection's tags, which CDN purges use;
- `Colophon-Cache`: `hit`, `miss`, `coalesced` (waited for another request's fill) or `bypass` (read from PostgreSQL).

```http
HTTP/1.1 200 OK
Colophon-Generation: 12
Colophon-Cache: hit
ETag: "…"
Cache-Control: public, max-age=0, must-revalidate, s-maxage=30
```

The cache is disposable. When Valkey is down or slower than 100 ms, reads go straight to PostgreSQL, bounded by its connection pool (503 with `Retry-After` when it's full), and `/readyz` reports `degraded` rather than unready. Nothing is lost.
