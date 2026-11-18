---
title: "Every server and CLI reports its version, and the CLI says when it doesn't fit"
date: 2026-10-28
type: Feature
areas: [API, CLI]
docs:
  - label: API reference
    href: /api/reference/
  - label: The colophon CLI
    href: /cli/
---

Colophon now has one version for the server, the CLI and the packages: `0.1.0-alpha.1`, not yet released. `GET /version` reports the release, its git commit, its build date and the API versions it serves, needs no sign-in and is never rate-limited. Fields may be added to it, never removed or renamed.

```bash
curl https://cms.example.com/version
{"version":"0.1.0-alpha.1","commit":"…","build_date":"2026-10-28","api":["v1"]}
```

`colophon --version` and `colophon-server --version` print the same facts on one line.

Before any command that talks to a server, the CLI reads `/version` and stops with a plain explanation when the two don't fit: the server must serve the API version the CLI speaks, and before 1.0 both must be on the same minor line, because a minor release may change the API. The message names both versions and says which one to install. `colophon logout` skips the check, so signing out always works.

Packaging is prepared for the first release but nothing is published yet: an npm launcher package with one binary package per platform, a Homebrew formula template and an install script.
