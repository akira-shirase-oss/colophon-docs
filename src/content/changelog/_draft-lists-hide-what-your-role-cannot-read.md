---
title: "Release changes, rollback previews and publish requests leave out entries your role can't read"
date: 2026-11-18
type: Security
areas: [API, Studio]
docs:
  - label: Members and roles
    href: /studio/members-and-roles/
---

Some lists name entries across content types and authors: a release's changes, a rollback preview, and a publish request's items. Until now they named every entry. So a role limited to one collection, or to its own entries, or without read access to the title field, could see other entries' titles, ids and versions there. The entries API already hid those. These lists now follow the same rules:

- An entry your role can't read is left out. A publish request says how many it left out in `hidden_items`, and its hash still covers every item, so nothing changes behind a reviewer's back.
- A title your role can't read is blank, marked `title_hidden: true`.
- Approving a request needs a role that reads every field of every item in it. Otherwise the approval is refused with `403 cannot_review_hidden`. Asking for changes is still allowed.

The Studio shows these counts and blank titles as they come, and offers a reviewer who can't see everything **Request changes**.
