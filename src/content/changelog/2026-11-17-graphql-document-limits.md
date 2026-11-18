---
title: "GraphQL refuses documents that are too deep or too large before running them"
date: 2026-11-17
type: Security
areas: [API]
docs:
  - label: GraphQL
    href: /api/graphql/
  - label: Errors
    href: /api/errors/
---

A GraphQL document's cost used to be measured only as it ran. A short document full of nested fragments could keep a server busy for minutes, and a value nested deeply enough could exhaust the server's stack while parsing.

Now every document sent to `POST /api/v1/projects/{project}/environments/{environment}/collections/{collection}/graphql` is measured before it runs, with its fragments expanded:

- deeper than 16 levels: `too_deep`
- more than 512 fields: `too_complex`
- fragments that spread one another in a cycle: `fragment_cycle`
- brackets nested more than 64 deep, checked before parsing: `too_deep`

Each refusal is a `422` in the usual error envelope, pointing at the query, and nothing runs:

```json
{"error": {"code": "validation_failed",
  "message": "…",
  "details": {"reason": "too_deep", "pointer": "/query"},
  "request_id": "…"}}
```

The limits leave room for every read the schema allows (a two-level reference read is 6 deep) and for a full introspection query.
