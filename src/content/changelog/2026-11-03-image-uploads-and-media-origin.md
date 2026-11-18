---
title: "Upload images: verified before anyone sees them, served from a public media address"
date: 2026-11-03
type: Feature
areas: [API, Studio]
docs:
  - label: Media library
    href: /studio/media-library/
---

Colophon now stores images. An upload (PNG, JPEG or WebP, up to 20 MiB) lands in quarantine and answers `202` with state `quarantined`. A worker then checks the real file signature, decodes it within size limits, strips its metadata and promotes it to `usable`, or marks it `rejected` with a reason. A verified image also gets `w320` and `w1280` renditions when it is wider than those.

```bash
curl -X POST https://cms.example.com/api/v1/projects/{project}/environments/{environment}/assets \
  -H "Authorization: Bearer $COLOPHON_TOKEN" -H "Idempotency-Key: upload-harbour-0001" \
  -H "Content-Type: image/jpeg" -H "X-Colophon-File-Name: harbour.jpg" \
  --data-binary @harbour.jpg
```

Content types gain an `asset` field: one upload's id, or a bounded list with `"many": true`. A draft may name an image that is still being checked, but a release refuses one that isn't usable (`409 asset_not_usable`), so readers only ever get verified bytes. Those are served without sign-in at `GET /media/v1/{project}/{environment}/{asset}` and `…/{asset}/w320`.

In the Studio, an image field is a picker: **Choose an image** opens the project's uploads, shows each one's state, and uploads a new file in place.

Deleting is staged: `DELETE …/assets/{asset}` answers `202` (requested, not gone), and is refused `409 still_referenced` while a draft or any release names the image.
