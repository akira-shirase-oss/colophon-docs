---
title: "Project API tokens with an exact kill switch, and an append-only audit log"
date: 2026-10-28
type: Feature
areas: [API, Studio]
docs:
  - label: Authentication & API tokens
    href: /api/authentication/
  - label: Studio settings
    href: /studio/settings/
---

Scripts and integrations can now use a project API token instead of a person's sign-in. A token is `read-only`, `full-access` or `custom` (its own permission list, like a role), expires in 1 to 366 days, and acts as an identity of its own, so what it writes is attributed to it. The secret, prefixed `colophon_api_`, is shown once in the create answer and stored only as a hash. No token can manage members, roles or tokens, or read the audit log.

```http
POST /api/v1/projects/{project}/tokens
{"name": "Site build", "kind": "read-only", "expires_in_days": 90}
```

Send it as `Authorization: Bearer colophon_api_…`. It works on its own project's `/environments/…` routes; elsewhere it gets 403 `api_token_not_allowed`, another project answers 404, and a revoked or expired token 401. `DELETE /api/v1/projects/{project}/tokens/{token}` revokes it exactly: requests already running finish, and nothing starts after.

Every change to roles, memberships, invitations and tokens is written to the audit log in the same transaction; the API can only add to it and read it. Owners read it newest first at `GET /api/v1/projects/{project}/audit`, filtered by `action` (such as `token.revoked`) and `actor`, with `limit` and `cursor`. In the Studio, both live in Settings: *API tokens* and *Activity*.
