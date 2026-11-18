---
title: "Agents can reach the MCP server over HTTP, signed in with a project API token"
date: 2026-11-04
type: Feature
areas: [API]
docs:
  - label: MCP server
    href: /mcp/
---

The API itself now serves Colophon's MCP server at `POST /api/v1/projects/{project}/environments/{environment}/mcp`, over MCP's Streamable HTTP transport (protocol `2025-11-25`). An agent host that supports remote servers points at that URL with a project API token; nothing else needs installing.

Why it matters: it is the same server as the local `colophon mcp` process, not a second one. Tools, answers and refusals are identical on both, and every tool call runs through the API's own routes under the same token, so the boundary holds: agents read, query and write drafts, comments and tasks, and open publish requests, but never approve, publish or drive a migration.

How it works: the first `initialize` answers with an `Mcp-Session-Id` header, which later requests send back with `MCP-Protocol-Version: 2025-11-25`; `DELETE` on the same URL ends the session. Only project API tokens may connect: a browser session or personal token answers `403` with reason `api_token_required`. Sessions are capped per token (`429`) and per project and server (`503`), expire when idle, and stop working when the token is revoked.

```sh
curl -X POST https://cms.example.com/api/v1/projects/{project}/environments/production/mcp \
  -H "Authorization: Bearer $COLOPHON_TOKEN" \
  -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"demo","version":"1"}}}'
```
