---
title: "Define your own content types, versioned and checked against the content they hold"
date: 2026-10-26
type: Feature
areas: [API]
docs:
  - label: Concepts
    href: /concepts/
  - label: Management API
    href: /api/management/
---

A project now defines its own content types. A definition has a name, the field that serves as each entry's title, and 1 to 100 fields, each with an id, a label, whether it is required, and a type with its limits: `text`, `rich_text`, `number`, `boolean`, `enum` or `datetime`. The server validates every entry save against its collection's definition.

Definitions are versioned and insert-only, and each revision records the version it was checked against. `GET …/content-types/{slug}` answers with `ETag: "v<version>"`; a change is a `PUT` with that value in `If-Match`, so two people editing one type can't overwrite each other (409 `stale_version`). A change that would leave stored entries invalid is refused with 422 `needs_migration`, so every stored revision stays valid.

```sh
curl -X POST "https://cms.example.com/api/v1/projects/{project}/environments/{environment}/content-types" \
  -H 'Authorization: Bearer …' -H 'Idempotency-Key: create-posts-type-01' \
  -H 'Content-Type: application/json' \
  -d '{"slug":"posts","definition":{"name":"Posts","title_field":"headline",
       "fields":[{"id":"headline","label":"Headline","type":"text","required":true}]}}'
```

Entries then live under `…/collections/posts/entries`.
