---
title: "Export a collection as JSON Lines and import it back, or bring entries from Strapi and Sanity"
date: 2026-11-04
type: Feature
areas: [API, CLI]
docs:
  - label: Management API
    href: /api/management/
  - label: The colophon CLI
    href: /cli/
---

`GET /api/v1/projects/{project}/environments/{environment}/collections/{collection}/export` streams every draft of a collection as JSON Lines (`application/jsonlines`), one content document per line. `POST …/import` takes that file back, or a JSON array, a Strapi v4 or v5 export, or Sanity's NDJSON, mapping each document onto your content type's fields. Up to 512 items land in one transaction, or none do. An item carrying the id of a live entry updates that entry's draft; the rest are created.

Why it matters: moving content between projects, or in from another CMS, no longer needs a script per source. `?dry_run=true` runs the whole import and rolls it back, answering a plan per item (`would_create`, `would_update`, `skipped`, or `invalid` with its refusal) plus any `unmapped` fields, and needs no `Idempotency-Key`. A real import requires one, so a retry can't import twice. `?type=` takes one Sanity `_type` from a mixed file. An export needs a role that reads every field.

From the terminal:

```sh
colophon content export posts --project my-site > posts.jsonl
colophon content import posts --project my-site --file posts.jsonl --dry-run
colophon content import posts --project other-site --file sanity.ndjson --type post
```
