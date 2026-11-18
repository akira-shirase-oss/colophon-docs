---
title: "Drafts that can't be lost: every save is a revision, guarded by If-Match and Idempotency-Key"
date: 2026-10-26
type: Feature
areas: [API, Studio]
docs:
  - label: Writing in the Studio
    href: /studio/writing/
  - label: Management API
    href: /api/management/
  - label: History
    href: /studio/history/
---

Entries are drafts, and every save writes a new revision; revisions are insert-only, so nothing is overwritten. An entry's `ETag` names its current revision, and a save sends it back in `If-Match`. If someone saved in between, the answer is 409 with `details.reason` `stale_revision` and the current `ETag`; a save without `If-Match` is 428.

Creates and saves also need an `Idempotency-Key` (16 to 128 letters, digits, `-` or `_`). A retry after a lost answer replays the recorded result with `Idempotent-Replayed: true` instead of saving twice; the same key with a different body is 409 `idempotency_key_reused`.

```sh
curl -X PUT "http://localhost:8080/api/v1/projects/{project}/environments/{environment}/collections/{collection}/entries/{entry}" \
  -H 'Authorization: Bearer …' -H 'If-Match: "{revision}"' \
  -H 'Idempotency-Key: save-hello-world-0001' \
  -H 'Content-Type: application/json' -d '{"title":"Hello"}'
```

`GET …/entries/{entry}/revisions` lists every revision kept.

The Studio's editor keeps your edits in this browser first, saves a second after you stop typing, and holds on to them through a closed tab, a dropped network or an expired session. On a conflict it shows both versions and lets you choose: **Keep my version** saves yours on top (theirs stays in the history), **Use their version** discards your unsaved changes.
