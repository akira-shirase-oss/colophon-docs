---
title: "Change a content type that existing entries don't fit: plan, dry run, approve, apply"
date: 2026-11-04
type: Feature
areas: [API, Studio, CLI]
docs:
  - label: Management API
    href: /api/management/
  - label: The colophon CLI
    href: /cli/
---

A content-type change that stored entries wouldn't pass (`422 needs_migration`) no longer has to stop at a refusal. You can plan a migration: Colophon dry-runs the new definition against every draft and open publication of the collection and lists each entry as `ok` or `needs_input`, with the problem it would hit. Nothing is written until the plan is approved and applied.

Approve and apply bind to the plan's hash (its `ETag`), so you apply exactly what you looked at; if the plan has moved, the answer is `409 plan_moved`. Applying answers `202` and a worker converts the entries one at a time, resuming after a crash without doing any twice. The plan ends `done`, or `blocked` with its reason, and `republish_required` lists the published entries to publish again. While it runs, the type can't be changed elsewhere (`migration_in_progress`). For an entry the target can't derive, give it a replacement with `PUT …/migrations/{migration}/items/{entry}`.

In the Studio, the type builder's refusal offers **Plan a migration for this change**, and a **Migrations** section shows each plan's counts, items and a resolve dialog. From the terminal:

```bash
colophon migration plan posts --project my-site --file posts-v4.json
colophon migration show {migration} --project my-site
colophon migration approve {migration} --project my-site --if-match <plan hash>
colophon migration apply {migration} --project my-site --if-match <plan hash>
```
