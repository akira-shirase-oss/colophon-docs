---
title: "Opening an entry no longer slows down as a project fills up with entries"
date: 2026-11-17
type: Improvement
areas: [Performance]
docs:
  - label: Languages
    href: /studio/languages/
---

Every read of a draft also lists its translations (the `localizations` on `GET /api/v1/projects/{project}/environments/{environment}/collections/{collection}/entries/{entry}`). In a project that had just been filled with entries, PostgreSQL could plan that lookup as a comparison of every entry with every other one. In load tests a single entry read then took 0.5–0.7 seconds, and the entries load test failed with 2–4 second latencies.

The lookup is now two direct reads: the entry by its key, then, only if it belongs to a group of translations, that group by its key. An entry without translations, the usual case, costs one key lookup, and a translated entry's read grows with the size of its own group, never with the size of the project.

What you notice: entry pages in the Studio, and draft reads over the API, stay as quick in a project of thousands of entries as in a small one, including right after a large import, before the database has refreshed its statistics. A test now fills a project with 1,500 entries and reads translations twenty times each within 250 ms; it took 1.1 seconds before the fix.

Nothing to change on your side.
