---
title: "Site users and gated content: visitors sign up, and each entry says who may read it"
date: 2026-11-05
type: Feature
areas: [API, Studio]
docs:
  - label: Delivery API
    href: /api/delivery/
  - label: Authentication & API tokens
    href: /api/authentication/
  - label: Members and roles
    href: /studio/members-and-roles/
---

A project can now have an audience: site visitors with accounts of their own, separate from staff. They sign up and sign in with email and password at `/audience/v1/{project}/signup` and `/signin`, getting a session as a cookie or as the `session` token for a bearer header; `/me` and `/signout` complete the set. Staff manage audience roles, users and their sessions under `/api/v1/projects/{project}/audience/…` with the `audience.manage` permission. Signup may choose only a role marked `self_assign`.

Every entry now carries a `visibility`, set with `?visibility=` on a create or save: `public` (the default), `authenticated`, or `role:<name>`. A release publishes the gate its revision carried, and PostgreSQL row-level security enforces it in delivery. Anonymous readers see public rows only; a gated row answers `404`, like one never published. A visitor's read bypasses the shared cache (`Colophon-Cache: bypass`, `Cache-Control: private`), so gated content never enters it.

In the Studio, the sidebar's People group now holds Members and a new Audience page (visitors, roles, disabling, sign-in activity), and visitor sign-ups and sign-ins are recorded in the audit log.

```sh
curl https://cms.example.com/content/v1/{project}/production/posts \
  -H "Authorization: Bearer $SITE_SESSION"
```
