---
title: "Colophon is released under the MIT licence"
date: 2026-11-17
type: Improvement
areas: [Self-hosting]
docs:
  - label: Introduction
    href: /
---

Colophon now has a licence: MIT. The repository's `LICENSE` file holds the standard MIT text, every Rust component of the server, worker and `colophon` CLI declares `license = "MIT"`, and the npm packages prepared for the first release (`@colophon-cms/sdk`, `@colophon-cms/rich-text` and `@colophon-cms/cli`) say `"license": "MIT"`.

Why it matters: until a licence is settled, nobody can safely run, change or build on the code. MIT lets you self-host Colophon, modify it and ship it inside your own products, commercial or not. The only condition is that copies keep the copyright and licence notice. There is no warranty.

What to do: nothing, if you are running Colophon. If you redistribute it, for example in a container image or as part of a larger product, include the `LICENSE` file. Colophon's own dependencies keep their own licences; the build only admits licences on its allowlist, MIT among them.

```json
{
  "name": "@colophon-cms/sdk",
  "license": "MIT"
}
```
