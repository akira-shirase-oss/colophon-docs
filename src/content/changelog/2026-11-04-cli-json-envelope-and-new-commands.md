---
title: "Every CLI command's JSON output is one versioned envelope, and lists stream line by line"
date: 2026-11-04
type: Feature
areas: [CLI]
docs:
  - label: The colophon CLI
    href: /cli/
---

Every `colophon` command's `--json` now prints one object of a fixed shape: `{"version": 2, "command": "content list", "data": …}` on success, and the same object with `error` in place of `data` on failure. An API refusal is carried whole (`code`, `message`, `details`, `request_id`), so a script reads exactly what the server said, and the exit code still names the class of failure: 2 usage, 3 denied, 4 conflict, 5 unavailable, 6 internal.

List commands take `--jsonl` and print one envelope per item, following `next_cursor` page by page without holding more than a page in memory: `content list`, `content query`, `release list`, `migration list`, `migration items`, `comment list` and `task list`.

New the same day: `colophon content query` runs a query document against a collection; `colophon release list` and `colophon release show GENERATION` read releases and their receipts; and `colophon mcp` serves the MCP server on standard input and output, configured by `COLOPHON_SERVER`, `COLOPHON_TOKEN` and `COLOPHON_PROJECT`.

```sh
colophon content list posts --project my-site --jsonl | jq -r '.data.id'
colophon release show 12 --project my-site --json
```
