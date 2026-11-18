---
title: "Preview helpers for your site in the SDK, and a colophon preview command"
date: 2026-11-18
type: Feature
areas: [SDK, CLI]
docs:
  - label: TypeScript SDK
    href: /sdk/
  - label: The colophon CLI
    href: /cli/
  - label: Preview
    href: /studio/preview/
---

Connecting your site to draft preview is now a few lines. `@colophon-cms/sdk` adds helpers built on the standard `Request` and `Response` types, so they work in SvelteKit, Astro, Next.js or any other framework:

- `createPreviewHandler` exchanges the one-time code for a preview token, keeps it in your own `HttpOnly` cookie and redirects to the page;
- `previewTokenFromRequest` and `previewClient` read drafts from `/preview/v1` with that token;
- `previewHeaders` sends `private, no-store`, `noindex` and a `frame-ancestors` rule so only your Studio can frame the page;
- `listenForDraftUpdates` reloads the page after each save in the Studio; `exitPreviewHandler` ends preview.

```ts
import { createPreviewHandler } from '@colophon-cms/sdk';
const enter = createPreviewHandler({ baseUrl: 'http://localhost:8080', project: PROJECT_ID });
```

A static site can read previews straight from the browser: `/preview/v1` answers CORS for the environment's preview origin, never with credentials.

From the terminal, `colophon preview` prints a one-time address for an entry's saved draft, or for a publish request with `--changeset`:

```sh
colophon preview <entry id> --project <project> --minutes 30
```

The address works once, within a minute. The SDK is prepared for its first npm release.
