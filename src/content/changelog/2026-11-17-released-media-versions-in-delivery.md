---
title: "Delivery rows name the exact image versions a release published"
date: 2026-11-17
type: Breaking
areas: [API, SDK]
docs:
  - label: Delivery API
    href: /api/delivery/
  - label: Media library
    href: /studio/media-library/
  - label: TypeScript SDK
    href: /sdk/
---

**Old behaviour:** sites built image addresses that always served an upload's newest version, with no size. Replacing an image changed published pages at once, without anyone publishing.

**New behaviour:** a release records the version of every upload its entries name, in asset fields and rich text. Each `/content/v1` row now carries `media`, keyed by asset id: `url` (that version's immutable address, cacheable for a year), `current_url` (follows replacements), `type`, `width`, `height` and `renditions` (`w320`, `w1280` when the original is wider). A replaced image reaches `url` at the entry's next publish; pinned reads with `?generation=` and rollbacks show that release's images. Absolute addresses use `COLOPHON_MEDIA_URL`, which defaults to `COLOPHON_PUBLIC_URL`. Cached delivery answers are refetched once.

**What to do:** use `url` for "what was published" or `current_url` for "always the newest", and republish entries whose images you replaced. With the SDK, `mediaFor(row)` gives the renderer each image's `width`, `height`, `srcset` and `sizes`:

```ts
import { mediaFor } from '@colophon-cms/sdk';
import { renderToHtml } from '@colophon-cms/rich-text';

const html = renderToHtml(row.content.body, { assetUrl, media: mediaFor(row) });
```
