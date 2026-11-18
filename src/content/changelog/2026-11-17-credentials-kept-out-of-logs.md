---
title: "Sign-in tokens and device codes in a URL never reach the logs"
date: 2026-11-17
type: Security
areas: [Self-hosting]
docs:
  - label: Monitoring
    href: /self-hosting/monitoring/
  - label: Security
    href: /self-hosting/security/
---

Every log line written while handling a request carries the request's path. Two routes carry a secret in that path: spending a magic link (`POST /audience/v1/{project}/magic-link/{token}`) and the CLI's device approval page (`GET /auth/device/{code}`). With debug logging on, or whenever a warning was logged during such a request, the live token or code was written to the log store.

Now the logged path writes those segments as their names, so the line reads `POST /audience/v1/<project id>/magic-link/{token}` at every log level. Every other segment is kept as sent, so ids stay searchable. A path that matches no route but looks like one of these, such as one with a trailing slash, is redacted the same way.

Nothing changes for clients; the routes keep their shape. If you kept debug logs from before this change, treat magic-link tokens and device codes in them as exposed. They expire on their own within minutes, so the risk is to old logs that were shared, not to accounts today.
