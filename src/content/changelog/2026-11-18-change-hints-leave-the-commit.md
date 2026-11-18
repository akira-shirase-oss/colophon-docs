---
title: "Saves commit together again: live-list hints are sent after the commit"
date: 2026-11-18
type: Improvement
areas: [Performance, API]
docs:
  - label: Live events
    href: /api/live-events/
---

Every save, publish or membership change used to send its live-list hint from inside its own database transaction. PostgreSQL lets only one transaction that sends a notification commit at a time, so concurrent writes lost group commit: in load tests on a slower machine, changes to members, schedules and tokens queued 100–380 ms for that one lock.

Now a write only records its hint, and each Colophon process sends the committed hints every 100 ms, each distinct hint once, in a short transaction of its own. Concurrent saves commit in groups again. A statement that changes 1,000 rows queues one hint, not 1,000.

What you notice: a Studio list or an open event stream may hear about a change up to 100 ms later than before. Nothing else changes for clients. The `change` frames on `GET /api/v1/projects/{project}/environments/{environment}/events` keep their shape, commits close together may fold into one frame, and the last commit is always reported. A client should still refetch on each frame rather than count frames, and treat `resync` as "reload what you show".

```text
event: change
data: {"k":"entries","c":"posts","e":"<environment id>"}
```
