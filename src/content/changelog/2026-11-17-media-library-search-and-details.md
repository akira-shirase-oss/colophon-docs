---
title: "The media library pages, searches, filters and keeps alt text, titles, credits and tags"
date: 2026-11-17
type: Improvement
areas: [API, Studio]
docs:
  - label: Media library
    href: /studio/media-library/
---

The upload list used to stop at the newest 100, so the 101st upload was invisible in the Media page and in every image picker. Now `GET /api/v1/projects/{project}/environments/{environment}/assets` pages with `limit` (1–100) and `cursor`, answering `next_cursor`. It also searches file names, titles and alt text with `q`, and filters by `state` and `tag`.

Each upload keeps its own words. `PATCH …/assets/{asset}` changes `alt` (up to 300 characters), `title`, `credit` and `tags` (up to 10, lowercase with dashes), under `If-Match`; a stale `ETag` answers `409 stale_version`. Tags take the place of folders.

```sh
curl -X PATCH https://cms.example.com/api/v1/projects/{project}/environments/production/assets/{asset} \
  -H "Authorization: Bearer $COLOPHON_TOKEN" -H 'If-Match: "v3"' \
  -H "Idempotency-Key: $(uuidgen)" -H "Content-Type: application/json" \
  -d '{"alt": "Harbour at dawn", "tags": ["harbour", "cover"]}'
```

In the Studio, the Media page shows the whole library with search and filters, uploads many files at once through a queue, and opens each upload's details: alt text, title, credit and tags (with a conflict state if someone else changed them), its versions, where it's used, replace (with a reminder to republish), both addresses to copy, and delete.
