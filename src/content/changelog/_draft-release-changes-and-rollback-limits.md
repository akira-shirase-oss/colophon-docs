---
title: "A release's changes are their own paged list; a rollback preview is a promise, and rollbacks have a size limit"
date: 2026-11-18
type: Breaking
areas: [API, SDK]
docs:
  - label: Management API
    href: /api/management/
  - label: Rollback
    href: /studio/rollback/
---

**A receipt no longer embeds what the release changed.** `GET …/releases/{n}` drops `changes`. Read them a page at a time instead, publishes first and then takedowns, each in entry-id order:

```sh
curl "http://localhost:8080/api/v1/projects/$PROJECT/environments/production/releases/3/changes?limit=100" \
  -H "Authorization: Bearer $COLOPHON_TOKEN"
```

Pass `next_cursor` back as `cursor` until it is `null`. A release that changed thousands of entries no longer makes a receipt thousands of lines long.

**A rollback preview is a promise.** `GET …/releases/{n}/rollback` answers with an `ETag`: the hash of exactly what the rollback would pin. Send it back as `If-Match` on `POST …/rollback`. If anything moved since you looked, the rollback is refused with `409 stale_changeset` instead of making something you didn't review. The Studio always sends it.

**A rollback changes at most 190 entries.** Past that, `POST …/rollback` is refused with `422 rollback_too_large`, and the preview answers `too_large` with the totals instead of the lines. Before this limit, a rollback of a few hundred entries failed with a `500`, and nothing was made. To go back further, roll back to a nearer release first, or take entries down in batches.

A `{generation}` that isn't a positive whole number now gets the usual error envelope: `404` on release reads and `422 invalid_generation` on rollbacks.

Reading what was live at a past release no longer scans publication history: it uses two index ranges, so the cost of a rollback's preview no longer grows with the length of the history.
