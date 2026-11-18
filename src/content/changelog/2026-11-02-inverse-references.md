---
title: "Two-way links: a reference field can be mirrored on the entries it points to"
date: 2026-11-02
type: Feature
areas: [API, Studio]
docs:
  - label: Linked entries
    href: /studio/linked-entries/
---

A reference field can now name an `inverse`: a reference field on the target collection that points back. When you link a post to a writer, the writer's `posts` field gains the post in the same save; unlink it and the writer loses it; delete the post and it leaves every mirror.

This is the link editors reach for first (posts and writers, products and categories), and you no longer keep both sides by hand. Both sides commit together or not at all. The forward link stays the truth: if a mirror can't be written, for example because the far field no longer points back, the forward save still succeeds and the link is simply one-way.

In the Studio, open the reference field's settings and pick the field under **Mirrored on … by**. To offer one, first add a link back to this type on the other collection. In a definition:

```json
{ "id": "writers", "label": "Writers", "type": "reference",
  "to": "writers", "many": true, "inverse": "posts" }
```

Only top-level reference fields may mirror. The named field must exist on the target, be a reference, and point back at this collection; otherwise the definition is refused `422 invalid_inverse` at `/fields/{n}/inverse`.
