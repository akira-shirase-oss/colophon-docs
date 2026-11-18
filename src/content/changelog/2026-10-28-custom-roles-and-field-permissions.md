---
title: "Custom roles, down to single fields and a member's own entries"
date: 2026-10-28
type: Feature
areas: [API, Studio]
docs:
  - label: Members and roles
    href: /studio/members-and-roles/
---

Roles are now data you can shape. Every project starts with four built-in roles, `owner`, `developer`, `editor` and `publisher`, with the powers they always had, and owners can add their own in Settings → Roles. A role is a list of permissions: an action such as `content.update` or `content.publish`, a subject (one collection, or `*` for all), an optional field list, and an optional `own` condition that limits it to entries the member created.

A field list works both ways. A save that changes any other field is refused with 422 `field_not_permitted` at that field's pointer; a read leaves the other fields out and names them in `hidden_fields`. One evaluator decides for the API, the CLI and the Studio, and the Studio hides controls a role can't use while the server still decides.

```http
POST /api/v1/projects/{project}/roles
{"key": "copy-desk", "name": "Copy desk", "permissions": [
  {"action": "content.read", "subject": "*"},
  {"action": "content.update", "subject": "articles", "fields": ["title", "summary"]},
  {"action": "content.update", "subject": "notes", "condition": "own"}]}
```

Roles change under `If-Match` (`"v<version>"`). Any caller can ask what it may do with `GET /api/v1/projects/{project}/environments/{environment}/permissions`. The Studio's role editor is a grid of collections and actions, with a section for field lists and "only their own entries".
