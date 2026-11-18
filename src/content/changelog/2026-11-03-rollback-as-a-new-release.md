---
title: "Roll back to an earlier release, reviewed like any other publish"
date: 2026-11-03
type: Feature
areas: [API, Studio]
docs:
  - label: Rollback
    href: /studio/rollback/
  - label: Publishing
    href: /studio/publishing/
---

You can now restore what an earlier release published. A rollback is not a jump back in time: it opens an ordinary publish request (`changesets` in the API) that republishes every entry that release had live, and takes down entries that are live now but weren't then. It is submitted, approved on its exact content and published like any other, and publishing it makes a new release with the next generation number. Your history stays whole, and the review rule still applies.

In the Studio, a release's receipt has **Roll back to this release** for anyone who may update content, on any release before the current one. It opens the restore, and its page says which release it restores.

Through the API:

```bash
curl -X POST https://cms.example.com/api/v1/projects/{project}/environments/{environment}/releases/{generation}/rollback \
  -H "Authorization: Bearer $COLOPHON_TOKEN" -H "Idempotency-Key: rollback-to-12-0001" \
  -H "Content-Type: application/json" -d '{"title": "Rollback to release 12"}'
```

The answer is `201` with the publish request, whose `rollback_generation` names the release it restores. A generation outside the earlier releases is `422 invalid_generation`; if nothing would change, `422 already_at`. Content taken down since that release is not brought back.
