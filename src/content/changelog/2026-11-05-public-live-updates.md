---
title: "Published content has a public live stream, so open pages refresh without a rebuild"
date: 2026-11-05
type: Feature
areas: [API]
docs:
  - label: Live events
    href: /api/live-events/
---

A site can now hear when something is published. `GET /content/v1/{project}/{environment}/events` is an anonymous server-sent-events stream: it sends `hello` once, then a `change` frame each time a release lands in that environment. Draft saves never reach it, and a burst of release activity folds into one frame.

The frame carries nothing but its own existence: no ids, no collections, no content. A reader only learns to re-read the delivery API with whatever credentials it already has, so gated entries cannot leak through the stream. The answer is `Cache-Control: no-store`, and the stream ends after its lifetime so clients reconnect.

The intended shape is one stream per site server, not per visitor: your server listens once and tells its open browser tabs to refresh, which keeps the CMS's stream count proportional to sites, not readers.

```sh
curl -N http://localhost:8080/content/v1/{project}/{environment}/events
```

```text
event: hello
data: {}

event: change
data: {}
```

On each `change`, fetch the page's data again from `/content/v1`; the new answer names the new generation.
