---
title: "Collections with a hyphen in their name get a cache tag, so CDN purges reach their lists"
date: 2026-11-16
type: Fix
areas: [API]
docs:
  - label: Website connections
    href: /api/website-connections/
  - label: Delivery API
    href: /api/delivery/
---

Delivery answers carry a `Cache-Tag` header so a CDN connection can purge exactly what a release changed. A list page's tags include one for its collection, but that tag was only made for names of lowercase letters, digits and underscores. Collection names may also contain hyphens, so a collection such as `release-notes` got no collection tag. After a release, the purge missed its list pages, and a CDN kept serving the old list until it expired (up to 30 seconds).

The rule for a collection tag is now exactly the rule for a collection's name, hyphens included. A name no collection could have still gets no tag, so text from a URL never reaches the header.

```http
GET /content/v1/{project}/{environment}/release-notes HTTP/1.1
Host: cms.example.com

HTTP/1.1 200 OK
Cache-Tag: …, colophon:p:<project id>:e:<environment id>:c:release-notes
```

Nothing to change on your side: the next release purges these lists along with everything else, and the tags do not depend on the generation, so purges cover answers cached from earlier releases too.
