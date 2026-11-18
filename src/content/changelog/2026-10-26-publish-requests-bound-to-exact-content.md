---
title: "Publish requests pin exact revisions, and an approval covers only what was reviewed"
date: 2026-10-26
type: Feature
areas: [API, Studio]
docs:
  - label: Publishing
    href: /studio/publishing/
---

A publish request (`changesets` in the API) names 1 to 100 entries and pins each at its current revision. Its hash is computed from those exact revisions, and an approval counts only while the request keeps the hash it was given on. Edit an entry afterwards and the request turns `stale`: refreshing it pins the new revision, changes the hash and needs a fresh review. Approvals also expire after seven days.

Why it matters: "approved" means these exact bytes were looked at, not that someone once said yes to an entry.

```http
POST /api/v1/projects/{project}/environments/{environment}/changesets
Idempotency-Key: …
{"title":"Spring launch","entries":["{entry}"]}

POST …/changesets/{changeset}/submit
If-Match: "sha256:…"

POST …/changesets/{changeset}/reviews
If-Match: "sha256:…"
{"decision":"approve","comment":"Checked the prices"}
```

`submit`, `refresh` and `reviews` each send the hash the caller looked at; if it moved, the answer is 409 `stale_changeset` with the current hash in `ETag`. A review's `decision` is `approve` or `request_changes`, and only the latest decision on the current hash counts. A request moves through `open`, `awaiting_review`, `changes_requested`, `approved` and `approval_expired`, and publishes once.
