---
title: "A replaced or deleted image no longer stays cached for a year at its plain address"
date: 2026-11-17
type: Security
areas: [API]
docs:
  - label: Media library
    href: /studio/media-library/
  - label: Delivery API
    href: /api/delivery/
---

An upload's plain address, `/media/v1/{project}/{environment}/{asset}`, always serves the upload's current version, and a replace or a delete changes what that is. It was nevertheless marked immutable for a year, so a browser or CDN that had seen the old bytes could keep showing a replaced image, or one you had deleted, long after the change.

Now caching follows what the address names:

- a version's own address, `…/{asset}/{sha}` and its renditions, stays `public` and `immutable` with a one-year `max-age`: those bytes never change;
- the plain addresses, `…/{asset}` and `…/{asset}/{name}`, answer `public, max-age=60, must-revalidate` with the version's `ETag`, and a matching `If-None-Match` gets a `304` with no body.

```http
GET /media/v1/{project}/production/{asset}
If-None-Match: "…"

HTTP/1.1 304 Not Modified
Cache-Control: public, max-age=60, must-revalidate
```

A change at the plain address now reaches caches within a minute. For pages that must show exactly what was published, use the versioned `url` that delivery rows carry in `media`.
