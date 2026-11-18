---
title: "One release, one generation number, and a public delivery API that reads any of them"
date: 2026-10-26
type: Feature
areas: [API]
docs:
  - label: Delivery API
    href: /api/delivery/
  - label: Concepts
    href: /concepts/
---

Publishing an approved publish request commits one release in one transaction. The environment's generation goes up by exactly one, and only from the base the publisher saw: if another release committed first, the answer is 409 `generation_moved` with the current number in `Colophon-Generation`. Two releases on one base can never both win.

```http
POST /api/v1/projects/{project}/environments/{environment}/changesets/{changeset}/publish
If-Match: "sha256:…"
Idempotency-Key: …
{"base_generation": 11}
```

Published content is served at `/content/v1` with no sign-in, from a published copy read by a database role that can't see drafts at all. `{project}` is the project's id:

```sh
curl http://localhost:8080/content/v1/{project}/{environment}/posts
curl "http://localhost:8080/content/v1/{project}/{environment}/posts/{entry}?generation=12"
```

Without `generation` you read the latest release; with it you read that release exactly as it was, so a site build can take every collection from one release. Every answer names its generation in `Colophon-Generation`, a list's `next_cursor` keeps its first page's generation so paging never mixes two releases, and a generation not yet published is 422 `invalid_generation`.
