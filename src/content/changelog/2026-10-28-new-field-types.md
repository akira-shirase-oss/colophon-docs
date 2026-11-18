---
title: "Seven new field types: email, URL, date, time, JSON, Markdown and colour"
date: 2026-10-28
type: Feature
areas: [API, Studio]
docs:
  - label: Concepts
    href: /concepts/
  - label: Writing in the Studio
    href: /studio/writing/
---

Content types can now use `email`, `url`, `date`, `time`, `json`, `markdown` and `color` fields, beside text, rich text, number, yes-or-no, choice and date-time. Any field may carry a `description` (help text, up to 500 characters), and text fields a `min_chars`.

Each type keeps one stored form that a browser can reproduce, so what you send round-trips byte for byte:

- `url`: `http` or `https` only, no credentials, stored as a browser's `new URL(text).href` writes it;
- `email`: checked for its shape, never for delivery;
- `date` is `YYYY-MM-DD`; `time` is `HH:MM` or `HH:MM:SS`;
- `json`: any value up to 64 KiB and 32 levels deep, keys sorted the way JavaScript sorts them;
- `markdown`: multi-line text with `max_chars`, rendered by your site;
- `color`: lowercase `#rrggbb`; an uppercase value is refused, not rewritten.

```json
{"id": "contact", "label": "Contact", "type": "email",
 "description": "Shown under the article"}
```

Changing a field's type is checked against stored content: a text field can become an email field when every stored value is an address. The Studio's builder offers every type, and the editor has a control for each.
