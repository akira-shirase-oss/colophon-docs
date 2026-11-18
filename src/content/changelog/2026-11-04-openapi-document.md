---
title: "An OpenAPI 3.1 document describes every route, served at /openapi.json"
date: 2026-11-04
type: Feature
areas: [API]
docs:
  - label: API reference
    href: /api/reference/
---

Colophon now serves an OpenAPI 3.1 document for its whole HTTP surface: the management API under `/api/v1`, sign-in under `/auth`, `/me`, public delivery under `/content/v1`, media under `/media/v1`, the health checks, `/version` and the document itself. It is emitted from the same route table the server's router is built from, so a route can't exist without being described, and a described route can't be missing. A copy is kept in the repository, and a test fails when the two differ.

Why it matters: you can generate a typed client, browse the API in any OpenAPI viewer, and check a request's shape before writing code. Every failure points at the one error envelope, and each kind of credential has its own security scheme.

How to use it: `GET /openapi.json` needs no sign-in. It answers with `Cache-Control: public, max-age=300` and an `ETag`; send that back in `If-None-Match` and an unchanged document answers `304 Not Modified`.

```sh
curl -s -D - -o openapi.json https://cms.example.com/openapi.json | grep -i etag
curl -s -o /dev/null -w '%{http_code}\n' https://cms.example.com/openapi.json \
  -H 'If-None-Match: "<etag from above>"'   # 304
```
