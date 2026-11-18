---
title: "Delete an entry, refused while anything still depends on it"
date: 2026-10-28
type: Feature
areas: [API]
docs:
  - label: Management API
    href: /api/management/
---

Entries can now be deleted through the API. A deletion leaves a tombstone: the entry disappears from every read, list and history, its URL name and any unique values become free, and its earlier versions and past releases are kept untouched. It needs `content.delete` on the entry (or the `own` condition and an entry you created), the draft's `ETag` as `If-Match`, and an `Idempotency-Key`, so a retry after a lost answer replays the same result.

```bash
curl -X DELETE \
  https://cms.example.com/api/v1/projects/{project}/environments/{environment}/collections/posts/entries/{entry} \
  -H "Authorization: Bearer $COLOPHON_TOKEN" \
  -H 'If-Match: <the draft ETag>' \
  -H "Idempotency-Key: $(uuidgen)"
```

The database refuses a deletion that would leave something dangling, and it decides every race. The answer is 409 with a reason:

- `entry_published`: readers still get it, so take it down in a publish request first;
- `still_referenced`: another entry links to it, listed in `details.referenced_by` (only collections you can read);
- `entry_in_changeset`: an unpublished publish request holds it, scheduled or not, listed in `details.changesets`.

A successful deletion answers 200 with `id`, `collection`, `revision_id`, `deleted_at` and `deleted_by`, and is recorded in the audit log.
