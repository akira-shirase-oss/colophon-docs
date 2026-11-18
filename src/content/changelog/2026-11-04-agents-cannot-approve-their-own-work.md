---
title: "An API token can never approve a publish request that a token submitted"
date: 2026-11-04
type: Security
areas: [API]
docs:
  - label: MCP server
    href: /mcp/
  - label: Authentication & API tokens
    href: /api/authentication/
---

A project API token can no longer approve a publish request (`changesets` in the API) that any API token submitted. An approval sent to `POST /api/v1/projects/{project}/environments/{environment}/changesets/{changeset}/reviews` answers `403` with `details.reason` `agent_self_review`, at the single review and at every named review stage alike.

Why it matters: a token holding both review and publish permissions could otherwise submit, approve and publish its own work with no person involved. Checking only for the same token would not help, because a second token costs nothing to make, so the rule looks at the kind of credential on both sides. It runs on the server, inside the review's own transaction, so it holds for MCP clients, scripts and any other HTTP client alike.

What a token may still do: ask for changes on any publish request (`"decision": "request_changes"`), approve a person's publish request when its permissions include `content.review`, and publish a request a person approved when it holds `content.publish`. People reviewing their own requests are not affected.

```json
{"error": {"code": "forbidden", "request_id": "…",
  "message": "an API token can't approve a changeset an API token submitted; it needs a person's approval",
  "details": {"reason": "agent_self_review"}}}
```
