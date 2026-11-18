---
title: "Link entries with reference fields that can never point at nothing"
date: 2026-10-28
type: Feature
areas: [API, Studio]
docs:
  - label: Linked entries
    href: /studio/linked-entries/
---

A `reference` field links an entry to entries of one collection: one, or up to 100 with `many`. Each version stores its links and the database checks them, so an id that names no entry of that collection is refused with 422 `reference_not_found` at the field's pointer.

```json
{"id": "author", "label": "Author", "type": "reference", "to": "authors"}
{"id": "related", "label": "Related", "type": "reference", "to": "articles", "many": true, "max": 5}
```

Releases keep links whole too. Publishing an entry that links to one nobody has published is refused with 409 `references_unpublished`, and taking down an entry that a published entry still links to is refused with 409 `still_referenced`. Doing both in one release works.

An entry's read now carries `referenced_by`, the entries that link to it, limited to collections your role can read, so nobody learns of entries they can't open. Pointing an existing field at a different collection is refused.

In the Studio, a link field is filled by searching titles, an entry shows what it is *Linked from*, a refused link names the entries in the way and says what to do, and the Studio warns before a take-down that would be refused.
