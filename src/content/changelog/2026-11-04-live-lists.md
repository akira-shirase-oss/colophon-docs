---
title: "The Studio's lists update live as other people work, over a server-sent events stream"
date: 2026-11-04
type: Feature
areas: [API, Studio]
docs:
  - label: Live events
    href: /api/live-events/
---

When a colleague saves an entry, opens a publish request or publishes a release, your Studio now shows it without a reload or a poll: entry lists, publish requests, receipts, tasks and the rest refresh themselves within moments of the change committing. A save on an entry you have open is still a conflict for you to resolve, never a silent overwrite.

The same stream is open to your own tools. Any member or project API token can subscribe:

```bash
curl -N http://localhost:8080/api/v1/projects/{project}/environments/{environment}/events \
  -H "Authorization: Bearer $COLOPHON_TOKEN"
```

It sends `hello`, then a `change` frame naming only what kind of thing changed, such as `{"k":"entries","c":"posts"}`, never an id or any content. Refetch through the API you already use, so what you see is what your role may read. If hints may have been missed, the stream sends `resync`: reload what you show. It never replays.

Streams are bounded: past 8 for one credential the answer is `429 rate_limited` with `Retry-After`, and past the project's or server's limit, `503`. A stream ends cleanly after 30 minutes so clients reconnect, and a member removed from the project, or a revoked token, loses the stream within minutes.
