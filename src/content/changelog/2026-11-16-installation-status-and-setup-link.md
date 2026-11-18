---
title: "A new installation greets you as new, and the server prints a link that fills in the setup code"
date: 2026-11-16
type: Improvement
areas: [API, Studio, Self-hosting]
docs:
  - label: Installation
    href: /installation/
  - label: Quick start
    href: /quick-start/
---

The first run used to be the hardest part: the installer copied a setup code out of a scrolling server log, and the signed-out Studio told them to ask someone for an invitation. Now the server's banner prints a link next to the code, and the Studio knows when nobody runs this Colophon yet.

```text
Setup code: <code>
...the link fills the code in for you:
    http://localhost:8080/studio/#setup=<code>
```

The code travels in the `#` fragment, which browsers never send, so it reaches no server or proxy log. Opened from the link, the Studio leads with **Create an account** and fills the code into **Finish setting up**. The code works once, for an hour.

Without the link, the Studio asks `GET /api/v1/installation`, a route anyone may call before signing in. It answers only yes or no, never who, with `Cache-Control: no-store`:

```json
{"data": {"has_administrator": false}}
```

Smaller Studio changes landed alongside: no text is smaller than 14px, the search box says "Search", and the getting-started checklist says "Write first" until there is something to publish.
