---
title: "Entry requests stop re-reading their content type's definition from scratch"
date: 2026-10-28
type: Improvement
areas: [Performance]
docs:
  - label: Management API
    href: /api/management/
---

Every entry read, save, list and history request checks content against its collection's content type, and each one used to parse that definition again. Benchmarks showed the parse costing more than the entry's own validation: 1.9 µs for a small type, 20.4 µs for a typical page type and 281 µs for a 100-field type, about half of it compiling text patterns.

Each server now keeps parsed content types in memory, keyed by the SHA-256 of the definition text it has just read from the database. A cache hit costs only that hash: 0.12 µs, 0.59 µs and 6.5 µs for the same three types. The definition itself is still read from the database on every request, so a cached parse can never be out of date: a changed content type is new text with a new key, and nothing needs to be invalidated.

The cache holds at most 1,024 types and 32 MiB of definition text, dropping the least recently used first; a definition larger than that is parsed every time and never kept.

Nothing changes in the API. Projects with large content types, many fields or text patterns see the biggest drop in time per request.
