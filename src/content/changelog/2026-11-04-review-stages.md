---
title: "Review stages: several named approvals before a publish request can go live"
date: 2026-11-04
type: Feature
areas: [API, Studio]
docs:
  - label: Publishing
    href: /studio/publishing/
---

An environment can now name an ordered list of review stages, such as Editor, Legal and Fact-check. A publish request (`changesets` in the API) publishes only once every stage has an approval on its current content, in any order. A request for changes at any stage blocks it until a newer approval clears it, and any edit to the content makes earlier approvals stale, as before. A stage marked `different_reviewer` can't be approved by the person who made the request. An environment with no stages keeps the single review it always had.

In the Studio, **Settings → Review stages** edits the list, and a publish request's page shows each stage in order with its state (`pending`, `changes_requested`, `approved` or `approval_expired`) and who decided it. Every review names the stage it decides.

Through the API, replace the whole list under its `ETag` (you need permission to change the schema):

```bash
curl -X PUT http://localhost:8080/api/v1/projects/{project}/environments/{environment}/review-stages \
  -H "Authorization: Bearer $COLOPHON_TOKEN" -H 'If-Match: "sha256:…"' \
  -H "Idempotency-Key: stages-2026-11-0001" -H "Content-Type: application/json" \
  -d '{"stages": [{"key": "editor", "name": "Editor"},
                  {"key": "legal", "name": "Legal", "different_reviewer": true}]}'
```

A review then sends `{"decision": "approve", "stage": "legal"}`; leaving out `stage` where stages exist is `422 stage_required`.
