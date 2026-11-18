---
title: "Queued work is bounded per project and per installation, and dead rows are swept hourly"
date: 2026-11-05
type: Improvement
areas: [Self-hosting]
docs:
  - label: Errors
    href: /api/errors/
  - label: Configuration
    href: /self-hosting/configuration/
---

Two bounds now stop queued work growing without end. A project holds at most 10,000 unfinished jobs across delivery, uploads, bulk edits and schema migrations, and an installation holds at most 1 GiB of pending job data such as keys, manifests and migration plans. A request that would pass either bound is refused before anything is stored: `503 unavailable` with `Retry-After` and `details.reason` `work_full` or `payload_full`. Work drains as workers finish it, so retrying after the delay is the fix.

The worker also sweeps dead state every hour (`COLOPHON_TABLE_SWEEP_MS`), at most 500 rows a table per pass, oldest first: finished jobs, schedules, probe observations and idempotency records after 30 days; the audit log, settled budget records, and sessions, personal tokens, invitations and setup codes 90 days after they lapse.

Why it matters: a stuck destination or a runaway script can't fill the database, and a long-running installation stays the size of its content. History is never swept: revisions, publications, tombstones, comments, tasks and the deletion ledger stay, and open or uncertain budget records are kept.

```json
{"error": {"code": "unavailable", "message": "…", "request_id": "…",
  "details": {"reason": "work_full"}}}
```
