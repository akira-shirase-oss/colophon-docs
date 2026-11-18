---
title: "Rich text is stored in one strict, versioned format that the server checks"
date: 2026-10-25
type: Feature
areas: [API, Studio]
docs:
  - label: Rich text and images
    href: /studio/rich-text-and-images/
  - label: Management API
    href: /api/management/
---

Rich-text fields are stored as `colophon/rich-text` version 1: editor JSON limited to an allowlist and wrapped in a versioned envelope. It holds paragraphs, headings (levels 2 to 4), bulleted and numbered lists, quotes, code blocks, horizontal rules, callouts and images, with bold, italic, strike, code and link marks. Nothing executable is ever stored (no HTML, scripts, styles or embeds), and a link may only be `https:`, `http:`, `mailto:`, a site path or a `#` fragment.

Why it matters: the server has the last word, not the editor. A document deeper than 16 levels, larger than 256 KiB or with more than 10,000 nodes is refused, and every refusal names a code and a JSON Pointer to the value at fault. The Studio's editor opens a document only if it can write it back byte for byte, and one renderer turns documents into escaped HTML.

Check a document before saving it; the endpoint stores nothing:

```sh
curl -X POST https://cms.example.com/api/v1/rich-text/validate \
  -H 'Content-Type: application/json' \
  -d '{"schema":"colophon/rich-text","version":1,"doc":{"type":"doc","content":[{"type":"paragraph"}]}}'
```

A valid document comes back in canonical form with its `nodes`, `depth` and `bytes`; an invalid one is 422 `validation_failed`.
