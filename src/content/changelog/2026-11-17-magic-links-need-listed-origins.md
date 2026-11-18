---
title: "Magic links land only on sites the project lists, and link requests are bounded"
date: 2026-11-17
type: Breaking
areas: [API]
docs:
  - label: Authentication & API tokens
    href: /api/authentication/
---

**Old behaviour:** a magic-link request could name any absolute http(s) address as `return_to`, and the sign-in token was added to it, so the token could travel to a site the project never chose. Asking for a new link also cancelled the previous one.

**New behaviour:** `return_to` must be on an origin the project lists, or the request answers `422 return_to_not_allowed` before any link exists. A project that lists nothing sends no links. Asking again no longer cancels a link; spending any link retires the others for that address. The token is placed before any `#fragment` in `return_to`.

Requests are now bounded: 5 links per client address per project in ten minutes (`COLOPHON_MAGIC_LINKS_PER_ADDRESS`), a recipient wait that starts at one minute and doubles up to an hour, and 300 links per project a minute (`COLOPHON_MAGIC_LINKS_PER_PROJECT`). Each answers `429 rate_limited` with `Retry-After` and sends nothing.

**What to do:** as a member with `audience.manage`, list every site that receives links (at most 32, each `scheme://host[:port]`):

```sh
curl -X PUT http://localhost:8080/api/v1/projects/{project}/audience/origins \
  -H "Authorization: Bearer $COLOPHON_TOKEN" -H "Content-Type: application/json" \
  -d '{"origins": ["https://www.example.com"]}'
```
