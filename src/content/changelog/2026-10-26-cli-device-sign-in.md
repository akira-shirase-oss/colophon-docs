---
title: "Sign the colophon CLI in from your browser, then create and list entries"
date: 2026-10-26
type: Feature
areas: [CLI]
docs:
  - label: The colophon CLI
    href: /cli/
---

`colophon login` starts a device sign-in. It prints a short code and a link to the Studio's `/studio/device` page, where you, already signed in, see what is asking and approve it. The terminal then receives a personal token that acts with your own memberships for 30 days. The server stores only its hash; the CLI keeps it in `credentials.json` under `COLOPHON_CONFIG_DIR`, else `$XDG_CONFIG_HOME/colophon`, else `~/.config/colophon`.

Why it matters: a terminal can't hold a browser session, and the approval happens where you can see it. Codes last 10 minutes and the token is handed out exactly once.

```sh
colophon login --server https://cms.example.com
colophon whoami
colophon content create posts --project my-site --data '{"headline":"Hello"}'
colophon content list posts --project my-site --limit 20
```

`content create` writes the same validated draft the Studio would, with an idempotency key so a retry can't create twice; it exits 2 when the content doesn't fit its content type and 3 when you aren't allowed. `--profile` keeps sign-ins for several servers apart, and `colophon logout` revokes the token and forgets it.
