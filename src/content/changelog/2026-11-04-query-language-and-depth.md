---
title: "Filter, sort and select fields with one query document, on drafts and published content"
date: 2026-11-04
type: Feature
areas: [API]
docs:
  - label: Delivery API
    href: /api/delivery/
  - label: Management API
    href: /api/management/
---

Collections can now be queried with a small JSON document posted to `…/query`: `filters` (`eq`, `in`, `lt`, `lte`, `gt`, `gte`, `contains`), `sort`, `fields`, `limit` and `depth`. The same document runs on published content at `/content/v1` (pinned to a release with `?generation=`) and, for signed-in callers, on current drafts at `POST /api/v1/projects/{project}/environments/{environment}/collections/{collection}/entries/query`.

```bash
curl -X POST "https://cms.example.com/content/v1/{project}/{environment}/posts/query" \
  -H "Content-Type: application/json" \
  -d '{"filters": [{"field": "category", "op": "eq", "value": "travel"}],
       "sort": [{"field": "published_on", "dir": "desc"}],
       "fields": ["title", "author"], "limit": 10, "depth": 1}'
```

Queries stay fast and predictable because they are bounded: you can only filter or sort on fields the content type marks `"index": true` (`field_not_indexed` otherwise), with at most 8 filters and 4 sort keys. `depth` (0–2) replaces each top-level single reference with the linked entry's `id`, `title` and `content`. Every answer echoes the canonical query and its `query_hash` in `applied`, and `next_cursor` only works for that same query (`foreign_cursor`).

On drafts, results respect field-level permissions: filtering or sorting on a field your role can't read is `422 field_not_readable`, and `hidden_fields` names what a row left out.
