---
title: "The releases list pages past the newest 100, and the OpenAPI document matches the routes"
date: 2026-11-17
type: Fix
areas: [API, Studio]
docs:
  - label: Management API
    href: /api/management/
  - label: API reference
    href: /api/reference/
---

`GET /api/v1/projects/{project}/environments/{environment}/releases` used to stop at the newest 100 releases with `next_cursor` always `null`, although the OpenAPI document described a cursor. It now pages for real: `?limit=` takes 1–100 (default 100, what it answered before, so callers that never page see no change) and `?cursor=` takes the `next_cursor` of the previous page. A release published while you walk the pages lands above the first page, so a walk never skips or repeats one.

```sh
curl "http://localhost:8080/api/v1/projects/{project}/environments/{environment}/releases?limit=50&cursor=<next_cursor>" \
  -H "Authorization: Bearer $COLOPHON_TOKEN"
```

The MCP server's `list_releases` tool takes the cursor too, and the Studio's Releases page has **Show older releases**.

The OpenAPI document now says only what each route does. A list that pages names the parameter its `next_cursor` goes back in; a list that always answers in one page says what that page holds and types `next_cursor` as always `null`. A release's receipt lists every release field directly, with the release, delivery and observation fields marked required. The SDK's generated types follow the corrected document.
