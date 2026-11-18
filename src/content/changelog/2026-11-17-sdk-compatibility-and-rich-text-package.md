---
title: "The SDK checks it fits the server, and the rich-text renderer becomes its own package"
date: 2026-11-17
type: Feature
areas: [SDK]
docs:
  - label: TypeScript SDK
    href: /sdk/
  - label: Rich text and images
    href: /studio/rich-text-and-images/
---

`@colophon-cms/sdk` now says plainly when the server it talks to is too old or too new. Before its first call it reads `GET /version` once and judges it by the same rule as the `colophon` CLI: the server must serve API `v1`, share the SDK's minor version before 1.0, and be at least the oldest server the SDK supports. The new `compat` option decides what happens: `'warn'` (the default) logs the reason and never delays a call, `'throw'` fails every call with an `incompatible_server` error, `'off'` never asks.

```ts
import { Client } from '@colophon-cms/sdk';

const client = new Client({ baseUrl: 'http://localhost:8080', compat: 'throw' });
const fit = await client.compatibility();
if (!fit.compatible) console.error(fit.reason); // which side to upgrade, and to what
```

The renderer the Studio uses is now `@colophon-cms/rich-text`, a package with no dependencies whose `renderToHtml` turns stored rich text into escaped HTML, so your site renders exactly what editors previewed.

Both packages are prepared for their first npm release, not yet published: every push checks the files they would ship, their size (the browser client is about 4.5 KB compressed), their type declarations, and a scratch project that installs and compiles them.
