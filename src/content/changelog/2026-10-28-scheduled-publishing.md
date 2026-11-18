---
title: "Schedule a publish request for a local time in any time zone"
date: 2026-10-28
type: Feature
areas: [API, Studio]
docs:
  - label: Scheduling
    href: /studio/scheduling/
---

An approved publish request can now go live later. You choose the date and time as a wall clock shows it and an IANA time zone; Colophon keeps both, with the instant they resolve to. A time the clocks show twice or skip at a daylight-saving change is refused with 422 `ambiguous_local_time` or `skipped_local_time`, with both possible instants in `details.candidates`; send `"choice": "earlier"` or `"later"` to pick one.

```http
POST /api/v1/projects/{project}/environments/{environment}/changesets/{changeset}/schedule
If-Match: <the publish request's ETag>

{"local_time": "2026-12-01T09:00:00", "time_zone": "Europe/London"}
```

When it falls due, the worker publishes as the person who scheduled it, with every check a publish makes at that moment. An edit since approval, an expired approval, a role that can no longer publish or a URL name another entry holds blocks the schedule with the reason, and nothing is published. A run that starts more than a minute late is marked `delayed`, never reported as on time. API tokens can't schedule.

`GET …/schedules` lists pending and recently finished schedules; `DELETE …/schedules/{schedule}` cancels one (409 `schedule_ran` if it already ran). In the Studio, a publish request has a Schedule panel and the Releases page lists what is scheduled.
