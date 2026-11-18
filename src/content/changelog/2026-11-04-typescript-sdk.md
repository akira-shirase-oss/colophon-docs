---
title: "A TypeScript SDK whose types come from the OpenAPI document"
date: 2026-11-04
type: Feature
areas: [SDK]
docs:
  - label: TypeScript SDK
    href: /sdk/
---

`@colophon-cms/sdk` is a TypeScript client for Colophon. Its types are generated from the committed OpenAPI document, with a check that fails when they drift; the client on top is small and hand-written. It covers what a site, tool or agent calls most: entries and revisions, content types, publish requests, releases and receipts, comments, tasks, and public delivery.

Why it matters: the types know which writes need a precondition, so `saveEntry` won't compile without `ifMatch` and `idempotencyKey`, and a retried save can neither overwrite someone's edit nor apply twice. Every failure is an `ApiError` with the error envelope's `code`, `requestId` and `details`. The client attaches the credential you give it and never signs in by itself.

How to use it: the package is prepared for the first npm release; until then, build it from a checkout of the repository with `npm run build -w @colophon-cms/sdk`.

```ts
import { Client, newIdempotencyKey } from '@colophon-cms/sdk';

const client = new Client({ baseUrl: 'https://cms.example.com', token });
const env = client.environment(projectId); // production by default
const { data: draft, response } = await env.getEntry('posts', entryId);
await env.saveEntry('posts', entryId, { ...draft.content, title: 'New title' },
  { ifMatch: response.etag!, idempotencyKey: newIdempotencyKey() });

const site = client.delivery(projectId).atGeneration(42); // every read from one release
```
