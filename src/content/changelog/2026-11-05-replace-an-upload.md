---
title: "Replace an upload with new bytes, and every earlier version stays addressable"
date: 2026-11-05
type: Feature
areas: [API, Studio]
docs:
  - label: Media library
    href: /studio/media-library/
---

An upload can now be replaced. `POST /api/v1/projects/{project}/environments/{environment}/assets/{asset}/replace` takes the new file with the same headers as an upload and answers `202`. The worker checks the new bytes like any upload, and only if they pass does the asset's current version move to them; a refused file leaves the current version serving. Only a usable asset takes a replacement.

Why it matters: each verified version is stored under its own SHA-256 and never overwritten, so bytes a release published can't be silently replaced or deleted while anything pins them. `GET …/assets/{asset}` lists every verified version, oldest first, and the media origin serves both kinds of address: `/media/v1/{project}/{environment}/{asset}` for the current version, and `…/{asset}/{sha}` for one exact version, with its renditions under `…/{sha}/{name}`.

The same day, the Studio gained a Media page in the project sidebar: every upload with its thumbnail, state, dimensions and size, uploading, and a confirmed delete that names the entries still using a file.

```sh
curl -X POST http://localhost:8080/api/v1/projects/{project}/environments/production/assets/{asset}/replace \
  -H "Authorization: Bearer $COLOPHON_TOKEN" -H "Content-Type: image/webp" \
  -H "X-Colophon-File-Name: hero.webp" -H "Idempotency-Key: $(uuidgen)" \
  --data-binary @hero.webp
```
