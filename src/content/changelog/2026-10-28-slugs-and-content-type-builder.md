---
title: "URL names for entries, and a content-type builder that checks your content first"
date: 2026-10-28
type: Feature
areas: [API, Studio]
docs:
  - label: Concepts
    href: /concepts/
  - label: Studio settings
    href: /studio/settings/
---

A content type can now have one `slug` field, which the Studio calls a *URL name*. A slug is 1 to 120 lowercase letters and digits in groups joined by single hyphens; anything else is refused with `invalid_slug`, never quietly rewritten. The Studio suggests one from the text field you name as its `source`. A slug belongs to one entry among drafts and one among what is published, and the database enforces it: a save gets 409 `slug_taken`, and a release that would publish a taken slug is refused whole.

```json
{"id": "slug", "label": "URL name", "type": "slug", "source": "title"}
```

Changing a content type is now checked against what you have stored, not only against the old definition. Removing a field, making one required or narrowing a limit goes through when every draft and published version still fits; otherwise `PUT …/content-types/{slug}` answers 422 `needs_migration` and names the first 20 entries in the way.

In the Studio, *Content types* has a place of its own in the navigation, shown to roles that may change them. A type is one row per field; *Add a field* opens a picker grouped as Basics, Links, Structure and Advanced; each field's settings open in a dialog, and changes wait behind one save bar.
