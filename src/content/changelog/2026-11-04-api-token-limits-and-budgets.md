---
title: "API tokens can carry limits: requests a minute, and writes and jobs a day"
date: 2026-11-04
type: Feature
areas: [API]
docs:
  - label: Rate limits
    href: /api/rate-limits/
  - label: Authentication & API tokens
    href: /api/authentication/
---

A project API token can now carry `limits`, set when it is created or later with `PATCH /api/v1/projects/{project}/tokens/{token}`. Every ceiling is optional:

- `requests_per_minute` (1–100,000): past it, the token's requests answer `429 rate_limited` with `Retry-After`.
- `documents_per_day` (1–1,000,000) counts entry creates, saves, translations and imported items over a rolling day; `max_concurrent_jobs` (1–64) caps the delivery jobs its publishes hold at once. Past either, the write is refused with `403` and `details.reason` `budget_exceeded` before it commits.
- `tokens_per_day` and `cost_per_day_micros` are ceilings for model-provider usage; they are stored and reported, and no Colophon feature consumes them today.

Why it matters: a looping script or agent can't flood the API or rewrite a project overnight. Budgets are counted in PostgreSQL inside the transaction that accepts the work, so parallel requests can't overspend them. People are never limited this way.

`GET …/tokens/{token}` shows the limits and current `usage`; `{"limits": null}` removes them. Token management takes a person's credential:

```sh
curl -X PATCH https://cms.example.com/api/v1/projects/{project}/tokens/{token} \
  -H "Authorization: Bearer $PERSONAL_TOKEN" -H "Content-Type: application/json" \
  -d '{"limits": {"requests_per_minute": 60, "documents_per_day": 500}}'
```
