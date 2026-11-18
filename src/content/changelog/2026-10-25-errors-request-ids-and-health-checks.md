---
title: "Every error has one shape and a request ID, and health checks say what is wrong"
date: 2026-10-25
type: Feature
areas: [API, Self-hosting, CLI]
docs:
  - label: Errors
    href: /api/errors/
  - label: Monitoring
    href: /self-hosting/monitoring/
---

Every failed request now answers in one JSON envelope, whether a handler or the server's own middleware refused it: a stable `code` to branch on, a `message` that is safe to show a person, and the `request_id`. When there is more to say, `details` carries a stable `reason` and, for a refused body, a JSON Pointer to the value at fault.

```json
{"error":{"code":"validation_failed","message":"…","details":{"reason":"unknown_node","pointer":"/doc/content/0/type"},"request_id":"…"}}
```

The same ID comes back in the `x-request-id` header on every answer and appears in the server's log lines for that request, so a bug report can quote it. Send your own (up to 64 letters, digits, `.`, `_` or `-`) and the server keeps it; otherwise it makes one.

Two health endpoints need no sign-in. `/livez` says the process responds. `/readyz` reports `ready`, or `degraded` when the cache is down (slower, still safe), with a 200; `starting`, `not_ready` or `draining` answer 503, so a load balancer stops sending traffic. `colophon doctor` reads it for you:

```sh
colophon doctor --server http://localhost:8080
```

It exits 0 when the server is ready and 5 when it is degraded, not ready or unreachable.
