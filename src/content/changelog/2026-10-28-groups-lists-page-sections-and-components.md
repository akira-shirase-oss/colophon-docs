---
title: "Groups, lists, page sections and shared components in content types"
date: 2026-10-28
type: Feature
areas: [API, Studio]
docs:
  - label: Concepts
    href: /concepts/
---

Content types can now hold structure, not only flat fields:

- `object` groups nested `fields`, such as an address;
- `list` holds up to 100 values of one kind (`of`), never a list or page sections;
- `blocks` is a page builder: up to 100 items, each one of up to 20 named kinds of block with its own fields, marked by `_block`.

Structures nest at most three deep. A reference inside one is stored and checked like any other, with its path, such as `sections/1/author`.

```json
{"id": "tags", "label": "Tags", "type": "list", "of": {"type": "text", "max_chars": 30}, "max": 3}
```

A shared component is a named group of fields that many content types reuse, such as an SEO block. Create one with `POST …/components`, then use `{"type": "component", "component": "seo"}` wherever an object can go; the server copies the component's fields in, so every content type version stays a complete description of its content. Changing a component with `PUT …/components/{slug}` writes a new version of every content type that uses it, in one transaction and each checked against stored content. If one can't take the change, nothing changes, and the refusal names that type.

The Studio's builder makes groups, lists, page sections and components, and the editor fills them in.
