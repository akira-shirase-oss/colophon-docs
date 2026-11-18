---
title: "Creating API tokens no longer starves reads, and schedule and release lists read only what they show"
date: 2026-11-18
type: Improvement
areas: [Performance, API]
docs:
  - label: Authentication & API tokens
    href: /api/authentication/
  - label: Scheduling
    href: /studio/scheduling/
---

Two load fixes for busy projects.

**Token creation.** A project may hold at most 100 active API tokens, so each `POST /api/v1/projects/{project}/tokens` takes the project's creation lock, counts, then writes. That lock used to be held across eight round trips to the database, about 100 ms each on a small server, while queued creators each held a pooled connection and other reads waited. It is now held for two statements: the lock, then one statement that counts and writes the token and its permissions. The count stays exact: twenty creators racing for the last slot still make exactly one token, and the rest get `422 too_many_tokens`. The answer to a creation is now exactly what reading the token back returns.

**Schedule and release lists.** `GET …/schedules` and `GET …/releases`, and the check that finds which publish requests stop an entry's deletion, now choose their rows first and look up titles and names afterwards. Before, once a project had grown past the database's statistics, a 120-row schedule list could read 16,203 publish-request rows and take three seconds, and a 100-release page read 10,150. Each list now reads about as many rows as it returns.

Nothing to change on your side.
