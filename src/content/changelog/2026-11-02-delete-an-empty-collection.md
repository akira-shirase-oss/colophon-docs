---
title: "Delete a collection you no longer need, once nothing of it remains"
date: 2026-11-02
type: Feature
areas: [API, Studio]
docs:
  - label: Management API
    href: /api/management/
---

A collection can now be deleted for good, together with every version of its definition, and its name is free to use again. In the Studio, the content type's page has a two-step **Delete collection…** button.

Deletion is only allowed while nothing of the collection remains, so no revision, publish request or release ever points at a type that has gone. The answer is `409` with a reason you can act on:

- `still_referenced`: another content type has a reference field that links here; the message names it.
- `collection_not_empty`: the collection still has entries; the message counts them.
- `collection_has_history`: deleted entries left revisions that use its definition. Revisions are never rewritten, so a collection that has ever held an entry stays.

The request needs `If-Match` with the type's `ETag` and an `Idempotency-Key`, so a retry after a lost answer replays the deletion instead of answering 404.

```bash
curl -X DELETE http://localhost:8080/api/v1/projects/{project}/environments/{environment}/content-types/drafts-old \
  -H 'If-Match: "v3"' -H 'Idempotency-Key: delete-drafts-old-0001' \
  -H "Authorization: Bearer $COLOPHON_TOKEN"
```

The answer is `200` with `{"data": {"slug": "drafts-old", "removed": true}}`.
