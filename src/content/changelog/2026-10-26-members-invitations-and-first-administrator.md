---
title: "Members and single-use invitations, and a first administrator made from the terminal"
date: 2026-10-26
type: Feature
areas: [API, Studio, Self-hosting]
docs:
  - label: Members and roles
    href: /studio/members-and-roles/
  - label: Installation
    href: /installation/
---

Signing in grants nothing by itself: people reach a project by invitation. Each member has a role (the built-in ones are owner, developer, editor and publisher). Owners change roles and remove people, anyone may leave, and the last owner can't go (409 `last_owner`).

An invitation is a single-use link that expires after 72 hours by default. The answer that creates it is the only place the link appears; its token travels after `#`, so it never reaches a server, and only its hash is stored. Before joining, the invitee sees the project, the role and who invited them.

```sh
curl -X POST http://localhost:8080/api/v1/projects/{project}/invitations \
  -H 'Authorization: Bearer …' -H 'Content-Type: application/json' \
  -d '{"role":"editor","label":"Copy desk"}'
```

Only an installation's administrators create projects; anyone else gets 403 `administrators_only`. The first administrator is made once, from the operator's terminal, bound to a sign-in identity's subject (`colophon whoami` prints yours):

```sh
colophon admin bootstrap --subject "{subject}"
```

Run again for the same person it changes nothing; after that first run, bootstrap is disabled for good.
