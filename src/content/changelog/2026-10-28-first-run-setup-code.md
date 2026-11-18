---
title: "Set up a new installation from the Studio with a one-time setup code"
date: 2026-10-28
type: Feature
areas: [Studio, Self-hosting]
docs:
  - label: Quick start
    href: /quick-start/
  - label: Installation
    href: /installation/
---

A new Colophon no longer needs someone with database access to make its first administrator. While nobody is an administrator, the server prints a one-time setup code to its terminal when it starts, never to the structured log or to any response. A signed-in person enters it on the Studio's home page, which sends it to `POST /api/v1/setup`, and becomes the administrator.

```http
POST /api/v1/setup
{"code": "XXXXX-XXXXX-XXXXX-XXXXX"}
```

The code lasts an hour, works once and is stored only as a hash. Attempts are limited (429 `rate_limited` with `Retry-After`), and wrong, used and expired codes all get the same 422 `setup_code_invalid`. Once anyone is an administrator the route answers 409 `already_set_up`, and later starts print nothing.

Alongside it, the Studio was reworked for editors who aren't developers. Its words come from one glossary: a changeset is a *publish request*, a revision a *version*, a slug a *URL name*, destinations are *website connections*. A project's first page is a short checklist (write, invite, connect the website, publish). Publishing one entry is one button: it publishes at once where the project lets you review your own work, and asks for review otherwise.
