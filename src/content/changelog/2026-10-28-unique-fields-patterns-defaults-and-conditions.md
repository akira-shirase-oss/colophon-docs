---
title: "Field rules: unique values, text patterns, defaults and conditional fields"
date: 2026-10-28
type: Feature
areas: [API, Studio]
docs:
  - label: Concepts
    href: /concepts/
---

Four rules for fields, checked by the server for the Studio, the CLI, scripts and agents alike:

- **Unique.** `"unique": true` on a top-level text, email, URL, number, date, time or date-time field. A value belongs to one entry among drafts and one among what is published, compared exactly as stored. The database enforces it: a save gets 409 `value_taken`, and so does a release that would publish a taken value.
- **Pattern.** A text field's `pattern` must match the whole value, in Rust `regex` syntax, which runs in time linear in the value, so no pattern can stall writes. A bad pattern is 422 `invalid_pattern`; a value that doesn't match, 422 `pattern_mismatch`.
- **Default.** `default` fills a field a new entry leaves out, on the server and only on creation, so a required field with a default may be left out.
- **Conditional.** `"when": {"field": "kind", "is": "video"}` makes a field apply only while a yes-or-no or choice field holds those values; otherwise content must leave it out (422 `not_applicable`).

```json
{"id": "duration", "label": "Duration", "type": "number",
 "when": {"field": "kind", "is": ["video"]}}
```

Adding any of these is checked against stored content. The Studio's builder sets them, its editor shows the allowed form, fills defaults into new entries and shows a conditional field only while it applies.
