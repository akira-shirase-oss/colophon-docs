---
title: "Preview drafts on your own site through a short-lived, read-only preview API"
date: 2026-11-17
type: Feature
areas: [API]
docs:
  - label: Preview
    href: /studio/preview/
  - label: Delivery API
    href: /api/delivery/
---

Your site can now show unpublished drafts to the people who are working on them. First tell Colophon where previews open, as a signed-in person (here with the personal token `colophon login` keeps):

```sh
curl -X PUT https://cms.example.com/api/v1/projects/{project}/environments/{environment}/preview-target \
  -H "Authorization: Bearer $COLOPHON_TOKEN" -H 'Content-Type: application/json' \
  -d '{"url_template":"https://example.com/api/preview?code={code}"}'
```

A person then opens a preview of an entry (with its translations) or of a publish request with `POST …/previews`; project API tokens can't. The answer holds a site address carrying a one-time code that works once, within 60 seconds. Your site exchanges it at `POST /preview/v1/{project}/{environment}/exchange` for a bearer token that lasts 15 minutes by default.

With that token, `/preview/v1` answers exactly like `/content/v1` (list, get, query and a `session` route for a preview banner), with the drafts laid over the latest release and a `preview` object on each row. A publish request's preview is bound to the exact content under review: if it changes, reads answer `409 preview_stale`.

Preview answers are `private, no-store`, never indexed and never cached, and every read re-checks that the person who opened it may still read this content. They can renew the preview, ask for a fresh code or end it now.
