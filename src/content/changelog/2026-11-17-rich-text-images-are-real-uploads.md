---
title: "Images inside rich text must name real uploads from the media library"
date: 2026-11-17
type: Breaking
areas: [API, Studio]
docs:
  - label: Rich text and images
    href: /studio/rich-text-and-images/
  - label: Media library
    href: /studio/media-library/
---

**Old behaviour:** the server checked only a rich-text image's shape. Any `assetId` was saved, so an image could name nothing at all, publishing never checked it, and its upload could be deleted while a page still showed it. The Studio's old image dialog inserted a random placeholder id.

**New behaviour:** each image is tracked like an asset field: checked at publish, kept from deletion while used, and listed under "Where it's used". A save naming an id that isn't an upload of the environment is refused at that image:

```json
{"error": {"code": "validation_failed", "message": "…",
  "details": {"reason": "asset_not_found",
              "pointer": "/body/doc/content/3/attrs/assetId"},
  "request_id": "…"}}
```

A document may name at most 200 distinct images (`too_many_images`). In the Studio, images come from the media library: pick, search or upload one, then give alt text, which is required. A pasted or dropped image is uploaded and inserted.

**What to do:** drafts holding placeholder images are refused at their next save. Open each one: the Studio marks the image in place with **Replace** and **Remove**. Revisions saved before this change pin their images only once saved again.
