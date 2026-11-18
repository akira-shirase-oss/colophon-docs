---
title: "Single types for one-of-a-kind content like site settings or a home page"
date: 2026-10-28
type: Feature
areas: [API, Studio]
docs:
  - label: Concepts
    href: /concepts/
---

A content type marked `"single": true` holds at most one entry per environment: a site's settings, its home page, its footer. The database is what enforces it, so however two creations race, the second is refused with 409 `single_exists`.

```http
POST /api/v1/projects/{project}/environments/{environment}/content-types
Idempotency-Key: 6f1c…

{"slug": "settings", "definition": {
  "name": "Settings", "title_field": "site_name", "single": true,
  "fields": [{"id": "site_name", "label": "Site name", "type": "text", "required": true}]}}
```

You can make an existing collection single while it holds at most one entry; with more, the change is refused with 422 `too_many_entries` at `/single`. Making it plural again just clears the flag. Older definitions keep their hashes, because the flag is written only when it is true.

In the Studio, a single type opens straight to its one entry instead of a list.
