---
title: "An MCP server lets AI agents draft content, but never approve or publish it"
date: 2026-10-28
type: Feature
areas: [API]
docs:
  - label: MCP server
    href: /mcp/
---

Colophon now has a Model Context Protocol server, so an agent host can give an AI agent typed tools over your content. It speaks MCP over standard input and output, and it is a plain client of the same `/api/v1` the Studio and the CLI use, with a project API token as its only credential: an agent can do exactly what a script with that token can, and what it writes is attributed to the token.

```bash
COLOPHON_SERVER=http://localhost:8080
COLOPHON_TOKEN=colophon_api_…
COLOPHON_PROJECT={project}
```

Its tools read content types and entries, create and update drafts (sending the revision it read as `If-Match`), make a publish request and ask for its review. Writes carry an `Idempotency-Key`, and a refusal keeps the API's reason and field pointer.

Agents stop at proposals. No tool approves, publishes, unpublishes or schedules, or manages roles, members or tokens, whatever the token itself may do. The tool list follows the token's permissions, read from the new `GET /api/v1/projects/{project}/environments/{environment}/permissions`, which answers any caller's own permissions. Listing a tool grants nothing: the API still decides every call.
